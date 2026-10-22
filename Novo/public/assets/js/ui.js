// Pequenas peças de interface partilhadas.

import { esc, curto, inteiro } from "./format.js";
import { estado } from "./data.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Cor estável a partir de um texto (para avatares sem foto). */
const CORES = ["#e0294f", "#b3123b", "#c98500", "#d9925a", "#9085e9", "#199e70", "#d55181", "#8f0d2c"];
export function corDe(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

export function iniciais(nome) {
  const p = String(nome || "?").replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function avatar(p, tam = 40) {
  const nome = esc(p?.name || "");
  if (p?.photo) {
    return `<span class="avatar" style="--tam:${tam}px"><img src="${esc(p.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="var s=this.parentNode;s.style.background='${corDe(p.name)}';s.textContent='${esc(iniciais(p.name))}'"></span>`;
  }
  return `<span class="avatar" style="--tam:${tam}px;background:${corDe(p?.name)}" role="img" aria-label="${nome}">${esc(iniciais(p?.name))}</span>`;
}

const SETA_CIMA = `<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1 9.5 8h-9z" fill="currentColor"/></svg>`;
const SETA_BAIXO = `<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 9 .5 2h9z" fill="currentColor"/></svg>`;

/** Movimento no ranking face ao mês anterior. */
export function movimento(pos, ant) {
  if (ant === null || ant === undefined) return `<span class="mov novo" title="Sem posição no mês anterior">novo</span>`;
  const d = ant - pos;
  if (d > 0) return `<span class="mov sobe" title="Subiu ${d} ${d === 1 ? "lugar" : "lugares"}">${SETA_CIMA}${d}</span>`;
  if (d < 0) return `<span class="mov desce" title="Desceu ${-d} ${d === -1 ? "lugar" : "lugares"}">${SETA_BAIXO}${-d}</span>`;
  return `<span class="mov igual" title="Mesma posição">=</span>`;
}

export function variacao(atual, antes) {
  if (atual === null || antes === null || antes === undefined || !antes) return "";
  const r = atual / antes - 1;
  const cls = r > 0.005 ? "sobe" : r < -0.005 ? "desce" : "";
  const sinal = r > 0 ? "+" : "";
  return `<span class="delta ${cls}">${sinal}${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(r * 100)}%</span>`;
}

export function linkPessoa(p) {
  return `#/youtuber/${encodeURIComponent(p.id)}`;
}

export function etiquetaCategoria(cat) {
  if (!cat) return "";
  return `<a class="etiqueta" href="#/ranking?cat=${encodeURIComponent(cat)}">${esc(cat)}</a>`;
}

/** Mini gráfico de linha em SVG (sem eixos). */
export function sparkline(valores, { largura = 110, altura = 28, destaque = true } = {}) {
  const pts = valores.map((v, i) => [i, v]).filter(([, v]) => v !== null && v !== undefined);
  if (pts.length < 2) return `<svg width="${largura}" height="${altura}" aria-hidden="true"></svg>`;
  const max = Math.max(...pts.map(([, v]) => v)) || 1;
  const n = valores.length - 1 || 1;
  const x = (i) => 3 + (i / n) * (largura - 6);
  const y = (v) => altura - 3 - (v / max) * (altura - 6);
  let d = "";
  let ultimoI = -2;
  for (const [i, v] of pts) {
    d += (i === ultimoI + 1 ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
    ultimoI = i;
  }
  const [li, lv] = pts[pts.length - 1];
  return `<svg width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" aria-hidden="true">
    <path d="${d}" fill="none" stroke="#c48a99" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    ${destaque ? `<circle cx="${x(li)}" cy="${y(lv)}" r="3" fill="#e0294f" stroke="#12060b" stroke-width="1.5"/>` : ""}
  </svg>`;
}

// ---------- Dica (tooltip) ----------
const dicaEl = () => document.getElementById("dica");
export function mostrarDica(html, ev) {
  const d = dicaEl();
  d.innerHTML = html;
  d.classList.add("visivel");
  moverDica(ev);
}
export function moverDica(ev) {
  const d = dicaEl();
  const r = d.getBoundingClientRect();
  let x = ev.clientX + 14;
  let y = ev.clientY + 14;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
  d.style.left = Math.max(8, x) + "px";
  d.style.top = Math.max(8, y) + "px";
}
export function esconderDica() {
  dicaEl().classList.remove("visivel");
}

// ---------- Avisos ----------
export function toast(msg, { erro = false, tempo = 3200 } = {}) {
  const t = document.createElement("div");
  t.className = "toast" + (erro ? " erro" : "");
  t.textContent = msg;
  document.getElementById("toasts").appendChild(t);
  setTimeout(() => t.remove(), tempo);
}

// ---------- Janela (modal) ----------
export function janela(html, { larga = false, aoAbrir } = {}) {
  const fundo = document.createElement("div");
  fundo.className = "janela-fundo";
  fundo.innerHTML = `<div class="janela${larga ? " larga" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  const anterior = document.activeElement;
  const fechar = () => {
    fundo.remove();
    document.removeEventListener("keydown", tecla);
    anterior?.focus?.();
  };
  const tecla = (e) => {
    if (e.key === "Escape") fechar();
  };
  fundo.addEventListener("mousedown", (e) => {
    if (e.target === fundo) fechar();
  });
  document.addEventListener("keydown", tecla);
  document.body.appendChild(fundo);
  const j = fundo.querySelector(".janela");
  $$("[data-fechar]", j).forEach((b) => b.addEventListener("click", fechar));
  (j.querySelector("[autofocus]") || j.querySelector("input,select,textarea,button"))?.focus();
  aoAbrir?.(j, fechar);
  return { el: j, fechar };
}

export function confirmar(texto, { sim = "Confirmar", perigo = false } = {}) {
  return new Promise((resolve) => {
    let resposta = false;
    const { el, fechar } = janela(`<h2>${esc(texto)}</h2><div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn ${perigo ? "btn-perigo" : "btn-primario"}" data-sim>${esc(sim)}</button></div>`);
    el.querySelector("[data-sim]").addEventListener("click", () => {
      resposta = true;
      fechar();
    });
    const obs = new MutationObserver(() => {
      if (!document.body.contains(el)) {
        obs.disconnect();
        resolve(resposta);
      }
    });
    obs.observe(document.body, { childList: true });
  });
}

/** Contador que "rola" até ao valor (efeito de placar). */
export function contar(el, ate, { duracao = 1100, formato = curto, atraso = 0 } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !Number.isFinite(ate)) {
    el.textContent = formato(ate);
    return;
  }
  const inicio = performance.now() + atraso;
  const passo = (t) => {
    const k = Math.min(1, Math.max(0, (t - inicio) / duracao));
    const e = 1 - Math.pow(1 - k, 4);
    el.textContent = formato(ate * e);
    if (k < 1) requestAnimationFrame(passo);
  };
  el.textContent = formato(0);
  requestAnimationFrame(passo);
}

