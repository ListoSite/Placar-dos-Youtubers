// Radar do Caso: procura nos vídeos recentes dos Youtubers os que podem dar notícia.
//
// Afinado com vídeos reais de notícias do YouTube português (Sparking, canais de clips, reações…):
//   - quase tudo está no TÍTULO: nomes de outros Youtubers ("X reage à resposta do Y", "O X tem
//     razão", listas de nomes no fim) e verbos de conflito (reage, ataca, critica, indireta, exposto);
//   - as descrições são quase só links, patrocínios e redes: só conta a parte sem links, e pouco;
//   - as etiquetas muitas vezes trazem nomes de outros Youtubers (conta a menção, pouco);
//   - títulos aos gritos (MAIÚSCULAS) e "!?" são sinal de notícia;
//   - os canais de clips e de notícias (que podem não estar no Placar) são onde as notícias saem.
// Sinais nos números (muitas mais views do que o normal, muitos comentários para as views) e,
// nos mais fortes, os comentários mais relevantes (1 unidade da quota cada) também contam.
//
// Dois grupos: os Youtubers escolhidos à mão (mais os canais extra a vigiar), que o radar lê
// sozinho uma vez por dia, e todos os do Placar, só quando se carrega no botão.

import { getJSON, setJSON } from "./storage.mjs";

const CHAVE = "radar";
const MAX = 500;
export const DIAS = 45;

// palavra (sem acentos, minúsculas) → [tema, peso]. No título vale 1,5×; na descrição 0,5×.
export const PALAVRAS = {
  // Polémica e conflito
  polemica: ["stress", 3], polemicas: ["stress", 3], drama: ["stress", 3], resposta: ["stress", 3], respondo: ["stress", 3], responder: ["stress", 2],
  responde: ["stress", 2], "tive que responder": ["stress", 3], reage: ["stress", 2], reagir: ["stress", 1], reacao: ["stress", 1], "tem razao": ["stress", 3],
  indireta: ["stress", 3], indiretas: ["stress", 3], "manda indireta": ["stress", 3], ataca: ["stress", 3], atacam: ["stress", 3], ataque: ["stress", 3],
  critica: ["stress", 2], criticas: ["stress", 2], contra: ["stress", 2], exposto: ["stress", 3], exposta: ["stress", 3], exposed: ["stress", 3], expor: ["stress", 2],
  mentira: ["stress", 2], mentiras: ["stress", 2], acusacao: ["stress", 3], acusou: ["stress", 3], acusa: ["stress", 2], treta: ["stress", 2], beef: ["stress", 3],
  cancelado: ["stress", 3], cancelamento: ["stress", 3], processo: ["stress", 2], tribunal: ["stress", 3], advogado: ["stress", 2], queixa: ["stress", 3],
  queixas: ["stress", 3], arquivadas: ["stress", 2], arquivada: ["stress", 2], denuncia: ["stress", 3], policia: ["stress", 2], burla: ["stress", 3],
  plagio: ["stress", 3], copiou: ["stress", 2], banido: ["stress", 2], desmonetizado: ["stress", 2], strike: ["stress", 2], desculpas: ["stress", 2],
  "peco desculpa": ["stress", 3], esclarecimento: ["stress", 2], "a verdade": ["stress", 2], desabafo: ["stress", 2], "longe demais": ["stress", 3],
  "volta a polemica": ["stress", 3], casinos: ["stress", 2], casino: ["stress", 2], apostas: ["stress", 1], marcas: ["stress", 1], "tem um problema": ["stress", 2],
  // Pausa, fim e regresso
  pausa: ["pausa", 3], "vou parar": ["pausa", 3], despedida: ["pausa", 3], adeus: ["pausa", 2], "ultimo video": ["pausa", 3], "deixar o youtube": ["pausa", 3],
  "acabou o canal": ["pausa", 3], "fim do canal": ["pausa", 3], "carreira acabou": ["pausa", 3], acabou: ["pausa", 1], regresso: ["pausa", 2], voltei: ["pausa", 2], volta: ["pausa", 1],
  // Colab
  colab: ["colab", 3], colaboracao: ["colab", 3], feat: ["colab", 2], ft: ["colab", 2], convidado: ["colab", 1], juntos: ["colab", 1], visita: ["colab", 1],
  // Marcos e conquistas (coisas boas)
  "1 milhao": ["marco", 3], "um milhao": ["marco", 3], "milhao de subscritores": ["marco", 3], "100 mil": ["marco", 2], "500 mil": ["marco", 2], recorde: ["marco", 2],
  "play button": ["marco", 3], "botao de ouro": ["marco", 3], "botao de prata": ["marco", 2], marco: ["marco", 1], conquista: ["marco", 2], inesquecivel: ["marco", 1],
  ganhei: ["boa", 3], ganhou: ["boa", 2], premio: ["boa", 3], "globo de ouro": ["boa", 3], vitoria: ["boa", 2], campeao: ["boa", 2], caridade: ["boa", 3],
  solidario: ["boa", 2], doacao: ["boa", 2], angariacao: ["boa", 3], casamento: ["boa", 2], noivado: ["boa", 2], "vou ser pai": ["boa", 3], "vou ser mae": ["boa", 3],
  // Eventos e estreias
  estreia: ["evento", 2], "ante estreia": ["evento", 3], evento: ["evento", 2], torneio: ["evento", 2], gala: ["evento", 2], festival: ["evento", 2], bilhetes: ["evento", 2],
  // Notícias e curiosidades
  "novo canal": ["noticia", 3], "novo projeto": ["noticia", 2], "novo podcast": ["noticia", 2], anuncio: ["noticia", 2], lancamento: ["noticia", 2], "ex namorada": ["noticia", 3],
  "ex namorado": ["noticia", 3], namorada: ["noticia", 2], namorado: ["noticia", 2], "casa nova": ["noticia", 2], revelo: ["noticia", 2], segredo: ["noticia", 2],
  salvou: ["noticia", 2], "youtube portugues": ["noticia", 2], "youtube tuga": ["noticia", 2], comunidade: ["noticia", 1],
  // Rumores
  rumor: ["rumor", 2], rumores: ["rumor", 2], boatos: ["rumor", 2], "sera que": ["rumor", 1], "dizem que": ["rumor", 1],
};

