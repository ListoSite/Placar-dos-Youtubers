// Votações: criadas na área de edição, votadas pelos visitantes com a conta Google.
// Os votos vão diretamente do browser para o Supabase (com as regras do schema.sql:
// um voto por pessoa e por votação). Aqui o servidor lista as votações com as contagens
// e cria, muda ou apaga votações (com a chave service_role).

import { pedidoSupabase, supabaseConfigurado, getJSON, urlSupabase } from "./storage.mjs";
import { googleClientId } from "./auth.mjs";

export function exigirSupabase() {
  if (!supabaseConfigurado()) {
    const e = new Error("As votações precisam do Supabase. Segue os passos em Editar, Definições, Base de dados.");
    e.status = 400;
    throw e;
  }
}

async function contagens(id) {
  const r = (await pedidoSupabase(`rpc/resultados_votacao`, { metodo: "POST", corpo: { v: id } })) || [];
  return Object.fromEntries(r.map((x) => [x.opcao, Number(x.votos)]));
}

/** Votações com contagens. Público: só as publicadas. */
export const TIPOS = ["escolha", "melhor", "favorito", "confronto", "desafiante", "torneio", "previsao"];

/** Erro claro quando o Supabase ainda não tem as colunas novas (o schema.sql tem de correr outra vez). */
async function supa(caminho, opcoes) {
  try {
    return await pedidoSupabase(caminho, opcoes);
  } catch (e) {
    if (/PGRST204|column .* does not exist|Could not find the '/.test(e.message || "")) {
      throw Object.assign(new Error("A base de dados precisa das colunas novas das votações: no Supabase, SQL Editor, corre outra vez o ficheiro supabase/schema.sql (não apaga nada)."), { status: 400 });
    }
    throw e;
  }
}

export async function listarVotacoes({ todas = false } = {}) {
  if (!supabaseConfigurado()) return { ligado: false, votacoes: [] };
  const filtro = todas ? "" : "&estado=neq.rascunho";
  const lista = (await supa(`votacoes?select=*&order=criado.desc${filtro}&limit=300`)) || [];
  const agora = Date.now();
  const out = await pool(lista, 8, async (v) => {
    const fechou = v.estado === "fechada" || (v.fecha && Date.parse(v.fecha) <= agora);
    const mostrar = todas || v.mostrar_resultados || fechou;
    const c = mostrar ? await contagens(v.id) : null;
    return { ...v, tipo: v.tipo || "escolha", extra: v.extra || {}, aberta: v.estado === "aberta" && !fechou && Date.parse(v.abre) <= agora, fechou, votos: c, total: c ? Object.values(c).reduce((a, b) => a + b, 0) : null };
  });
  // Nome e foto dos Youtubers que são opções (a página pública não tem os dados do painel)
  const ids = new Set(out.flatMap((v) => [...v.opcoes.map((o) => o.pessoa), v.extra?.contra].filter(Boolean)));
  const pessoas = {};
  if (ids.size) for (const p of (await getJSON("dataset"))?.people || []) if (ids.has(p.id)) pessoas[p.id] = { name: p.name, photo: p.photo || "", category: p.category || "" };
  return { ligado: true, votacoes: out, pessoas };
}

async function pool(lista, n, f) {
  const out = new Array(lista.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, lista.length) }, async () => {
      while (i < lista.length) {
        const k = i++;
        out[k] = await f(lista[k]);
      }
    }),
  );
  return out;
}

const texto = (x, max) => String(x ?? "").trim().slice(0, max);
const idOpcao = (x) => texto(x, 80).toLowerCase().replace(/[^a-z0-9._-]+/g, "-");

function limparOpcoes(lista, db, max = 400) {
  return (Array.isArray(lista) ? lista : [])
    .map((o) => {
      const p = o?.pessoa && db.people[o.pessoa];
      const id = idOpcao(o?.id || o?.pessoa || o?.nome);
      return id ? { id, nome: texto(o.nome || p?.name || id, 80), ...(p ? { pessoa: p.id } : {}) } : null;
    })
    .filter(Boolean)
    .filter((o, i, a) => a.findIndex((x) => x.id === o.id) === i)
    .slice(0, max);
}

function limparExtra(e) {
  if (!e || typeof e !== "object") return {};
  const out = {};
  for (const k of ["contra", "metrica", "mes", "nomeGrupo", "campeao", "explicacao"]) if (typeof e[k] === "string") out[k] = texto(e[k], 300);
  for (const k of ["pos", "rondas", "participantes"]) if (Number.isFinite(Number(e[k]))) out[k] = Number(e[k]);
  return out;
}

