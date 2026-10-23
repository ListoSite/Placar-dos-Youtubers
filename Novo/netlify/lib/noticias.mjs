// O Caso, Notícias: o dono do site publica o que anda a acontecer (com um tema: polémica, notícia,
// coisas boas…). O público reage, responde à pergunta da notícia (se houver) e, nos Youtubers
// envolvidos, pode dar karma (o mesmo karma do Caso). Tudo anónimo, com a conta Google.
//
// As notícias guardam-se no armazenamento do site (são poucas e escritas no painel);
// os votos vão para a tabela noticia_votos do Supabase (um por conta e por notícia).

import crypto from "node:crypto";
import { pedidoSupabase, supabaseConfigurado, getJSON, setJSON } from "./storage.mjs";

const CHAVE = "caso-noticias";

/** Os temas das notícias (cor e ícone na página). */
export const TEMAS = {
  noticia: { nome: "Notícia", icone: "📰", cor: "#5aa8ff" },
  stress: { nome: "Polémica", icone: "🔥", cor: "#ff4d4d" },
  boa: { nome: "Coisas boas", icone: "💚", cor: "#4fe3a0" },
  colab: { nome: "Colaboração", icone: "🤝", cor: "#b58cff" },
  marco: { nome: "Marco", icone: "🏆", cor: "#f4b942" },
  rumor: { nome: "Rumor", icone: "👀", cor: "#ff9b6b" },
  evento: { nome: "Evento", icone: "📅", cor: "#5fd6d6" },
  pausa: { nome: "Pausa ou saída", icone: "👋", cor: "#a77f8b" },
};

/** As reações às notícias. "quente" diz quanto a reação aquece o termómetro de stress. */
export const REACOES_NOTICIA = {
  fogo: { emoji: "🔥", nome: "Polémico", quente: 1 },
  pipoca: { emoji: "🍿", nome: "A acompanhar", quente: 0.6 },
  choque: { emoji: "😮", nome: "Chocado", quente: 0.7 },
  raiva: { emoji: "😡", nome: "Irritado", quente: 1 },
  triste: { emoji: "😢", nome: "Triste", quente: 0.3 },
  riso: { emoji: "😂", nome: "Hilariante", quente: 0.1 },
  palmas: { emoji: "👏", nome: "Bem feito", quente: 0 },
  amor: { emoji: "❤️", nome: "Adoro", quente: 0 },
};

function erro(status, msg) {
  return Object.assign(new Error(msg), { status });
}

async function supa(caminho, opcoes) {
  try {
    return await pedidoSupabase(caminho, opcoes);
  } catch (e) {
    if (/PGRST20[0-9]|42P01|relation .* does not exist|Could not find the table|schema cache/.test(e.message || "")) {
      throw erro(400, "A base de dados precisa da tabela das notícias: no Supabase, SQL Editor, corre outra vez o ficheiro supabase/schema.sql (não apaga nada).");
    }
    throw e;
  }
}

const txt = (x, max) => String(x ?? "").replace(/\r/g, "").trim().slice(0, max);
const linkSeguro = (x) => {
  const s = txt(x, 500);
  if (!s) return "";
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
};

// ---------- Notícias ----------

export async function lerNoticias() {
  const l = (await getJSON(CHAVE, null)) || [];
  return Array.isArray(l) ? l : [];
}

/** Ordem: as fixadas primeiro, depois as mais recentes. */
const ordenar = (l) => [...l].sort((a, b) => Number(Boolean(b.fixada)) - Number(Boolean(a.fixada)) || (b.data || b.criado).localeCompare(a.data || a.criado));

/** Limpa uma notícia vinda do painel. pessoasValidas: ids dos Youtubers que existem. */
export function limparNoticia(n, pessoasValidas, antiga = null) {
  const titulo = txt(n?.titulo, 160);
  if (!titulo) throw erro(400, "A notícia precisa de um título.");
  const opcoes = (Array.isArray(n.opcoes) ? n.opcoes : [])
    .map((o) => txt(o, 60))
    .filter(Boolean)
    .slice(0, 4);
  const pergunta = txt(n.pergunta, 140);
  if (pergunta && opcoes.length < 2) throw erro(400, "A pergunta precisa de pelo menos 2 respostas.");
  const agora = new Date().toISOString();
  const data = n.data && !Number.isNaN(Date.parse(n.data)) ? new Date(n.data).toISOString() : antiga?.data || agora;
  return {
    id: antiga?.id || `n${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`,
    criado: antiga?.criado || agora,
    editado: antiga ? agora : undefined,
    data,
    tema: TEMAS[n.tema] ? n.tema : "noticia",
    titulo,
    texto: txt(n.texto, 3000),
    pessoas: [...new Set((Array.isArray(n.pessoas) ? n.pessoas : []).filter((id) => pessoasValidas.has(id)))].slice(0, 8),
    link: linkSeguro(n.link),
    imagem: linkSeguro(n.imagem),
    pergunta: pergunta && opcoes.length >= 2 ? pergunta : "",
    opcoes: pergunta && opcoes.length >= 2 ? opcoes : [],
    estado: ["publicada", "rascunho", "arquivada"].includes(n.estado) ? n.estado : "publicada",
    fixada: Boolean(n.fixada),
    votar: n.votar === undefined ? true : Boolean(n.votar),
  };
}

