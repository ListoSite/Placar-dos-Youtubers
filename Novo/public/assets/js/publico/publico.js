// Página pública do Placar dos Youtubers: votações, os vídeos publicados e o hall da fama.
// Não tem nenhuma ligação para o painel (que é só para quem gere o site).

import { api } from "../data.js";
import { esc, ha } from "../format.js";
import { $, avatar, toast } from "../ui.js";
import { lerRegressoDoLogin } from "../conta.js";
import { montarVotacoes } from "./votacoes.js";

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
};

const urlRede = {
  youtube: (h) => `https://www.youtube.com/${h.startsWith("@") ? h : "@" + h}`,
  tiktok: (h) => `https://www.tiktok.com/${h.startsWith("@") ? h : "@" + h}`,
  instagram: (h) => `https://www.instagram.com/${h.replace(/^@/, "")}`,
};
const ICONE_REDE = {
  youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="#ff0033"/><path d="M10 9v6l5-3z" fill="#fff"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3-3.46V8.1A6.5 6.5 0 1 0 17 14.5V8.6a6.6 6.6 0 0 0 4 1.4V7a4 4 0 0 1-4-4z" fill="currentColor"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>`,
};

let pessoas = {};
const quem = (id, nome) => (id && pessoas[id] ? { id, ...pessoas[id] } : { id: id || nome, name: nome || "?", photo: "" });

function redes(canal) {
  return ["youtube", "tiktok", "instagram"]
    .filter((r) => canal[r])
    .map((r) => `<a class="pub-rede" href="${esc(urlRede[r](canal[r].trim()))}" target="_blank" rel="noopener" title="${esc(canal[r])}">${ICONE_REDE[r]}<span>${esc(canal[r])}</span></a>`)
    .join("");
}

/** O resultado de um vídeo, em pequeno. */
function resultado(r) {
  const linhas = r.linhas || [];
  if (r.tipo === "duelo" && linhas.length === 2) {
    const [a, b] = linhas;
    const ganha = r.vencedor?.id;
    return `<div class="pv-duelo">
      <div class="${ganha === a.id ? "ganha" : ""}">${avatar(quem(a.id, a.nome), 64)}<b>${esc(a.nome)}</b></div>
      <strong>${esc(r.placar || `${a.valor}–${b.valor}`)}</strong>
      <div class="${ganha === b.id ? "ganha" : ""}">${avatar(quem(b.id, b.nome), 64)}<b>${esc(b.nome)}</b></div></div>
      ${r.nota ? `<p class="pv-nota">${esc(r.nota)}</p>` : ""}`;
  }
  if ((r.tipo === "torneio" || r.tipo === "historia") && r.vencedor) {
    return `<div class="pv-campeao">${avatar(quem(r.vencedor.id, r.vencedor.nome), 72)}<div><small>${r.tipo === "torneio" ? "★ Campeão" : "Em destaque"}</small><b>${esc(r.vencedor.nome)}</b>${r.nota ? `<span>${esc(r.nota)}</span>` : ""}</div></div>`;
  }
  if (linhas.length) {
    const mostrar = linhas.slice(0, r.tipo === "jogo" ? 8 : 5);
    if (r.tipo === "jogo" && mostrar.every((l) => l.id))
      return `<div class="pv-caras">${mostrar.map((l) => avatar(quem(l.id, l.nome), 44)).join("")}</div>${r.nota ? `<p class="pv-nota">${esc(r.nota)}</p>` : ""}`;
    return `${r.medida ? `<p class="pv-medida">${esc(r.medida)}</p>` : ""}<ol class="pv-top">${mostrar
      .map((l, i) => `<li>${l.id ? avatar(quem(l.id, l.nome), 32) : `<span class="pv-n">${i + 1}</span>`}<span>${esc(l.nome)}</span><b>${esc(l.valor || "")}</b></li>`)
      .join("")}</ol>`;
  }
  if (r.vencedor) return `<div class="pv-campeao">${avatar(quem(r.vencedor.id, r.vencedor.nome), 64)}<div><b>${esc(r.vencedor.nome)}</b></div></div>`;
  return r.nota ? `<p class="pv-nota">${esc(r.nota)}</p>` : "";
}

function cartaoVideo(p) {
  const e = ESPETACULOS[p.espetaculo] || { nome: p.espetaculo, icone: "🎬" };
  return `<article class="vidro pv">
    <div class="pv-topo"><span class="pv-tipo">${e.icone} ${esc(e.nome)}</span><small>${esc(ha(p.criado))}</small></div>
    <h3>${esc(p.titulo || e.nome)}</h3>
    <div class="pv-res">${resultado(p.resumo || {})}</div>
    ${p.link ? `<a class="btn btn-primario pv-ver" href="${esc(p.link)}" target="_blank" rel="noopener">▶ Ver o vídeo</a>` : `<span class="pv-breve">Vídeo em breve</span>`}
  </article>`;
}

