// Conta dos visitantes (login com Google pelo Supabase) e votos.
// Sem bibliotecas: fala diretamente com a API do Supabase. A chave "anon" é pública;
// as regras da base de dados (schema.sql) é que garantem um voto por pessoa.

const CHAVE = "placar-conta";
const VOLTAR = "placar-conta-voltar";

function ler() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || "null");
  } catch {
    return null;
  }
}
function gravar(s) {
  try {
    if (s) localStorage.setItem(CHAVE, JSON.stringify(s));
    else localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
}

/**
 * No regresso do Google, o Supabase volta ao site com os tokens no endereço (#access_token=…).
 * Guarda a sessão e devolve a página para onde ir (ou null se não for um regresso).
 */
export function lerRegressoDoLogin() {
  const h = location.hash.replace(/^#/, "");
  if (!/(^|&)(access_token|error)=/.test(h)) return null;
  const p = new URLSearchParams(h);
  let destino = "#/votar";
  try {
    destino = sessionStorage.getItem(VOLTAR) || destino;
    sessionStorage.removeItem(VOLTAR);
  } catch {
    /* nada */
  }
  if (p.get("access_token")) {
    gravar({ access_token: p.get("access_token"), refresh_token: p.get("refresh_token"), expira: Number(p.get("expires_at")) * 1000 || Date.now() + Number(p.get("expires_in") || 3600) * 1000 });
  }
  history.replaceState(null, "", location.pathname + location.search + destino);
  return { destino, erro: p.get("error_description") || p.get("error") || "" };
}

export function temConta() {
  return Boolean(ler()?.access_token);
}

export function entrarComGoogle(cfg) {
  try {
    sessionStorage.setItem(VOLTAR, location.hash || "#/votar");
  } catch {
    /* nada */
  }
  location.href = `${cfg.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

export async function sairDaConta(cfg) {
  const s = ler();
  gravar(null);
  if (s?.access_token && cfg) {
    fetch(`${cfg.url}/auth/v1/logout`, { method: "POST", headers: { apikey: cfg.anon, authorization: `Bearer ${s.access_token}` } }).catch(() => {});
  }
}

/** Token válido (renova-o se estiver a acabar). */
async function token(cfg) {
  const s = ler();
  if (!s?.access_token) return null;
  if (s.expira && s.expira - Date.now() > 60000) return s.access_token;
  if (!s.refresh_token) return s.access_token;
  const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: cfg.anon, "content-type": "application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
  if (!r.ok) {
    gravar(null);
    return null;
  }
  const j = await r.json();
  gravar({ access_token: j.access_token, refresh_token: j.refresh_token, expira: (j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000) });
  return j.access_token;
}

async function pedido(cfg, caminho, { metodo = "GET", corpo, prefer } = {}) {
  const t = await token(cfg);
  if (!t) {
    const e = new Error("Entra com a tua conta Google para votar.");
    e.semConta = true;
    throw e;
  }
  const r = await fetch(`${cfg.url}${caminho}`, {
    method: metodo,
    headers: { apikey: cfg.anon, authorization: `Bearer ${t}`, "content-type": "application/json", ...(prefer ? { prefer } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (r.status === 401) {
    gravar(null);
    const e = new Error("A sessão expirou. Entra outra vez.");
    e.semConta = true;
    throw e;
  }
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    const e = new Error(dados?.message || `Erro ${r.status}`);
    e.status = r.status;
    e.codigo = dados?.code;
    throw e;
  }
  return dados;
}

/** Nome e foto da conta Google. */
export async function quemSou(cfg) {
  if (!temConta()) return null;
  try {
    const u = await pedido(cfg, "/auth/v1/user");
    const m = u.user_metadata || {};
    return { id: u.id, nome: m.full_name || m.name || u.email || "Conta Google", foto: m.avatar_url || m.picture || "", email: u.email || "" };
  } catch {
    return null;
  }
}

/** Os votos desta conta: { votacaoId: opcao }. */
export async function meusVotos(cfg) {
  if (!temConta()) return {};
  try {
    const r = await pedido(cfg, "/rest/v1/votos?select=votacao_id,opcao");
    return Object.fromEntries((r || []).map((x) => [x.votacao_id, x.opcao]));
  } catch {
    return {};
  }
}

export async function votar(cfg, votacaoId, opcao) {
  try {
    await pedido(cfg, "/rest/v1/votos", { metodo: "POST", corpo: { votacao_id: votacaoId, opcao }, prefer: "return=minimal" });
  } catch (e) {
    if (e.status === 409 || e.codigo === "23505") throw new Error("Já votaste nesta votação.");
    if (e.status === 403 || e.codigo === "42501") throw new Error("Esta votação já não aceita votos.");
    throw e;
  }
}
