// Os blocos do Início da página pública. Cada bloco é escolhido e configurado no painel
// (período, medida, quantos, estilo e animação); aqui só se desenha.

import { estado, views, indice } from "../data.js";
import { esc, curto, inteiro, mesNome } from "../format.js";
import { avatar, sparkline, movimento } from "../ui.js";
import { linhasMensais } from "../charts.js";
import { MEDIDAS, mesesDoPeriodo, rotuloPeriodo, rankingPeriodo, nomeMedida, periodoAnterior } from "../periodo.js";
import { modo } from "../modo.js";
import { ligacaoPessoa, cabeca } from "./comum.js";
import { cartaoVideo, hallHtml } from "./videos.js";
import { cartaoExclusivo, ligarExclusivos } from "./exclusivos.js";

export const CORES = ["#ff4d70", "#f4b942", "#2ec4a0", "#9085e9", "#4db6ff", "#ff8a3d", "#c86bfa", "#8bd450"];

const fmtDe = (chave) => (chave === "crescimento" ? "pct" : chave === "indice" ? "inteiro" : "curto");
const numero = (v, chave) => `<b data-n="${v}" data-fmt="${fmtDe(chave)}">${(MEDIDAS[chave] || MEDIDAS.views).fmt(v)}</b>`;

/** Um Youtuber com ligação para o perfil (se os perfis estiverem ligados). */
function quemHtml(p, tam = 40, extra = "") {
  const href = ligacaoPessoa(p);
  const dentro = `${avatar(p, tam)}<span class="pb-nome"><b>${esc(p.name)}</b>${extra || (p.category ? `<small>${esc(p.category)}</small>` : "")}</span>`;
  return href ? `<a class="pb-quem" href="${href}">${dentro}</a>` : `<span class="pb-quem">${dentro}</span>`;
}

const vazioBloco = (t) => `<div class="pb-vazio muted">${esc(t)}</div>`;

