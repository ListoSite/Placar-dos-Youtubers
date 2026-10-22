// Formatação de números, datas e texto (português de Portugal).

const nf = new Intl.NumberFormat("pt-PT");
const nf1 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Número completo com separadores: 1 234 567 */
export function inteiro(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "–";
  return nf.format(Math.round(n));
}

/** Número curto: 9 876 · 345 mil · 12,3 M · 1,23 mil M */
export function curto(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "–";
  const a = Math.abs(n);
  if (a < 10000) return nf.format(Math.round(n));
  if (a < 1e6) return nf.format(Math.round(n / 1000)) + " mil";
  if (a < 1e7) return nf2.format(n / 1e6) + " M";
  if (a < 1e9) return nf1.format(n / 1e6) + " M";
  return nf2.format(n / 1e9) + " mil M";
}

/** Para eixos de gráficos (mais compacto). */
export function eixo(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return nf1.format(n / 1e9) + "MM";
  if (a >= 1e6) return nf1.format(n / 1e6) + "M";
  if (a >= 1e3) return nf1.format(n / 1e3) + "K";
  return nf.format(n);
}

export function pct(x, { sinal = false, casas = 0 } = {}) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "–";
  const f = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: casas, minimumFractionDigits: casas });
  const s = f.format(x * 100) + "%";
  return sinal && x > 0 ? "+" + s : s;
}

export function decimal(x, casas = 1) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "–";
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: casas, minimumFractionDigits: casas }).format(x);
}

export function mesNome(m, { curto: c = false, ano = true } = {}) {
  if (!m) return "";
  const [y, mo] = m.split("-").map(Number);
  const nome = (c ? MESES_CURTOS : MESES)[mo - 1];
  if (!ano) return nome;
  return c ? `${nome} ${String(y).slice(2)}` : `${nome} ${y}`;
}

export function mesNomeMaiuscula(m) {
  const s = mesNome(m);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function data(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MESES_CURTOS[d.getMonth()]} ${d.getFullYear()}`;
}

export function ha(iso) {
  if (!iso) return "";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return "agora mesmo";
  const min = s / 60;
  if (min < 60) return `há ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 24) return `há ${Math.round(h)} h`;
  const d = h / 24;
  if (d < 2) return "ontem";
  if (d < 31) return `há ${Math.round(d)} dias`;
  const m = d / 30.4;
  if (m < 12) return `há ${Math.round(m)} ${Math.round(m) === 1 ? "mês" : "meses"}`;
  const y = m / 12;
  return `há ${decimal(y, y < 10 ? 1 : 0)} anos`;
}

export function anos(iso) {
  if (!iso) return null;
  return (Date.now() - Date.parse(iso)) / (365.25 * 86400000);
}

export function duracao(seg) {
  if (!seg) return "";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.floor(seg % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Normaliza texto para pesquisa (sem acentos, minúsculas). */
export function norm(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function plural(n, um, varios) {
  return `${inteiro(n)} ${Math.abs(n) === 1 ? um : varios}`;
}
