// O Caso, Radar (painel): vídeos recentes dos Youtubers que podem dar notícia.
// Cada um mostra porquê (palavras, Youtubers mencionados, sinais nos números e nos comentários)
// e vira notícia com um clique (o editor abre já preenchido).

import { api, pessoa, procurar } from "../data.js";
import { esc, curto, inteiro, ha } from "../format.js";
import { $, $$, avatar, toast, janela } from "../ui.js";
import { chamar } from "./common.js";
import { novaNoticiaCom } from "./noticias.js";

let filtro = "novo";
let tema = "";
// Aba: os Youtubers escolhidos à mão (lidos sozinhos uma vez por dia) ou todos os do Placar
let grupo = "escolhidos";
let aParar = false;

const NOMES_PALAVRA = {};
const urlVideo = (it) => (it.s ? `https://www.youtube.com/shorts/${it.id}` : `https://www.youtube.com/watch?v=${it.id}`);

const VARIANTES = { a: "aàáâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö", u: "uúùûü", c: "cç" };
/** Destaca as palavras encontradas num texto (sem HTML vindo de fora), com ou sem acentos. */
function destacar(texto, palavras) {
  const lista = palavras.filter((p) => p.length >= 3).sort((a, b) => b.length - a.length);
  if (!lista.length) return esc(texto);
  const padrao = lista
    .map((p) => [...p].map((ch) => (VARIANTES[ch] ? `[${VARIANTES[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join(""))
    .join("|");
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${padrao})(?=$|[^\\p{L}\\p{N}])`, "giu");
  return esc(texto).replace(re, (m, a, b) => `${a}<mark>${b}</mark>`);
}

export async function desenharRadar(main) {
  const corpo = $("#csp-corpo", main);
  let r;
  try {
    r = await api("admin/caso/radar");
  } catch (e) {
    corpo.innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  const recarregar = () => desenharRadar(main);
  $("#csp-regras", main).onclick = () => regras(r, recarregar);
  const extrasIds = new Set((r.regras.extras || []).map((e) => e.id));
  const escolhidos = new Set(r.regras.escolhidos || []);
  const doGrupo = (it) => grupo === "todos" || escolhidos.has(it.personId) || extrasIds.has(it.ch);
  const nCanais = r.canais?.[grupo] || 0;
  const botao = $("#csp-procurar", main);
  botao.textContent = grupo === "todos" ? `Procurar em todos (${nCanais} canais)` : `Procurar nos escolhidos (${nCanais})`;
  botao.title = `Lê os últimos 15 vídeos de cada canal: cerca de ${nCanais * 3} unidades da quota (mais 1 por vídeo com comentários lidos).`;
  botao.onclick = async () => {
    if (!nCanais) return toast(grupo === "todos" ? "Ainda não há canais ligados." : "Escolhe primeiro os Youtubers (ou canais extra) a vigiar.", { erro: true });
    aParar = false;
    botao.disabled = true;
    const caixa = $("#rdr-progresso", main);
    caixa.hidden = false;
    let desde = 0;
    let novos = 0;
    try {
      while (desde !== null && !aParar) {
        caixa.innerHTML = `<div class="ed-progresso"><i style="width:${Math.round((desde / nCanais) * 100)}%"></i></div><p class="muted">A ler ${desde} de ${nCanais} canais… ${novos ? `${novos} ${novos === 1 ? "vídeo novo" : "vídeos novos"} no radar.` : ""} <button class="btn-link" id="rdr-parar">Parar</button></p>`;
        $("#rdr-parar", caixa).onclick = () => (aParar = true);
        const res = await chamar("caso/radar/procurar", { grupo, desde }, { recarregar: false });
        novos += res.novos;
        desde = res.proximo;
      }
      toast(novos ? `${novos} ${novos === 1 ? "vídeo novo" : "vídeos novos"} no radar.` : "Nada de novo.");
    } catch {
      /* o erro já apareceu */
    }
    botao.disabled = false;
    recarregar();
  };

  const nome = (id) => pessoa(id)?.name || r.nomes[id] || id;
  const conta = { novo: 0, noticia: 0, ignorado: 0 };
  const doGrupoTodos = r.itens.filter(doGrupo);
  for (const k of Object.keys(conta)) conta[k] = doGrupoTodos.filter((x) => x.estado === k).length;
  const temasUsados = [...new Set(doGrupoTodos.filter((x) => filtro === "todos" || x.estado === filtro).map((x) => x.tema))];
  const lista = doGrupoTodos.filter((x) => (filtro === "todos" || x.estado === filtro) && (!tema || x.tema === tema));

  const cartao = (it) => {
    const t = r.temas[it.tema] || r.temas.noticia;
    const dono = pessoa(it.personId);
    const mencionados = (it.pessoas || []).map((id) => pessoa(id) || { id, name: nome(id) });
    const nosCom = (it.nosComentarios || []).map((id) => pessoa(id) || { id, name: nome(id) });
    return `<article class="painel ed-bloco rdr-cartao ${it.estado}" data-v="${esc(it.id)}" style="--tc:${t.cor}">
      <a class="rdr-mini" href="${urlVideo(it)}" target="_blank" rel="noopener" aria-label="Ver o vídeo no YouTube">${it.th ? `<img src="${esc(it.th)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}${it.s ? `<span>Short</span>` : ""}</a>
      <div class="rdr-info">
        <div class="rdr-topo"><span class="ntp-tema">${t.icone} ${esc(t.nome)}</span><span class="rdr-pontos" title="Quanto parece notícia">🔥 ${inteiro(Math.round(it.pontos))}</span>${it.estado === "noticia" ? `<span class="vt-selo aberta">Já é notícia</span>` : it.estado === "ignorado" ? `<span class="vt-selo">Ignorado</span>` : ""}<small class="muted">${esc(ha(it.p))}</small></div>
        <h3><a href="${urlVideo(it)}" target="_blank" rel="noopener">${destacar(it.t, it.palavras || [])}</a></h3>
        <div class="rdr-dono">${dono ? avatar(dono, 24) : ""}<b>${esc(it.personId ? nome(it.personId) : it.chNome || "Canal extra")}</b>${it.chNome && it.personId && it.chNome !== nome(it.personId) ? `<span class="muted">(${esc(it.chNome)})</span>` : ""}<span class="muted">· ${curto(it.v)} views · ${curto(it.c)} comentários</span></div>
        ${it.desc ? `<p class="rdr-desc">${destacar(it.desc.slice(0, 280), it.palavras || [])}${it.desc.length > 280 ? "…" : ""}</p>` : ""}
        <div class="rdr-porque">
          ${mencionados.length ? `<span class="rdr-motivo forte">Fala de ${mencionados.map((p) => `<b>${esc(p.name)}</b>`).join(", ")}</span>` : ""}
          ${(it.palavras || []).length ? `<span class="rdr-motivo">Palavras: ${it.palavras.map((p) => esc(NOMES_PALAVRA[p] || p)).join(", ")}</span>` : ""}
          ${(it.sinais || []).map((s) => `<span class="rdr-motivo">📈 ${esc(s)}</span>`).join("")}
          ${(it.nasEtiquetas || []).length ? `<span class="rdr-motivo">Nas etiquetas: ${it.nasEtiquetas.map((id) => esc(nome(id))).join(", ")}</span>` : ""}
          ${nosCom.length ? `<span class="rdr-motivo">💬 Nos comentários fala-se de ${nosCom.map((p) => `<b>${esc(p.name)}</b>`).join(", ")}</span>` : ""}
          ${(it.quentesCom || []).length ? `<span class="rdr-motivo">💬 Comentários com "${esc(it.quentesCom.join('", "'))}"</span>` : ""}
        </div>
        <div class="sgp-acoes">
          ${it.estado !== "noticia" ? `<button class="btn btn-primario btn-pequeno" data-noticia>📰 Fazer notícia</button>` : ""}
          ${it.estado === "ignorado" ? `<button class="btn btn-pequeno" data-estado="novo">Voltar a mostrar</button>` : it.estado === "novo" ? `<button class="btn btn-pequeno" data-estado="ignorado">Ignorar</button>` : ""}
          <a class="btn btn-pequeno" href="${urlVideo(it)}" target="_blank" rel="noopener">Ver vídeo ↗</a>
        </div>
      </div>
    </article>`;
  };

  corpo.innerHTML = `<div class="filtros">
      <div class="segmentos rdr-grupos" role="group" aria-label="Que Youtubers">${[["escolhidos", `⭐ Escolhidos (${escolhidos.size + extrasIds.size})`], ["todos", "Todos os Youtubers"]].map(([k, n]) => `<button data-grupo="${k}" aria-pressed="${grupo === k}">${n}</button>`).join("")}</div>
    </div>
    ${grupo === "escolhidos" ? blocoEscolhidos(r) : `<p class="muted rdr-nota">Todos os Youtubers do Placar: só são lidos quando carregas em "Procurar em todos" (cerca de ${nCanais * 3} unidades da quota). Aqui aparecem também os vídeos dos escolhidos.</p>`}
    <div id="rdr-progresso" class="painel ed-bloco" hidden></div>
    <div class="filtros">
      <div class="segmentos" role="group" aria-label="Mostrar">${[["novo", `Por ver (${conta.novo})`], ["noticia", `Viraram notícia (${conta.noticia})`], ["ignorado", `Ignorados (${conta.ignorado})`], ["todos", "Todos"]].map(([k, n]) => `<button data-filtro="${k}" aria-pressed="${filtro === k}">${n}</button>`).join("")}</div>
      ${temasUsados.length > 1 ? `<div class="segmentos rdr-temas" role="group" aria-label="Tema"><button data-tema="" aria-pressed="${!tema}">Todos os temas</button>${temasUsados.map((k) => `<button data-tema="${k}" aria-pressed="${tema === k}">${r.temas[k]?.icone || ""} ${esc(r.temas[k]?.nome || k)}</button>`).join("")}</div>` : ""}
    </div>
    <div class="rdr-lista">${lista.map(cartao).join("") || `<div class="painel ed-bloco"><h3>${r.itens.length ? "Nada aqui" : "O radar ainda está vazio"}</h3><p class="muted">${r.itens.length ? "Experimenta outro filtro." : 'O radar lê os vídeos novos de hora a hora, com a recolha automática. Carrega em "Procurar agora" para ler já os vídeos de 15 canais (e voltar a ver os que já estavam guardados).'}</p></div>`}</div>
    <p class="muted sgp-regras-txt">${r.ultima ? `Última leitura: ${esc(ha(r.ultima))}. ` : ""}O radar vê os vídeos dos últimos 45 dias: título, descrição e etiquetas, outros Youtubers mencionados (nome, nome do canal ou @), e sinais nos números. Nos que já parecem notícia, lê também os comentários mais relevantes (gasta 1 unidade da quota por vídeo). Mínimo para entrar: ${r.regras.minimo} pontos.</p>`;

  $$("[data-grupo]", corpo).forEach((b) => b.addEventListener("click", () => ((grupo = b.dataset.grupo), (tema = ""), recarregar())));
  ligarEscolhidos(corpo, r, recarregar);
  $$("[data-filtro]", corpo).forEach((b) => b.addEventListener("click", () => ((filtro = b.dataset.filtro), (tema = ""), recarregar())));
  $$("[data-tema]", corpo).forEach((b) => b.addEventListener("click", () => ((tema = b.dataset.tema), recarregar())));
  $$("[data-v]", corpo).forEach((el) => {
    const it = r.itens.find((x) => x.id === el.dataset.v);
    el.querySelector("[data-estado]")?.addEventListener("click", async (e) => {
      await chamar("caso/radar/estado", { id: it.id, estado: e.currentTarget.dataset.estado }, { botao: e.currentTarget, recarregar: false }).catch(() => {});
      recarregar();
    });
    el.querySelector("[data-noticia]")?.addEventListener("click", async () => {
      const pessoas = [it.personId, ...(it.pessoas || [])].filter((id) => pessoa(id)).slice(0, 8);
      const polemica = it.tema === "stress";
      await novaNoticiaCom(
        {
          tema: it.tema,
          titulo: it.t,
          texto: `${nome(it.personId)} publicou "${it.t}"${(it.pessoas || []).length ? `, onde fala de ${it.pessoas.map(nome).join(", ")}` : ""}.${it.desc ? `\n\n${it.desc.slice(0, 400)}` : ""}`,
          pessoas,
          link: urlVideo(it),
          imagem: it.th || "",
          pergunta: polemica && pessoas.length >= 2 ? "Quem tem razão?" : "",
          opcoes: polemica && pessoas.length >= 2 ? [...pessoas.slice(0, 2).map(nome), "Ninguém"] : [],
          estado: "rascunho",
          fixada: false,
          votar: true,
        },
        async (n) => {
          if (!n) return;
          await chamar("caso/radar/estado", { id: it.id, estado: "noticia", noticia: n.id }, { recarregar: false }).catch(() => {});
          recarregar();
        },
      );
    });
  });
}

/** Os Youtubers escolhidos (lidos sozinhos uma vez por dia) e os canais extra a vigiar. */
function blocoEscolhidos(r) {
  const pessoas = (r.regras.escolhidos || []).map((id) => pessoa(id) || { id, name: r.nomes[id] || id });
  const extras = r.regras.extras || [];
  return `<div class="painel ed-bloco rdr-escolhidos">
    <h3>Youtubers escolhidos</h3>
    <p class="muted">O radar lê estes sozinho, uma vez por dia (cerca de 3 unidades da quota por canal; os canais de clips de cada um também entram). Escolhe os que costumam dar notícias.</p>
    <div class="rdr-chips">${pessoas.map((p) => `<span class="rdr-chip">${avatar(p, 24)}${esc(p.name)}<button type="button" data-tirar-p="${esc(p.id)}" aria-label="Tirar ${esc(p.name)}">✕</button></span>`).join("") || `<span class="muted">Ainda ninguém.</span>`}</div>
    <div class="rdr-juntar"><span style="position:relative;flex:1;min-width:200px"><input class="input" id="rdr-procura" placeholder="Juntar Youtuber" autocomplete="off"><span class="ntp-resultados" id="rdr-resultados"></span></span></div>
    <h3 style="margin-top:18px">Canais extra a vigiar</h3>
    <p class="muted">Canais de clips ou de notícias que não estão no Placar (por exemplo, um canal de clips de lives). Os Youtubers que eles mencionam aparecem no radar.</p>
    <div class="rdr-chips">${extras.map((e) => `<span class="rdr-chip">${e.thumb ? `<img src="${esc(e.thumb)}" alt="" referrerpolicy="no-referrer">` : ""}${esc(e.title)}<button type="button" data-tirar-e="${esc(e.id)}" aria-label="Tirar ${esc(e.title)}">✕</button></span>`).join("") || `<span class="muted">Nenhum.</span>`}</div>
    <div class="rdr-juntar"><input class="input" id="rdr-extra" placeholder="Link do canal ou @handle" style="flex:1;min-width:200px"><button class="btn btn-pequeno" id="rdr-extra-ok" data-a-esperar="A procurar">Juntar canal</button></div>
  </div>`;
}

function ligarEscolhidos(corpo, r, recarregar) {
  const guardar = async (escolhidos) => {
    await chamar("caso/radar/regras", { escolhidos }, { recarregar: false }).catch(() => {});
    recarregar();
  };
  $$("[data-tirar-p]", corpo).forEach((b) => b.addEventListener("click", () => guardar(r.regras.escolhidos.filter((id) => id !== b.dataset.tirarP))));
  $$("[data-tirar-e]", corpo).forEach((b) =>
    b.addEventListener("click", async () => {
      await chamar("caso/radar/extra", { tirar: b.dataset.tirarE }, { recarregar: false }).catch(() => {});
      recarregar();
    }),
  );
  const procura = $("#rdr-procura", corpo);
  procura?.addEventListener("input", () => {
    const l = procura.value.trim() ? procurar(procura.value, 8).filter((p) => !r.regras.escolhidos.includes(p.id)) : [];
    $("#rdr-resultados", corpo).innerHTML = l.map((p) => `<button type="button" data-por="${esc(p.id)}">${avatar(p, 24)}${esc(p.name)}</button>`).join("");
    $$("[data-por]", corpo).forEach((b) => b.addEventListener("click", () => guardar([...r.regras.escolhidos, b.dataset.por])));
  });
  $("#rdr-extra-ok", corpo)?.addEventListener("click", async (e) => {
    const input = $("#rdr-extra", corpo).value.trim();
    if (!input) return toast("Cola o link do canal.", { erro: true });
    const res = await chamar("caso/radar/extra", { input }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
    if (res) recarregar();
  });
}

function regras(r, depois) {
  const g = r.regras;
  const { el, fechar } = janela(`<h2>Regras do radar</h2>
    <form class="vc-form">
      <label class="campo"><span>Pontos mínimos para um vídeo entrar no radar</span><input class="input" type="number" name="minimo" min="2" max="15" value="${g.minimo}"><small>Mais baixo apanha mais vídeos (e mais falsos alarmes). Cada palavra vale 1 a 3 pontos (mais no título), cada Youtuber mencionado 3, e os sinais nos números 2.</small></label>
      <label class="campo"><span>Palavras a vigiar, além das que já vêm (uma por linha)</span><textarea class="input" name="palavras" rows="5" placeholder="sparking&#10;bomba=stress&#10;novo podcast=noticia">${esc((g.palavras || []).join("\n"))}</textarea><small>Podes dizer o tema depois de =: stress (polémica), pausa, colab, marco, evento, boa, noticia ou rumor.</small></label>
      <label class="ed-check"><input type="checkbox" name="comentarios" ${g.comentarios !== false ? "checked" : ""}> Ler os comentários dos vídeos que já parecem notícia (1 unidade da quota por vídeo)</label>
    </form>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok data-a-esperar="A guardar">Guardar</button></div>`);
  $("[data-ok]", el).addEventListener("click", async (e) => {
    const f = $("form", el);
    const res = await chamar("caso/radar/regras", { minimo: Number(f.elements.minimo.value), palavras: f.elements.palavras.value, comentarios: f.elements.comentarios.checked }, { botao: e.currentTarget, recarregar: false, sucesso: "Regras guardadas. Valem para os próximos vídeos lidos." }).catch(() => null);
    if (res) {
      fechar();
      depois();
    }
  });
}
