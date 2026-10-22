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
export async function listarVotacoes({ todas = false } = {}) {
  if (!supabaseConfigurado()) return { ligado: false, votacoes: [] };
  const filtro = todas ? "" : "&estado=neq.rascunho";
  const lista = (await pedidoSupabase(`votacoes?select=*&order=criado.desc${filtro}&limit=60`)) || [];
  const agora = Date.now();
  const out = [];
  for (const v of lista) {
    const fechou = v.estado === "fechada" || (v.fecha && Date.parse(v.fecha) <= agora);
    const mostrar = todas || v.mostrar_resultados || fechou;
    const c = mostrar ? await contagens(v.id) : null;
    out.push({ ...v, aberta: v.estado === "aberta" && !fechou && Date.parse(v.abre) <= agora, fechou, votos: c, total: c ? Object.values(c).reduce((a, b) => a + b, 0) : null });
  }
  // Nome e foto dos Youtubers que são opções (a página pública não tem os dados do painel)
  const ids = new Set(out.flatMap((v) => v.opcoes.map((o) => o.pessoa).filter(Boolean)));
  const pessoas = {};
  if (ids.size) for (const p of (await getJSON("dataset"))?.people || []) if (ids.has(p.id)) pessoas[p.id] = { name: p.name, photo: p.photo || "", category: p.category || "" };
  return { ligado: true, votacoes: out, pessoas };
}

const texto = (x, max) => String(x ?? "").trim().slice(0, max);

/** Cria ou muda uma votação. */
export async function guardarVotacao(v, db) {
  exigirSupabase();
  const opcoes = (Array.isArray(v.opcoes) ? v.opcoes : [])
    .map((o) => {
      const p = o.pessoa && db.people[o.pessoa];
      const id = texto(o.id || o.pessoa || o.nome, 80).toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      return id ? { id, nome: texto(o.nome || p?.name || id, 80), ...(p ? { pessoa: p.id } : {}) } : null;
    })
    .filter(Boolean)
    .filter((o, i, a) => a.findIndex((x) => x.id === o.id) === i)
    .slice(0, 40);
  if (!texto(v.titulo, 140)) throw Object.assign(new Error("Falta o título."), { status: 400 });
  if (opcoes.length < 2) throw Object.assign(new Error("Uma votação precisa de pelo menos 2 opções."), { status: 400 });
  const linha = {
    titulo: texto(v.titulo, 140),
    descricao: texto(v.descricao, 600),
    opcoes,
    estado: ["rascunho", "aberta", "fechada"].includes(v.estado) ? v.estado : "aberta",
    fecha: v.fecha && !Number.isNaN(Date.parse(v.fecha)) ? new Date(v.fecha).toISOString() : null,
    mostrar_resultados: v.mostrar_resultados !== false,
  };
  if (v.id) {
    await pedidoSupabase(`votacoes?id=eq.${encodeURIComponent(v.id)}`, { metodo: "PATCH", corpo: linha, prefer: "return=minimal" });
    return v.id;
  }
  const r = await pedidoSupabase(`votacoes`, { metodo: "POST", corpo: linha, prefer: "return=representation" });
  return r?.[0]?.id;
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
