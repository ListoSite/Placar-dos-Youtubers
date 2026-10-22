// Períodos (um mês, um ano, um intervalo, os últimos N meses) e as medidas que se podem somar
// num período. Usado pelos blocos da página pública e pelo ranking.

import { estado, views, indice } from "./data.js";
import { curto, inteiro, mesNome } from "./format.js";

/** Meses completos com dados (o mês a decorrer não entra). */
function mesesCompletos() {
  return estado.ds.months.filter((m) => m < estado.ds.currentMonth);
}

/** Os meses de um período. */
export function mesesDoPeriodo(per = { tipo: "ultimo" }) {
  const todos = mesesCompletos();
  const ref = estado.ref;
  switch (per.tipo) {
    case "mes":
      return todos.includes(per.mes) ? [per.mes] : [ref];
    case "ano": {
      const l = todos.filter((m) => m.startsWith(String(per.ano) + "-"));
      return l.length ? l : [ref];
    }
    case "intervalo": {
      const l = todos.filter((m) => (!per.de || m >= per.de) && (!per.ate || m <= per.ate));
      return l.length ? l : [ref];
    }
    case "ultimos": {
      const i = todos.indexOf(ref);
      return todos.slice(Math.max(0, i - (per.n || 6) + 1), i + 1);
    }
    default:
      return [ref];
  }
}

/** O período equivalente imediatamente antes (para mostrar quem subiu e desceu). */
export function periodoAnterior(meses) {
  const todos = mesesCompletos();
  const i = todos.indexOf(meses[0]);
  if (i <= 0) return [];
  return todos.slice(Math.max(0, i - meses.length), i);
}

export function rotuloPeriodo(meses) {
  if (!meses.length) return "";
  if (meses.length === 1) return mesNome(meses[0]);
  const [a, b] = [meses[0], meses[meses.length - 1]];
  if (a.slice(0, 4) === b.slice(0, 4) && a.endsWith("-01") && b.endsWith("-12")) return a.slice(0, 4);
  if (a.slice(0, 4) === b.slice(0, 4) && meses.length >= 2 && a.endsWith("-01")) return `${a.slice(0, 4)} (até ${mesNome(b, { ano: false })})`;
  return `${mesNome(a, { curto: true })} a ${mesNome(b, { curto: true })}`;
}

const somar = (vals) => (vals.length ? vals.reduce((x, y) => x + y, 0) : null);
const pctSinal = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x))}%`;

/** As medidas da página pública. valor(p, meses) devolve um número ou null. */
export const MEDIDAS = {
  views: {
    nome: "Views",
    frase: (r) => `Views em ${r}`,
    fmt: curto,
    unidade: "views",
    valor: (p, meses) => somar(meses.map((m) => views(p, m)).filter((v) => v !== null)),
    periodo: true,
  },
  media: {
    nome: "Média por mês",
    frase: (r) => `Média de views por mês, ${r}`,
    fmt: curto,
    unidade: "views por mês",
    valor: (p, meses) => {
      const v = meses.map((m) => views(p, m)).filter((x) => x !== null);
      return v.length ? somar(v) / v.length : null;
    },
    periodo: true,
  },
  crescimento: {
    nome: "Crescimento",
    frase: (r) => `Crescimento, ${r}`,
    fmt: pctSinal,
    unidade: "",
    valor: (p, meses) => {
      const fim = views(p, meses[meses.length - 1]);
      const todos = mesesCompletos();
      const ini = meses.length > 1 ? views(p, meses[0]) : views(p, todos[todos.indexOf(meses[0]) - 1] || "");
      if (fim === null || ini === null || ini < 50000) return null;
      return ((fim - ini) / ini) * 100;
    },
    periodo: true,
  },
  subs: {
    nome: "Subscritores ganhos",
    frase: (r) => `Subscritores ganhos, ${r}`,
    fmt: curto,
    unidade: "subscritores",
    valor: (p, meses) => somar(meses.map((m) => p.sb?.s?.[m]).filter((v) => Number.isFinite(v))),
    periodo: true,
  },
  indice: { nome: "Índice de Influência", frase: () => "Índice de Influência", fmt: inteiro, unidade: "pontos", valor: (p) => indice(p.id).total, periodo: false },
  subsTotal: { nome: "Subscritores", frase: () => "Subscritores", fmt: curto, unidade: "subscritores", valor: (p) => p.totals?.subs ?? null, periodo: false },
  viewsTotal: { nome: "Views totais", frase: () => "Views totais", fmt: curto, unidade: "views", valor: (p) => p.totals?.views ?? null, periodo: false },
  tiktok: { nome: "Seguidores no TikTok", frase: () => "Seguidores no TikTok", fmt: curto, unidade: "seguidores", valor: (p) => p.socials?.tiktok?.last?.followers ?? null, periodo: false },
};

/** Ranking de uma medida num período: [{ p, v, pos, ant }] (ant: posição no período anterior). */
export function rankingPeriodo(chave, per, { cat = "", n = Infinity } = {}) {
  const med = MEDIDAS[chave] || MEDIDAS.views;
  const meses = mesesDoPeriodo(per);
  const linha = (ms) =>
    estado.ds.people
      .filter((p) => !cat || p.category === cat)
      .map((p) => ({ p, v: med.valor(p, ms) }))
      .filter((x) => x.v !== null && x.v !== undefined && Number.isFinite(x.v))
      .sort((a, b) => b.v - a.v);
  const lista = linha(meses);
  const ant = med.periodo && chave !== "crescimento" ? periodoAnterior(meses) : [];
  const posAnt = new Map(ant.length ? linha(ant).map((x, i) => [x.p.id, i + 1]) : []);
  return lista.slice(0, n).map((x, i) => ({ ...x, pos: i + 1, ant: ant.length ? posAnt.get(x.p.id) ?? null : undefined }));
}

/** Frase completa da medida no período ("Views em julho 2025", "Índice de Influência"). */
export function nomeMedida(chave, per) {
  const med = MEDIDAS[chave] || MEDIDAS.views;
  return med.frase(rotuloPeriodo(mesesDoPeriodo(per)));
}
