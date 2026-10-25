// O Caso, Radar (painel): vídeos recentes dos Youtubers que podem dar notícia.
// Cada um mostra porquê (palavras, Youtubers mencionados, sinais nos números e nos comentários),
// fica marcado quando já foi visto, pode ser removido (não volta) e vira notícia com um clique.

import { api, pessoa, procurar } from "../data.js";
import { esc, curto, inteiro, ha } from "../format.js";
import { $, $$, avatar, toast, janela } from "../ui.js";
import { chamar } from "./common.js";
import { novaNoticiaCom } from "./noticias.js";

// O que se vê (fica entre visitas à página)
const vista = { grupo: "escolhidos", filtro: "novo", tema: "", pessoa: "", ordem: "recentes" };
let aParar = false;

const urlVideo = (it) => (it.s ? `https://www.youtube.com/shorts/${it.id}` : `https://www.youtube.com/watch?v=${it.id}`);
const calor = (p) => (p >= 20 ? "ferve" : p >= 12 ? "quente" : "morno");

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
  const nome = (id) => pessoa(id)?.name || r.nomes[id] || id;
  const extrasIds = new Set((r.regras.extras || []).map((e) => e.id));
  const escolhidos = new Set(r.regras.escolhidos || []);
  const doGrupo = (it) => vista.grupo === "todos" || escolhidos.has(it.personId) || extrasIds.has(it.ch);

  // ---------- Botão de procurar (só no grupo da aba aberta) ----------
  const nCanais = r.canais?.[vista.grupo] || 0;
  const botao = $("#csp-procurar", main);
  botao.textContent = vista.grupo === "todos" ? `Procurar em todos (${nCanais} canais)` : `Procurar nos escolhidos (${nCanais})`;
  botao.title = `Lê os últimos 15 vídeos de cada canal: cerca de ${nCanais * 3} unidades da quota (mais 1 por vídeo com comentários lidos).`;
  botao.onclick = async () => {
    if (!nCanais) return toast(vista.grupo === "todos" ? "Ainda não há canais ligados." : "Escolhe primeiro os Youtubers (ou canais extra) a vigiar.", { erro: true });
    aParar = false;
    botao.disabled = true;
    const caixa = $("#rdr-progresso", main);
    caixa.hidden = false;
    let desde = 0;
    let novos = 0;
    try {
      while (desde !== null && !aParar) {
        caixa.innerHTML = `<div class="rdr-prog-linha"><b>📡 A ler ${desde} de ${nCanais} canais…</b><span class="muted">${novos ? `${novos} ${novos === 1 ? "vídeo novo" : "vídeos novos"}` : ""}</span><button class="btn btn-pequeno" id="rdr-parar">Parar</button></div><div class="ed-progresso"><i style="width:${Math.round((desde / nCanais) * 100)}%"></i></div>`;
        $("#rdr-parar", caixa).onclick = () => (aParar = true);
        const res = await chamar("caso/radar/procurar", { grupo: vista.grupo, desde }, { recarregar: false });
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

  // ---------- Mudar o estado (sem voltar a carregar tudo) ----------
  const mudar = async (ids, estado, extra = {}) => {
    try {
      await chamar("caso/radar/estado", { ids, estado, ...extra }, { recarregar: false });
    } catch {
      return false;
    }
    if (estado === "remover") {
      r.itens = r.itens.filter((x) => !ids.includes(x.id));
      r.nRemovidos = (r.nRemovidos || 0) + ids.length;
    } else for (const it of r.itens) if (ids.includes(it.id)) it.estado = estado;
    desenhar();
    return true;
  };

  const cartao = (it) => {
    const t = r.temas[it.tema] || r.temas.noticia;
    const dono = pessoa(it.personId);
    const quem = it.personId ? nome(it.personId) : it.chNome || "Canal extra";
    const mencionados = (it.pessoas || []).map(nome);
    const motivos = [
      ...(it.sinais || []).map((s) => `📈 ${esc(s)}`),
      (it.nasEtiquetas || []).length ? `🏷️ Nas etiquetas: ${it.nasEtiquetas.map((id) => esc(nome(id))).join(", ")}` : "",
      (it.nosComentarios || []).length ? `💬 Nos comentários: ${it.nosComentarios.map((id) => `<b>${esc(nome(id))}</b>`).join(", ")}` : "",
      (it.quentesCom || []).length ? `💬 Comentários com "${esc(it.quentesCom.join('", "'))}"` : "",
    ].filter(Boolean);
    return `<article class="rdr-cartao ${it.estado}" data-v="${esc(it.id)}" style="--tc:${t.cor}">
      <a class="rdr-mini" href="${urlVideo(it)}" target="_blank" rel="noopener" data-abrir aria-label="Ver o vídeo no YouTube">
        ${it.th ? `<img src="${esc(it.th)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
        <span class="rdr-calor ${calor(it.pontos)}" title="Quanto parece notícia">🔥 ${inteiro(Math.round(it.pontos))}</span>
        ${it.s ? `<span class="rdr-short">Short</span>` : ""}
        ${it.estado === "visto" ? `<span class="rdr-selo">✓ Visto</span>` : it.estado === "noticia" ? `<span class="rdr-selo noticia">📰 Notícia</span>` : ""}
      </a>
      <div class="rdr-info">
        <div class="rdr-topo"><span class="rdr-tema">${t.icone} ${esc(t.nome)}</span><span class="rdr-quem">${dono ? avatar(dono, 20) : ""}${esc(quem)}${it.chNome && it.personId && it.chNome.toLowerCase() !== quem.toLowerCase() ? ` <small>· ${esc(it.chNome)}</small>` : ""}</span><span class="rdr-quando">${esc(ha(it.p))}</span></div>
        <h3><a href="${urlVideo(it)}" target="_blank" rel="noopener" data-abrir>${destacar(it.t, it.palavras || [])}</a></h3>
        ${mencionados.length ? `<div class="rdr-fala">Fala de ${mencionados.map((n) => `<b>${esc(n)}</b>`).join(", ")}</div>` : ""}
        ${motivos.length || (it.palavras || []).length ? `<div class="rdr-porque">${(it.palavras || []).map((p) => `<span class="rdr-palavra">${esc(p)}</span>`).join("")}${motivos.map((m) => `<span class="rdr-motivo">${m}</span>`).join("")}</div>` : ""}
        <div class="rdr-numeros"><span>👁 ${curto(it.v)}</span><span>💬 ${curto(it.c)}</span>${it.desc ? `<span class="rdr-desc" title="${esc(it.desc)}">${esc(it.desc.slice(0, 120))}${it.desc.length > 120 ? "…" : ""}</span>` : ""}</div>
      </div>
      <div class="rdr-acoes">
        ${it.estado !== "noticia" ? `<button class="btn btn-primario btn-pequeno" data-noticia>📰 Fazer notícia</button>` : `<span class="rdr-feita">Já é notícia</span>`}
        ${it.estado === "novo" ? `<button class="btn btn-pequeno" data-estado="visto" title="Marcar como visto">✓ Visto</button>` : it.estado === "visto" ? `<button class="btn btn-pequeno" data-estado="novo" title="Voltar a pôr por ver">↺ Por ver</button>` : ""}
        <button class="botao-icone rdr-remover" data-remover title="Remover do radar (não volta a aparecer)" aria-label="Remover do radar">🗑</button>
      </div>
    </article>`;
  };

  function desenhar() {
    const doGrupoTodos = r.itens.filter(doGrupo);
    const conta = { novo: 0, visto: 0, noticia: 0 };
    for (const it of doGrupoTodos) conta[it.estado] = (conta[it.estado] || 0) + 1;
    const porEstado = doGrupoTodos.filter((x) => vista.filtro === "todos" || x.estado === vista.filtro);
    // Em alta: quem mais aparece (mencionado ou a falar de alguém) nos últimos 7 dias
    const semana = Date.now() - 7 * 864e5;
    const alta = new Map();
    for (const it of doGrupoTodos) {
      if (Date.parse(it.p || 0) < semana) continue;
      const envolvidos = new Set([...(it.pessoas || []), ...((it.pessoas || []).length && it.personId ? [it.personId] : [])]);
      for (const id of envolvidos) alta.set(id, (alta.get(id) || 0) + 1);
    }
    const emAlta = [...alta.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const temas = [...new Set(porEstado.map((x) => x.tema))];
    const lista = porEstado
      .filter((x) => !vista.tema || x.tema === vista.tema)
      .filter((x) => !vista.pessoa || x.personId === vista.pessoa || (x.pessoas || []).includes(vista.pessoa))
      .sort((a, b) => (vista.ordem === "quentes" ? b.pontos - a.pontos : 0) || (b.p || "").localeCompare(a.p || ""));
    const novosNaLista = lista.filter((x) => x.estado === "novo");

    corpo.innerHTML = `
      <div class="rdr-cabeca">
        <div class="segmentos rdr-grupos" role="group" aria-label="Que Youtubers">${[["escolhidos", `⭐ Escolhidos`], ["todos", "Todos os Youtubers"]].map(([k, n]) => `<button data-grupo="${k}" aria-pressed="${vista.grupo === k}">${n}</button>`).join("")}</div>
        <div class="rdr-resumo">
          ${[["novo", "Por ver", conta.novo], ["visto", "Vistos", conta.visto], ["noticia", "Viraram notícia", conta.noticia], ["todos", "Todos", doGrupoTodos.length]].map(([k, n, v]) => `<button class="rdr-num ${k === "novo" && v ? "destaque" : ""}" data-filtro="${k}" aria-pressed="${vista.filtro === k}"><b>${inteiro(v)}</b><span>${n}</span></button>`).join("")}
        </div>
      </div>
      ${vista.grupo === "escolhidos" ? blocoEscolhidos(r) : `<p class="muted rdr-nota">Todos os Youtubers do Placar só são lidos quando carregas em "Procurar em todos" (cerca de ${nCanais * 3} unidades da quota). Aqui também aparecem os vídeos dos escolhidos.</p>`}
      <div id="rdr-progresso" class="painel ed-bloco rdr-progresso" hidden></div>
      ${emAlta.length ? `<div class="rdr-alta"><span class="rdr-alta-titulo">🔥 Em alta esta semana</span>${emAlta.map(([id, n]) => `<button class="rdr-alta-p" data-pessoa="${esc(id)}" aria-pressed="${vista.pessoa === id}">${pessoa(id) ? avatar(pessoa(id), 22) : ""}${esc(nome(id))}<b>${n}</b></button>`).join("")}</div>` : ""}
      <div class="rdr-barra">
        <select class="input" id="rdr-tema" aria-label="Tema"><option value="">Todos os temas</option>${temas.map((k) => `<option value="${k}" ${vista.tema === k ? "selected" : ""}>${r.temas[k]?.icone || ""} ${esc(r.temas[k]?.nome || k)}</option>`).join("")}</select>
        <select class="input" id="rdr-ordem" aria-label="Ordem"><option value="recentes" ${vista.ordem === "recentes" ? "selected" : ""}>Mais recentes</option><option value="quentes" ${vista.ordem === "quentes" ? "selected" : ""}>Mais quentes</option></select>
        ${vista.pessoa ? `<button class="btn btn-pequeno" data-pessoa="">✕ ${esc(nome(vista.pessoa))}</button>` : ""}
        <span class="rdr-barra-fim">${novosNaLista.length > 1 ? `<button class="btn btn-pequeno" id="rdr-todos-vistos">✓ Marcar ${novosNaLista.length} como vistos</button>` : ""}</span>
      </div>
      <div class="rdr-lista">${lista.map(cartao).join("") || `<div class="painel ed-bloco rdr-vazio"><h3>${r.itens.length ? "Nada aqui" : "O radar ainda está vazio"}</h3><p class="muted">${r.itens.length ? (vista.filtro === "novo" ? "Já viste tudo. 🎉" : "Experimenta outro filtro.") : `Carrega em "${esc(botao.textContent)}" para ler já os vídeos.`}</p></div>`}</div>
      <p class="muted sgp-regras-txt">${r.ultima ? `Última leitura: ${esc(ha(r.ultima))}. ` : ""}${r.nRemovidos ? `${inteiro(r.nRemovidos)} ${r.nRemovidos === 1 ? "vídeo removido" : "vídeos removidos"} (não voltam a aparecer). ` : ""}O radar vê os vídeos dos últimos 45 dias. Mínimo para entrar: ${r.regras.minimo} pontos. Abrir um vídeo marca-o como visto.</p>`;

    $$("[data-grupo]", corpo).forEach((b) => b.addEventListener("click", () => ((vista.grupo = b.dataset.grupo), (vista.tema = ""), (vista.pessoa = ""), recarregar())));
    $$("[data-filtro]", corpo).forEach((b) => b.addEventListener("click", () => ((vista.filtro = b.dataset.filtro), (vista.tema = ""), desenhar())));
    $$("[data-pessoa]", corpo).forEach((b) => b.addEventListener("click", () => ((vista.pessoa = vista.pessoa === b.dataset.pessoa ? "" : b.dataset.pessoa), desenhar())));
    $("#rdr-tema", corpo).addEventListener("change", (e) => ((vista.tema = e.target.value), desenhar()));
    $("#rdr-ordem", corpo).addEventListener("change", (e) => ((vista.ordem = e.target.value), desenhar()));
    $("#rdr-todos-vistos", corpo)?.addEventListener("click", () => mudar(novosNaLista.map((x) => x.id), "visto"));
    ligarEscolhidos(corpo, r, recarregar);
    $$("[data-v]", corpo).forEach((el) => {
      const it = r.itens.find((x) => x.id === el.dataset.v);
      // Abrir o vídeo marca-o como visto
      $$("[data-abrir]", el).forEach((a) => a.addEventListener("click", () => it.estado === "novo" && setTimeout(() => mudar([it.id], "visto"), 300)));
      el.querySelector("[data-estado]")?.addEventListener("click", (e) => mudar([it.id], e.currentTarget.dataset.estado));
      el.querySelector("[data-remover]").addEventListener("click", async () => {
        if (await mudar([it.id], "remover")) toast("Removido do radar.");
      });
      el.querySelector("[data-noticia]")?.addEventListener("click", () => fazerNoticia(it, nome, mudar));
    });
  }
  desenhar();
}

/** Abre o editor das notícias já preenchido com o vídeo. */
async function fazerNoticia(it, nome, mudar) {
  const pessoas = [it.personId, ...(it.pessoas || [])].filter((id) => id && pessoa(id)).slice(0, 8);
  const polemica = it.tema === "stress";
  await novaNoticiaCom(
    {
      tema: it.tema,
      titulo: it.t,
      texto: `${it.personId ? nome(it.personId) : it.chNome || "Um canal"} publicou "${it.t}"${(it.pessoas || []).length ? `, onde fala de ${it.pessoas.map(nome).join(", ")}` : ""}.${it.desc ? `\n\n${it.desc.slice(0, 400)}` : ""}`,
      pessoas,
      link: urlVideo(it),
      imagem: it.th || "",
      pergunta: polemica && pessoas.length >= 2 ? "Quem tem razão?" : "",
      opcoes: polemica && pessoas.length >= 2 ? [...pessoas.slice(0, 2).map(nome), "Ninguém"] : [],
      estado: "rascunho",
      fixada: false,
      votar: true,
    },
    (n) => n && mudar([it.id], "noticia", { noticia: n.id }),
  );
}

/** Os Youtubers escolhidos (lidos sozinhos uma vez por dia) e os canais extra a vigiar. */
function blocoEscolhidos(r) {
  const pessoas = (r.regras.escolhidos || []).map((id) => pessoa(id) || { id, name: r.nomes[id] || id });
  const extras = r.regras.extras || [];
  const vazio = !pessoas.length && !extras.length;
  return `<details class="painel ed-bloco rdr-escolhidos" ${vazio ? "open" : ""}>
    <summary><span><b>⭐ ${pessoas.length} ${pessoas.length === 1 ? "Youtuber escolhido" : "Youtubers escolhidos"}</b>${extras.length ? ` e ${extras.length} ${extras.length === 1 ? "canal extra" : "canais extra"}` : ""}</span><span class="rdr-mini-av">${pessoas.slice(0, 8).map((p) => avatar(p, 26)).join("")}</span><span class="muted rdr-editar">Editar</span></summary>
    <p class="muted">Lidos sozinhos uma vez por dia, de manhã (cerca de 3 unidades da quota por canal; os canais de clips de cada um também entram). Escolhe os que costumam dar notícias.</p>
    <div class="rdr-chips">${pessoas.map((p) => `<span class="rdr-chip">${avatar(p, 24)}${esc(p.name)}<button type="button" data-tirar-p="${esc(p.id)}" aria-label="Tirar ${esc(p.name)}">✕</button></span>`).join("") || `<span class="muted">Ainda ninguém.</span>`}</div>
    <div class="rdr-juntar"><span><input class="input" id="rdr-procura" placeholder="Juntar Youtuber…" autocomplete="off"><span class="ntp-resultados" id="rdr-resultados"></span></span></div>
    <h4 class="ed-sub">Canais extra a vigiar</h4>
    <p class="muted">Canais de clips ou de notícias que não estão no Placar. Os Youtubers que eles mencionam aparecem no radar.</p>
    <div class="rdr-chips">${extras.map((e) => `<span class="rdr-chip">${e.thumb ? `<img src="${esc(e.thumb)}" alt="" referrerpolicy="no-referrer">` : ""}${esc(e.title)}<button type="button" data-tirar-e="${esc(e.id)}" aria-label="Tirar ${esc(e.title)}">✕</button></span>`).join("") || `<span class="muted">Nenhum.</span>`}</div>
    <div class="rdr-juntar"><input class="input" id="rdr-extra" placeholder="Link do canal ou @handle"><button class="btn btn-pequeno" id="rdr-extra-ok" data-a-esperar="A procurar">Juntar canal</button></div>
  </details>`;
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
      <label class="campo"><span>Pontos mínimos para um vídeo entrar no radar</span><input class="input" type="number" name="minimo" min="2" max="15" value="${g.minimo}"><small>Mais baixo apanha mais vídeos (e mais falsos alarmes). Cada Youtuber mencionado no título vale 4, cada palavra 1 a 3 (mais no título), e os sinais nos números 1 a 2.</small></label>
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