export const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}@.\s]/gu, " ")
    // Pontos só dentro de nomes (@nome.x); "acabou..." e "demais." ficam sem ponto
    .replace(/\.(?![\p{L}\p{N}])/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const temPalavra = (texto, p) => ` ${texto} `.includes(` ${p} `);
const menciona = (texto, n) => (n.startsWith("@") ? texto.includes(n) : temPalavra(texto, n));

/** Só a parte da descrição que é texto escrito (sem links, emails, redes, patrocínios e hashtags). */
export function descricaoLimpa(desc) {
  return String(desc || "")
    .split(/\n+/)
    .filter((l) => !/https?:\/\/|www\.|@\w|[\w.]+@[\w.]+|#\w|discord|patreon|instagram|twitter|twitch|tiktok|prozis|betano|revolut|c[oó]digo|cup[aã]o|desconto|parceria|business|email|membro do canal|subscreve|editado por|gravado e editado/i.test(l))
    .join(" ")
    .slice(0, 600);
}

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
      // "Clips do X" não é outro nome do X
      if (!/^(clips?|cortes?|o melhor) d/i.test(c.nome || c.title || "")) juntar(c.nome || c.title);
      if (c.handle) nomes.add(norm(c.handle.startsWith("@") ? c.handle : "@" + c.handle));
    }
    if (nomes.size) out.push({ id: p.id, nomes: [...nomes] });
  }
  return out;
}

/**
 * Lê um vídeo e diz se pode dar notícia: { pontos, tema, palavras, pessoas, sinais… }.
 * v: { id, t, desc, tags, v, c }; dono: id do Youtuber do canal (ou null); mediana: views normais do canal.
 */
export function analisarVideo(v, { dono = null, nomes, extra = {}, mediana = 0, comentarios = [] }) {
  const tituloOriginal = String(v.t || "");
  const titulo = norm(tituloOriginal);
  const desc = norm(descricaoLimpa(v.desc));
  const tags = norm((v.tags || []).join(" , "));
  const textoCom = norm(comentarios.join(" "));
  const temas = {};
  const palavras = [];
  let pontos = 0;
  for (const [p, [tema, peso]] of Object.entries({ ...PALAVRAS, ...extra })) {
    const fator = temPalavra(titulo, p) ? 1.5 : temPalavra(desc, p) ? 0.5 : 0;
    if (!fator) continue;
    temas[tema] = (temas[tema] || 0) + peso * fator;
    palavras.push(p);
    pontos += peso * fator;
  }
  // Outros Youtubers mencionados: no título valem muito, nas etiquetas e na descrição pouco
  const pessoas = [];
  const nasEtiquetas = [];
  const nosComentarios = [];
  for (const y of nomes) {
    if (y.id === dono) continue;
    if (y.nomes.some((n) => menciona(titulo, n))) pessoas.push(y.id);
    else if (y.nomes.some((n) => menciona(desc, n) || menciona(tags, n))) nasEtiquetas.push(y.id);
    else if (textoCom && y.nomes.some((n) => menciona(textoCom, n))) nosComentarios.push(y.id);
  }
  pontos += Math.min(4, pessoas.length) * 4 + Math.min(3, nasEtiquetas.length) * 1 + Math.min(2, nosComentarios.length) * 1.5;
  // Conflito com outro Youtuber vale mais; uma menção sem mais nada pode ser colab ou notícia
  if (pessoas.length && temas.stress) pontos += 2;
  if (pessoas.length >= 3) temas.stress = (temas.stress || 0) + 1; // listas de nomes: costuma ser notícia de drama
  if (pessoas.length && !Object.keys(temas).length) temas.noticia = 1;
  // Título aos gritos e "!?"
  const sinais = [];
  const letras = tituloOriginal.replace(/[^\p{L}]/gu, "");
  if (letras.length >= 15 && letras.replace(/[^\p{Lu}]/gu, "").length / letras.length >= 0.6) {
    sinais.push("título em maiúsculas");
    pontos += 1;
  }
  if (/!\?|\?!|!!/.test(tituloOriginal)) {
    sinais.push('título com "!?"');
    pontos += 1.5;
  }
  // Palavras quentes nos comentários
  const quentesCom = textoCom ? ["polemica", "drama", "resposta", "exposed", "exposto", "mentira", "cancelado", "treta", "beef", "indireta", "razao"].filter((p) => temPalavra(textoCom, p)) : [];
  if (quentesCom.length) {
    temas.stress = (temas.stress || 0) + quentesCom.length;
    pontos += Math.min(3, quentesCom.length);
  }
  // Sinais nos números
  if (mediana > 0 && v.v >= mediana * 2.5 && v.v >= 5000) {
    sinais.push(`${Math.round(v.v / mediana)}× mais views do que é normal no canal`);
    pontos += 2;
  }
  if (v.v >= 2000 && v.c / v.v >= 0.02) {
    sinais.push("muitos comentários para as views");
    pontos += 2;
  }
  const tema = Object.entries(temas).sort((a, b) => b[1] - a[1])[0]?.[0] || "noticia";
  return { pontos: Math.round(pontos * 10) / 10, tema, palavras, pessoas, nasEtiquetas, nosComentarios, sinais, quentesCom };
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
  const base = { minimo: 5, palavras: [], comentarios: true, escolhidos: [], extras: [] };
  return { itens: [], ...(r || {}), regras: { ...base, ...(r?.regras || {}) } };
}

