// Sugestões do público: quem tem conta Google sugere um vídeo (um top, uma batalha, um torneio,
// uma simulação ou a história de um Youtuber) escolhendo os Youtubers. Fica no site, sempre anónimo,
// e os outros votam "quero" ou "não quero". Se muitos não quiserem, sai do ar. Ao fim do prazo
// (2 semanas por defeito) vai para o painel, onde o dono aceita ou recusa.
//
// Tudo passa pelo servidor (com a chave service_role): o browser manda o token da sessão Google,
// o servidor confirma-o no Supabase e guarda só um código anónimo da conta (nunca o email nem o id).

import crypto from "node:crypto";
import { pedidoSupabase, supabaseConfigurado, urlSupabase, getJSON, setJSON } from "./storage.mjs";

const CHAVE_REGRAS = "sugestoes-regras";
const CHAVE_SAL = "sugestoes-sal";

/** Os tipos de sugestão (e o espetáculo do Palco que cada um usa). */
export const TIPOS = {
  top: { nome: "Top", icone: "🏆", palco: "revelacao" },
  batalha: { nome: "Batalha", icone: "🥊", palco: "batalha" },
  torneio: { nome: "Torneio", icone: "🏟️", palco: "torneio" },
  simulacao: { nome: "Simulação", icone: "🎲", palco: "" },
  historia: { nome: "História", icone: "📈", palco: "historia" },
};
export const JOGOS = {
  comilonas: { nome: "Bolas comilonas", min: 4, max: 12 },
  cavalos: { nome: "Corrida de cavalos", min: 3, max: 12 },
  berlindes: { nome: "Corrida de berlindes", min: 4, max: 12 },
  escapa: { nome: "Escapa do círculo", min: 2, max: 10 },
  ringue: { nome: "Batalha no ringue", min: 3, max: 12 },
};
export const MEDIDAS = {
  views: "views do mês",
  subs: "subscritores",
  indice: "Índice de Influência",
  total: "views totais",
  subsMes: "subscritores ganhos no mês",
  crescimento: "crescimento",
};
const ESTADOS = ["ativa", "acabou", "removida", "aceite", "recusada"];

export function regrasBase() {
  return {
    novas: true, // aceitar sugestões novas
    max: 3, // no máximo no site ao mesmo tempo
    dias: 14, // quanto tempo cada uma fica no ar
    minVotos: 10, // votos precisos antes de uma sugestão poder sair por "não quero"
    percentagem: 60, // % de "não quero" que a tira do ar
    horas: 24, // tempo entre duas sugestões da mesma conta
    tipos: Object.keys(TIPOS),
    jogos: Object.keys(JOGOS),
    aceites: true, // mostrar no site as sugestões aceites (nos últimos 30 dias)
  };
}

const num = (x, a, b, d) => (Number.isFinite(Number(x)) ? Math.max(a, Math.min(b, Math.round(Number(x)))) : d);

export function limparRegras(r = {}) {
  const b = regrasBase();
  const lista = (x, todos, d) => (Array.isArray(x) ? x.filter((t) => todos.includes(t)) : d);
  return {
    novas: r.novas === undefined ? b.novas : Boolean(r.novas),
    max: num(r.max, 1, 10, b.max),
    dias: num(r.dias, 1, 60, b.dias),
    minVotos: num(r.minVotos, 1, 1000, b.minVotos),
    percentagem: num(r.percentagem, 50, 100, b.percentagem),
    horas: num(r.horas, 0, 720, b.horas),
    tipos: lista(r.tipos, Object.keys(TIPOS), b.tipos),
    jogos: lista(r.jogos, Object.keys(JOGOS), b.jogos),
    aceites: r.aceites === undefined ? b.aceites : Boolean(r.aceites),
  };
}

export async function lerRegras() {
  return limparRegras((await getJSON(CHAVE_REGRAS, null)) || {});
}
export async function guardarRegras(r) {
  const limpas = limparRegras(r);
  await setJSON(CHAVE_REGRAS, limpas);
  return limpas;
}

function erro(status, msg) {
  return Object.assign(new Error(msg), { status });
}

function exigirSupabase() {
  if (!supabaseConfigurado()) throw erro(400, "As sugestões precisam do Supabase.");
}

