// O Caso: o que o público acha de cada Youtuber, à parte dos números.
// Quem tem conta Google dá karma (apoiar 👍 ou "estou farto" 👎) e uma reação a cada Youtuber.
// Tudo anónimo (guarda-se só um código da conta). O karma esquece-se com o tempo: um voto de há
// meses pesa menos do que um de hoje. Não entra no Índice de Influência, a não ser que o dono
// do site o ligue (e mesmo assim só mexe no Índice até um certo ponto).

import { pedidoSupabase, supabaseConfigurado, getJSON, setJSON } from "./storage.mjs";

const CHAVE_REGRAS = "caso-regras";

/** As reações (e o lado para que puxam: +1 bom, -1 mau, 0 neutro). */
export const REACOES = {
  amor: { emoji: "❤️", nome: "Adoro", lado: 1 },
  palmas: { emoji: "👏", nome: "Bem feito", lado: 1 },
  riso: { emoji: "😂", nome: "Hilariante", lado: 0 },
  choque: { emoji: "😮", nome: "Chocado", lado: 0 },
  raiva: { emoji: "😡", nome: "Irritado", lado: -1 },
  nojo: { emoji: "🤮", nome: "Vergonha", lado: -1 },
};

export function regrasBase() {
  return {
    votar: true, // aceitar votos novos
    meiaVida: 60, // dias até um voto pesar metade
    minVotos: 20, // votos precisos para o karma ter força total (com menos, o efeito é menor)
    peso: 10, // quanto o karma pode mexer no Índice, em % (para cima ou para baixo)
    noIndice: false, // juntar o karma ao Índice no site
    reacoes: true,
  };
}

const num = (x, a, b, d) => (Number.isFinite(Number(x)) ? Math.max(a, Math.min(b, Math.round(Number(x)))) : d);

export function limparRegras(r = {}) {
  const b = regrasBase();
  return {
    votar: r.votar === undefined ? b.votar : Boolean(r.votar),
    meiaVida: num(r.meiaVida, 7, 730, b.meiaVida),
    minVotos: num(r.minVotos, 1, 10000, b.minVotos),
    peso: num(r.peso, 0, 50, b.peso),
    noIndice: Boolean(r.noIndice),
    reacoes: r.reacoes === undefined ? b.reacoes : Boolean(r.reacoes),
  };
}

export async function lerRegras() {
  return limparRegras((await getJSON(CHAVE_REGRAS, null)) || {});
}
export async function guardarRegras(r) {
  const limpas = limparRegras(r);
  await setJSON(CHAVE_REGRAS, limpas);
  esquecerResumo();
  return limpas;
}

function erro(status, msg) {
  return Object.assign(new Error(msg), { status });
}

async function supa(caminho, opcoes) {
  try {
    return await pedidoSupabase(caminho, opcoes);
  } catch (e) {
    if (/PGRST20[0-9]|42P01|relation .* does not exist|Could not find the table|schema cache/.test(e.message || "")) {
      throw erro(400, "A base de dados precisa da tabela do Caso: no Supabase, SQL Editor, corre outra vez o ficheiro supabase/schema.sql (não apaga nada).");
    }
    throw e;
  }
}

async function todas(caminho) {
  const out = [];
  for (let i = 0; ; i += 1000) {
    const parte = (await supa(caminho, { intervalo: `${i}-${i + 999}` })) || [];
    out.push(...parte);
    if (parte.length < 1000) return out;
  }
}

// ---------- Resumo (contas por Youtuber) ----------

let cache = null;
export function esquecerResumo() {
  cache = null;
}

/**
 * O karma de cada Youtuber:
 *  - cada voto pesa 0,5^(dias / meia-vida);
 *  - as reações contam meio voto para o seu lado (as neutras não puxam);
 *  - liquido = (bom - mau) / (bom + mau), de -1 a 1;
 *  - confiança = votos / (votos + votos mínimos): com poucos votos, o karma mexe pouco;
 *  - fator = liquido × confiança, de -1 a 1. É isto que pode entrar no Índice.
 */
