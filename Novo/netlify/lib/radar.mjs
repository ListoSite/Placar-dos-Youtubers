// Radar do Caso: procura nos vídeos recentes dos Youtubers os que podem dar notícia.
//
// Afinado com vídeos reais de notícias do YouTube português (Sparking, canais de clips, reações…):
//   - quase tudo está no TÍTULO: nomes de outros Youtubers ("X reage à resposta do Y", "O X tem
//     razão", listas de nomes no fim) e verbos de conflito (reage, ataca, critica, indireta, exposto);
//   - as descrições são quase só links, patrocínios e redes: só conta a parte sem links, e pouco;
//   - as etiquetas muitas vezes trazem nomes de outros Youtubers (conta a menção, pouco);
//   - títulos aos gritos (MAIÚSCULAS) e "!?" são sinal de notícia;
//   - os canais de clips e de notícias (que podem não estar no Placar) são onde as notícias saem.
// Também contam:
//   - a velocidade (views para a idade do vídeo, comparadas com o normal do canal), os vídeos que
//     "explodem" (passam dos 10 mil num canal onde o normal é muito menos), os regressos depois de
//     muito tempo parado e os vídeos nas tendências de Portugal;
//   - nos mais fortes, os comentários mais relevantes (1 unidade da quota cada);
//   - os casos a crescer: assuntos de que vários canais começaram a falar nos últimos dias (só os
//     que envolvem Youtubers do Placar sobem; os assuntos gerais podem ser mundiais e não contam);
//   - o que o radar aprendeu contigo (útil, notícia, remover), até 5 pontos para cima ou para baixo.
//
// O radar lê todos os Youtubers duas vezes por dia pelo feed RSS de cada canal (não gasta quota).
// Os escolhidos à mão vão primeiro, com os comentários lidos primeiro.

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
  // Quando se fala dos Youtubers portugueses (sobretudo em canais de fora)
  "youtubers portugueses": ["noticia", 3], "youtuber portugues": ["noticia", 3], "youtubers tugas": ["noticia", 3], "youtuber tuga": ["noticia", 3],
  "portuguese youtuber": ["noticia", 3], "portuguese youtubers": ["noticia", 3], "youtubers de portugal": ["noticia", 3],
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


// ---------- Assuntos de cada vídeo (para juntar os vídeos do mesmo caso) ----------

