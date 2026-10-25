// "Bocas": comentários com piada que aparecem no Palco nos momentos certos (quem ganha, quem sobe,
// quem cai, quem passa para a frente…), para quem vê comentar. Saem dos números de cada um e das
// bocas escritas no painel (para cada Youtuber e gerais, em Definições).
//
// A escolha não usa a sorte do espetáculo (um hash do momento): um exclusivo repete as mesmas.
// Os dados antigos (exclusivos gravados antes das bocas) não têm settings.bocas e ficam sem elas.

import { estado, views, indice, mesAnterior, seguidoresRede } from "../data.js";
import { esc, curto } from "../format.js";
import { dadosPessoa } from "./historico.js";

export const bocasLigadas = () => Array.isArray(estado.ds?.settings?.bocas);

const RE_NOTICIAS = /not[ií]cia|news|atualidade|drama|coment[aá]rio|fofoca|tabloide/i;

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const escolher = (lista, chave) => (lista.length ? lista[hash(chave) % lista.length] : null);

/** O Youtuber de notícias com mais Índice (para "ainda vais parar às notícias do…"). */
function noticiarista(excluir) {
  return (
    estado.ds.people
      .filter((p) => p.id !== excluir && (RE_NOTICIAS.test(p.category || "") || (p.tags || []).some((t) => RE_NOTICIAS.test(t))))
      .sort((a, b) => (indice(b.id).total ?? -1) - (indice(a.id).total ?? -1))[0] || null
  );
}

/** Troca {nome}, {noticias}, {n}… num texto e põe os nomes em destaque. */
function preencher(t, vars) {
  return esc(t).replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : vars[k].destaque ? `<b>${esc(vars[k].v)}</b>` : esc(String(vars[k]))));
}

// Bocas por momento. {nome}: o Youtuber; {noticias}: o Youtuber de notícias; {n}: lugares.
const MOMENTOS = {
  vencedor: [
    "{nome} ganhou! Alguém avise o {noticias}: isto é notícia de última hora.",
    "E o prémio vai para… {nome}! Discurso de agradecimento em 3, 2, 1.",
    "{nome} em 1.º. Os outros já estão a gravar o vídeo de desabafo.",
    "{nome} ganhou e nem precisou de clickbait.",
  ],
  subida: [
    "{nome} subiu {n} lugares. Anda a comer cereais com Red Bull?",
    "Olha o {nome} a subir! O algoritmo anda apaixonado.",
    "{nome} sobe {n} lugares: o {noticias} já está a escrever a notícia.",
  ],
  queda: [
    "{nome} caiu {n} lugares. As views foram de férias para o Algarve.",
    "Força, {nome}! Até o Cristiano falha penáltis.",
    "{nome} a descer… isto vai dar vídeo de desabafo, não vai?",
  ],
  cartao: [
    "Se isto fosse a Liga, o {nome} já estava na Champions.",
    "{nome}, cá em casa já carregámos no sininho.",
    "Mandem isto ao {nome}. Ele vai gostar… ou não.",
    "O {noticias} que se prepare: o {nome} anda a dar que falar.",
    "Comenta aí: o {nome} merece este lugar ou não?",
  ],
  lider: [
    "{nome} passa para a frente! Mais renhido do que um Benfica–Porto.",
    "Ultrapassagem à Fórmula 1 do {nome}!",
    "{nome} na liderança. Alguém tire print antes que mude.",
  ],
};
// Sem Youtuber de notícias no Placar, estas não aparecem
const PRECISA_NOTICIAS = /\{noticias\}/;

const CATEGORIAS = [
  [/gam|jogo/i, "GG, {nome}!"],
  [/m[uú]sic/i, "Isto merece um refrão, {nome}."],
  [/culin|cozinh|comida/i, "Receita de sucesso, chef {nome}."],
  [/futebol|football|desport/i, "Golo do {nome}! E sem VAR."],
  [/humor|com[eé]dia/i, "Até o algoritmo se riu com o {nome}."],
  [/tec|review/i, "Unboxing de views para o {nome}."],
  [/vlog/i, "Vlog do dia: {nome} a subir no Placar."],
  [/react/i, "Isto vai dar react. Ou react ao react."],
];