/** Erro claro quando faltam as tabelas novas (o schema.sql tem de correr outra vez). */
async function supa(caminho, opcoes) {
  try {
    return await pedidoSupabase(caminho, opcoes);
  } catch (e) {
    if (/PGRST20[0-9]|42P01|relation .* does not exist|Could not find the table|schema cache/.test(e.message || "")) {
      throw erro(400, "A base de dados precisa das tabelas das sugestões: no Supabase, SQL Editor, corre outra vez o ficheiro supabase/schema.sql (não apaga nada).");
    }
    throw e;
  }
}

// ---------- Contas (anónimas) ----------

/** Um "sal" ao acaso, criado uma vez e guardado só no servidor. */
async function sal() {
  let s = await getJSON(CHAVE_SAL, null);
  if (!s?.v) {
    s = { v: crypto.randomBytes(32).toString("hex") };
    await setJSON(CHAVE_SAL, s);
  }
  return s.v;
}

/** O código anónimo de uma conta: não dá para voltar ao id nem ao email. */
async function anonimo(idConta) {
  return crypto.createHmac("sha256", await sal()).update(String(idConta)).digest("hex").slice(0, 40);
}

/**
 * Confirma no Supabase o token da sessão do visitante. Só contas Google (como nas votações:
 * assim não se fazem contas falsas em série). Devolve o código anónimo da conta.
 */
export async function contaDoToken(token) {
  exigirSupabase();
  if (!token || typeof token !== "string" || token.length > 4000) throw erro(401, "Entra com a tua conta Google.");
  const chave = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const r = await fetch(`${urlSupabase()}/auth/v1/user`, { headers: { apikey: chave, authorization: `Bearer ${token}` } }).catch(() => null);
  if (!r || r.status === 401 || r.status === 403) throw erro(401, "A sessão expirou. Entra outra vez com a conta Google.");
  if (!r.ok) throw erro(502, "Não foi possível confirmar a conta. Tenta daqui a pouco.");
  const u = await r.json().catch(() => ({}));
  const app = u.app_metadata || {};
  const google = app.provider === "google" || (Array.isArray(app.providers) && app.providers.includes("google"));
  if (!u.id || u.is_anonymous || !google) throw erro(403, "Só contas Google podem sugerir e votar.");
  return anonimo(u.id);
}

// ---------- Validar uma sugestão ----------

const lista = (x) => (Array.isArray(x) ? x : String(x || "").split(",")).map((s) => String(s).trim()).filter(Boolean);

/**
 * Limpa o que o visitante escolheu (só Youtubers que aparecem na página pública) e faz o título.
 * Não há texto livre: o título sai das escolhas.
 */
export function validarSugestao(s, regras, pessoas) {
  const tipo = String(s?.tipo || "");
  if (!TIPOS[tipo] || !regras.tipos.includes(tipo)) throw erro(400, "Este tipo de sugestão não está disponível.");
  const d = s.dados || {};
  const nome = (id) => pessoas.get(id)?.name || id;
  const so = (ids, min, max, oque) => {
    const l = [...new Set(lista(ids))];
    if (l.some((id) => !pessoas.has(id))) throw erro(400, "Há um Youtuber que não está disponível. Escolhe outra vez.");
    if (l.length < min) throw erro(400, `Escolhe pelo menos ${min} Youtubers${oque ? ` ${oque}` : ""}.`);
    if (l.length > max) throw erro(400, `No máximo ${max} Youtubers${oque ? ` ${oque}` : ""}.`);
    return l;
  };
  const juntar = (ids) => (ids.length <= 3 ? ids.map(nome).join(", ").replace(/, ([^,]*)$/, " e $1") : `${ids.slice(0, 2).map(nome).join(", ")} e mais ${ids.length - 2}`);
  if (tipo === "top") {
    const medida = MEDIDAS[d.medida] ? d.medida : "views";
    const pessoasTop = d.pessoas?.length ? so(d.pessoas, 3, 20, "no top") : [];
    const n = pessoasTop.length || [5, 10, 15, 20].find((x) => x === Number(d.n)) || 10;
    const cat = pessoasTop.length ? "" : String(d.cat || "").slice(0, 60);
    const titulo = pessoasTop.length ? `Top ${n} por ${MEDIDAS[medida]}: ${juntar(pessoasTop)}` : `Top ${n}${cat ? ` de ${cat}` : ""} por ${MEDIDAS[medida]}`;
    return { tipo, titulo, dados: { medida, n, ...(cat ? { cat } : {}), ...(pessoasTop.length ? { pessoas: pessoasTop } : {}) } };
  }
  if (tipo === "batalha") {
    const [a, b] = so([d.a, d.b], 2, 2, "para a batalha");
    return { tipo, titulo: `${nome(a)} vs ${nome(b)}`, dados: { a, b } };
  }
  if (tipo === "torneio") {
    const ids = so(d.pessoas, 8, 8, "no torneio");
    return { tipo, titulo: `Torneio com ${juntar(ids)}`, dados: { pessoas: ids } };
  }
  if (tipo === "simulacao") {
    const jogo = JOGOS[d.jogo] && regras.jogos.includes(d.jogo) ? d.jogo : null;
    if (!jogo) throw erro(400, "Escolhe um jogo.");
    const ids = so(d.pessoas, JOGOS[jogo].min, JOGOS[jogo].max, "neste jogo");
    return { tipo, titulo: `${JOGOS[jogo].nome} com ${juntar(ids)}`, dados: { jogo, pessoas: ids } };
  }
  const [id] = so([d.id], 1, 1, "");
  return { tipo, titulo: `A história de ${nome(id)} no YouTube`, dados: { id } };
}