// Palavras que não são assunto (português, inglês e coisas de todos os vídeos)
const STOP = new Set(
  `a o as os um uma uns umas de do da dos das no na nos nas ao aos em por pelo pela pelos pelas para pra pro com sem sob sobre entre ate desde
  e ou mas nem que se nao sim ja so mais menos muito muita muitos muitas pouco tao tambem ainda ate agora hoje ontem amanha sempre nunca depois antes
  eu tu ele ela nos vos eles elas voce voces me te lhe nos vos meu minha meus minhas teu tua seu sua seus suas nosso nossa dele dela deles delas
  isto isso aquilo este esta estes estas esse essa esses essas aquele aquela aqui ali la cada todo toda todos todas tudo nada algo alguem ninguem outro outra outros outras
  ser sou es somos sao era foi fui fomos foram sera estar estou esta estamos estao estava ter tenho tens tem temos tinha teve tive ha haver
  fazer faco fiz fez fizemos fazem feito ir vou vai vamos vao fui ver vi viu vejo dar dei deu dizer disse diz falar falei falou fala saber sei
  querer quero quer poder posso pode podem dever devo deve acho achas sabes olha olhem vem vens fica ficou ficar tentei tentar comprei comprar
  como quando onde quem qual quais quanto quanta porque porque porquê pq oque coisa coisas vez vezes dia dias semana semanas mes meses ano anos hora horas minutos
  melhor melhores pior piores maior maiores menor primeiro primeira ultimo ultima novo nova novos novas velho grande grandes pequeno bom boa bons boas mau ma
  real verdade final fim parte part ep episodio temporada serie capitulo especial completo oficial version versao ao vivo direto live stream streams
  video videos vlog vlogs short shorts canal canais youtube youtuber youtubers subscritores subs inscritos views clip clips cortes momentos melhores momentos
  jogo jogos jogar jogando joguei gameplay game games play playing desafio desafios challenge react reagi reagindo reacting teste testei top lista ranking
  portugal portugues portuguesa portugueses tuga tugas pt br brasil
  the a an of to in on for with and or but is are was were be been it its this that these those my your his her our their me you he she we they
  what why how who when where which not no yes all any some more most best new old first last day days time vs ft feat official full episode
  i im ive dont cant got get getting made make making goes go going went watch watching try trying tried
  destruiu destroi destruir perdeu perdi perder comprou mostrou mostro mostra mostrar disse falou chorou chorei morreu voltou saiu sai entrou entrei conheci conheceu
  tentou gastei gastou encontrei encontrou descobri descobriu explica explico explicar conta contei contou acontece aconteceu passou passei recebi recebeu levou levei
  irmao irma amigo amigos amiga amigas familia mae pai filho filha casa carro dinheiro euros mil milhoes vida mundo pessoas pessoa gente tipo trailer reagir
  incrivel epico louco loucura insano absurdo chocante inacreditavel engracado engracada triste feliz serio mesmo nunca jamais finalmente afinal assim entao
  aqui agora la isso tudo nada quem sabe vale pena quanto custa preco gratis barato caro sorteio giveaway unboxing review analise opiniao minha nossa`.split(/\s+/),
);
// Nomes com mais de uma palavra (e abreviaturas) que contam como um só assunto
const ALIAS = [
  ["league of legends", "lol", "LoL"], ["counter strike", "cs", "CS"], ["grand theft auto", "gta", "GTA"], ["call of duty", "cod", "Call of Duty"],
  ["clash royale", "clashroyale", "Clash Royale"], ["clash of clans", "clashofclans", "Clash of Clans"], ["brawl stars", "brawlstars", "Brawl Stars"],
  ["rocket league", "rocketleague", "Rocket League"], ["among us", "amongus", "Among Us"], ["fall guys", "fallguys", "Fall Guys"], ["apex legends", "apex", "Apex"],
  ["genshin impact", "genshin", "Genshin"], ["red dead", "reddead", "Red Dead"], ["ea fc", "eafc", "EA FC"], ["big brother", "bigbrother", "Big Brother"],
  ["secret story", "secretstory", "Secret Story"], ["real madrid", "realmadrid", "Real Madrid"], ["sporting", "sporting", "Sporting"], ["benfica", "benfica", "Benfica"],
];
const NOME_BONITO = { lol: "LoL", gta: "GTA", cs: "CS", cs2: "CS2", fifa: "FIFA", fc: "FC", tiktok: "TikTok", twitch: "Twitch", kick: "Kick", instagram: "Instagram", ia: "IA", ai: "AI", nba: "NBA", ufc: "UFC" };

/** Os assuntos de um título: [[chave, nome a mostrar]]. As chaves são "e:palavra". */
export function assuntosDoTitulo(titulo, nomeTokens = new Set()) {
  const out = new Map();
  const n = ` ${norm(titulo)} `;
  const saltar = new Set();
  for (const [frase, k, d] of ALIAS) {
    if (!n.includes(` ${frase} `)) continue;
    out.set("e:" + k, d);
    for (const w of frase.split(" ")) saltar.add(w);
  }
  for (const tok of String(titulo).split(/[^\p{L}\p{N}]+/u)) {
    const k = norm(tok);
    if (k.length < 3 || /^\d+$/.test(k) || saltar.has(k) || STOP.has(k) || PALAVRAS[k] || nomeTokens.has(k) || out.has("e:" + k)) continue;
    const bonito = NOME_BONITO[k] || (tok.length > 3 && tok === tok.toUpperCase() ? tok[0] + tok.slice(1).toLowerCase() : tok);
    out.set("e:" + k, bonito);
  }
  return [...out].slice(0, 8);
}

/** As palavras dos nomes dos Youtubers (não contam como assunto: os Youtubers são "p:id"). */
export const tokensDosNomes = (nomes) => new Set(nomes.flatMap((y) => y.nomes.flatMap((n) => n.replace(/^@/, "").split(/[\s.]+/))).filter(Boolean));

const curtoN = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".0", "").replace(".", ",")} M` : n >= 1e4 ? `${Math.round(n / 1e3)} mil` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(".0", "").replace(".", ",")} mil` : String(n));
const vezes = (r) => (r >= 10 ? Math.round(r) : Math.round(r * 10) / 10).toString().replace(".", ",");
const FRASES_PT = ["youtubers portugueses", "youtuber portugues", "youtubers tugas", "youtuber tuga", "portuguese youtuber", "portuguese youtubers", "youtubers de portugal"];

