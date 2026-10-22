// Autenticação da área de edição.
// A palavra-passe fica na variável de ambiente ADMIN_PASSWORD (definida no Netlify).
// Depois do login, o browser guarda um token assinado que dura 30 dias.

import crypto from "node:crypto";

const DAY = 24 * 60 * 60 * 1000;

function secret() {
  const pass = process.env.ADMIN_PASSWORD || "";
  return process.env.ADMIN_SECRET || crypto.createHash("sha256").update("placar|" + pass).digest("hex");
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
