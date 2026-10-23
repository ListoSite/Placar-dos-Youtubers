// Quem aparece na página pública e quem tem perfil aberto.
// O mesmo código corre no painel (para mostrar o resultado enquanto se escolhe) e no servidor
// (que só manda para a página pública os Youtubers que passam a regra).

import { calcularIndice, valorMes, comBonusCanais } from "./score.js";

export const MEDIDAS_QUEM = {
  views: "Views do último mês",
  media3: "Média de views dos últimos 3 meses",
  indice: "Índice de Influência",
  subs: "Subscritores",
  total: "Views totais",
};

/** O último mês completo em que pelo menos 30% dos Youtubers têm dados (o mesmo que o site usa). */
export function mesReferencia(ds) {
  const total = ds.people.length || 1;
  const completos = ds.months.filter((m) => m < ds.currentMonth);
  const bom = [...completos].reverse().find((m) => ds.people.filter((p) => p.monthly?.[m] && !p.monthly[m].cur).length / total >= 0.3);
  const ref = bom || completos[completos.length - 1] || ds.currentMonth;
  const i = ds.months.indexOf(ref);
  return { ref, janela: ds.months.slice(Math.max(0, i - 11), i + 1) };
}

/** Contexto para as contas (o servidor calcula o Índice; o painel já o tem calculado). */
export function contextoQuem(ds) {
  const { ref, janela } = mesReferencia(ds);
  const ctx = { janela, pesos: ds.settings?.weights, topo: ds.settings?.alcanceTopo || 1e7 };
  const indices = new Map(ds.people.map((p) => [p.id, comBonusCanais(calcularIndice(p, ctx), p, ds.settings?.bonusCanais)?.total ?? null]));
  return { ref, indices };
}

function viewsMes(p, m) {
  const e = p.monthly?.[m];
  if (!e || e.cur) return null;
  return valorMes(p, m);
}

/** O valor de um Youtuber na medida escolhida (null se não tiver dados). */
export function valorQuem(p, medida, ds, ctx) {
  if (medida === "indice") return ctx.indices.get(p.id) ?? null;
  if (medida === "subs") return p.totals?.subs ?? null;
  if (medida === "total") return p.totals?.views ?? null;
  if (medida === "media3") {
    const i = ds.months.indexOf(ctx.ref);
    const vals = ds.months.slice(Math.max(0, i - 2), i + 1).map((m) => viewsMes(p, m)).filter((v) => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return viewsMes(p, ctx.ref);
}

/** Regra limpa (com os valores por defeito). */
export function regraQuem(q) {
  q = q && typeof q === "object" ? q : {};
  const ids = (l) => (Array.isArray(l) ? l.filter((x) => typeof x === "string" && /^[\w.-]{1,80}$/.test(x)).slice(0, 2000) : []);
  return {
    modo: ["todos", "top", "lista"].includes(q.modo) ? q.modo : "todos",
    medida: Object.keys(MEDIDAS_QUEM).includes(q.medida) ? q.medida : "views",
    n: Math.min(400, Math.max(1, Math.round(Number(q.n)) || 10)),
    categorias: Array.isArray(q.categorias) ? q.categorias.filter((c) => typeof c === "string").map((c) => c.slice(0, 60)).slice(0, 100) : [],
    sempre: ids(q.sempre),
    lista: ids(q.lista),
  };
}

/**
 * Quem aparece e quem tem perfil.
 * dados: { escondidos, quem }   perfis: { ligado, quem: "todos"|"lista", lista }
 * Os escondidos (e os marcados como escondidos em Youtubers) nunca aparecem.
 */
export function quemAparece(ds, dados, perfis, ctx) {
  const q = regraQuem(dados?.quem);
  const fora = new Set(dados?.escondidos || []);
  const base = ds.people.filter((p) => !p.hidden && !fora.has(p.id));
  const catOk = (p) => !q.categorias.length || q.categorias.includes(p.category);
  let lista;
  if (q.modo === "lista") {
    const sel = new Set(q.lista);
    lista = base.filter((p) => sel.has(p.id));
  } else if (q.modo === "top") {
    const top = base
      .filter(catOk)
      .map((p) => ({ p, v: valorQuem(p, q.medida, ds, ctx) }))
      .filter((x) => x.v !== null && Number.isFinite(x.v))
      .sort((a, b) => b.v - a.v)
      .slice(0, q.n)
      .map((x) => x.p);
    const sempre = new Set(q.sempre);
    lista = [...new Set([...top, ...base.filter((p) => sempre.has(p.id))])];
  } else lista = base.filter(catOk);
  const aparece = new Set(lista.map((p) => p.id));
  let perfil = new Set();
  if (perfis?.ligado !== false) {
    if (perfis?.quem === "lista") {
      const sel = new Set(perfis.lista || []);
      perfil = new Set([...aparece].filter((id) => sel.has(id)));
    } else perfil = new Set(aparece);
  }
  return { aparece, perfil, regra: q };
}