/**
 * Lê um vídeo e diz se pode dar notícia: { pontos, tema, palavras, pessoas, sinais, marcas, chaves… }.
 * v: { id, t, p, desc, tags, v, c }; dono: id do Youtuber do canal (ou null);
 * mediana: views normais de um vídeo já assente no canal (do mesmo tipo: Short ou longo);
 * anterior: data do vídeo anterior do canal (para os regressos); tend: lugar nas tendências de Portugal.
 */
export function analisarVideo(v, { dono = null, nomes, nomeTokens = null, extra = {}, mediana = 0, comentarios = [], agora = Date.now(), anterior = "", tend = 0 }) {
  const tituloOriginal = String(v.t || "");
  const titulo = norm(tituloOriginal);
  const desc = norm(descricaoLimpa(v.desc));
  const tags = norm((v.tags || []).join(" , "));
  const textoCom = norm(comentarios.join(" "));
  const temas = {};
  const palavras = [];
  const marcas = [];
  let pontos = 0;
  for (const [p, [tema, peso]] of Object.entries({ ...PALAVRAS, ...extra })) {
    const fator = temPalavra(titulo, p) ? 1.5 : temPalavra(desc, p) ? 0.5 : 0;
    if (!fator) continue;
    temas[tema] = (temas[tema] || 0) + peso * fator;
    palavras.push(p);
    pontos += peso * fator;
  }
  if (palavras.some((p) => FRASES_PT.includes(p))) marcas.push("pt");
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
  pontos += Math.min(4, pessoas.length) * 4 + Math.min(3, nasEtiquetas.length) * 1;
  let ptsCom = Math.min(2, nosComentarios.length) * 1.5;
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
    ptsCom += Math.min(3, quentesCom.length);
  }
  pontos += ptsCom;
  // Velocidade: as views que tem para a idade, comparadas com o normal do canal.
  // Um vídeo costuma fazer metade das views no primeiro dia: o esperado é mediana × h/(h+24).
  const horas = Math.max(1, (agora - Date.parse(v.p || agora)) / 3.6e6);
  if (mediana > 0 && v.v > 0) {
    const r = v.v / (mediana * (horas / (horas + 24)));
    if (r >= 5 && v.v >= 3000) {
      sinais.push(`⚡ ${vezes(r)}× mais rápido do que é normal no canal`);
      marcas.push("rapido");
      pontos += 3.5;
    } else if (r >= 2.5 && v.v >= 2000) {
      sinais.push(`${vezes(r)}× mais views do que é normal no canal`);
      marcas.push("rapido");
      pontos += 2;
    }
    if (mediana < 10000 && v.v >= 10000 && r >= 3) {
      sinais.push(`💥 Passou dos ${curtoN(Math.floor(v.v / 1000) * 1000)}; o normal no canal são ${curtoN(Math.round(mediana))}`);
      marcas.push("explodiu");
      pontos += 2;
    }
  }
  if (Number(v.c) > 0 && v.v >= 2000 && v.c / v.v >= 0.02) {
    sinais.push("muitos comentários para as views");
    pontos += 2;
  }
  // Regresso: o primeiro vídeo depois de muito tempo parado
  const parado = anterior ? (Date.parse(v.p) - Date.parse(anterior)) / 864e5 : 0;
  if (parado >= 45 && horas <= 24 * 10) {
    sinais.push(`🔙 Primeiro vídeo em ${Math.round(parado)} dias`);
    marcas.push("regresso");
    pontos += 2.5;
  }
  if (tend) {
    sinais.push(`📈 Nas tendências de Portugal (#${tend})`);
    marcas.push("tendencias");
    pontos += 3;
  }
  const assuntos = assuntosDoTitulo(tituloOriginal, nomeTokens || tokensDosNomes(nomes));
  const tema = Object.entries(temas).sort((a, b) => b[1] - a[1])[0]?.[0] || "noticia";
  return {
    pontos: Math.round(pontos * 10) / 10,
    ptsCom: Math.round(ptsCom * 10) / 10,
    tema,
    palavras,
    pessoas,
    nasEtiquetas,
    nosComentarios,
    sinais,
    marcas,
    quentesCom,
    chaves: assuntos.map(([k]) => k),
    nomesAssuntos: Object.fromEntries(assuntos),
  };
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