export function vazio(titulo, texto, acao = "") {
  return `<div class="vazio"><h3>${esc(titulo)}</h3><p>${texto}</p>${acao}</div>`;
}

export function fonteDados(src) {
  return { youtube: "YouTube", socialblade: "Social Blade", folha: "Folha antiga", manual: "Manual", misto: "Várias fontes" }[src] || src || "";
}

export const ICONES = {
  youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-4.8.5-4.8s0-3.2-.5-4.8zM9.7 15.1V8.9l5.8 3.1z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z"/></svg>`,
  twitch: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.3 2 3 5.4v13.4h4.6V21h2.6l2.4-2.2h3.7L21 14V2zm15 11.2-2.8 2.8H12l-2.4 2.3V16H5.8V3.7h13.5zM16.5 7.1v4.9h-1.7V7.1zm-4.7 0v4.9h-1.7V7.1z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.3 4.7H5.5z"/></svg>`,
  kick: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 3h6v4h2V5h2V3h8v6h-2v2h-2v2h2v2h2v6h-8v-2h-2v-2H9v4H3z"/></svg>`,
  site: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,
};

export const REDES = [
  { id: "instagram", nome: "Instagram", seguidores: "seguidores", campos: ["followers", "posts", "likes"] },
  { id: "tiktok", nome: "TikTok", seguidores: "seguidores", campos: ["followers", "likes", "videos"] },
  { id: "twitch", nome: "Twitch", seguidores: "seguidores", campos: ["followers"] },
  { id: "x", nome: "X", seguidores: "seguidores", campos: ["followers"] },
  { id: "kick", nome: "Kick", seguidores: "seguidores", campos: ["followers"] },
  { id: "site", nome: "Site", seguidores: "", campos: [] },
];

export function numeroOuTraco(n) {
  return n === null || n === undefined ? "–" : inteiro(n);
}

export function dataAtualizacao() {
  const m = estado.ds?.meta;
  return m?.lastDaily || estado.ds?.generatedAt;
}