function hall(h) {
  const linha = (x, valor) => `<div class="hall-linha">${avatar(quem(x.id), 34)}<span>${esc(quem(x.id).name)}</span><b>${valor}</b></div>`;
  const caixas = [
    h.estrelas?.length ? `<div class="vidro hall-caixa"><h3>★ Estrelas</h3><p class="muted hall-explica">Um torneio ganho, uma estrela para sempre.</p>${h.estrelas.map((x) => linha(x, `<span class="estrelas">${x.n > 5 ? `★×${x.n}` : "★".repeat(x.n)}</span>`)).join("")}</div>` : "",
    h.coroas?.length ? `<div class="vidro hall-caixa"><h3>👑 Coroas</h3><p class="muted hall-explica">Vezes em 1.º lugar nos rankings e votações.</p>${h.coroas.map((x) => linha(x, x.n)).join("")}</div>` : "",
    h.vitorias?.length ? `<div class="vidro hall-caixa"><h3>⚔️ Duelos</h3><p class="muted hall-explica">Vitórias e derrotas nas batalhas e torneios.</p>${h.vitorias.map((x) => linha(x, `${x.v}–${x.d}`)).join("")}</div>` : "",
    h.classicos?.length
      ? `<div class="vidro hall-caixa"><h3>⚡ Clássicos</h3><p class="muted hall-explica">Os confrontos que mais se repetem.</p>${h.classicos
          .map((c) => {
            const [a, b] = c.par.map((id) => quem(id));
            return `<div class="hall-linha">${avatar(a, 30)}${avatar(b, 30)}<span>${esc(a.name)} vs ${esc(b.name)}</span><b>${c.v[a.id] || 0}–${c.v[b.id] || 0}</b></div>`;
          })
          .join("")}</div>`
      : "",
  ].filter(Boolean);
  return caixas.length ? `<div class="hall">${caixas.join("")}</div>` : `<div class="vidro pub-vazio"><p class="muted">O hall da fama enche-se com os resultados dos vídeos. Em breve!</p></div>`;
}

async function iniciar() {
  const regresso = lerRegressoDoLogin();
  if (regresso?.erro) setTimeout(() => toast(`Não foi possível entrar: ${regresso.erro}`, { erro: true, tempo: 6000 }), 600);
  const main = $("#conteudo");
  let dados;
  let vot;
  try {
    [dados, vot] = await Promise.all([api("publico"), api("votacoes").catch(() => ({ ligado: false, votacoes: [] }))]);
  } catch (e) {
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Placar dos Youtubers</h1><p>Não foi possível carregar a página. <button class="btn btn-pequeno" onclick="location.reload()">Tentar de novo</button></p></div>`;
    return;
  }
  pessoas = { ...(dados.pessoas || {}), ...(vot.pessoas || {}) };
  const canal = dados.canal || {};
  $("#pub-redes").innerHTML = redes(canal);
  $("#pub-rodape-redes").innerHTML = redes(canal);
  const abertas = (vot.votacoes || []).filter((v) => v.aberta).length;
  const pubs = dados.publicacoes || [];
  main.innerHTML = `
    <section class="pub-heroi" id="inicio"><div class="wrap">
      <span class="pub-etiqueta">Os Youtubers portugueses, em números</span>
      <h1 class="placar">Placar<br><span>dos Youtubers</span></h1>
      <p class="pub-sub">Rankings, batalhas, torneios e clássicos entre os maiores Youtubers de Portugal. Aqui votas, vês os resultados de cada vídeo e quem já entrou para a história.</p>
      <div class="pub-acoes">
        ${abertas ? `<a class="btn btn-ouro" href="#votacoes">🗳️ ${abertas === 1 ? "Há 1 votação aberta" : `Há ${abertas} votações abertas`}</a>` : `<a class="btn btn-ouro" href="#videos">Ver os últimos vídeos</a>`}
        ${canal.youtube ? `<a class="btn" href="${esc(urlRede.youtube(canal.youtube))}" target="_blank" rel="noopener">Subscrever no YouTube</a>` : ""}
      </div>
    </div></section>

    <section class="secao wrap" id="votacoes">
      <div class="secao-cabeca"><div><h2>Votar</h2><p>O público também conta: os resultados entram nos vídeos do canal.</p></div></div>
      <div id="pub-votacoes"></div>
    </section>

    <section class="secao wrap" id="videos">
      <div class="secao-cabeca"><div><h2>Os últimos vídeos</h2><p>O resultado de cada vídeo do Placar: quem ganhou, quem ficou no topo e quem caiu.</p></div></div>
      ${pubs.length ? `<div class="pub-videos">${pubs.map(cartaoVideo).join("")}</div>` : `<div class="vidro pub-vazio"><p class="muted">Os primeiros vídeos estão a caminho.</p></div>`}
    </section>

    <section class="secao wrap" id="hall">
      <div class="secao-cabeca"><div><h2>Hall da fama</h2><p>Estrelas, coroas e clássicos que ficam para sempre.</p></div></div>
      ${hall(dados.hall || {})}
    </section>`;
  montarVotacoes($("#pub-votacoes"), { dados: vot, pessoas });
  if (location.hash && location.hash.length > 1) document.querySelector(location.hash)?.scrollIntoView();
}

iniciar();