/** Cria ou muda uma votação (de qualquer tipo). */
export async function guardarVotacao(v, db) {
  exigirSupabase();
  const tipo = TIPOS.includes(v.tipo) ? v.tipo : "escolha";
  const opcoes = limparOpcoes(v.opcoes, db, tipo === "favorito" ? 400 : 60);
  if (!texto(v.titulo, 140)) throw Object.assign(new Error("Falta o título."), { status: 400 });
  if (opcoes.length < 2) throw Object.assign(new Error("Uma votação precisa de pelo menos 2 opções."), { status: 400 });
  if ((tipo === "confronto" || tipo === "torneio") && opcoes.length !== 2) throw Object.assign(new Error("Um confronto tem exatamente 2 opções."), { status: 400 });
  const linha = {
    titulo: texto(v.titulo, 140),
    descricao: texto(v.descricao, 600),
    opcoes,
    tipo,
    modo: ["decide", "previsao"].includes(v.modo) ? v.modo : null,
    extra: limparExtra(v.extra),
    estado: ["rascunho", "aberta", "fechada"].includes(v.estado) ? v.estado : "aberta",
    fecha: v.fecha && !Number.isNaN(Date.parse(v.fecha)) ? new Date(v.fecha).toISOString() : null,
    mostrar_resultados: v.mostrar_resultados !== false,
  };
  if (v.grupo) linha.grupo = texto(v.grupo, 40);
  if (Number.isFinite(Number(v.ronda))) linha.ronda = Number(v.ronda);
  if (v.id) {
    await supa(`votacoes?id=eq.${encodeURIComponent(v.id)}`, { metodo: "PATCH", corpo: linha, prefer: "return=minimal" });
    return v.id;
  }
  const r = await supa(`votacoes`, { metodo: "POST", corpo: linha, prefer: "return=representation" });
  return r?.[0]?.id;
}

/** Muda só o estado de uma votação (abrir, fechar, rascunho). */
export async function mudarEstado(id, estado) {
  exigirSupabase();
  if (!["rascunho", "aberta", "fechada"].includes(estado)) throw Object.assign(new Error("Estado inválido."), { status: 400 });
  await supa(`votacoes?id=eq.${encodeURIComponent(id)}`, { metodo: "PATCH", corpo: { estado }, prefer: "return=minimal" });
}

/** Marca a opção certa (previsões) ou vencedora (o público decidiu). */
export async function resolverVotacao(id, resultado, { fechar = true } = {}) {
  exigirSupabase();
  const v = (await supa(`votacoes?id=eq.${encodeURIComponent(id)}&select=*`))?.[0];
  if (!v) throw Object.assign(new Error("Votação não encontrada."), { status: 404 });
  if (resultado && !v.opcoes.some((o) => o.id === resultado)) throw Object.assign(new Error("Essa opção não existe nesta votação."), { status: 400 });
  await supa(`votacoes?id=eq.${encodeURIComponent(id)}`, { metodo: "PATCH", corpo: { resultado: resultado || null, ...(fechar ? { estado: "fechada" } : {}) }, prefer: "return=minimal" });
}

/** Torneio: cada confronto é uma votação do mesmo grupo. A ronda 1 junta os participantes pela ordem dada (1.º com o último…). */
export async function criarTorneio(t, db) {
  exigirSupabase();
  const nomes = limparOpcoes((t.participantes || []).map((id) => ({ pessoa: id })), db, 32);
  const n = nomes.length;
  if (![4, 8, 16].includes(n)) throw Object.assign(new Error("Um torneio tem 4, 8 ou 16 participantes."), { status: 400 });
  const titulo = texto(t.titulo, 100) || "Torneio do Placar";
  const grupo = "t" + Date.now().toString(36);
  const rondas = Math.log2(n);
  const pares = [];
  for (let i = 0; i < n / 2; i++) pares.push([nomes[i], nomes[n - 1 - i]]);
  // Ordem da chave: 1.º vs último no topo, 2.º vs penúltimo no fundo, como nos torneios de ténis
  const ordem = chaveOrdem(n / 2).map((k) => pares[k]);
  const fecha = t.fecha && !Number.isNaN(Date.parse(t.fecha)) ? new Date(t.fecha).toISOString() : null;
  let pos = 0;
  for (const [a, b] of ordem) {
    await guardarVotacao(
      {
        titulo: `${a.nome} vs ${b.nome}`,
        descricao: texto(t.descricao, 600),
        opcoes: [a, b],
        tipo: "torneio",
        modo: t.modo === "previsao" ? "previsao" : "decide",
        grupo,
        ronda: 1,
        extra: { nomeGrupo: titulo, pos: pos++, rondas, participantes: n },
        estado: t.estado === "rascunho" ? "rascunho" : "aberta",
        fecha,
        mostrar_resultados: t.mostrar_resultados !== false,
      },
      db,
    );
  }
  return grupo;
}