/** Uma impressão das escolhas, para não haver duas sugestões iguais no ar. */
function impressao(tipo, dados) {
  const d = { ...dados };
  if (tipo === "batalha") return `batalha:${[d.a, d.b].sort().join(",")}`;
  if (Array.isArray(d.pessoas)) d.pessoas = [...d.pessoas].sort();
  return `${tipo}:${JSON.stringify(Object.keys(d).sort().map((k) => [k, d[k]]))}`;
}

// ---------- Ler ----------

const lt = (ids) => ids.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",");

async function contarVotos(ids) {
  const c = Object.fromEntries(ids.map((id) => [id, { quero: 0, nao: 0 }]));
  if (!ids.length) return c;
  for (let i = 0; i < ids.length; i += 60) {
    const parte = ids.slice(i, i + 60);
    const linhas = (await supa(`sugestao_votos?select=sugestao_id,quer&sugestao_id=in.(${lt(parte)})&limit=100000`)) || [];
    for (const v of linhas) if (c[v.sugestao_id]) c[v.sugestao_id][v.quer ? "quero" : "nao"]++;
  }
  return c;
}

const percentNao = (v) => (v.quero + v.nao ? Math.round((v.nao / (v.quero + v.nao)) * 100) : 0);

/** As que passaram o prazo acabam (vão para o painel) e as com muitos "não quero" saem do ar. */
async function arrumar(regras, ativas, votos) {
  const agora = Date.now();
  const mudadas = [];
  for (const s of ativas) {
    const v = votos[s.id] || { quero: 0, nao: 0 };
    let novo = null;
    let motivo = "";
    if (v.quero + v.nao >= regras.minVotos && percentNao(v) >= regras.percentagem) {
      novo = "removida";
      motivo = `O público não quis (${percentNao(v)}% de "não quero" em ${v.quero + v.nao} votos).`;
    } else if (Date.parse(s.fecha) <= agora) {
      novo = "acabou";
      motivo = "Acabou o prazo.";
    }
    if (novo) {
      await supa(`sugestoes?id=eq.${encodeURIComponent(s.id)}&estado=eq.ativa`, { metodo: "PATCH", corpo: { estado: novo, motivo, votos_final: v }, prefer: "return=minimal" });
      Object.assign(s, { estado: novo, motivo, votos_final: v });
      mudadas.push(s);
    }
  }
  return mudadas;
}

async function ativasArrumadas(regras) {
  const ativas = (await supa(`sugestoes?select=*&estado=eq.ativa&order=criado.asc&limit=100`)) || [];
  const votos = await contarVotos(ativas.map((s) => s.id));
  await arrumar(regras, ativas, votos);
  return { ativas: ativas.filter((s) => s.estado === "ativa"), votos };
}

/** O que o site mostra de uma sugestão (nunca quem a fez). */
function publica(s, v, extra = {}) {
  const votos = v || s.votos_final || { quero: 0, nao: 0 };
  return { id: s.id, tipo: s.tipo, titulo: s.titulo, dados: s.dados || {}, criado: s.criado, fecha: s.fecha, estado: s.estado, decidido: s.decidido || null, quero: votos.quero, nao: votos.nao, ...extra };
}

