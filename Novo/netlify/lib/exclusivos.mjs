// Exclusivos: espetáculos do Palco que os visitantes veem a correr no próprio browser (não são vídeos gravados).
// O painel guarda o espetáculo, as opções, o tema e o formato; a página pública mostra os que estiverem
// visíveis e dentro das datas, e cada visitante carrega em play.

import { getJSON, setJSON, remove } from "./storage.mjs";
import { retratoPublico } from "./vitrine.mjs";
import { mesReferencia } from "../../public/assets/js/quem.js";
import { limparRoteiro } from "../../public/assets/js/stage/roteiro.js";

const CHAVE = "exclusivos";

/** Os espetáculos do Palco (o mesmo id que em public/assets/js/stage/stage.js). */
export const ESPETACULOS = {
  revelacao: "Revelação do top",
  corrida: "Corrida das views",
  tier: "Tier list",
  altos: "Altos e baixos",
  barras: "Gráfico de barras",
  categorias: "O bolo das categorias",
  bolhas: "Bolhas",
  linhas: "Linha a linha",
  numeros: "O mês em números",
  votacao: "O público escolheu",
  desafio: "Desafio do Placar",
  quiz: "Quem fez mais?",
  maismenos: "Mais ou menos",
  adivinha: "Adivinha quem é",
  roda: "Roda da sorte",
  batalha: "Batalha",
  torneio: "Torneio",
  cartao: "Cartão de Youtuber",
  historia: "A história de…",
};

const txt = (x, max) => String(x ?? "").trim().slice(0, max);
const data = (x) => (x && !Number.isNaN(Date.parse(x)) ? new Date(x).toISOString() : null);
const cor = (x) => (typeof x === "string" && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i.test(x.trim()) ? x.trim() : null);

function limpar(e, antigo = {}) {
  if (!ESPETACULOS[e.esp]) throw Object.assign(new Error("Espetáculo desconhecido."), { status: 400 });
  const opts = {};
  for (const [k, v] of Object.entries(e.opts && typeof e.opts === "object" ? e.opts : {}).slice(0, 30)) {
    if (/^[a-zA-Z]{1,24}$/.test(k) && ["string", "number"].includes(typeof v)) opts[k] = txt(v, 120);
  }
  const titulo = txt(e.titulo, 100) || ESPETACULOS[e.esp];
  return {
    id: antigo.id || `x${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    criado: antigo.criado || new Date().toISOString(),
    atualizado: new Date().toISOString(),
    titulo,
    texto: txt(e.texto, 400),
    esp: e.esp,
    opts,
    tema: /^[\w-]{1,40}$/.test(e.tema || "") ? e.tema : "rubi",
    cores: (Array.isArray(e.cores) ? e.cores : []).map(cor).filter(Boolean).slice(0, 3),
    formato: e.formato === "9x16" ? "9x16" : "16x9",
    efeitos: e.efeitos === "cores" ? "cores" : "completo",
    velocidade: ["rapido", "normal", "lento"].includes(e.velocidade) ? e.velocidade : "normal",
    visivel: e.visivel !== false,
    desde: data(e.desde),
    ate: data(e.ate),
    roteiro: e.roteiro ? limparRoteiro(e.roteiro) : antigo.roteiro || null,
    // Com retrato: repete-se no site com os números, a sorte e as cenas guardadas
    retrato: e.retrato && typeof e.retrato === "object" ? { publicado: data(e.retrato.publicado), ref: /^\d{4}-\d{2}$/.test(e.retrato.ref || "") ? e.retrato.ref : null } : antigo.retrato || null,
  };
}

const chaveRetrato = (id) => `exclusivos/retrato/${id}`;

/**
 * O retrato de um exclusivo: os números, o histórico, o que foi buscado fora (votações), a semente da
 * sorte e o roteiro, tal como estavam quando o espetáculo correu no painel. Só entram os Youtubers que
 * aparecem no site (e os escolhidos nas opções do espetáculo).
 */
export function prepararRetrato(r, exclusivo, cfg) {
  if (!r?.ds?.people || !Array.isArray(r.ds.people)) throw Object.assign(new Error("Faltam os dados do espetáculo."), { status: 400 });
  const ids = new Set(r.ds.people.map((p) => p.id));
  const roteiro = limparRoteiro(r.roteiro);
  const incluir = new Set();
  for (const v of Object.values(exclusivo.opts || {})) if (ids.has(v)) incluir.add(v);
  for (const c of roteiro.cenas) {
    if (c.cfg?.pessoa && ids.has(c.cfg.pessoa)) incluir.add(c.cfg.pessoa);
    for (const o of Array.isArray(c.cfg?.opcoes) ? c.cfg.opcoes : []) if (o?.id && ids.has(o.id)) incluir.add(o.id);
  }
  const ds = retratoPublico(r.ds, cfg, [...incluir]);
  const retrato = {
    ds,
    historico: r.historico && typeof r.historico === "object" ? r.historico : { pares: {}, pessoas: {}, classicos: [] },
    capturas: r.capturas && typeof r.capturas === "object" ? r.capturas : {},
    semente: Number.isFinite(Number(r.semente)) ? Number(r.semente) >>> 0 : 1,
    roteiro,
  };
  if (JSON.stringify(retrato).length > 4_500_000) throw Object.assign(new Error("Os dados deste espetáculo são grandes demais para guardar."), { status: 413 });
  return { retrato, meta: { publicado: new Date().toISOString(), ref: mesReferencia(ds).ref } };
}

export async function guardarRetrato(id, retrato) {
  await setJSON(chaveRetrato(id), retrato);
}

export async function lerRetrato(id) {
  return getJSON(chaveRetrato(id), null);
}

export async function lerExclusivos() {
  const l = await getJSON(CHAVE, []);
  return Array.isArray(l) ? l : [];
}

/** Cria ou muda um exclusivo. Só mudar o texto ou a visibilidade não mexe no espetáculo. */
export async function guardarExclusivo(e) {
  const lista = await lerExclusivos();
  const i = e?.id ? lista.findIndex((x) => x.id === e.id) : -1;
  const antigo = i >= 0 ? lista[i] : {};
  const novo = limpar({ ...antigo, ...e }, antigo);
  if (i >= 0) lista[i] = novo;
  else lista.unshift(novo);
  await setJSON(CHAVE, lista.slice(0, 100));
  return novo;
}

export async function apagarExclusivo(id) {
  const lista = await lerExclusivos();
  await setJSON(CHAVE, lista.filter((x) => x.id !== id));
  await remove(chaveRetrato(id)).catch(() => {});
}

export async function ordenarExclusivos(ids) {
  const lista = await lerExclusivos();
  const pos = new Map((Array.isArray(ids) ? ids : []).map((id, i) => [id, i]));
  lista.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
  await setJSON(CHAVE, lista);
  return lista;
}

/** Os que a página pública pode mostrar agora (visíveis e dentro das datas), sem notas internas. */
export function exclusivosPublicos(lista, agora = Date.now()) {
  return lista
    .filter((x) => x.visivel && (!x.desde || Date.parse(x.desde) <= agora) && (!x.ate || Date.parse(x.ate) > agora))
    .map(({ id, titulo, texto, esp, opts, tema, cores, formato, efeitos, velocidade, desde, ate, roteiro, retrato }) => ({ id, titulo, texto, esp, nomeEsp: ESPETACULOS[esp], opts, tema, cores, formato, efeitos, velocidade, desde, ate, roteiro, retrato }));
}
