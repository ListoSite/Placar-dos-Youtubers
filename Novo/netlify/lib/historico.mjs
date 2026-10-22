// Histórico do Palco: resultados dos espetáculos gravados em vídeo.
// Daqui saem os confrontos diretos (clássicos e rivais), as estrelas dos torneios,
// as coroas dos rankings, as sequências de vitórias e as vinganças.

import { adicionarLinhas, lerLinhas } from "./storage.mjs";

export const COLECAO = "palco_resultados";
const TIPOS = new Set(["duelo", "titulo", "coroa"]);
const id = (x) => (typeof x === "string" && /^[\w.-]{1,80}$/.test(x) ? x : null);

/** Valida e grava os resultados de um espetáculo. */
export async function guardarResultados(lista, { espetaculo, tema = "", formato = "" } = {}) {
  const sessao = new Date().toISOString();
  const linhas = [];
  for (const r of Array.isArray(lista) ? lista.slice(0, 80) : []) {
    if (!r || !TIPOS.has(r.tipo)) continue;
    const vence = id(r.vence);
    if (!vence) continue;
    const a = id(r.a);
    const b = id(r.b);
    if (r.tipo === "duelo" && (!a || !b || a === b || (vence !== a && vence !== b))) continue;
    linhas.push({
      espetaculo: String(r.espetaculo || espetaculo || "").slice(0, 30),
      tipo: r.tipo,
      a,
      b,
      vencedor: vence,
      dados: {
        sessao,
        tema: String(tema).slice(0, 30),
        formato: String(formato).slice(0, 8),
        ...(r.placar ? { placar: String(r.placar).slice(0, 20) } : {}),
        ...(r.ko ? { ko: true } : {}),
        ...(r.penaltis ? { penaltis: true } : {}),
        ...(r.criterio ? { criterio: String(r.criterio).slice(0, 30) } : {}),
        ...(r.ronda ? { ronda: String(r.ronda).slice(0, 30) } : {}),
        ...(r.metrica ? { metrica: String(r.metrica).slice(0, 30) } : {}),
        ...(Array.isArray(r.participantes) ? { participantes: r.participantes.map(id).filter(Boolean).slice(0, 32) } : {}),
      },
    });
  }
  if (linhas.length) await adicionarLinhas(COLECAO, linhas);
  return linhas.length;
}

const chavePar = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Resumo público: confrontos diretos, estrelas, coroas e sequências. */
export async function resumoHistorico() {
  const linhas = (await lerLinhas(COLECAO)).sort((x, y) => (x.criado || "").localeCompare(y.criado || "") || x.id - y.id);
  const pares = {};
  const pessoas = {};
  const p = (k) => (pessoas[k] ||= { v: 0, d: 0, ko: 0, estrelas: 0, coroas: 0, seq: 0, melhorSeq: 0 });
  for (const l of linhas) {
    const at = l.criado || "";
    if (l.tipo === "duelo") {
      const perde = l.vencedor === l.a ? l.b : l.a;
      const k = chavePar(l.a, l.b);
      const par = (pares[k] ||= { n: 0, v: {}, ultimo: null, seq: { quem: null, n: 0 } });
      par.n++;
      par.v[l.vencedor] = (par.v[l.vencedor] || 0) + 1;
      par.seq = par.seq.quem === l.vencedor ? { quem: l.vencedor, n: par.seq.n + 1 } : { quem: l.vencedor, n: 1 };
      par.ultimo = { vence: l.vencedor, at, esp: l.espetaculo, placar: l.dados?.placar || "" };
      const w = p(l.vencedor);
      w.v++;
      w.seq++;
      w.melhorSeq = Math.max(w.melhorSeq, w.seq);
      if (l.dados?.ko) w.ko++;
      const d = p(perde);
      d.d++;
      d.seq = 0;
    } else if (l.tipo === "titulo") {
      const w = p(l.vencedor);
      w.estrelas++;
      (w.titulos ||= []).push({ at, esp: l.espetaculo });
    } else if (l.tipo === "coroa") {
      p(l.vencedor).coroas++;
    }
  }
  // Clássicos: os pares que mais se defrontaram (pelo menos 3 vezes)
  const classicos = Object.entries(pares)
    .filter(([, x]) => x.n >= 3)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 20)
    .map(([k, x]) => ({ par: k.split("|"), n: x.n, v: x.v }));
  return { at: new Date().toISOString(), total: linhas.length, pares, pessoas, classicos };
}