// ---------- Guardar ----------

const CHAVE_INDICE = "radar-indice";
export const DIAS_INDICE = 14;

export async function lerRadar() {
  const r = await getJSON(CHAVE, null);
  const base = { minimo: 5, palavras: [], comentarios: true, comentariosDia: 60, bolhaAuto: true, escolhidos: [], extras: [] };
  const radar = {
    itens: [],
    removidos: [],
    casos: [],
    casosMudos: [],
    bolha: {},
    tendencias: { at: "", pos: {} },
    ronda: {},
    ...(r || {}),
    gosto: { f: {}, tags: {}, ...(r?.gosto || {}) },
    regras: { ...base, ...(r?.regras || {}) },
  };
  // Os "ignorados" de antes passam a removidos (não voltam a aparecer)
  for (const x of radar.itens) if (x.estado === "ignorado") radar.removidos.push(x.id);
  radar.itens = radar.itens.filter((x) => x.estado !== "ignorado");
  return radar;
}

/** O índice dos títulos dos últimos 14 dias de todos os vídeos lidos (para os casos). */
export async function lerIndice() {
  const i = await getJSON(CHAVE_INDICE, null);
  return { v: {}, disp: {}, ...(i || {}) };
}
export async function guardarIndice(ind, agora = Date.now()) {
  const limite = agora - DIAS_INDICE * 864e5;
  for (const [id, e] of Object.entries(ind.v)) if (Date.parse(e.p || 0) < limite) delete ind.v[id];
  const usadas = new Set(Object.values(ind.v).flatMap((e) => e.k || []));
  for (const k of Object.keys(ind.disp)) if (!usadas.has(k)) delete ind.disp[k];
  await setJSON(CHAVE_INDICE, ind);
}

/** Junta ao radar acabado de ler (fresh) o que uma procura encontrou, sem estragar o que se mudou entretanto no painel. */
export function juntarNoRadar(fresh, { itens = [], campos = {} } = {}) {
  const porId = new Map(fresh.itens.map((x) => [x.id, x]));
  const removidos = new Set(fresh.removidos);
  for (const novo of itens) {
    if (removidos.has(novo.id)) continue;
    const o = porId.get(novo.id);
    if (!o) {
      fresh.itens.push(novo);
      porId.set(novo.id, novo);
    } else {
      // O que o utilizador decidiu (estado, útil, etiquetas…) fica como está
      const { estado, visto, noticia, util, tags, dado, encontrado, ...dados } = novo;
      Object.assign(o, dados);
    }
  }
  Object.assign(fresh, campos);
  return fresh;
}

export async function guardarRadar(radar) {
  radar.itens.sort((a, b) => (b.p || "").localeCompare(a.p || ""));
  const limite = Date.now() - (DIAS + 30) * 864e5;
  radar.itens = radar.itens.filter((x) => x.estado === "noticia" || Date.parse(x.p || 0) >= limite);
  if (radar.itens.length > MAX) {
    // Ficam primeiro as notícias e os por ver que se veem; os candidatos escondidos e os vistos saem primeiro
    const pont = pontuar(radar);
    const ordem = (x) => (x.estado === "noticia" ? 0 : x.estado === "novo" && pont.get(x.id).visivel ? 1 : x.estado === "visto" ? 2 : 3);
    radar.itens = [...radar.itens].sort((a, b) => ordem(a) - ordem(b)).slice(0, MAX);
    radar.itens.sort((a, b) => (b.p || "").localeCompare(a.p || ""));
  }
  await setJSON(CHAVE, radar);
}

// ---------- Ler um canal ----------

/** O que é preciso para analisar vídeos (lido uma vez por procura). */
export function contextoRadar(db, radar, { agora = Date.now() } = {}) {
  const nomes = nomesDosYoutubers(db);
  return {
    db,
    agora,
    nomes,
    nomeTokens: tokensDosNomes(nomes),
    extra: palavrasExtra(radar.regras.palavras),
    minimo: radar.regras.minimo,
    removidos: new Set(radar.removidos),
    antes: new Map(radar.itens.map((x) => [x.id, x])),
    tend: radar.tendencias?.pos || {},
    // Os assuntos dos casos portugueses a crescer: o radar fica mais atento a eles
    atento: new Set((radar.casos || []).filter((c) => c.nat === "pt").flatMap((c) => c.chaves)),
  };
}

