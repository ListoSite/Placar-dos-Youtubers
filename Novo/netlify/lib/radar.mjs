// Radar do Caso: procura nos vídeos recentes dos Youtubers os que podem dar notícia.
//
// Cada vídeo novo (título, descrição e etiquetas) é lido à procura de:
//   - outros Youtubers do Placar mencionados (nome, nome verdadeiro, nome do canal ou @handle);
//   - palavras que costumam dar notícia (resposta, polémica, colab, pausa, 1 milhão, evento…),
//     cada uma ligada a um tema das notícias (Polémica, Colab, Marco, Pausa…);
//   - sinais nos números: muitas mais views do que é normal no canal, ou muitos comentários
//     para as views (as polémicas enchem os comentários).
// Os mais fortes também têm os comentários mais relevantes lidos (1 unidade da quota cada).
// No painel (O Caso, Radar), cada um pode virar notícia com um clique, ou ser ignorado.

import { getJSON, setJSON } from "./storage.mjs";

const CHAVE = "radar";
const MAX = 400;

// palavra (sem acentos, minúsculas) → [tema, peso]
export const PALAVRAS = {
  // Polémica
  polemica: ["stress", 3], drama: ["stress", 3], resposta: ["stress", 3], respondo: ["stress", 3], responder: ["stress", 2], "a verdade": ["stress", 2],
  desabafo: ["stress", 2], exposed: ["stress", 3], expor: ["stress", 2], mentira: ["stress", 2], mentiras: ["stress", 2], acusacao: ["stress", 3],
  acusou: ["stress", 3], acusa: ["stress", 2], treta: ["stress", 2], beef: ["stress", 3], indireta: ["stress", 2], indiretas: ["stress", 2],
  cancelado: ["stress", 3], cancelamento: ["stress", 3], processo: ["stress", 2], tribunal: ["stress", 3], advogado: ["stress", 2],
  plagio: ["stress", 3], copiou: ["stress", 2], banido: ["stress", 2], desmonetizado: ["stress", 2], strike: ["stress", 2],
  desculpas: ["stress", 2], "peco desculpa": ["stress", 3], "fui enganado": ["stress", 3], burla: ["stress", 3], esclarecimento: ["stress", 2],
  // Pausa / despedida / regresso
  pausa: ["pausa", 3], "vou parar": ["pausa", 3], despedida: ["pausa", 3], adeus: ["pausa", 2], "ultimo video": ["pausa", 3],
  "deixar o youtube": ["pausa", 3], "acabou o canal": ["pausa", 3], "fim do canal": ["pausa", 3], regresso: ["pausa", 2], voltei: ["pausa", 2],
  // Colab
  colab: ["colab", 3], colaboracao: ["colab", 3], parceria: ["colab", 2], feat: ["colab", 2], "ft.": ["colab", 2], convidado: ["colab", 1], juntos: ["colab", 1],
  // Marcos
  "1 milhao": ["marco", 3], "um milhao": ["marco", 3], "milhao de subscritores": ["marco", 3], "100 mil": ["marco", 2], "500 mil": ["marco", 2],
  recorde: ["marco", 2], "play button": ["marco", 3], "botao de ouro": ["marco", 3], "botao de prata": ["marco", 2], aniversario: ["marco", 1],
  // Eventos
  evento: ["evento", 2], torneio: ["evento", 2], gala: ["evento", 2], festival: ["evento", 2], bilhetes: ["evento", 2], tour: ["evento", 1], "live especial": ["evento", 2],
  // Coisas boas
  caridade: ["boa", 3], solidario: ["boa", 2], doacao: ["boa", 2], angariacao: ["boa", 3], "ajudar quem": ["boa", 2],
  // Notícias e novidades
  "novo canal": ["noticia", 3], "novo projeto": ["noticia", 2], anuncio: ["noticia", 2], novidade: ["noticia", 1], lancamento: ["noticia", 2],
  "a minha marca": ["noticia", 2], livro: ["noticia", 1], casamento: ["noticia", 2], "vou ser pai": ["noticia", 3], "vou ser mae": ["noticia", 3], gravidez: ["noticia", 2],
  // Rumores
  rumor: ["rumor", 2], rumores: ["rumor", 2], boatos: ["rumor", 2], "sera que": ["rumor", 1], "dizem que": ["rumor", 1],
};

