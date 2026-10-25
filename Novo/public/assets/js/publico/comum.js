// Peças comuns da página pública.

import { modo } from "../modo.js";
import { estado } from "../data.js";

/** Ligação para o perfil público (ou null se os perfis estiverem desligados no painel). */
export function ligacaoPessoa(p) {
  if (!p) return null;
  if (modo.publico && (!modo.cfg?.perfis?.ligado || p.semPerfil)) return null;
  return `#/youtuber/${encodeURIComponent(p.id)}`;
}

/** A página de um canal à parte (quando o dono tem perfil aberto). */
export function ligacaoCanal(c) {
  if (!c) return null;
  const dono = estado.pessoas.get(c.personId);
  if (!dono || !ligacaoPessoa(dono)) return null;
  // O canal principal é o perfil do Youtuber
  return dono.channelIds?.[0] === c.id ? ligacaoPessoa(dono) : `#/canal/${encodeURIComponent(c.id)}`;
}

/** A aba está ligada no painel? */
export function abaLigada(id) {
  return Boolean(modo.cfg?.abas?.some((a) => a.id === id));
}

export const ICONES_ABA = {
  casa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>`,
  trofeu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/></svg>`,
  voto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16v8H4z"/><path d="M8 12V5l4-2 4 2v7"/><path d="m9.5 8.5 2 2 3.5-3.5"/></svg>`,
  pessoas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></svg>`,
  duelo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l9 9M20 4l-9 9M6 15l3 3M18 15l-3 3M7.5 16.5 4 20M16.5 16.5 20 20"/></svg>`,
  bolo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.4"/></svg>`,
  serie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 3h8M6 5h12"/></svg>`,
  estrela: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 14.5 8.5 20 9.3 16 13.2 17 19 12 16.3 7 19 8 13.2 4 9.3 9.5 8.5z"/></svg>`,
  ideia: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>`,
  balanca: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/></svg>`,
  mais: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>`,
};

/** Cabeça de um bloco. */
export function cabeca(titulo, sub = "", extra = "") {
  if (!titulo && !sub && !extra) return "";
  return `<div class="pb-cabeca"><div>${titulo ? `<h2>${titulo}</h2>` : ""}${sub ? `<p>${sub}</p>` : ""}</div>${extra}</div>`;
}