const pick = (a) => ({
  pontos: a.pontos, ptsCom: a.ptsCom, tema: a.tema, palavras: a.palavras, pessoas: a.pessoas, nasEtiquetas: a.nasEtiquetas, nosComentarios: a.nosComentarios,
  sinais: a.sinais, marcas: a.marcas, quentesCom: a.quentesCom, chaves: a.chaves, ...(a.comLidos ? { comLidos: true } : {}),
});

/**
 * Analisa os vídeos de um canal. videos: os últimos (do feed ou da API), do mais recente para o mais antigo.
 * mediana: { l, s } views normais dos vídeos longos e dos Shorts. Devolve [{ v, a }] dos vídeos dos últimos 45 dias.
 */
export function analisarCanal(ctx, canal, videos, { mediana = {}, comentarios = {} } = {}) {
  const limite = ctx.agora - DIAS * 864e5;
  const lista = [...videos].filter((v) => v?.id).sort((a, b) => (b.p || "").localeCompare(a.p || ""));
  const out = [];
  lista.forEach((v, i) => {
    if (Date.parse(v.p || 0) < limite || ctx.removidos.has(v.id)) return;
    const a = analisarVideo(v, {
      dono: canal.personId || null,
      nomes: ctx.nomes,
      nomeTokens: ctx.nomeTokens,
      extra: ctx.extra,
      mediana: (v.s ? mediana.s : mediana.l) || mediana.s || mediana.l || 0,
      comentarios: comentarios[v.id] || [],
      agora: ctx.agora,
      anterior: lista[i + 1]?.p || "",
      tend: ctx.tend[v.id] || 0,
    });
    if (comentarios[v.id]) a.comLidos = true;
    out.push({ v, a });
  });
  return out;
}

/** Se um vídeo analisado fica guardado no radar (os candidatos abaixo do mínimo podem subir com os casos e o que o radar aprendeu). */
export function eCandidato(ctx, { v, a }) {
  if (ctx.antes.has(v.id)) return true;
  if (a.pontos >= ctx.minimo - 3) return true;
  if (a.marcas.some((m) => m === "tendencias" || m === "explodiu" || m === "regresso")) return true;
  return [...a.pessoas.map((p) => "p:" + p), ...a.chaves].some((k) => ctx.atento.has(k)) && a.pontos >= 1;
}

/** O item do radar para um vídeo analisado (novo, ou o antigo com os números de agora). */
export function itemDoVideo(ctx, canal, { v, a }) {
  const antes = ctx.antes.get(v.id);
  const hoje = new Date(ctx.agora).toISOString().slice(0, 10);
  const vh = [...(antes?.vh || [])];
  if (v.v && vh.at(-1)?.[0] !== hoje) vh.push([hoje, v.v]);
  else if (v.v && vh.length) vh[vh.length - 1] = [hoje, v.v];
  // Os comentários lidos antes continuam a contar (não se voltam a pedir)
  const an = antes?.comLidos && !a.comLidos ? { ...a, pontos: Math.round((a.pontos - a.ptsCom + (antes.ptsCom || 0)) * 10) / 10, ptsCom: antes.ptsCom || 0, nosComentarios: antes.nosComentarios || [], quentesCom: antes.quentesCom || [], comLidos: true } : a;
  return {
    ...(antes || {}),
    id: v.id,
    ch: canal.id,
    chNome: canal.titulo || ctx.db.channels[canal.id]?.title || antes?.chNome || "",
    personId: canal.personId || null,
    t: String(v.t || "").slice(0, 200),
    desc: descricaoLimpa(v.desc).slice(0, 400),
    p: v.p,
    v: v.v,
    ...(Number.isFinite(v.c) ? { c: v.c } : {}),
    th: v.th || antes?.th || "",
    s: Boolean(v.s),
    ...pick(an),
    vh: vh.slice(-8),
    estado: antes?.estado || "novo",
    encontrado: antes?.encontrado || new Date(ctx.agora).toISOString(),
  };
}

/** A linha do índice de um vídeo (para os casos). */
export function linhaDoIndice(canal, chNome, { v, a }) {
  return { ch: canal.id, dono: canal.personId || null, n: chNome, p: v.p, t: String(v.t || "").slice(0, 160), pe: a.pessoas, k: a.chaves, v: v.v, th: v.th || "", s: Boolean(v.s), tema: a.tema };
}

