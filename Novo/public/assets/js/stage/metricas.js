// Medidas usadas pelos espetáculos (rankings, duelos e jogos).

import { estado, views, indice, mediaMeses, mesAnterior } from "../data.js";
import { curto, inteiro, mesNome } from "../format.js";

const pctSinal = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x))}%`;

export const METRICAS = {
  views: { nome: (m) => `Views em ${mesNome(m)}`, curtoNome: "Views do mês", fmt: curto, unidade: "views", valor: (p, m) => views(p, m) },
  indice: { nome: () => "Índice de Influência", curtoNome: "Índice", fmt: inteiro, unidade: "pontos", valor: (p) => indice(p.id).total },
  subsMes: { nome: (m) => `Subscritores ganhos em ${mesNome(m)}`, curtoNome: "Subscritores ganhos", fmt: curto, unidade: "subscritores", valor: (p, m) => p.sb?.s?.[m] ?? null },
  crescimento: {
    nome: (m) => `Crescimento em ${mesNome(m)}`,
    curtoNome: "Crescimento",
    fmt: pctSinal,
    unidade: "face ao mês anterior",
    valor: (p, m) => {
      const a = views(p, m);
      const ant = mesAnterior(m);
      const b = ant ? views(p, ant) : null;
      if (a === null || b === null || b < 50000) return null;
      return ((a - b) / b) * 100;
    },
  },
  subs: { nome: () => "Subscritores", curtoNome: "Subscritores", fmt: curto, unidade: "subscritores", valor: (p) => p.totals?.subs ?? null },
  total: { nome: () => "Views totais", curtoNome: "Views totais", fmt: curto, unidade: "views", valor: (p) => p.totals?.views ?? null },
  media3: { nome: () => "Média de 3 meses", curtoNome: "Média de 3 meses", fmt: curto, unidade: "views por mês", valor: (p, m) => mediaMeses(p, m, 3) },
  videos30: { nome: () => "Vídeos em 30 dias", curtoNome: "Vídeos em 30 dias", fmt: inteiro, unidade: "vídeos", valor: (p) => p.vid?.up30 ?? null },
  porVideo: { nome: () => "Views por vídeo", curtoNome: "Views por vídeo", fmt: curto, unidade: "views por vídeo", valor: (p) => p.vid?.med ?? null },
  tiktok: { nome: () => "Seguidores no TikTok", curtoNome: "Seguidores no TikTok", fmt: curto, unidade: "seguidores no TikTok", valor: (p) => p.socials?.tiktok?.last?.followers ?? null },
  tiktokMes: { nome: (m) => `Seguidores ganhos no TikTok em ${mesNome(m)}`, curtoNome: "Seguidores ganhos no TikTok", fmt: curto, unidade: "seguidores no TikTok", valor: (p, m) => p.tt?.f?.[m] ?? null },
  anos: { nome: () => "Anos no YouTube", curtoNome: "Anos no YouTube", fmt: inteiro, unidade: "anos", valor: (p) => (p.since ? new Date().getFullYear() - new Date(p.since).getFullYear() : null) },
};

/** Lista ordenada por uma medida: [{ p, v, pos, ant }]. */
export function rankingPor(chave, m, { cat = "", n = Infinity } = {}) {
  const met = METRICAS[chave] || METRICAS.views;
  const ant = mesAnterior(m);
  const linha = (mes) =>
    estado.ds.people
      .filter((p) => !cat || p.category === cat)
      .map((p) => ({ p, v: met.valor(p, mes) }))
      .filter((x) => x.v !== null && x.v !== undefined && Number.isFinite(x.v))
      .sort((a, b) => b.v - a.v);
  const lista = linha(m);
  const temAnterior = ["views", "subsMes", "tiktokMes"].includes(chave) && ant;
  const posAnt = new Map(temAnterior ? linha(ant).map((x, i) => [x.p.id, i + 1]) : []);
  return lista.slice(0, n).map((x, i) => ({ ...x, pos: i + 1, ant: temAnterior ? posAnt.get(x.p.id) ?? null : undefined }));
}

/** Os melhores pelo Índice (para jogos e duelos). */
export function melhores(n, { cat = "" } = {}) {
  return estado.ds.people
    .filter((p) => (!cat || p.category === cat) && indice(p.id).total !== null)
    .sort((a, b) => indice(b.id).total - indice(a.id).total)
    .slice(0, n);
}