export async function guardarNoticia(n, pessoasValidas) {
  const l = await lerNoticias();
  const i = n?.id ? l.findIndex((x) => x.id === n.id) : -1;
  const limpa = limparNoticia(n, pessoasValidas, i >= 0 ? l[i] : null);
  if (i >= 0) l[i] = limpa;
  else l.unshift(limpa);
  await setJSON(CHAVE, l.slice(0, 500));
  esquecerContagens();
  return limpa;
}

export async function apagarNoticia(id) {
  const l = await lerNoticias();
  await setJSON(
    CHAVE,
    l.filter((x) => x.id !== id),
  );
  if (supabaseConfigurado()) await supa(`noticia_votos?noticia_id=eq.${encodeURIComponent(id)}`, { metodo: "DELETE", prefer: "return=minimal" }).catch(() => {});
  esquecerContagens();
  return { ok: true };
}

// ---------- Contagens ----------

let cache = null;
export function esquecerContagens() {
  cache = null;
}

/** Reações e respostas de cada notícia: { id: { r: {fogo: 3}, o: {0: 5, 1: 2}, n, quente (0 a 1) } }. */
async function contagens() {
  if (!supabaseConfigurado()) return {};
  if (cache && Date.now() - cache.em < 30000) return cache.dados;
  const linhas = [];
  for (let i = 0; ; i += 1000) {
    const parte = (await supa("noticia_votos?select=noticia_id,reacao,opcao&order=chave.asc", { intervalo: `${i}-${i + 999}` })) || [];
    linhas.push(...parte);
    if (parte.length < 1000) break;
  }
  const out = {};
  for (const l of linhas) {
    const x = (out[l.noticia_id] ||= { r: {}, o: {}, n: 0 });
    x.n++;
    if (REACOES_NOTICIA[l.reacao]) x.r[l.reacao] = (x.r[l.reacao] || 0) + 1;
    if (l.opcao !== null && l.opcao !== undefined && l.opcao >= 0) x.o[l.opcao] = (x.o[l.opcao] || 0) + 1;
  }
  for (const x of Object.values(out)) {
    const tot = Object.values(x.r).reduce((a, b) => a + b, 0);
    const calor = Object.entries(x.r).reduce((a, [k, v]) => a + REACOES_NOTICIA[k].quente * v, 0);
    // Termómetro: a parte das reações "quentes", com pouco peso quando há poucas reações
    x.quente = tot ? Math.round((calor / tot) * (tot / (tot + 5)) * 100) / 100 : 0;
  }
  cache = { em: Date.now(), dados: out };
  return out;
}

/** Para o site: só as publicadas, com as contagens. */
export async function noticiasPublicas({ n = 60, vivos } = {}) {
  const [l, c] = await Promise.all([lerNoticias(), contagens().catch(() => ({}))]);
  return ordenar(l.filter((x) => x.estado === "publicada"))
    .slice(0, n)
    .map((x) => ({ ...x, pessoas: vivos ? x.pessoas.filter((id) => vivos.has(id)) : x.pessoas, editado: undefined, estado: undefined, conta: c[x.id] || { r: {}, o: {}, n: 0, quente: 0 } }));
}

/** Para o painel: todas, com as contagens. */
export async function noticiasPainel() {
  const [l, c] = await Promise.all([lerNoticias(), contagens().catch(() => ({}))]);
  return ordenar(l).map((x) => ({ ...x, conta: c[x.id] || { r: {}, o: {}, n: 0, quente: 0 } }));
}

// ---------- Votar ----------

export async function minhasNoticias(conta) {
  const linhas = (await supa(`noticia_votos?select=noticia_id,reacao,opcao&autor=eq.${conta}&limit=2000`)) || [];
  return Object.fromEntries(linhas.map((l) => [l.noticia_id, { reacao: l.reacao || "", opcao: l.opcao ?? -1 }]));
}

/** Reação ("" para tirar) e/ou resposta à pergunta (índice, -1 para tirar). */
export async function votarNoticia({ conta, id, reacao, opcao }) {
  const n = (await lerNoticias()).find((x) => x.id === id);
  if (!n || n.estado !== "publicada") throw erro(404, "Esta notícia já não está no site.");
  if (!n.votar) throw erro(403, "Esta notícia já não aceita votos.");
  const chave = `${id}|${conta}`;
  const atual = ((await supa(`noticia_votos?select=reacao,opcao&chave=eq.${encodeURIComponent(chave)}&limit=1`)) || [])[0] || { reacao: "", opcao: -1 };
  const novaR = reacao === undefined ? atual.reacao || "" : REACOES_NOTICIA[reacao] ? reacao : "";
  let novaO = opcao === undefined ? (atual.opcao ?? -1) : Number(opcao);
  if (!Number.isInteger(novaO) || novaO < -1 || novaO >= n.opcoes.length) novaO = -1;
  if (!novaR && novaO < 0) {
    await supa(`noticia_votos?chave=eq.${encodeURIComponent(chave)}`, { metodo: "DELETE", prefer: "return=minimal" });
  } else {
    await supa("noticia_votos?on_conflict=chave", {
      metodo: "POST",
      corpo: { chave, noticia_id: id, autor: conta, reacao: novaR, opcao: novaO, atualizado: new Date().toISOString() },
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }
  esquecerContagens();
  const c = await contagens();
  return { meu: { reacao: novaR, opcao: novaO }, conta: c[id] || { r: {}, o: {}, n: 0, quente: 0 } };
}
