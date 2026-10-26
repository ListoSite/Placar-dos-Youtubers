// Os vídeos publicados (o resultado de cada vídeo do Palco) e o hall da fama.

import { esc, ha } from "../format.js";
import { avatar } from "../ui.js";
import { estado } from "../data.js";
import { modo } from "../modo.js";
import { ligacaoPessoa } from "./comum.js";

const ESPETACULOS = {
  revelacao: { nome: "Revelação do top", icone: "🏆" },
  corrida: { nome: "Corrida das views", icone: "🏁" },
  tier: { nome: "Tier list", icone: "🔥" },
  altos: { nome: "Altos e baixos", icone: "📈" },
  barras: { nome: "Gráfico de barras", icone: "📊" },
  categorias: { nome: "O bolo das categorias", icone: "🍩" },
  bolhas: { nome: "Bolhas", icone: "🫧" },
  linhas: { nome: "Linha a linha", icone: "📈" },
  numeros: { nome: "O mês em números", icone: "🔢" },
  votacao: { nome: "O público escolheu", icone: "🗳️" },
  desafio: { nome: "Desafio do Placar", icone: "🧠" },
  quiz: { nome: "Quem fez mais?", icone: "❓" },
  maismenos: { nome: "Mais ou menos", icone: "↕️" },
  adivinha: { nome: "Adivinha quem é", icone: "👀" },
  roda: { nome: "Roda da sorte", icone: "🎡" },
  batalha: { nome: "Batalha", icone: "⚔️" },
  torneio: { nome: "Torneio", icone: "🏆" },
  cartao: { nome: "Cartão de Youtuber", icone: "🪪" },
  historia: { nome: "A história de…", icone: "📖" },
  curiosidades: { nome: "Curiosidades", icone: "🎲" },
};

/** Uma pessoa pelo id (do dataset público ou da lista que veio com os vídeos). */
export function quem(id, nome) {
  const p = estado.pessoas.get(id);
  if (p) return p;
  const x = modo.extra?.pessoas?.[id];
  return x ? { id, ...x } : { id: id || nome, name: nome || "?", photo: "" };
}

const comLink = (id, html) => {
  const href = id && estado.pessoas.get(id) ? ligacaoPessoa(estado.pessoas.get(id)) : null;
  return href ? `<a href="${href}" class="pv-ligacao">${html}</a>` : html;
};

function resultado(r) {
  const linhas = r.linhas || [];
  if (r.tipo === "duelo" && linhas.length === 2) {
    const [a, b] = linhas;
    const ganha = r.vencedor?.id;
    return `<div class="pv-duelo">
      ${comLink(a.id, `<div class="${ganha === a.id ? "ganha" : ""}">${avatar(quem(a.id, a.nome), 56)}<b>${esc(a.nome)}</b></div>`)}
      <strong>${esc(r.placar || `${a.valor}–${b.valor}`)}</strong>
      ${comLink(b.id, `<div class="${ganha === b.id ? "ganha" : ""}">${avatar(quem(b.id, b.nome), 56)}<b>${esc(b.nome)}</b></div>`)}</div>
      ${r.nota ? `<p class="pv-nota">${esc(r.nota)}</p>` : ""}`;
  }
  if ((r.tipo === "torneio" || r.tipo === "historia") && r.vencedor) {
    return comLink(r.vencedor.id, `<div class="pv-campeao">${avatar(quem(r.vencedor.id, r.vencedor.nome), 64)}<div><small>${r.tipo === "torneio" ? "★ Campeão" : "Em destaque"}</small><b>${esc(r.vencedor.nome)}</b>${r.nota ? `<span>${esc(r.nota)}</span>` : ""}</div></div>`);
  }
  if (linhas.length) {
    const mostrar = linhas.slice(0, r.tipo === "jogo" ? 8 : 5);
    if (r.tipo === "jogo" && mostrar.every((l) => l.id)) return `<div class="pv-caras">${mostrar.map((l) => avatar(quem(l.id, l.nome), 40)).join("")}</div>${r.nota ? `<p class="pv-nota">${esc(r.nota)}</p>` : ""}`;
    return `${r.medida ? `<p class="pv-medida">${esc(r.medida)}</p>` : ""}<ol class="pv-top">${mostrar
      .map((l, i) => `<li>${l.id ? avatar(quem(l.id, l.nome), 30) : `<span class="pv-n">${i + 1}</span>`}<span>${esc(l.nome)}</span><b>${esc(l.valor || "")}</b></li>`)
      .join("")}</ol>`;
  }
  if (r.vencedor) return `<div class="pv-campeao">${avatar(quem(r.vencedor.id, r.vencedor.nome), 56)}<div><b>${esc(r.vencedor.nome)}</b></div></div>`;
  return r.nota ? `<p class="pv-nota">${esc(r.nota)}</p>` : "";
}