// ---------- Casos a crescer ----------

const RE_PT = /\bportug|\btugas?\b/;

/**
 * Os casos: assuntos (Youtubers mencionados ou palavras do título) de que muitos canais diferentes
 * começaram a falar nos últimos 4 dias, muito mais do que nos 10 dias antes. Os que andam sempre
 * na boca de todos não contam: só as subidas.
 * nat: "pt" quando o caso envolve Youtubers do Placar (ou fala de Portugal); "mundial" quando não.
 */
export function detetarCasos(ind, { agora = Date.now(), mudos = [], nomeDe = (id) => id } = {}) {
  const REC = 4 * 864e5;
  const JAN = DIAS_INDICE * 864e5;
  const mudo = new Set(mudos);
  const por = new Map();
  const entradas = Object.entries(ind.v || {});
  for (const [id, e] of entradas) {
    const t = Date.parse(e.p || 0);
    if (!t || agora - t > JAN) continue;
    for (const k of new Set([...(e.pe || []).map((x) => "p:" + x), ...(e.k || [])])) {
      if (mudo.has(k)) continue;
      let o = por.get(k);
      if (!o) por.set(k, (o = { ch: new Set(), vids: new Set(), velhos: 0 }));
      if (agora - t <= REC) {
        o.ch.add(e.ch);
        o.vids.add(id);
      } else o.velhos++;
    }
  }
  // Subidas: pelo menos 3 canais, e o ritmo dos últimos 4 dias bem acima do dos 10 dias antes
  const quentes = [...por].filter(([k, o]) => o.ch.size >= 3 && o.vids.size / 4 >= (k.startsWith("p:") ? 2 : 3) * ((o.velhos + 0.5) / 10));
  // Juntar os assuntos que aparecem nos mesmos vídeos (ex.: "Wuant" e "LoL")
  const pai = quentes.map((_, i) => i);
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  for (let i = 0; i < quentes.length; i++)
    for (let j = i + 1; j < quentes.length; j++) {
      const a = quentes[i][1].vids;
      const b = quentes[j][1].vids;
      let n = 0;
      for (const x of a) if (b.has(x)) n++;
      if (n >= 2 || n >= 0.5 * Math.min(a.size, b.size)) pai[raiz(i)] = raiz(j);
    }
  const grupos = new Map();
  quentes.forEach((q, i) => grupos.set(raiz(i), [...(grupos.get(raiz(i)) || []), q]));
  const casos = [];
  for (const g of grupos.values()) {
    g.sort((a, b) => (a[0].startsWith("p:") ? 0 : 1) - (b[0].startsWith("p:") ? 0 : 1) || b[1].ch.size - a[1].ch.size);
    const chaves = g.map(([k]) => k);
    const vids = new Set(g.flatMap(([, o]) => [...o.vids]));
    // Os vídeos do próprio Youtuber do caso, quando falam do mesmo assunto
    const donos = new Set(chaves.filter((k) => k.startsWith("p:")).map((k) => k.slice(2)));
    const assuntos = new Set(chaves.filter((k) => k.startsWith("e:")));
    for (const [id, e] of entradas) if (e.dono && donos.has(e.dono) && agora - Date.parse(e.p || 0) <= REC && ((e.k || []).some((k) => assuntos.has(k)) || e.tema === "stress")) vids.add(id);
    const lista = [...vids].map((id) => ({ id, ...ind.v[id] })).filter((x) => x.p);
    const canais = new Set(lista.map((x) => x.ch));
    const views = lista.reduce((s, x) => s + (x.v || 0), 0);
    const nat = donos.size || lista.some((x) => RE_PT.test(norm(x.t))) ? "pt" : "mundial";
    const datas = lista.map((x) => x.p).sort();
    casos.push({
      id: chaves[0],
      chaves,
      titulo: chaves.slice(0, 3).map((k) => (k.startsWith("p:") ? nomeDe(k.slice(2)) : ind.disp?.[k] || k.slice(2))).join(" · "),
      nat,
      canais: canais.size,
      nVideos: lista.length,
      views,
      desde: datas[0],
      ate: datas.at(-1),
      forca: Math.round((canais.size * 2 + lista.length + Math.log10(views + 1)) * 10) / 10,
      videos: lista.sort((a, b) => (b.v || 0) - (a.v || 0)).slice(0, 12).map(({ id, t, ch, n, p, v, th, s, dono }) => ({ id, t, ch, n, p, v, th, s, dono })),
    });
  }
  return casos.sort((a, b) => (a.nat === "pt" ? 0 : 1) - (b.nat === "pt" ? 0 : 1) || b.forca - a.forca).slice(0, 12);
}