/** Bocas que saem dos números de p (vídeos, último vídeo, antiguidade, redes, crescimento). */
function dosNumeros(p, h) {
  const out = [];
  const ref = estado.ref;
  const v = views(p, ref);
  const ant = mesAnterior(ref);
  const va = ant ? views(p, ant) : null;
  if (p.vid?.up30 >= 25) out.push(["{nome} publicou {x} vídeos em 30 dias. Dormes quando?", { x: p.vid.up30 }]);
  if (p.vid?.last) {
    const dias = Math.round((Date.now() - Date.parse(p.vid.last)) / 864e5);
    if (dias >= 60) out.push(["Último vídeo do {nome} há {x} dias… está tudo bem aí?", { x: dias }]);
  }
  if (p.since && new Date(p.since).getFullYear() <= 2011) out.push(["No YouTube desde {x}: o {nome} já é património nacional.", { x: new Date(p.since).getFullYear() }]);
  const ig = seguidoresRede(p, "instagram");
  if (ig && p.totals?.subs && ig > p.totals.subs * 1.3) out.push(["Mais seguidores no Instagram do que no YouTube: influencer de dia, youtuber à noite.", {}]);
  const tt = seguidoresRede(p, "tiktok");
  if (tt && p.totals?.subs && tt > p.totals.subs * 3) out.push(["{nome} tem {x} no TikTok. O YouTube é só o canal secundário?", { x: curto(tt) }]);
  if (v && va && va >= 50000) {
    const r = (v - va) / va;
    if (r >= 0.5) out.push(["+{x}% de views num mês. {nome}, qual é o segredo?", { x: Math.round(r * 100) }]);
    if (r <= -0.4) out.push(["{x}% num mês. As views do {nome} foram dar uma volta.", { x: Math.round(r * 100) }]);
  }
  if (RE_NOTICIAS.test(p.category || "")) out.push(["{nome} no Placar: amanhã já é notícia no próprio canal.", {}]);
  for (const [re, t] of CATEGORIAS) if (re.test(p.category || "")) out.push([t, {}]);
  if (h && dadosPessoa(h, p.id).coroas >= 3) out.push(["{nome} outra vez em 1.º? Já vai em {x} coroas no Palco.", { x: dadosPessoa(h, p.id).coroas }]);
  return out;
}

/**
 * A boca para um momento (ou null). momento: vencedor, subida, queda, lider, revelar.
 * extra.n: lugares que subiu ou desceu. As bocas escritas no painel para o Youtuber vêm primeiro.
 */
export function bocaPara(momento, p, extra = {}) {
  if (!p || !bocasLigadas()) return null;
  const not = noticiarista(p.id);
  const vars = { nome: { v: p.name, destaque: true }, noticias: not ? { v: not.name, destaque: true } : null, n: extra.n ?? "" };
  const chave = `${momento}|${p.id}|${estado.ref}|${extra.n ?? ""}`;
  const servem = (t) => !PRECISA_NOTICIAS.test(t) || not;
  // 1. Do painel: as deste Youtuber e as gerais
  const proprias = (p.bocas || []).filter(servem);
  if (proprias.length && (momento !== "revelar" || hash(chave) % 2 === 0)) return preencher(escolher(proprias, chave), vars);
  // 2. Dos números (sobretudo quando aparece num ranking)
  const numeros = dosNumeros(p, extra.historico).filter(([t]) => servem(t));
  if (momento === "revelar") {
    const gerais = (estado.ds.settings.bocas || []).filter(servem);
    const todas = [...numeros.map(([t, x]) => [t, x]), ...gerais.map((t) => [t, {}])];
    const e = escolher(todas, chave);
    return e ? preencher(e[0], { ...vars, ...e[1] }) : null;
  }
  // 3. Do momento
  const pool = (MOMENTOS[momento] || []).filter(servem);
  if (numeros.length && hash(chave + "n") % 3 === 0) {
    const e = escolher(numeros, chave);
    return preencher(e[0], { ...vars, ...e[1] });
  }
  const t = escolher(pool, chave);
  return t ? preencher(t, vars) : null;
}