/** Os dados para a página pública. Com a conta (código anónimo): as minhas e os meus votos. */
export async function estadoPublico({ conta = null, pessoas } = {}) {
  const regras = await lerRegras();
  if (!supabaseConfigurado()) return { ligado: false, regras, ativas: [], aceites: [] };
  const { ativas, votos } = await ativasArrumadas(regras);
  let aceites = [];
  if (regras.aceites) {
    const desde = Date.now() - 30 * 864e5;
    aceites = ((await supa(`sugestoes?select=*&estado=eq.aceite&order=decidido.desc&limit=6`)) || []).filter((s) => Date.parse(s.decidido || s.criado) >= desde).slice(0, 3);
  }
  const out = {
    ligado: true,
    regras: { novas: regras.novas, max: regras.max, dias: regras.dias, minVotos: regras.minVotos, percentagem: regras.percentagem, horas: regras.horas, tipos: regras.tipos, jogos: regras.jogos },
    ativas: ativas.map((s) => publica(s, votos[s.id])),
    aceites: aceites.map((s) => publica(s)),
    tipos: TIPOS,
    jogos: Object.fromEntries(Object.entries(JOGOS).filter(([k]) => regras.jogos.includes(k))),
    medidas: MEDIDAS,
  };
  if (conta) {
    const meus = ativas.length ? (await supa(`sugestao_votos?select=sugestao_id,quer&autor=eq.${conta}&sugestao_id=in.(${lt(ativas.map((s) => s.id))})`)) || [] : [];
    const voto = Object.fromEntries(meus.map((v) => [v.sugestao_id, v.quer]));
    out.ativas = out.ativas.map((s, i) => ({ ...s, minha: ativas[i].autor === conta, meuVoto: voto[s.id] ?? null }));
    // Quando pode sugerir outra vez
    const ultima = ((await supa(`sugestoes?select=criado,estado&autor=eq.${conta}&order=criado.desc&limit=1`)) || [])[0];
    const proxima = ultima ? Date.parse(ultima.criado) + regras.horas * 3600e3 : 0;
    out.eu = { temAtiva: ativas.some((s) => s.autor === conta), podeDepois: proxima > Date.now() ? new Date(proxima).toISOString() : null };
  }
  // Nome e foto dos Youtubers das sugestões (só os que aparecem na página pública)
  if (pessoas) {
    const ids = new Set([...out.ativas, ...out.aceites].flatMap((s) => idsDe(s)));
    out.pessoas = Object.fromEntries([...ids].filter((id) => pessoas.has(id)).map((id) => [id, { name: pessoas.get(id).name, photo: pessoas.get(id).photo || "", category: pessoas.get(id).category || "" }]));
  }
  return out;
}

export function idsDe(s) {
  const d = s.dados || {};
  return [...(d.pessoas || []), d.a, d.b, d.id].filter(Boolean);
}

// ---------- Criar e votar ----------

export async function criarSugestao({ conta, sugestao, pessoas }) {
  exigirSupabase();
  const regras = await lerRegras();
  if (!regras.novas) throw erro(403, "As sugestões novas estão fechadas por agora.");
  const { tipo, titulo, dados } = validarSugestao(sugestao, regras, pessoas);
  const { ativas } = await ativasArrumadas(regras);
  if (ativas.some((s) => s.autor === conta)) throw erro(409, "Já tens uma sugestão no ar. Espera que acabe para sugerir outra.");
  if (ativas.length >= regras.max) throw erro(409, `Já há ${regras.max} sugestões no site (o máximo). Quando uma sair, abre um lugar.`);
  const marca = impressao(tipo, dados);
  if (ativas.some((s) => impressao(s.tipo, s.dados || {}) === marca)) throw erro(409, "Já há uma sugestão igual no ar. Vota nela!");
  if (regras.horas) {
    const ultima = ((await supa(`sugestoes?select=criado&autor=eq.${conta}&order=criado.desc&limit=1`)) || [])[0];
    if (ultima && Date.parse(ultima.criado) + regras.horas * 3600e3 > Date.now()) {
      const h = Math.ceil((Date.parse(ultima.criado) + regras.horas * 3600e3 - Date.now()) / 3600e3);
      throw erro(429, `Só podes fazer uma sugestão a cada ${regras.horas} horas. Tenta daqui a ${h} ${h === 1 ? "hora" : "horas"}.`);
    }
  }
  const agora = new Date();
  const linha = { autor: conta, tipo, titulo, dados, estado: "ativa", motivo: "", criado: agora.toISOString(), fecha: new Date(agora.getTime() + regras.dias * 864e5).toISOString() };
  const [nova] = (await supa("sugestoes", { metodo: "POST", corpo: linha, prefer: "return=representation" })) || [];
  if (!nova?.id) throw erro(500, "Não foi possível guardar a sugestão.");
  // Quem sugere quer ver, claro
  await supa("sugestao_votos?on_conflict=chave", { metodo: "POST", corpo: { chave: `${nova.id}|${conta}`, sugestao_id: nova.id, autor: conta, quer: true }, prefer: "resolution=merge-duplicates,return=minimal" });
  return nova;
}

