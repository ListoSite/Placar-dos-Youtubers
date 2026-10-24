// Carrega o dataset da API e faz as contas usadas por todas as páginas.

import { calcularIndice, pontuacaoClassica, valorMes, comBonusCanais } from "./score.js";
import { norm } from "./format.js";

export const estado = {
  ds: null,
  pessoas: new Map(),
  canais: new Map(),
  projetos: new Map(),
  ref: null,
  janela: [],
  indices: new Map(),
  posIndice: new Map(),
  classica: new Map(),
  cobertura: [],
};

// ---------- API ----------
const CHAVE_TOKEN = "placar-token";

export function token() {
  try {
    return localStorage.getItem(CHAVE_TOKEN) || "";
  } catch {
    return "";
  }
}
export function guardarToken(t) {
  try {
    if (t) localStorage.setItem(CHAVE_TOKEN, t);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* sem armazenamento: o login dura só esta sessão */
  }
  sessao.token = t || "";
}
const sessao = { token: token() };
export function temSessao() {
  return Boolean(sessao.token);
}

export async function api(caminho, { metodo, corpo } = {}) {
  const res = await fetch("/api/" + caminho, {
    method: metodo || (corpo ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(sessao.token ? { authorization: "Bearer " + sessao.token } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let dados = {};
  try {
    dados = await res.json();
  } catch {
    /* resposta vazia */
  }
  if (res.status === 401 && caminho !== "login") guardarToken("");
  if (!res.ok) {
    const e = new Error(dados.error || `Erro ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return dados;
}

// ---------- Carregar ----------
export async function carregar({ forcar = false } = {}) {
  if (estado.ds && !forcar) return estado;
  const ds = await api("dataset" + (forcar ? "?t=" + Date.now() : ""));
  preparar(ds);
  return estado;
}

/** Usa um dataset já carregado (a página pública recebe-o junto com a configuração). */
export function usarDataset(ds) {
  preparar(ds);
  return estado;
}

function preparar(ds) {
  estado.ds = ds;
  estado.pessoas = new Map(ds.people.map((p) => [p.id, p]));
  estado.canais = new Map(ds.channels.map((c) => [c.id, c]));
  estado.projetos = new Map(ds.projects.map((p) => [p.id, p]));

  // Cobertura: quantas pessoas têm dados em cada mês
  const total = ds.people.length || 1;
  estado.cobertura = ds.months.map((m) => ({
    m,
    n: ds.people.filter((p) => p.monthly[m] && !p.monthly[m].cur).length,
    est: ds.people.filter((p) => p.monthly[m]?.src === "estimativa").length,
    parcial: ds.people.some((p) => p.monthly[m]?.cur),
  }));
  // Mês de referência: o último mês completo em que pelo menos 30% das pessoas têm dados
  const completos = estado.cobertura.filter((c) => c.m < ds.currentMonth);
  const bom = [...completos].reverse().find((c) => c.n / total >= 0.3);
  estado.ref = bom?.m || completos[completos.length - 1]?.m || ds.currentMonth;
  const iRef = ds.months.indexOf(estado.ref);
  estado.janela = ds.months.slice(Math.max(0, iRef - 11), iRef + 1);

  const ctx = { janela: estado.janela, pesos: ds.settings.weights, topo: ds.settings.alcanceTopo || 1e7 };
  estado.indices = new Map(ds.people.map((p) => [p.id, comBonusCanais(calcularIndice(p, ctx), p, ds.settings.bonusCanais)]));
  // O Caso: o karma fica à parte. Calcula-se sempre o "Índice + karma"; só substitui o Índice
  // se o dono o ligou no painel (O Caso, "Juntar ao Índice").
  estado.karma = new Map(Object.entries(ds.karma?.pessoas || {}));
  estado.karmaPeso = (ds.karma?.peso ?? 10) / 100;
  estado.indicesKarma = new Map(ds.people.map((p) => [p.id, comKarma(estado.indices.get(p.id), estado.karma.get(p.id))]));
  estado.karmaNoIndice = Boolean(ds.karma?.noIndice);
  if (estado.karmaNoIndice) {
    for (const p of ds.people) {
      const i = estado.indices.get(p.id);
      const k = estado.indicesKarma.get(p.id);
      if (i.total !== null) estado.indices.set(p.id, { ...i, semKarma: i.total, total: k.total, karma: k.karma });
    }
  }
  estado.classica = new Map(ds.people.map((p) => [p.id, pontuacaoClassica(p, estado.janela)]));
  const ordem = ds.people
    .filter((p) => estado.indices.get(p.id).total !== null)
    .sort((a, b) => estado.indices.get(b.id).total - estado.indices.get(a.id).total);
  estado.posIndice = new Map(ordem.map((p, i) => [p.id, i + 1]));
}

/** O Índice mexido pelo karma: até ±peso (10% por defeito), conforme o fator do karma (-1 a 1). */
function comKarma(i, k) {
  if (!i || i.total === null) return { total: null, karma: k || null };
  if (!k) return { total: i.total, karma: null };
  return { total: Math.max(0, Math.min(1000, Math.round(i.total * (1 + estado.karmaPeso * k.k)))), karma: k };
}

// ---------- Contas ----------
export function pessoa(id) {
  return estado.pessoas.get(id);
}
export function indice(id) {
  return estado.indices.get(id) || { total: null, partes: {} };
}
/** O Índice com o karma do Caso (mesmo que o karma não esteja ligado no Índice do site). */
export function indiceKarma(id) {
  return estado.indicesKarma?.get(id) || { total: null, karma: null };
}
/** O karma de um Youtuber no Caso: { k (-1 a 1), n (votos) } ou null. */
export function karmaDe(id) {
  return estado.karma?.get(id) || null;
}

/** Valor de views de um mês. Com projecao=true, o mês atual usa a projeção. */
export function views(p, m, { projecao = false } = {}) {
  const e = p.monthly?.[m];
  if (!e) return null;
  if (e.cur) return projecao ? e.est ?? null : null;
  return valorMes(p, m);
}

export function mediaMeses(p, fim, n = 3) {
  const ds = estado.ds;
  const i = ds.months.indexOf(fim);
  const vals = ds.months.slice(Math.max(0, i - n + 1), i + 1).map((m) => views(p, m)).filter((v) => v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function mesAnterior(m) {
  const ms = estado.ds.months;
  const i = ms.indexOf(m);
  return i > 0 ? ms[i - 1] : null;
}

/** Ranking de um mês por views (com posição e movimento face ao mês anterior). */
export function rankingMes(m, { categoria = "", projecao = false } = {}) {
  const lista = [];
  for (const p of estado.ds.people) {
    if (categoria && p.category !== categoria) continue;
    const v = views(p, m, { projecao });
    if (v === null) continue;
    lista.push({ p, v });
  }
  lista.sort((a, b) => b.v - a.v);
  const ant = mesAnterior(m);
  const posAnt = new Map();
  if (ant) {
    const l2 = [];
    for (const p of estado.ds.people) {
      if (categoria && p.category !== categoria) continue;
      const v = views(p, ant);
      if (v !== null) l2.push({ id: p.id, v });
    }
    l2.sort((a, b) => b.v - a.v);
    l2.forEach((x, i) => posAnt.set(x.id, i + 1));
  }
  return lista.map((x, i) => ({ ...x, pos: i + 1, ant: posAnt.get(x.p.id) ?? null, vAnt: ant ? views(x.p, ant) : null }));
}

export function serieMensal(p, { ate = estado.ds.currentMonth } = {}) {
  return estado.ds.months.filter((m) => m <= ate).map((m) => ({ m, ...(p.monthly[m] || {}), tem: Boolean(p.monthly[m]) }));
}

export function projetosDe(id) {
  return estado.ds.projects.filter((pr) => pr.personId === id || pr.guests.includes(id));
}

export function canaisDe(p) {
  return p.channelIds.map((id) => estado.canais.get(id)).filter(Boolean);
}

export function procurar(q, limite = 12) {
  const t = norm(q);
  if (!t) return [];
  const out = [];
  for (const p of estado.ds.people) {
    const n = norm(p.name);
    const extra = norm(p.realName) + " " + canaisDe(p).map((c) => norm(c.title) + " " + norm(c.handle)).join(" ");
    let s = -1;
    if (n === t) s = 100;
    else if (n.startsWith(t)) s = 80;
    else if (n.includes(t)) s = 60;
    else if (extra.includes(t)) s = 40;
    if (s >= 0) out.push({ p, s: s + Math.min(19, (indice(p.id).total || 0) / 60) });
  }
  return out.sort((a, b) => b.s - a.s).slice(0, limite).map((x) => x.p);
}

/** O Índice de um canal visto à parte (pages/channel.js): só com os números dele, sem bónus. */
export function indiceCanal(c) {
  return calcularIndice(c, { janela: estado.janela, pesos: estado.ds.settings.weights, topo: estado.ds.settings.alcanceTopo || 1e7 });
}

/**
 * Onde ficaria um canal visto à parte entre os Youtubers (sem contar o dono, que já o inclui):
 * pelas views de um mês, ou pelo Índice (quem = "indice", valor = o Índice do canal).
 */
export function posicaoCanal(c, quem, valor) {
  const outros = estado.ds.people.filter((p) => p.id !== c.dono);
  if (quem === "indice") return valor === null || valor === undefined ? null : 1 + outros.filter((p) => (indice(p.id).total ?? -1) > valor).length;
  const v = views(c, quem);
  return v === null ? null : 1 + outros.filter((p) => (views(p, quem) ?? -1) > v).length;
}

/** Melhor mês, melhor posição e meses no top 10 de uma pessoa (ou de um canal, com posDe). */
export function recordes(p, posDe = null) {
  let melhor = null;
  let melhorPos = null;
  let top10 = 0;
  let top50 = 0;
  for (const m of estado.ds.months) {
    if (m >= estado.ds.currentMonth) continue;
    const v = views(p, m);
    if (v !== null && (!melhor || v > melhor.v)) melhor = { m, v };
  }
  const minimo = Math.max(20, cobertura(estado.ref) * 0.5);
  for (const c of estado.cobertura) {
    if (c.m >= estado.ds.currentMonth || c.n < minimo) continue;
    let x;
    let de;
    if (posDe) {
      const pos = posDe(c.m);
      x = pos ? { pos } : null;
      de = c.n;
    } else {
      const r = rankingMes(c.m);
      x = r.find((y) => y.p.id === p.id);
      de = r.length;
    }
    if (!x) continue;
    if (!melhorPos || x.pos < melhorPos.pos) melhorPos = { m: c.m, pos: x.pos, de };
    if (x.pos <= 10) top10++;
    if (x.pos <= 50) top50++;
  }
  return { melhor, melhorPos, top10, top50 };
}

export function estimados(m) {
  return estado.cobertura.find((c) => c.m === m)?.est || 0;
}

export function eEstimativa(p, m) {
  return p.monthly?.[m]?.src === "estimativa";
}

export function cobertura(m) {
  return estado.cobertura.find((c) => c.m === m)?.n || 0;
}

/** Meses que aparecem nas escolhas (com dados suficientes para um ranking). */
export function mesesComDados(min = 5) {
  return estado.cobertura.filter((c) => c.n >= min || (c.m === estado.ds.currentMonth && c.parcial)).map((c) => c.m);
}
