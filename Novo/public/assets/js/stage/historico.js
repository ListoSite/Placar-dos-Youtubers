// Histórico do Palco no browser: confrontos diretos, clássicos, estrelas e coroas.
// Os resultados só contam quando o espetáculo é gravado em vídeo (e com sessão iniciada).

import { api, pessoa } from "../data.js";
import { esc } from "../format.js";

let cache = null;
let quando = 0;

export async function carregarHistorico({ forcar = false } = {}) {
  if (cache && !forcar && Date.now() - quando < 60000) return cache;
  try {
    cache = await api("palco/historico");
    quando = Date.now();
  } catch {
    cache ||= { pares: {}, pessoas: {}, classicos: [] };
  }
  return cache;
}
export function historicoEmCache() {
  return cache || { pares: {}, pessoas: {}, classicos: [] };
}

const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Confronto direto entre a e b (antes deste espetáculo). */
export function confronto(h, a, b) {
  const par = h?.pares?.[chave(a, b)];
  if (!par) return { n: 0, va: 0, vb: 0, classico: false, seq: null, ultimo: null };
  return { n: par.n, va: par.v[a] || 0, vb: par.v[b] || 0, classico: par.n + 1 >= 3, seq: par.seq, ultimo: par.ultimo };
}

export function dadosPessoa(h, id) {
  return h?.pessoas?.[id] || { v: 0, d: 0, ko: 0, estrelas: 0, coroas: 0, seq: 0, melhorSeq: 0 };
}

/** Linha para mostrar antes de um duelo. */
export function linhaConfronto(h, a, b) {
  const c = confronto(h, a.id, b.id);
  if (!c.n) return `<span class="hi-primeiro">Primeiro confronto entre os dois</span>`;
  const quem = c.va === c.vb ? "Empatados" : `${c.va > c.vb ? a.name : b.name} na frente`;
  return `${c.classico ? `<span class="hi-classico">⚡ Clássico</span>` : ""}<span>${c.n + 1}.º confronto · <b>${c.va}–${c.vb}</b> · ${esc(quem)}</span>`;
}

/** Depois de um duelo: vingança, sequência ou primeira vitória (texto ou ""). */
export function momentoDoDuelo(h, vence, perde) {
  const c = confronto(h, vence.id, perde.id);
  if (c.ultimo && c.ultimo.vence === perde.id && c.seq?.quem === perde.id && c.seq.n >= 2) return `Vingança! Acaba com ${c.seq.n} derrotas seguidas`;
  if (c.ultimo && c.ultimo.vence === perde.id) return "Vingança!";
  if (c.seq?.quem === vence.id && c.seq.n >= 1) return `${c.seq.n + 1} vitórias seguidas contra ${perde.name}`;
  if (c.n && c.va === 0) return `Primeira vitória contra ${perde.name}`;
  return "";
}

/** Estrelas de alguém, para pôr ao lado do nome. */
export function estrelasHtml(h, id, max = 5) {
  const n = dadosPessoa(h, id).estrelas;
  if (!n) return "";
  return `<span class="hi-estrelas" title="${n} ${n === 1 ? "torneio ganho" : "torneios ganhos"}">${n > max ? `★×${n}` : "★".repeat(n)}</span>`;
}

/** Lista dos maiores rivais de alguém. */
export function rivaisDe(h, id, n = 5) {
  return Object.entries(h?.pares || {})
    .filter(([k]) => k.split("|").includes(id))
    .map(([k, x]) => {
      const outro = k.split("|").find((y) => y !== id);
      return { outro, p: pessoa(outro), n: x.n, eu: x.v[id] || 0, ele: x.v[outro] || 0 };
    })
    .filter((x) => x.p)
    .sort((a, b) => b.n - a.n || b.eu - a.eu)
    .slice(0, n);
}