/** Os canais de um grupo: "escolhidos" (Youtubers escolhidos + canais extra) ou "todos". */
export function canaisDoGrupo(db, regras, grupo) {
  const pessoas = grupo === "todos" ? Object.values(db.people).filter((p) => !p.hidden) : (regras.escolhidos || []).map((id) => db.people[id]).filter(Boolean);
  const out = [];
  for (const p of pessoas) for (const id of p.channels || []) if (db.channels[id]) out.push({ id, personId: p.id });
  for (const e of regras.extras || []) if (!out.some((c) => c.id === e.id)) out.push({ id: e.id, personId: db.channels[e.id]?.personId || null, titulo: e.title });
  return out;
}

/**
 * Lê os vídeos de um canal para o radar. videos: os últimos (com desc e tags).
 * buscarComentarios(id): textos dos comentários (opcional, só para os que já parecem notícia).
 */
export async function radarCanal(db, radar, canal, videos, { buscarComentarios = null, mediana = 0, maxComentarios = 2 } = {}) {
  const nomes = nomesDosYoutubers(db);
  const extra = palavrasExtra(radar.regras.palavras);
  const limite = Date.now() - DIAS * 864e5;
  const dono = canal.personId || null;
  let novos = 0;
  let pedidos = 0;
  for (const v of videos) {
    if (!v?.id || Date.parse(v.p || 0) < limite) continue;
    const antes = radar.itens.find((x) => x.id === v.id);
    let a = analisarVideo(v, { dono, nomes, extra, mediana });
    if (buscarComentarios && radar.regras.comentarios && !antes?.comLidos && a.pontos >= radar.regras.minimo - 1 && v.c >= 20 && pedidos < maxComentarios) {
      pedidos++;
      const com = await buscarComentarios(v.id).catch(() => []);
      a = { ...(com.length ? analisarVideo(v, { dono, nomes, extra, mediana, comentarios: com }) : a), comLidos: true };
    }
    if (antes) {
      Object.assign(antes, { v: v.v, c: v.c, t: v.t, ...(a.pontos > antes.pontos || a.comLidos ? pick(a) : {}) });
      continue;
    }
    if (a.pontos < radar.regras.minimo) continue;
    radar.itens.push({
      id: v.id,
      ch: canal.id,
      chNome: canal.titulo || db.channels[canal.id]?.title || "",
      personId: dono,
      t: String(v.t || "").slice(0, 200),
      desc: descricaoLimpa(v.desc).slice(0, 400),
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
const pick = (a) => ({ pontos: a.pontos, tema: a.tema, palavras: a.palavras, pessoas: a.pessoas, nasEtiquetas: a.nasEtiquetas, nosComentarios: a.nosComentarios, sinais: a.sinais, quentesCom: a.quentesCom, ...(a.comLidos ? { comLidos: true } : {}) });

export async function guardarRadar(radar) {
  radar.itens.sort((a, b) => (b.p || "").localeCompare(a.p || ""));
  const limite = Date.now() - (DIAS + 30) * 864e5;
  radar.itens = radar.itens.filter((x) => x.estado === "noticia" || Date.parse(x.p || 0) >= limite);
  if (radar.itens.length > MAX) radar.itens = radar.itens.filter((x) => x.estado !== "ignorado").slice(0, MAX);
  await setJSON(CHAVE, radar);
}