export function calcularResumo(linhas, regras, agora = Date.now()) {
  const por = {};
  for (const l of linhas) {
    const idade = Math.max(0, (agora - Date.parse(l.atualizado || l.criado || agora)) / 864e5);
    const w = Math.pow(0.5, idade / regras.meiaVida);
    const x = (por[l.pessoa_id] ||= { bom: 0, mau: 0, n: 0, pos: 0, neg: 0, r: {} });
    x.n++;
    if (l.karma > 0) {
      x.pos++;
      x.bom += w;
    } else if (l.karma < 0) {
      x.neg++;
      x.mau += w;
    }
    const re = REACOES[l.reacao];
    if (re && regras.reacoes) {
      x.r[l.reacao] = (x.r[l.reacao] || 0) + 1;
      if (re.lado > 0) x.bom += w * 0.5;
      if (re.lado < 0) x.mau += w * 0.5;
    }
  }
  const out = {};
  for (const [id, x] of Object.entries(por)) {
    const tot = x.bom + x.mau;
    const liquido = tot ? (x.bom - x.mau) / tot : 0;
    const confianca = tot / (tot + regras.minVotos);
    out[id] = { k: Math.round(liquido * confianca * 1000) / 1000, liq: Math.round(liquido * 100) / 100, conf: Math.round(confianca * 100) / 100, pos: x.pos, neg: x.neg, n: x.n, r: x.r };
  }
  return out;
}

/** O resumo de todos (guardado um minuto, e refeito logo depois de cada voto). */
export async function resumo() {
  if (!supabaseConfigurado()) return { ligado: false, pessoas: {}, regras: await lerRegras() };
  if (cache && Date.now() - cache.em < 60000) return cache.dados;
  const regras = await lerRegras();
  const linhas = await todas("caso_votos?select=pessoa_id,karma,reacao,atualizado&order=chave.asc");
  const dados = { ligado: true, regras, pessoas: calcularResumo(linhas, regras), em: new Date().toISOString() };
  cache = { em: Date.now(), dados };
  return dados;
}

/** O que vai junto com os dados do site (para o Índice com karma). */
export async function karmaParaDataset() {
  try {
    const r = await resumo();
    if (!r.ligado) return null;
    return { noIndice: r.regras.noIndice, peso: r.regras.peso, pessoas: Object.fromEntries(Object.entries(r.pessoas).map(([id, x]) => [id, { k: x.k, n: x.n }])) };
  } catch {
    return null;
  }
}

// ---------- Votar ----------

/** Os meus votos (com o código anónimo da conta). */
export async function meusVotos(conta) {
  const linhas = await todas(`caso_votos?select=pessoa_id,karma,reacao&autor=eq.${conta}`);
  return Object.fromEntries(linhas.map((l) => [l.pessoa_id, { karma: l.karma, reacao: l.reacao || "" }]));
}

/**
 * Dar ou mudar o karma (1, -1 ou 0 para tirar) e/ou a reação ("" para tirar) a um Youtuber.
 * Limite: 120 mudanças por hora por conta (contra quem tenta encher de votos).
 */
export async function votar({ conta, pessoa, karma, reacao, pessoas }) {
  const regras = await lerRegras();
  if (!regras.votar) throw erro(403, "Os votos do Caso estão fechados por agora.");
  if (!pessoas.has(pessoa)) throw erro(400, "Este Youtuber não está disponível.");
  const limite = (await getJSON(`caso/limite/${conta}`, null)) || { ini: Date.now(), n: 0 };
  if (Date.now() - limite.ini > 3600e3) Object.assign(limite, { ini: Date.now(), n: 0 });
  if (limite.n >= 120) throw erro(429, "Muitos votos seguidos. Espera um pouco e tenta outra vez.");
  limite.n++;
  await setJSON(`caso/limite/${conta}`, limite);

  const chave = `${pessoa}|${conta}`;
  const atual = ((await supa(`caso_votos?select=karma,reacao&chave=eq.${encodeURIComponent(chave)}&limit=1`)) || [])[0] || { karma: 0, reacao: "" };
  const novoK = karma === undefined ? atual.karma : [1, -1].includes(Number(karma)) ? Number(karma) : 0;
  let novoR = reacao === undefined ? atual.reacao || "" : REACOES[reacao] ? reacao : "";
  if (!regras.reacoes) novoR = atual.reacao || "";
  if (!novoK && !novoR) {
    await supa(`caso_votos?chave=eq.${encodeURIComponent(chave)}`, { metodo: "DELETE", prefer: "return=minimal" });
  } else {
    await supa("caso_votos?on_conflict=chave", {
      metodo: "POST",
      corpo: { chave, pessoa_id: pessoa, autor: conta, karma: novoK, reacao: novoR, atualizado: new Date().toISOString() },
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }
  esquecerResumo();
  return { karma: novoK, reacao: novoR };
}

// ---------- Painel ----------

/** Apaga todos os votos de um Youtuber (por exemplo, depois de uma enxurrada de votos falsos). */
export async function limparPessoa(pessoa) {
  if (!pessoa) throw erro(400, "Falta o Youtuber.");
  await supa(`caso_votos?pessoa_id=eq.${encodeURIComponent(pessoa)}`, { metodo: "DELETE", prefer: "return=minimal" });
  esquecerResumo();
  return { ok: true };
}
