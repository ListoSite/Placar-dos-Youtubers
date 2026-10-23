// A página pública ("vitrine"): o que aparece, onde e como. Tudo é escolhido no painel e
// nada aparece na página pública sem estar ligado aqui.

import { getJSON, setJSON, listKeys } from "./storage.mjs";
import { quemAparece, contextoQuem, regraQuem } from "../../public/assets/js/quem.js";

const CHAVE = "vitrine";

/** As abas possíveis da página pública (a ordem e o nome escolhem-se no painel). */
export const ABAS = [
  { id: "inicio", nome: "Início", icone: "casa" },
  { id: "ranking", nome: "Ranking", icone: "trofeu" },
  { id: "votar", nome: "Votar", icone: "voto" },
  { id: "youtubers", nome: "Youtubers", icone: "pessoas" },
  { id: "videos", nome: "Vídeos", icone: "play" },
  { id: "comparar", nome: "Comparar", icone: "duelo" },
  { id: "categorias", nome: "Categorias", icone: "bolo" },
  { id: "projetos", nome: "Projetos", icone: "serie" },
  { id: "exclusivos", nome: "Exclusivos", icone: "estrela" },
  { id: "sugestoes", nome: "Sugerir", icone: "ideia" },
  { id: "caso", nome: "O Caso", icone: "balanca" },
];

/** Os blocos que se podem pôr no Início (e o que cada um aceita). */
export const BLOCOS = {
  podio: { nome: "Pódio", campos: ["titulo", "periodo", "metrica", "categoria", "animacao"] },
  ranking: { nome: "Tabela do ranking", campos: ["titulo", "periodo", "metrica", "categoria", "n", "estilo", "animacao"] },
  barras: { nome: "Gráfico de barras", campos: ["titulo", "periodo", "metrica", "categoria", "n", "animacao"] },
  evolucao: { nome: "Evolução (linhas)", campos: ["titulo", "periodo", "n", "pessoas", "animacao"] },
  categorias: { nome: "O bolo das categorias", campos: ["titulo", "periodo", "animacao"] },
  numeros: { nome: "O mês em números", campos: ["titulo", "periodo", "animacao"] },
  subidas: { nome: "Quem subiu e quem caiu", campos: ["titulo", "periodo", "n", "animacao"] },
  youtuber: { nome: "Youtuber em destaque", campos: ["titulo", "texto", "periodo", "pessoas", "animacao"] },
  duelo: { nome: "Frente a frente", campos: ["titulo", "periodo", "pessoas", "animacao"] },
  votacao: { nome: "Votação", campos: ["titulo", "votacao", "animacao"] },
  videos: { nome: "Últimos vídeos", campos: ["titulo", "n", "animacao"] },
  hall: { nome: "Hall da fama", campos: ["titulo", "animacao"] },
  exclusivos: { nome: "Exclusivos (play)", campos: ["titulo", "n", "animacao"] },
  noticias: { nome: "Notícias do Caso", campos: ["titulo", "n", "animacao"] },
  texto: { nome: "Texto ou aviso", campos: ["titulo", "texto", "link", "rotuloLink", "estilo", "animacao"] },
};

export const METRICAS = ["views", "media", "crescimento", "subs", "indice", "subsTotal", "viewsTotal", "tiktok"];
export const PERIODOS = ["ultimo", "mes", "ano", "intervalo", "ultimos"];
export const ANIMACOES = ["subir", "revelar", "contar", "crescer", "deslizar", "nenhuma"];
const ESTILOS = ["lista", "cartoes", "destaque", "aviso", "normal"];

const SECOES_PERFIL = ["numeros", "mensal", "diario", "crescimento", "tiktok", "indice", "recordes", "videos", "canais", "palco", "redes", "projetos", "comparar"];