export function cartaoVideo(p) {
  const e = ESPETACULOS[p.espetaculo] || { nome: p.espetaculo, icone: "🎬" };
  return `<article class="vidro pv" data-anim-item>
    <div class="pv-topo"><span class="pv-tipo">${e.icone} ${esc(e.nome)}</span><small>${esc(ha(p.criado))}</small></div>
    <h3>${esc(p.titulo || e.nome)}</h3>
    <div class="pv-res">${resultado(p.resumo || {})}</div>
    ${p.link ? `<a class="btn btn-primario pv-ver" href="${esc(p.link)}" target="_blank" rel="noopener">▶ Ver o vídeo</a>` : `<span class="pv-breve">Vídeo em breve</span>`}
  </article>`;
}

export function hallHtml(h) {
  const linha = (x, valor) => comLink(x.id, `<div class="hall-linha">${avatar(quem(x.id), 34)}<span>${esc(quem(x.id).name)}</span><b>${valor}</b></div>`);
  const caixas = [
    h.estrelas?.length ? `<div class="vidro hall-caixa" data-anim-item><h3>★ Estrelas</h3><p class="muted hall-explica">Um torneio ganho, uma estrela para sempre.</p>${h.estrelas.map((x) => linha(x, `<span class="estrelas">${x.n > 5 ? `★×${x.n}` : "★".repeat(x.n)}</span>`)).join("")}</div>` : "",
    h.coroas?.length ? `<div class="vidro hall-caixa" data-anim-item><h3>👑 Coroas</h3><p class="muted hall-explica">Vezes em 1.º lugar nos rankings e votações.</p>${h.coroas.map((x) => linha(x, x.n)).join("")}</div>` : "",
    h.vitorias?.length ? `<div class="vidro hall-caixa" data-anim-item><h3>⚔️ Duelos</h3><p class="muted hall-explica">Vitórias e derrotas nas batalhas e torneios.</p>${h.vitorias.map((x) => linha(x, `${x.v}–${x.d}`)).join("")}</div>` : "",
    h.classicos?.length
      ? `<div class="vidro hall-caixa" data-anim-item><h3>⚡ Clássicos</h3><p class="muted hall-explica">Os confrontos que mais se repetem.</p>${h.classicos
          .map((c) => {
            const [a, b] = c.par.map((id) => quem(id));
            return `<div class="hall-linha">${avatar(a, 30)}${avatar(b, 30)}<span>${esc(a.name)} vs ${esc(b.name)}</span><b>${c.v[a.id] || 0}–${c.v[b.id] || 0}</b></div>`;
          })
          .join("")}</div>`
      : "",
  ].filter(Boolean);
  return caixas.length ? `<div class="hall">${caixas.join("")}</div>` : `<div class="vidro pub-vazio"><p class="muted">O hall da fama enche-se com os resultados dos vídeos. Em breve!</p></div>`;
}

export async function render(main) {
  main.dataset.titulo = "Vídeos";
  const cfg = modo.cfg.videos;
  const pubs = modo.extra.publicacoes || [];
  main.innerHTML = `<div class="wrap pub-pagina">
    ${
      cfg.publicacoes
        ? `<section class="pub-secao"><div class="pub-cabeca"><h1>Os últimos vídeos</h1><p>O resultado de cada vídeo do Placar: quem ganhou, quem ficou no topo e quem caiu.</p></div>
      ${pubs.length ? `<div class="pub-videos">${pubs.map(cartaoVideo).join("")}</div>` : `<div class="vidro pub-vazio"><p class="muted">Os primeiros vídeos estão a caminho.</p></div>`}</section>`
        : ""
    }
    ${cfg.hall ? `<section class="pub-secao"><div class="pub-cabeca"><h2>Hall da fama</h2><p>Estrelas, coroas e clássicos que ficam para sempre.</p></div>${hallHtml(modo.extra.hall || {})}</section>` : ""}
  </div>`;
}