function chaveOrdem(m) {
  // Posições para que os favoritos só se encontrem no fim (1,8,4,5,2,7,3,6 para 8 pares…)
  let ordem = [0];
  while (ordem.length < m) {
    const tam = ordem.length * 2;
    ordem = ordem.flatMap((x) => [x, tam - 1 - x]);
  }
  return ordem;
}

/** Fecha a ronda atual de um torneio com os vencedores dados e abre a seguinte (ou declara o campeão). */
export async function avancarTorneio(grupo, vencedores, db, { fecha } = {}) {
  exigirSupabase();
  const todas = (await supa(`votacoes?grupo=eq.${encodeURIComponent(grupo)}&select=*&order=ronda.asc`)) || [];
  if (!todas.length) throw Object.assign(new Error("Torneio não encontrado."), { status: 404 });
  const ronda = Math.max(...todas.map((v) => v.ronda || 1));
  const atuais = todas.filter((v) => (v.ronda || 1) === ronda).sort((a, b) => (a.extra?.pos || 0) - (b.extra?.pos || 0));
  const ganhos = [];
  for (const v of atuais) {
    let w = vencedores?.[v.id] || v.resultado;
    // O público decide: sem escolha dada, passa quem tem mais votos (num empate decide quem gere)
    if (!w && v.modo !== "previsao") {
      const c = await contagens(v.id);
      const [a, b] = v.opcoes.map((o) => c[o.id] || 0);
      if (a !== b) w = v.opcoes[a > b ? 0 : 1].id;
    }
    const op = v.opcoes.find((o) => o.id === w);
    if (!op) throw Object.assign(new Error(`Falta escolher o vencedor de ${v.titulo} (empate ou previsão).`), { status: 400 });
    await supa(`votacoes?id=eq.${encodeURIComponent(v.id)}`, { metodo: "PATCH", corpo: { resultado: op.id, estado: "fechada" }, prefer: "return=minimal" });
    ganhos.push(op);
  }
  const base = atuais[0];
  if (ganhos.length === 1) {
    const extra = { ...(base.extra || {}), campeao: ganhos[0].pessoa || ganhos[0].id };
    await supa(`votacoes?id=eq.${encodeURIComponent(base.id)}`, { metodo: "PATCH", corpo: { extra }, prefer: "return=minimal" });
    return { campeao: ganhos[0] };
  }
  const prox = ronda + 1;
  const f = fecha && !Number.isNaN(Date.parse(fecha)) ? new Date(fecha).toISOString() : null;
  for (let i = 0; i < ganhos.length; i += 2) {
    const [a, b] = [ganhos[i], ganhos[i + 1]];
    await guardarVotacao(
      {
        titulo: `${a.nome} vs ${b.nome}`,
        descricao: base.descricao,
        opcoes: [a, b],
        tipo: "torneio",
        modo: base.modo,
        grupo,
        ronda: prox,
        extra: { ...(base.extra || {}), pos: i / 2, campeao: undefined },
        estado: "aberta",
        fecha: f,
        mostrar_resultados: base.mostrar_resultados,
      },
      db,
    );
  }
  return { ronda: prox };
}

export async function apagarTorneio(grupo) {
  exigirSupabase();
  await supa(`votacoes?grupo=eq.${encodeURIComponent(grupo)}`, { metodo: "DELETE", prefer: "return=minimal" });
}

export async function apagarVotacao(id) {
  exigirSupabase();
  await pedidoSupabase(`votacoes?id=eq.${encodeURIComponent(id)}`, { metodo: "DELETE", prefer: "return=minimal" });
}

/** A chave secreta (service_role) nunca pode ir para o browser, mesmo que seja posta em SUPABASE_ANON_KEY por engano. */
function chaveSecreta(k) {
  if (k.startsWith("sb_secret_")) return true;
  try {
    return JSON.parse(Buffer.from(k.split(".")[1] || "", "base64url").toString()).role === "service_role";
  } catch {
    return false;
  }
}

/** Dados públicos para o browser falar com o Supabase (login e votos). A chave anon é pública. */
export function configPublica() {
  const url = urlSupabase();
  const anon = (process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon || chaveSecreta(anon)) return null;
  // Com o ID do cliente Google, o botão do Google aparece no próprio site (a janela mostra o site, não o supabase.co)
  return { url, anon, ...(googleClientId() ? { google: googleClientId() } : {}) };
}