// ---------- Cada tipo de bloco ----------
const TIPOS = {
  podio(b) {
    const lista = rankingPeriodo(b.metrica, b.periodo, { cat: b.categoria, n: 3 });
    const sub = nomeMedida(b.metrica, b.periodo) + (b.categoria ? ` · ${esc(b.categoria)}` : "");
    if (lista.length < 3) return cabeca(esc(b.titulo || "Pódio"), sub) + vazioBloco("Ainda não há dados suficientes para este pódio.");
    const degrau = (x, cls) => {
      const href = ligacaoPessoa(x.p);
      const corpo = `${avatar(x.p, cls === "d1" ? 92 : 70)}<b>${esc(x.p.name)}</b><small>${numero(x.v, b.metrica)}</small><i class="pb-bloco">${x.pos}</i>`;
      return href ? `<a class="pb-degrau ${cls}" href="${href}" data-anim-item data-ordem="${x.pos}">${corpo}</a>` : `<div class="pb-degrau ${cls}" data-anim-item data-ordem="${x.pos}">${corpo}</div>`;
    };
    return `${cabeca(esc(b.titulo || "Pódio"), sub)}<div class="pb-podio">${degrau(lista[1], "d2")}${degrau(lista[0], "d1")}${degrau(lista[2], "d3")}</div>`;
  },

  ranking(b) {
    const lista = rankingPeriodo(b.metrica, b.periodo, { cat: b.categoria, n: b.n || 10 });
    const sub = nomeMedida(b.metrica, b.periodo) + (b.categoria ? ` · ${esc(b.categoria)}` : "");
    if (!lista.length) return cabeca(esc(b.titulo || "Ranking"), sub) + vazioBloco("Ainda sem dados para este ranking.");
    if (b.estilo === "cartoes") {
      return `${cabeca(esc(b.titulo || "Ranking"), sub)}<div class="pb-cartoes">${lista
        .map((x) => {
          const href = ligacaoPessoa(x.p);
          const corpo = `<span class="pb-pos">${x.pos}</span>${avatar(x.p, 64)}<b>${esc(x.p.name)}</b><small>${numero(x.v, b.metrica)}</small>`;
          return href ? `<a class="vidro pb-cartao" href="${href}" data-anim-item data-ordem="${x.pos}">${corpo}</a>` : `<div class="vidro pb-cartao" data-anim-item data-ordem="${x.pos}">${corpo}</div>`;
        })
        .join("")}</div>`;
    }
    return `${cabeca(esc(b.titulo || "Ranking"), sub)}<ol class="pb-lista">${lista
      .map((x) => `<li class="pb-linha ${x.pos <= 3 ? "top" + x.pos : ""}" data-anim-item data-ordem="${x.pos}"><span class="pb-pos">${x.pos}</span>${quemHtml(x.p, 40)}<span class="pb-valor">${numero(x.v, b.metrica)}${x.ant !== undefined ? movimento(x.pos, x.ant) : ""}</span></li>`)
      .join("")}</ol>`;
  },

  barras(b) {
    const lista = rankingPeriodo(b.metrica, b.periodo, { cat: b.categoria, n: b.n || 8 });
    const sub = nomeMedida(b.metrica, b.periodo) + (b.categoria ? ` · ${esc(b.categoria)}` : "");
    if (!lista.length) return cabeca(esc(b.titulo || "Gráfico"), sub) + vazioBloco("Ainda sem dados.");
    const max = Math.max(...lista.map((x) => Math.abs(x.v))) || 1;
    return `${cabeca(esc(b.titulo || "Gráfico"), sub)}<div class="pb-barras">${lista
      .map((x, i) => {
        const w = `${Math.max(2, (Math.abs(x.v) / max) * 100).toFixed(1)}%`;
        return `<div class="pb-barra-linha" data-anim-item data-ordem="${x.pos}">${quemHtml(x.p, 32, " ")}<div class="pb-barra"><i style="width:${w};--cor:${CORES[i % CORES.length]}" data-w="${w}"></i></div><span class="pb-valor">${numero(x.v, b.metrica)}</span></div>`;
      })
      .join("")}</div>`;
  },

  evolucao(b) {
    let meses = mesesDoPeriodo(b.periodo);
    if (meses.length < 2) {
      const todos = estado.ds.months.filter((m) => m < estado.ds.currentMonth);
      const i = todos.indexOf(meses[0]);
      meses = todos.slice(Math.max(0, i - 5), i + 1);
    }
    let pessoas = (b.pessoas || []).map((id) => estado.pessoas.get(id)).filter(Boolean);
    if (!pessoas.length) pessoas = rankingPeriodo("views", b.periodo, { n: Math.min(b.n || 5, 8) }).map((x) => x.p);
    const sub = `Views por mês, ${rotuloPeriodo(meses)}`;
    if (!pessoas.length) return cabeca(esc(b.titulo || "Evolução"), sub) + vazioBloco("Ainda sem dados.");
    return `${cabeca(esc(b.titulo || "Evolução"), sub)}<div class="vidro pb-grafico" data-anim-item data-grafico="evolucao" data-meses="${meses.join(",")}" data-pessoas="${pessoas.map((p) => p.id).join(",")}"></div>`;
  },

  categorias(b) {
    const meses = mesesDoPeriodo(b.periodo);
    const por = new Map();
    for (const p of estado.ds.people) {
      const v = MEDIDAS.views.valor(p, meses);
      if (!v || !p.category) continue;
      const c = por.get(p.category) || { c: p.category, v: 0, top: null };
      c.v += v;
      if (!c.top || v > c.top.v) c.top = { p, v };
      por.set(p.category, c);
    }
    const lista = [...por.values()].sort((a, b2) => b2.v - a.v);
    const total = lista.reduce((a, x) => a + x.v, 0) || 1;
    const sub = `Views por tipo de conteúdo, ${rotuloPeriodo(meses)}`;
    if (!lista.length) return cabeca(esc(b.titulo || "Categorias"), sub) + vazioBloco("Ainda sem dados.");
    const mostrar = lista.slice(0, 8);
    return `${cabeca(esc(b.titulo || "Categorias"), sub)}
      <div class="pb-faixa" data-anim-item>${mostrar.map((x, i) => `<i style="width:${((x.v / total) * 100).toFixed(2)}%;--cor:${CORES[i % CORES.length]}" data-w="${((x.v / total) * 100).toFixed(2)}%" title="${esc(x.c)}"></i>`).join("")}</div>
      <div class="pb-cats">${mostrar
        .map(
          (x, i) => `<div class="pb-cat" data-anim-item><i style="--cor:${CORES[i % CORES.length]}"></i><span><b>${esc(x.c)}</b><small>n.º 1: ${esc(x.top.p.name)}</small></span><span class="pb-valor"><b data-n="${(x.v / total) * 100}" data-fmt="texto">${Math.round((x.v / total) * 100)}</b>%</span></div>`,
        )
        .join("")}</div>`;
  },

  numeros(b) {
    const meses = mesesDoPeriodo(b.periodo);
    const r = rankingPeriodo("views", b.periodo);
    const total = r.reduce((a, x) => a + x.v, 0);
    const cresc = rankingPeriodo("crescimento", b.periodo, { n: 1 })[0];
    const milhoes = r.filter((x) => x.v >= 1e6 * meses.length).length;
    const itens = [
      { rot: "Views no total", html: `<b data-n="${total}" data-fmt="curto">${curto(total)}</b>`, sub: `${r.length} Youtubers com dados` },
      r[0] ? { rot: "O n.º 1", html: `<b>${esc(r[0].p.name)}</b>`, sub: `${curto(r[0].v)} views` } : null,
      cresc ? { rot: "Maior subida", html: `<b>${esc(cresc.p.name)}</b>`, sub: MEDIDAS.crescimento.fmt(cresc.v) } : null,
      { rot: meses.length > 1 ? "Com mais de 1 M por mês" : "Com mais de 1 milhão", html: `<b data-n="${milhoes}" data-fmt="inteiro">${milhoes}</b>`, sub: "Youtubers" },
    ].filter(Boolean);
    return `${cabeca(esc(b.titulo || "Em números"), esc(rotuloPeriodo(meses)))}<div class="pb-numeros">${itens.map((x) => `<div class="vidro pb-numero" data-anim-item><span>${esc(x.rot)}</span>${x.html}<small>${esc(x.sub)}</small></div>`).join("")}</div>`;
  },

  subidas(b) {
    const meses = mesesDoPeriodo(b.periodo);
    const ant = periodoAnterior(meses);
    const r = rankingPeriodo("views", b.periodo).filter((x) => x.ant);
    const sub = ant.length ? `Lugares no ranking de views, ${rotuloPeriodo(meses)} face a ${rotuloPeriodo(ant)}` : "";
    if (!r.length) return cabeca(esc(b.titulo || "Quem subiu e quem caiu"), sub) + vazioBloco("Ainda não há um período anterior para comparar.");
    const d = r.map((x) => ({ ...x, d: x.ant - x.pos }));
    const n = b.n || 3;
    const sobe = [...d].sort((a, c) => c.d - a.d).filter((x) => x.d > 0).slice(0, n);
    const desce = [...d].sort((a, c) => a.d - c.d).filter((x) => x.d < 0).slice(0, n);
    const linha = (x, cls) => `<li class="pb-linha" data-anim-item>${quemHtml(x.p, 36, `<small>${x.ant}.º → ${x.pos}.º</small>`)}<span class="pb-delta ${cls}">${cls === "sobe" ? "▲" : "▼"} ${Math.abs(x.d)}</span></li>`;
    return `${cabeca(esc(b.titulo || "Quem subiu e quem caiu"), esc(sub))}<div class="pb-duas">
      <div><h3 class="pb-sub sobe">Subiram</h3><ol class="pb-lista">${sobe.map((x) => linha(x, "sobe")).join("") || `<li class="muted">Ninguém</li>`}</ol></div>
      <div><h3 class="pb-sub desce">Caíram</h3><ol class="pb-lista">${desce.map((x) => linha(x, "desce")).join("") || `<li class="muted">Ninguém</li>`}</ol></div></div>`;
  },

  youtuber(b) {
    const p = estado.pessoas.get(b.pessoas?.[0]) || rankingPeriodo("views", b.periodo, { n: 1 })[0]?.p;
    if (!p) return vazioBloco("Escolhe um Youtuber no painel.");
    const meses = mesesDoPeriodo(b.periodo);
    const v = MEDIDAS.views.valor(p, meses);
    const pos = rankingPeriodo("views", b.periodo).find((x) => x.p.id === p.id)?.pos;
    const ind = indice(p.id).total;
    const ultimos = estado.ds.months.filter((m) => m < estado.ds.currentMonth).slice(-12);
    const href = ligacaoPessoa(p);
    return `${cabeca(esc(b.titulo || "Em destaque"), "")}<div class="vidro pb-destaque" data-anim-item>
      <div class="pb-destaque-topo">${avatar(p, 84)}<div><h3>${esc(p.name)}</h3><small>${esc(p.category || "")}</small></div></div>
      ${b.texto ? `<p class="pb-texto">${esc(b.texto)}</p>` : ""}
      <div class="pb-mini-numeros">
        <div><span>Views, ${esc(rotuloPeriodo(meses))}</span>${v !== null ? `<b data-n="${v}" data-fmt="curto">${curto(v)}</b>` : "<b>–</b>"}</div>
        <div><span>Lugar</span><b>${pos ? pos + ".º" : "–"}</b></div>
        <div><span>Índice</span>${ind !== null ? `<b data-n="${ind}" data-fmt="inteiro">${inteiro(ind)}</b>` : "<b>–</b>"}</div>
      </div>
      <div class="pb-spark">${sparkline(ultimos.map((m) => views(p, m)), { largura: 320, altura: 56 })}</div>
      ${href ? `<a class="btn btn-pequeno" href="${href}">Ver o perfil</a>` : ""}
    </div>`;
  },

  duelo(b) {
    const [a, c] = (b.pessoas || []).map((id) => estado.pessoas.get(id)).filter(Boolean);
    if (!a || !c) return vazioBloco("Escolhe dois Youtubers no painel.");
    const meses = mesesDoPeriodo(b.periodo);
    const linhas = [
      { rot: `Views, ${rotuloPeriodo(meses)}`, va: MEDIDAS.views.valor(a, meses), vb: MEDIDAS.views.valor(c, meses), chave: "views" },
      { rot: "Média por mês", va: MEDIDAS.media.valor(a, meses), vb: MEDIDAS.media.valor(c, meses), chave: "media" },
      { rot: "Subscritores", va: a.totals?.subs ?? null, vb: c.totals?.subs ?? null, chave: "subsTotal" },
      { rot: "Índice", va: indice(a.id).total, vb: indice(c.id).total, chave: "indice" },
    ].filter((l) => l.va !== null || l.vb !== null);
    return `${cabeca(esc(b.titulo || "Frente a frente"), "")}<div class="vidro pb-duelo" data-anim-item>
      <div class="pb-duelo-topo">${quemHtml(a, 64, " ")}<i>VS</i>${quemHtml(c, 64, " ")}</div>
      ${linhas
        .map((l) => {
          const s = (l.va || 0) + (l.vb || 0) || 1;
          const wa = `${(((l.va || 0) / s) * 100).toFixed(1)}%`;
          const fmt = MEDIDAS[l.chave].fmt;
          return `<div class="pb-duelo-linha" data-anim-item><b class="${(l.va || 0) >= (l.vb || 0) ? "ganha" : ""}">${l.va === null ? "–" : fmt(l.va)}</b><span>${esc(l.rot)}</span><b class="${(l.vb || 0) > (l.va || 0) ? "ganha" : ""}">${l.vb === null ? "–" : fmt(l.vb)}</b><div class="pb-duelo-barra"><i style="width:${wa}" data-w="${wa}"></i></div></div>`;
        })
        .join("")}
    </div>`;
  },

  votacao(b) {
    return `${b.titulo ? cabeca(esc(b.titulo), "") : ""}<div class="pb-votacao" data-votacao="${esc(b.votacao || "abertas")}" data-anim-item></div>`;
  },

  videos(b) {
    const pubs = (modo.extra.publicacoes || []).slice(0, b.n || 4);
    if (!pubs.length) return cabeca(esc(b.titulo || "Os últimos vídeos"), "") + vazioBloco("Os primeiros vídeos estão a caminho.");
    return `${cabeca(esc(b.titulo || "Os últimos vídeos"), "", modo.cfg.abas.some((a) => a.id === "videos") ? `<a class="btn btn-pequeno" href="#/videos">Ver todos</a>` : "")}<div class="pub-videos">${pubs.map(cartaoVideo).join("")}</div>`;
  },

  exclusivos(b) {
    const lista = (modo.extra.exclusivos || []).slice(0, b.n || 4);
    if (!lista.length) return "";
    return `${cabeca(esc(b.titulo || "Exclusivos"), "Carrega em play e vê.", modo.cfg.abas.some((a) => a.id === "exclusivos") ? `<a class="btn btn-pequeno" href="#/exclusivos">Ver todos</a>` : "")}<div class="px-grelha">${lista.map(cartaoExclusivo).join("")}</div>`;
  },

  hall(b) {
    return `${cabeca(esc(b.titulo || "Hall da fama"), "Estrelas, coroas e clássicos que ficam para sempre.")}${hallHtml(modo.extra.hall || {})}`;
  },

  texto(b) {
    return `<div class="vidro pb-aviso ${b.estilo === "aviso" ? "forte" : ""}" data-anim-item>
      ${b.titulo ? `<h2>${esc(b.titulo)}</h2>` : ""}${b.texto ? `<p>${esc(b.texto).replace(/\n/g, "<br>")}</p>` : ""}
      ${b.link ? `<a class="btn btn-primario" href="${esc(b.link)}" ${b.link.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${esc(b.rotuloLink || "Abrir")}</a>` : ""}</div>`;
  },
};

/** O HTML de um bloco (com a animação escolhida). */
export function blocoHtml(b) {
  const f = TIPOS[b.tipo];
  if (!f) return "";
  let html = "";
  try {
    html = f(b);
  } catch (e) {
    console.error(e);
    return "";
  }
  if (!html) return "";
  return `<section class="pb pbt-${b.tipo}" data-animacao="${esc(b.animacao || "subir")}" data-bloco="${esc(b.id)}">${html}</section>`;
}

/** Depois de pôr os blocos na página: gráficos e votações. Devolve uma função para limpar. */
export async function montarBlocos(raiz) {
  const limpar = [];
  for (const el of raiz.querySelectorAll('[data-grafico="evolucao"]')) {
    const meses = el.dataset.meses.split(",");
    const pessoas = el.dataset.pessoas.split(",").map((id) => estado.pessoas.get(id)).filter(Boolean);
    limpar.push(
      linhasMensais(
        el,
        pessoas.map((p, i) => ({ nome: p.name, cor: CORES[i % CORES.length], pontos: meses.map((m) => ({ m, v: views(p, m) })) })),
        meses,
        { altura: 260 },
      ),
    );
  }
  const vots = [...raiz.querySelectorAll(".pb-votacao")];
  if (vots.length) {
    const { montarVotacoes } = await import("./votacoes.js");
    for (const el of vots) montarVotacoes(el, { filtro: el.dataset.votacao, compacto: true });
  }
  for (const el of raiz.querySelectorAll(".pbt-exclusivos")) ligarExclusivos(el);
  return () => limpar.forEach((f) => typeof f === "function" && f());
}

export { mesNome };