/** quer: true ("quero"), false ("não quero") ou null (tirar o voto). */
export async function votarSugestao({ conta, id, quer }) {
  exigirSupabase();
  const regras = await lerRegras();
  const s = ((await supa(`sugestoes?select=*&id=eq.${encodeURIComponent(String(id))}&limit=1`)) || [])[0];
  if (!s || s.estado !== "ativa" || Date.parse(s.fecha) <= Date.now()) throw erro(404, "Esta sugestão já não está no ar.");
  const chave = `${s.id}|${conta}`;
  if (quer === null || quer === undefined) await supa(`sugestao_votos?chave=eq.${encodeURIComponent(chave)}`, { metodo: "DELETE", prefer: "return=minimal" });
  else await supa("sugestao_votos?on_conflict=chave", { metodo: "POST", corpo: { chave, sugestao_id: s.id, autor: conta, quer: Boolean(quer) }, prefer: "resolution=merge-duplicates,return=minimal" });
  const votos = await contarVotos([s.id]);
  const [saiu] = await arrumar(regras, [s], votos);
  return { saiu: saiu ? saiu.estado : null };
}

// ---------- Painel ----------

export async function listarParaPainel() {
  const regras = await lerRegras();
  if (!supabaseConfigurado()) return { ligado: false, regras, lista: [], contagem: {} };
  await ativasArrumadas(regras);
  const linhas = (await supa(`sugestoes?select=*&order=criado.desc&limit=300`)) || [];
  const vivas = linhas.filter((s) => s.estado === "ativa" || !s.votos_final);
  const votos = await contarVotos(vivas.map((s) => s.id));
  const lista = linhas.map((s) => ({ ...publica(s, votos[s.id] || s.votos_final), motivo: s.motivo || "", palco: TIPOS[s.tipo]?.palco || s.dados?.jogo || "" }));
  const contagem = Object.fromEntries(ESTADOS.map((e) => [e, lista.filter((s) => s.estado === e).length]));
  return { ligado: true, regras, lista, contagem, tipos: TIPOS, jogos: JOGOS, medidas: MEDIDAS };
}

/** Quantas acabaram e esperam pela decisão (para o número ao lado de "Sugestões" no painel). */
export async function porDecidir() {
  if (!supabaseConfigurado()) return 0;
  try {
    const regras = await lerRegras();
    await ativasArrumadas(regras);
    return ((await pedidoSupabase(`sugestoes?select=id&estado=eq.acabou&limit=200`)) || []).length;
  } catch {
    return 0;
  }
}

/** Aceitar, recusar, tirar do ar, acabar já ou apagar. */
export async function mudarSugestao(id, estado) {
  exigirSupabase();
  const s = ((await supa(`sugestoes?select=*&id=eq.${encodeURIComponent(String(id))}&limit=1`)) || [])[0];
  if (!s) throw erro(404, "Sugestão não encontrada.");
  if (estado === "apagar") {
    await supa(`sugestoes?id=eq.${encodeURIComponent(s.id)}`, { metodo: "DELETE", prefer: "return=minimal" });
    return { apagada: true };
  }
  const motivos = { removida: "Tirada do ar no painel.", acabou: "Acabada mais cedo no painel.", aceite: s.motivo || "", recusada: s.motivo || "", ativa: "" };
  if (!(estado in motivos)) throw erro(400, "Estado desconhecido.");
  const corpo = { estado, motivo: motivos[estado] };
  if (estado === "aceite" || estado === "recusada") corpo.decidido = new Date().toISOString();
  // Ao sair do ar, guardam-se os votos desse momento
  if (s.estado === "ativa" && estado !== "ativa") corpo.votos_final = (await contarVotos([s.id]))[s.id];
  if (estado === "ativa") {
    if (s.estado !== "removida" || !/painel/.test(s.motivo || "")) throw erro(400, "Só uma sugestão tirada do ar no painel pode voltar.");
    corpo.votos_final = null;
    if (Date.parse(s.fecha) <= Date.now()) throw erro(400, "Esta sugestão já passou o prazo.");
  }
  await supa(`sugestoes?id=eq.${encodeURIComponent(s.id)}`, { metodo: "PATCH", corpo, prefer: "return=minimal" });
  return { ok: true };
}