/** O caso de um item (ou null). */
export function casoDoItem(it, casos) {
  const ks = new Set([...(it.pessoas || []).map((p) => "p:" + p), ...(it.chaves || [])]);
  for (const c of casos || []) {
    if (c.chaves.some((k) => ks.has(k))) return c;
    // O próprio Youtuber do caso a responder
    if (it.personId && c.chaves.includes("p:" + it.personId) && it.tema === "stress" && (it.p || "") >= (c.desde || "")) return c;
  }
  return null;
}

/** Pontos a mais por estar num caso a crescer (os assuntos mundiais não sobem). */
export function bonusDoCaso(c, bolha) {
  if (!c || c.nat !== "pt") return 0;
  return Math.min(5, 2 + 0.75 * Math.max(0, c.canais - 3)) + ((bolha?.fora || 0) >= 2 ? 2 : 0);
}

// ---------- Aprender com o que escolhes ----------

export const ETIQUETAS = { interessante: "Interessante", bom: "Assunto bom", polemico: "Polémico" };
export const SINAIS_NOME = { rapido: "Mais rápido do que o normal", explodiu: "Explodiu", regresso: "Regressos", tendencias: "Nas tendências", pt: "Fala dos Youtubers portugueses" };

/** As características de um vídeo que o radar aprende: quem publicou, de quem fala, palavras, tema e sinais. */
export function caracteristicas(it) {
  return [
    "q:" + (it.personId || it.ch),
    ...(it.pessoas || []).map((p) => "p:" + p),
    ...(it.palavras || []).map((w) => "w:" + w),
    "t:" + (it.tema || "noticia"),
    ...(it.marcas || []).map((m) => "s:" + m),
  ];
}

/** O que um vídeo ensina: útil vale 1, virar notícia vale 2, remover vale 1 contra. */
export const alvoDe = (it, removido = false) => ({ bom: removido ? 0 : (it.util ? 1 : 0) + (it.estado === "noticia" ? 2 : 0), mau: removido ? 1 : 0 });

/** Aplica ao que o radar sabe a diferença entre o que o vídeo já tinha ensinado e o que ensina agora. */
export function aplicarGosto(radar, it, alvo) {
  const antes = it.dado || { bom: 0, mau: 0 };
  const d = { bom: alvo.bom - antes.bom, mau: alvo.mau - antes.mau };
  if (d.bom || d.mau)
    for (const f of new Set(caracteristicas(it))) {
      const g = (radar.gosto.f[f] ||= [0, 0]);
      g[0] = Math.max(0, g[0] + d.bom);
      g[1] = Math.max(0, g[1] + d.mau);
      if (!g[0] && !g[1]) delete radar.gosto.f[f];
    }
  // Etiquetas por quem publicou (para mostrar do que gostas em cada um)
  const q = it.personId || it.ch;
  const tAntes = new Set(it.tagsDadas || []);
  const tAgora = new Set(alvo.mau ? [] : it.tags || []);
  for (const t of new Set([...tAntes, ...tAgora])) {
    const n = (tAgora.has(t) ? 1 : 0) - (tAntes.has(t) ? 1 : 0);
    if (!n) continue;
    const m = (radar.gosto.tags[q] ||= {});
    m[t] = Math.max(0, (m[t] || 0) + n);
    if (!m[t]) delete m[t];
    if (!Object.keys(m).length) delete radar.gosto.tags[q];
  }
  it.tagsDadas = [...tAgora];
  it.dado = alvo;
}

const pesoDe = (g) => {
  if (!g) return 0;
  const [b, m] = g;
  let w = Math.log((b + 1) / (m + 1)) * 1.2;
  if (b + m < 2) w *= 0.5;
  return Math.max(-1.5, Math.min(2, w));
};
const LIMITES = { q: [-2.5, 3, 1.5], p: [-2, 2.5, 1], w: [-1.5, 2, 0.6], t: [-1, 1.5, 0.6], s: [-1, 1.5, 0.6] };

