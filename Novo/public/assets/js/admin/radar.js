// O Caso, Radar (painel): vídeos recentes dos Youtubers que podem dar notícia.
// Cada um mostra porquê (palavras, Youtubers mencionados, sinais nos números e nos comentários)
// e vira notícia com um clique (o editor abre já preenchido).

import { api, pessoa } from "../data.js";
import { esc, curto, inteiro, ha } from "../format.js";
import { $, $$, avatar, toast, janela } from "../ui.js";
import { chamar } from "./common.js";
import { novaNoticiaCom } from "./noticias.js";

let filtro = "novo";
let tema = "";

const NOMES_PALAVRA = { "ft.": "ft." };
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
  $("#csp-procurar", main).onclick = async (e) => {
    const res = await chamar("caso/radar/procurar", { novos: true, limit: 15 }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
    if (!res) return;
    toast(res.novos ? `${res.novos} ${res.novos === 1 ? "vídeo novo" : "vídeos novos"} no radar (vídeos de ${res.canais} canais atualizados).` : `Nada de novo nos ${res.canais} canais atualizados.`);
    recarregar();
  };

  const nome = (id) => pessoa(id)?.name || r.nomes[id] || id;
  const conta = { novo: 0, noticia: 0, ignorado: 0 };
  for (const it of r.itens) conta[it.estado]++;
  const temasUsados = [...new Set(r.itens.filter((x) => filtro === "todos" || x.estado === filtro).map((x) => x.tema))];
  const lista = r.itens.filter((x) => (filtro === "todos" || x.estado === filtro) && (!tema || x.tema === tema));

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
        <div class="rdr-dono">${dono ? avatar(dono, 24) : ""}<b>${esc(nome(it.personId))}</b><span class="muted">· ${curto(it.v)} views · ${curto(it.c)} comentários</span></div>
        ${it.desc ? `<p class="rdr-desc">${destacar(it.desc.slice(0, 280), it.palavras || [])}${it.desc.length > 280 ? "…" : ""}</p>` : ""}
        <div class="rdr-porque">
          ${mencionados.length ? `<span class="rdr-motivo forte">Fala de ${mencionados.map((p) => `<b>${esc(p.name)}</b>`).join(", ")}</span>` : ""}
          ${(it.palavras || []).length ? `<span class="rdr-motivo">Palavras: ${it.palavras.map((p) => esc(NOMES_PALAVRA[p] || p)).join(", ")}</span>` : ""}
          ${(it.sinais || []).map((s) => `<span class="rdr-motivo">📈 ${esc(s)}</span>`).join("")}
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
      <div class="segmentos" role="group" aria-label="Mostrar">${[["novo", `Por ver (${conta.novo})`], ["noticia", `Viraram notícia (${conta.noticia})`], ["ignorado", `Ignorados (${conta.ignorado})`], ["todos", "Todos"]].map(([k, n]) => `<button data-filtro="${k}" aria-pressed="${filtro === k}">${n}</button>`).join("")}</div>
      ${temasUsados.length > 1 ? `<div class="segmentos rdr-temas" role="group" aria-label="Tema"><button data-tema="" aria-pressed="${!tema}">Todos os temas</button>${temasUsados.map((k) => `<button data-tema="${k}" aria-pressed="${tema === k}">${r.temas[k]?.icone || ""} ${esc(r.temas[k]?.nome || k)}</button>`).join("")}</div>` : ""}
    </div>
    <div class="rdr-lista">${lista.map(cartao).join("") || `<div class="painel ed-bloco"><h3>${r.itens.length ? "Nada aqui" : "O radar ainda está vazio"}</h3><p class="muted">${r.itens.length ? "Experimenta outro filtro." : 'O radar lê os vídeos novos de hora a hora, com a recolha automática. Carrega em "Procurar agora" para ler já os vídeos de 15 canais (e voltar a ver os que já estavam guardados).'}</p></div>`}</div>
    <p class="muted sgp-regras-txt">O radar vê os vídeos dos últimos 45 dias: título, descrição e etiquetas, outros Youtubers mencionados (nome, nome do canal ou @), e sinais nos números. Nos que já parecem notícia, lê também os comentários mais relevantes (gasta 1 unidade da quota por vídeo). Mínimo para entrar: ${r.regras.minimo} pontos.</p>`;

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