let seq = 0;
const novoId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`;

export function configBase() {
  return {
    versao: 1,
    abas: ABAS.map((a, i) => ({ ...a, visivel: i < 5 })),
    inicio: {
      heroi: { visivel: true, etiqueta: "Os Youtubers portugueses, em números", titulo: "Placar dos Youtubers", texto: "Rankings, batalhas, torneios e clássicos entre os maiores Youtubers de Portugal. Aqui votas e vês os resultados de cada vídeo." },
      blocos: [
        { id: "b-podio", tipo: "podio", titulo: "O pódio do mês", visivel: true, periodo: { tipo: "ultimo" }, metrica: "views", animacao: "revelar" },
        { id: "b-vot", tipo: "votacao", titulo: "", visivel: true, votacao: "abertas", animacao: "subir" },
        { id: "b-top", tipo: "ranking", titulo: "Top 10", visivel: true, periodo: { tipo: "ultimo" }, metrica: "views", n: 10, estilo: "lista", animacao: "subir" },
        { id: "b-num", tipo: "numeros", titulo: "O mês em números", visivel: true, periodo: { tipo: "ultimo" }, animacao: "contar" },
        { id: "b-sub", tipo: "subidas", titulo: "Quem subiu e quem caiu", visivel: true, periodo: { tipo: "ultimo" }, n: 3, animacao: "deslizar" },
        { id: "b-cat", tipo: "categorias", titulo: "O que faz mais views", visivel: true, periodo: { tipo: "ultimo" }, animacao: "crescer" },
        { id: "b-vid", tipo: "videos", titulo: "Os últimos vídeos", visivel: true, n: 4, animacao: "subir" },
      ],
    },
    ranking: { metricas: ["views", "indice", "crescimento", "subs", "media"], escolherPeriodo: true, filtroCategoria: true, periodo: { tipo: "ultimo" }, n: 100, animacao: "subir", movimento: true },
    youtubers: { pesquisa: true, ordem: "indice", categorias: true },
    perfis: { ligado: true, quem: "todos", lista: [], secoes: Object.fromEntries(SECOES_PERFIL.map((s) => [s, s !== "diario"])) },
    comparar: { max: 4 },
    categorias: { periodo: { tipo: "ultimo" }, escolherPeriodo: true },
    projetos: { trabalho: true },
    videos: { publicacoes: true, hall: true, n: 30 },
    votar: { fechadas: true, explicacao: true },
    dados: { escondidos: [], desde: "", ate: "", quem: regraQuem({}) },
    ligacoes: { linkVotar: "", textoBio: "Link na bio", avisoVideos: true },
  };
}

// ---------- Limpeza (o painel manda, mas nada estranho entra) ----------
const txt = (x, max) => String(x ?? "").slice(0, max);
const bool = (x, def) => (typeof x === "boolean" ? x : def);
const um = (x, lista, def) => (lista.includes(x) ? x : def);
const mesOk = (m) => (typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : "");
const idOk = (x) => (typeof x === "string" && /^[\w.-]{1,80}$/.test(x) ? x : "");
const num = (x, min, max, def) => {
  const n = Math.round(Number(x));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const linkOk = (u) => {
  const s = String(u || "").trim();
  return /^https:\/\/[^\s"<>]+$/.test(s) || /^#\/[\w/?=&.-]*$/.test(s) ? s : "";
};

function limparPeriodo(p, def = { tipo: "ultimo" }) {
  if (!p || typeof p !== "object") return { ...def };
  const tipo = um(p.tipo, PERIODOS, def.tipo);
  const out = { tipo };
  if (tipo === "mes") out.mes = mesOk(p.mes);
  if (tipo === "ano") out.ano = num(p.ano, 2005, 2100, new Date().getFullYear());
  if (tipo === "intervalo") {
    out.de = mesOk(p.de);
    out.ate = mesOk(p.ate);
  }
  if (tipo === "ultimos") out.n = num(p.n, 2, 36, 6);
  return out;
}

function limparBloco(b) {
  if (!b || typeof b !== "object" || !BLOCOS[b.tipo]) return null;
  const campos = new Set(BLOCOS[b.tipo].campos);
  const out = { id: idOk(b.id) || novoId(), tipo: b.tipo, visivel: bool(b.visivel, true), titulo: txt(b.titulo, 120) };
  if (campos.has("texto")) out.texto = txt(b.texto, 600);
  if (campos.has("periodo")) out.periodo = limparPeriodo(b.periodo);
  if (campos.has("metrica")) out.metrica = um(b.metrica, METRICAS, "views");
  if (campos.has("categoria")) out.categoria = txt(b.categoria, 60);
  if (campos.has("n")) out.n = num(b.n, 1, 100, 10);
  if (campos.has("estilo")) out.estilo = um(b.estilo, ESTILOS, "lista");
  if (campos.has("animacao")) out.animacao = um(b.animacao, ANIMACOES, "subir");
  if (campos.has("pessoas")) out.pessoas = (Array.isArray(b.pessoas) ? b.pessoas : []).map(idOk).filter(Boolean).slice(0, 8);
  if (campos.has("votacao")) out.votacao = b.votacao === "abertas" || b.votacao === "todas" ? b.votacao : idOk(b.votacao) || "abertas";
  if (campos.has("link")) out.link = linkOk(b.link);
  if (campos.has("rotuloLink")) out.rotuloLink = txt(b.rotuloLink, 40);
  return out;
}

/** Junta o que vem do painel com os valores por defeito e limpa tudo. */
export function limparConfig(c) {
  const base = configBase();
  c = c && typeof c === "object" ? c : {};
  const vistas = new Set();
  const abas = [];
  for (const a of Array.isArray(c.abas) ? c.abas : []) {
    const def = ABAS.find((x) => x.id === a?.id);
    if (!def || vistas.has(def.id)) continue;
    vistas.add(def.id);
    abas.push({ id: def.id, nome: txt(a.nome, 24).trim() || def.nome, icone: def.icone, visivel: bool(a.visivel, true) });
  }
  // Abas que ainda não estavam na configuração (ou configuração nova): com o valor por defeito
  const semAbas = !Array.isArray(c.abas) || !c.abas.length;
  for (const a of base.abas) if (!vistas.has(a.id)) abas.push({ ...a, visivel: semAbas ? a.visivel : false });

  const ci = c.inicio || {};
  const heroi = { ...base.inicio.heroi, ...(ci.heroi || {}) };
  const blocos = Array.isArray(ci.blocos) ? ci.blocos.map(limparBloco).filter(Boolean).slice(0, 40) : base.inicio.blocos;
  const r = { ...base.ranking, ...(c.ranking || {}) };
  const perfis = { ...base.perfis, ...(c.perfis || {}) };
  const secoes = {};
  for (const s of SECOES_PERFIL) secoes[s] = bool(perfis.secoes?.[s], base.perfis.secoes[s]);
  const lig = { ...base.ligacoes, ...(c.ligacoes || {}) };
  const dados = { ...base.dados, ...(c.dados || {}) };
  return {
    versao: 1,
    abas,
    inicio: {
      heroi: { visivel: bool(heroi.visivel, true), etiqueta: txt(heroi.etiqueta, 80), titulo: txt(heroi.titulo, 80), texto: txt(heroi.texto, 400) },
      blocos,
    },
    ranking: {
      metricas: (Array.isArray(r.metricas) ? r.metricas : []).filter((m) => METRICAS.includes(m)).slice(0, 8),
      escolherPeriodo: bool(r.escolherPeriodo, true),
      filtroCategoria: bool(r.filtroCategoria, true),
      periodo: limparPeriodo(r.periodo),
      n: num(r.n, 5, 400, 100),
      animacao: um(r.animacao, ANIMACOES, "subir"),
      movimento: bool(r.movimento, true),
    },
    youtubers: { pesquisa: bool(c.youtubers?.pesquisa, true), ordem: um(c.youtubers?.ordem, ["indice", "nome", "views"], "indice"), categorias: bool(c.youtubers?.categorias, true) },
    perfis: {
      ligado: bool(perfis.ligado, true),
      quem: um(perfis.quem, ["todos", "lista"], "todos"),
      lista: (Array.isArray(perfis.lista) ? perfis.lista : []).map(idOk).filter(Boolean).slice(0, 2000),
      secoes,
    },
    comparar: { max: num(c.comparar?.max, 2, 4, 4) },
    categorias: { periodo: limparPeriodo(c.categorias?.periodo), escolherPeriodo: bool(c.categorias?.escolherPeriodo, true) },
    projetos: { trabalho: bool(c.projetos?.trabalho, true) },
    videos: { publicacoes: bool(c.videos?.publicacoes, true), hall: bool(c.videos?.hall, true), n: num(c.videos?.n, 1, 60, 30) },
    votar: { fechadas: bool(c.votar?.fechadas, true), explicacao: bool(c.votar?.explicacao, true) },
    dados: {
      escondidos: (Array.isArray(dados.escondidos) ? dados.escondidos : []).map(idOk).filter(Boolean).slice(0, 1000),
      quem: regraQuem(dados.quem),
      desde: mesOk(dados.desde),
      ate: mesOk(dados.ate),
    },
    ligacoes: { linkVotar: linkOk(lig.linkVotar), textoBio: txt(lig.textoBio, 60) || "Link na bio", avisoVideos: bool(lig.avisoVideos, true) },
  };
}

export async function lerConfig() {
  return limparConfig(await getJSON(CHAVE, null));
}

export async function guardarConfig(c) {
  const limpo = limparConfig(c);
  await setJSON(CHAVE, { ...limpo, atualizado: new Date().toISOString() });
  return limpo;
}

/** O dataset que vai para a página pública: sem Youtubers escondidos, sem meses fora do período e sem notas internas. */
export function datasetPublico(ds, cfg) {
  if (!ds) return null;
  // Quem passa a regra escolhida no painel (todos, os melhores, ou só os escolhidos) e quem tem perfil
  const { aparece, perfil } = quemAparece(ds, cfg.dados, cfg.perfis, contextoQuem(ds));
  const mesBom = (m) => (!cfg.dados.desde || m >= cfg.dados.desde) && (!cfg.dados.ate || m <= cfg.dados.ate || m === ds.currentMonth);
  const months = ds.months.filter(mesBom);
  const filtrarMeses = (o) => (o ? Object.fromEntries(Object.entries(o).filter(([m]) => mesBom(m))) : o);
  const people = ds.people
    .filter((p) => aparece.has(p.id))
    .map((p) => {
      const { hidden, legacy, updatedAt, ...resto } = p;
      return {
        ...resto,
        ...(perfil.has(p.id) ? {} : { semPerfil: true }),
        monthly: filtrarMeses(p.monthly),
        sb: p.sb ? { ...p.sb, s: filtrarMeses(p.sb.s), n: filtrarMeses(p.sb.n) } : p.sb,
        tt: p.tt ? { ...p.tt, f: filtrarMeses(p.tt.f), l: filtrarMeses(p.tt.l) } : p.tt,
      };
    });
  const vivos = new Set(people.map((p) => p.id));
  return {
    generatedAt: ds.generatedAt,
    today: ds.today,
    currentMonth: ds.currentMonth,
    months: months.length ? months : ds.months.slice(-1),
    settings: { weights: ds.settings.weights, alcanceTopo: ds.settings.alcanceTopo, canal: ds.settings.canal },
    categories: [...new Set(people.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt")),
    people,
    channels: ds.channels.filter((c) => vivos.has(c.personId)),
    projects: ds.projects.filter((p) => vivos.has(p.personId)).map((p) => ({ ...p, guests: (p.guests || []).filter((g) => vivos.has(g)) })),
    meta: { lastDaily: ds.meta?.lastDaily || null, trackingSince: ds.meta?.trackingSince || null },
  };
}

/** O dataset de um exclusivo: o que aparece no site, mais os Youtubers escolhidos no espetáculo. */
export function retratoPublico(ds, cfg, incluir = []) {
  const pub = datasetPublico(ds, cfg);
  const tem = new Set(pub.people.map((p) => p.id));
  for (const id of incluir) {
    const p = ds.people.find((x) => x.id === id);
    if (!p || tem.has(id)) continue;
    const { hidden, legacy, updatedAt, ...resto } = p;
    pub.people.push({ ...resto, semPerfil: true });
    pub.channels.push(...ds.channels.filter((c) => c.personId === id));
    tem.add(id);
  }
  // O karma do Caso desse momento (para o exclusivo repetir igual se usar o Índice com karma)
  if (ds.karma?.pessoas) pub.karma = { noIndice: Boolean(ds.karma.noIndice), peso: Number.isFinite(Number(ds.karma.peso)) ? Number(ds.karma.peso) : 10, pessoas: Object.fromEntries(Object.entries(ds.karma.pessoas).filter(([id]) => tem.has(id))) };
  return pub;
}

/** Só o que o browser precisa da configuração (sem a lista de escondidos). */
export function configPublicaVitrine(cfg) {
  const { dados, ...resto } = cfg;
  const { lista, ...perfis } = cfg.perfis;
  return { ...resto, perfis, abas: cfg.abas.filter((a) => a.visivel), inicio: { ...cfg.inicio, blocos: cfg.inicio.blocos.filter((b) => b.visivel) } };
}

/** Dados extra de um canal para o perfil público (vídeos, últimos dias, Social Blade), só o que estiver ligado. */
export async function canalPublico(ds, cfg, idCanal) {
  if (!cfg.perfis.ligado || !/^UC[\w-]{22}$/.test(idCanal || "")) return null;
  const pub = datasetPublico(ds, cfg);
  const canal = pub.channels.find((c) => c.id === idCanal);
  if (!canal || pub.people.find((p) => p.id === canal.personId)?.semPerfil) return null;
  const s = cfg.perfis.secoes;
  const out = {};
  if (s.videos) out.videos = await getJSON("videos/" + idCanal, { items: [] });
  if (s.diario) {
    const keys = (await listKeys("snap/")).sort().slice(-3);
    const d = {};
    for (const key of keys) {
      const snap = await getJSON(key, {});
      if (snap[idCanal]) d[key.slice(5)] = snap[idCanal];
    }
    out.diario = d;
  }
  if (s.crescimento) out.sb = (await getJSON("sbextra", {}))[idCanal] || null;
  return out;
}