export const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}@.\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const temPalavra = (texto, p) => (` ${texto} `).includes(` ${p} `);

/** Os nomes por que cada Youtuber pode ser mencionado (só nomes com pelo menos 4 letras). */
export function nomesDosYoutubers(db) {
  const out = [];
  for (const p of Object.values(db.people)) {
    if (p.hidden) continue;
    const nomes = new Set();
    const juntar = (x) => {
      const n = norm(x);
      if (n.replace(/[^a-z0-9]/g, "").length >= 4) nomes.add(n);
    };
    juntar(p.name);
    if (p.realName && p.realName.trim().split(/\s+/).length >= 2) juntar(p.realName);
    for (const id of p.channels || []) {
      const c = db.channels[id];
      if (!c) continue;
      juntar(c.nome || c.title);
      if (c.handle) nomes.add(norm(c.handle.startsWith("@") ? c.handle : "@" + c.handle));
    }
    if (nomes.size) out.push({ id: p.id, nomes: [...nomes] });
  }
  return out;
}

/**
 * Lê um vídeo e diz se pode dar notícia: { pontos, tema, palavras, pessoas, sinais }.
 * v: { id, t, desc, tags, v, c, ch }; dono: id do Youtuber do canal; mediana: views normais do canal.
 */
export function analisarVideo(v, { dono, nomes, extra = {}, mediana = 0, comentarios = [] }) {
  const titulo = norm(v.t);
  const texto = norm([v.t, v.desc, ...(v.tags || [])].join(" "));
  const textoCom = norm(comentarios.join(" "));
  const temas = {};
  const palavras = [];
  let pontos = 0;
  for (const [p, [tema, peso]] of Object.entries({ ...PALAVRAS, ...extra })) {
    const noTitulo = temPalavra(titulo, p);
    if (!noTitulo && !temPalavra(texto, p)) continue;
    const w = peso * (noTitulo ? 1.5 : 1);
    temas[tema] = (temas[tema] || 0) + w;
    palavras.push(p);
    pontos += w;
  }
  // Outros Youtubers mencionados
  const pessoas = [];
  const nosComentarios = [];
  for (const y of nomes) {
    if (y.id === dono) continue;
    if (y.nomes.some((n) => (n.startsWith("@") ? texto.includes(n) : temPalavra(texto, n)))) pessoas.push(y.id);
    else if (textoCom && y.nomes.some((n) => (n.startsWith("@") ? textoCom.includes(n) : temPalavra(textoCom, n)))) nosComentarios.push(y.id);
  }
  pontos += Math.min(3, pessoas.length) * 3 + Math.min(2, nosComentarios.length) * 1.5;
  // Polémica com outro Youtuber vale mais; uma menção sem palavras de polémica é quase sempre colab
  if (pessoas.length && temas.stress) pontos += 2;
  if (pessoas.length && !Object.keys(temas).length) temas.colab = 1;
  // Palavras de polémica nos comentários
  const quentesCom = textoCom ? ["polemica", "drama", "resposta", "exposed", "mentira", "cancelado", "treta", "beef", "indireta"].filter((p) => temPalavra(textoCom, p)) : [];
  if (quentesCom.length) {
    temas.stress = (temas.stress || 0) + quentesCom.length;
    pontos += Math.min(3, quentesCom.length);
  }
  // Sinais nos números
  const sinais = [];
  if (mediana > 0 && v.v >= mediana * 2.5 && v.v >= 5000) {
    sinais.push(`${Math.round(v.v / mediana)}× mais views do que é normal no canal`);
    pontos += 2;
  }
  if (v.v >= 2000 && v.c / v.v >= 0.02) {
    sinais.push("muitos comentários para as views");
    pontos += 2;
  }
  const tema = Object.entries(temas).sort((a, b) => b[1] - a[1])[0]?.[0] || "noticia";
  return { pontos: Math.round(pontos * 10) / 10, tema, palavras, pessoas, nosComentarios, sinais, quentesCom };
}