/** Pontos que o radar aprendeu para um vídeo: { pts, porque: [{ f, pts }] }. */
export function aprendido(gosto, it) {
  const grupos = {};
  const partes = [];
  for (const f of new Set(caracteristicas(it))) {
    const tipo = f[0];
    const w = pesoDe(gosto.f[f]) * LIMITES[tipo][2];
    if (!w) continue;
    grupos[tipo] = (grupos[tipo] || 0) + w;
    partes.push({ f, pts: Math.round(w * 10) / 10 });
  }
  let pts = 0;
  for (const [tipo, v] of Object.entries(grupos)) pts += Math.max(LIMITES[tipo][0], Math.min(LIMITES[tipo][1], v));
  pts = Math.round(Math.max(-4, Math.min(5, pts)) * 10) / 10;
  return { pts, porque: partes.filter((x) => Math.abs(x.pts) >= 0.4).sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts)).slice(0, 3) };
}

/** O que o radar aprendeu, do mais forte para o mais fraco. */
export function resumoGosto(gosto) {
  return Object.entries(gosto.f)
    .map(([f, [bom, mau]]) => ({ f, bom, mau, peso: Math.round(pesoDe([bom, mau]) * LIMITES[f[0]][2] * 10) / 10 }))
    .filter((x) => x.peso)
    .sort((a, b) => Math.abs(b.peso) - Math.abs(a.peso))
    .slice(0, 40);
}

/** A pontuação final de cada item: a dele, mais o caso, mais o que o radar aprendeu. */
export function pontuar(radar) {
  const out = new Map();
  for (const it of radar.itens) {
    const caso = casoDoItem(it, radar.casos);
    const bCaso = bonusDoCaso(caso, caso && radar.bolha?.[caso.id]);
    const ap = aprendido(radar.gosto, it);
    const final = Math.round((it.pontos + bCaso + ap.pts) * 10) / 10;
    out.set(it.id, { caso, bCaso, ap, final, visivel: it.estado !== "novo" || final >= radar.regras.minimo });
  }
  return out;
}

// ---------- Mudar o estado ----------

/** Muda o estado de vídeos do radar: novo, visto, noticia, ou remover (sai e não volta, e o radar aprende). */
export function mudarEstado(radar, ids, estado, extra = {}) {
  let n = 0;
  for (const id of ids) {
    const it = radar.itens.find((x) => x.id === id);
    if (!it) continue;
    n++;
    if (estado === "remover") {
      aplicarGosto(radar, it, alvoDe(it, true));
      radar.itens = radar.itens.filter((x) => x.id !== id);
      radar.removidos.push(id);
    } else {
      it.estado = estado;
      if (estado === "visto") it.visto = new Date().toISOString();
      if (extra.noticia) it.noticia = String(extra.noticia).slice(0, 40);
      aplicarGosto(radar, it, alvoDe(it));
    }
  }
  radar.removidos = [...new Set(radar.removidos)].slice(-3000);
  return n;
}

/** Marca um vídeo como útil (ou não), com etiquetas: interessante, bom, polemico. */
export function marcarUtil(radar, id, util, tags = []) {
  const it = radar.itens.find((x) => x.id === id);
  if (!it) return null;
  it.util = Boolean(util);
  it.tags = it.util ? [...new Set(tags.filter((t) => ETIQUETAS[t]))] : [];
  if (it.util && it.estado === "novo") {
    it.estado = "visto";
    it.visto = new Date().toISOString();
  }
  aplicarGosto(radar, it, alvoDe(it));
  return it;
}

/** Os canais de um grupo: "escolhidos" (Youtubers escolhidos + canais extra) ou "todos" (com os extra). */
export function canaisDoGrupo(db, regras, grupo) {
  const pessoas = grupo === "todos" ? Object.values(db.people).filter((p) => !p.hidden) : (regras.escolhidos || []).map((id) => db.people[id]).filter(Boolean);
  const out = [];
  for (const p of pessoas) for (const id of p.channels || []) if (db.channels[id]) out.push({ id, personId: p.id });
  for (const e of regras.extras || []) if (!out.some((c) => c.id === e.id)) out.push({ id: e.id, personId: db.channels[e.id]?.personId || null, titulo: e.title });
  return out;
}
