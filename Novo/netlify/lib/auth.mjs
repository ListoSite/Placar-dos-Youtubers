// Autenticação do painel.
// A palavra-passe fica na variável de ambiente ADMIN_PASSWORD (definida no Netlify) e serve também
// para assinar as sessões. Com GOOGLE_CLIENT_ID e ADMIN_EMAILS, entra-se com a conta Google:
// o servidor confirma a assinatura do Google e se o email está na lista.
// Depois do login, o browser guarda um token assinado que dura 30 dias.

import crypto from "node:crypto";

const DAY = 24 * 60 * 60 * 1000;

// Chave das sessões: ADMIN_SECRET se existir; senão deriva-se da palavra-passe com scrypt (lento de propósito,
// para que um token roubado não sirva para adivinhar a palavra-passe depressa).
let chaveCache = null;
function secret() {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  const pass = process.env.ADMIN_PASSWORD || "";
  if (chaveCache?.pass !== pass) chaveCache = { pass, chave: crypto.scryptSync(pass, "placar-sessoes-v2", 32, { N: 1 << 14, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex") };
  return chaveCache.chave;
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function adminEnabled() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(password) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real || typeof password !== "string") return false;
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 30 * DAY })).toString("base64url");
  return payload + "." + sign(payload);
}

export function verifyToken(token) {
  if (!adminEnabled() || typeof token !== "string") return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (expected.length !== sig.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export function tokenFromRequest(req) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

// ---------- Login com Google ----------
const CERTS_GOOGLE = process.env.GOOGLE_CERTS_URL || "https://www.googleapis.com/oauth2/v3/certs";
let cacheChaves = { ate: 0, chaves: [] };

/** O "ID do cliente" OAuth do Google Cloud (é público: vai para o browser). */
export function googleClientId() {
  return (process.env.GOOGLE_CLIENT_ID || "").trim();
}

/** Os emails que podem entrar no painel (ADMIN_EMAILS, separados por vírgulas). */
export function emailsAdmin() {
  return (process.env.ADMIN_EMAILS || "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function googleLigado() {
  return Boolean(adminEnabled() && googleClientId() && emailsAdmin().length);
}

async function chavesGoogle() {
  if (cacheChaves.ate > Date.now() && cacheChaves.chaves.length) return cacheChaves.chaves;
  const r = await fetch(CERTS_GOOGLE);
  if (!r.ok) throw new Error("Não foi possível falar com o Google. Tenta outra vez.");
  const j = await r.json();
  const idade = Number(/max-age=(\d+)/.exec(r.headers.get("cache-control") || "")?.[1]) || 3600;
  cacheChaves = { ate: Date.now() + idade * 1000, chaves: j.keys || [] };
  return cacheChaves.chaves;
}

/**
 * Confirma o "ID token" que o botão do Google devolve e devolve o email.
 * Lança um erro com uma mensagem para mostrar se o token não for válido ou o email não tiver acesso.
 */
export async function verificarGoogle(idToken, { chaves, agora = Date.now() } = {}) {
  const partes = typeof idToken === "string" ? idToken.split(".") : [];
  if (partes.length !== 3) throw new Error("Resposta do Google inválida.");
  const [h, p, sig] = partes;
  let cab, dados;
  try {
    cab = JSON.parse(Buffer.from(h, "base64url").toString());
    dados = JSON.parse(Buffer.from(p, "base64url").toString());
  } catch {
    throw new Error("Resposta do Google inválida.");
  }
  if (cab.alg !== "RS256") throw new Error("Resposta do Google inválida.");
  const lista = chaves || (await chavesGoogle());
  const jwk = lista.find((k) => k.kid === cab.kid);
  if (!jwk) throw new Error("Resposta do Google inválida (chave desconhecida).");
  const chave = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const ok = crypto.verify("RSA-SHA256", Buffer.from(h + "." + p), chave, Buffer.from(sig, "base64url"));
  if (!ok) throw new Error("Resposta do Google inválida (assinatura).");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(dados.iss)) throw new Error("Resposta do Google inválida (emissor).");
  if (dados.aud !== googleClientId()) throw new Error("Este login não é deste site (ID do cliente diferente).");
  if (!(Number(dados.exp) * 1000 > agora)) throw new Error("O login do Google expirou. Tenta outra vez.");
  const email = String(dados.email || "").toLowerCase();
  if (!email || dados.email_verified !== true) throw new Error("A conta Google não tem um email confirmado.");
  if (!emailsAdmin().includes(email)) throw new Error(`A conta ${email} não tem acesso ao painel.`);
  return email;
}