/** Palavras extra escritas no painel: "palavra" ou "palavra=tema" (uma por linha). */
export function palavrasExtra(linhas) {
  const out = {};
  for (const l of linhas || []) {
    const [p, t] = String(l).split("=").map((x) => x.trim());
    const n = norm(p);
    if (n.length >= 3) out[n] = [["stress", "pausa", "colab", "marco", "evento", "boa", "noticia", "rumor"].includes(t) ? t : "noticia", 2];
  }
  return out;
}

export async function lerRadar() {
  const r = await getJSON(CHAVE, null);
  return { itens: [], regras: { minimo: 4, palavras: [], comentarios: true }, ...(r || {}) };
}

/**
 * Junta os vídeos de um canal ao radar. videos: os últimos (com desc e tags quando vieram da API).
 * buscarComentarios(id): devolve textos dos comentários (opcional, só para os mais fortes).
 */
export async function radarCanal(db, radar, channelId, videos, { buscarComentarios = null, mediana = 0, maxComentarios = 3 } = {}) {
  const link = db.channels[channelId];
  if (!link) return 0;
  const nomes = nomesDosYoutubers(db);
  const extra = palavrasExtra(radar.regras.palavras);
  const limite = Date.now() - 45 * 864e5;
  let novos = 0;
  let pedidos = 0;
  for (const v of videos) {
    if (!v?.id || Date.parse(v.p || 0) < limite) continue;
    const antes = radar.itens.find((x) => x.id === v.id);
    let a = analisarVideo(v, { dono: link.personId, nomes, extra, mediana });
    // Os comentários: só para os que já parecem notícia e ainda não foram lidos
    if (buscarComentarios && radar.regras.comentarios && !antes?.comLidos && a.pontos >= radar.regras.minimo - 1 && v.c >= 20 && pedidos < maxComentarios) {
      pedidos++;
      const com = await buscarComentarios(v.id).catch(() => []);
      if (com.length) a = { ...analisarVideo(v, { dono: link.personId, nomes, extra, mediana, comentarios: com }), comLidos: true };
      else a.comLidos = true;
    }
    if (antes) {
      Object.assign(antes, { v: v.v, c: v.c, t: v.t, ...(a.pontos > antes.pontos || a.comLidos ? pick(a) : {}) });
      continue;
    }
    if (a.pontos < radar.regras.minimo) continue;
    radar.itens.push({
      id: v.id,
      ch: channelId,
      personId: link.personId,
      t: String(v.t || "").slice(0, 200),
      desc: String(v.desc || "").slice(0, 500),
      p: v.p,
      v: v.v,
      c: v.c,
      th: v.th || "",
      s: Boolean(v.s),
      ...pick(a),
      estado: "novo",
      encontrado: new Date().toISOString(),
    });
    novos++;
  }
  return novos;
}
const pick = (a) => ({ pontos: a.pontos, tema: a.tema, palavras: a.palavras, pessoas: a.pessoas, nosComentarios: a.nosComentarios, sinais: a.sinais, quentesCom: a.quentesCom, ...(a.comLidos ? { comLidos: true } : {}) });

export async function guardarRadar(radar) {
  // Os ignorados há mais de 30 dias e os mais fracos saem primeiro
  radar.itens.sort((a, b) => (b.p || "").localeCompare(a.p || ""));
  if (radar.itens.length > MAX) radar.itens = radar.itens.filter((x) => x.estado !== "ignorado").slice(0, MAX);
  await setJSON(CHAVE, radar);
}
