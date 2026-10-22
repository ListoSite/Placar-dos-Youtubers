// Página pública: o que os visitantes veem (votações, os vídeos publicados e o hall da fama).
// Os vídeos publicados ("publicações") são guardados quando um espetáculo do Palco é gravado.

import { adicionarLinhas, lerLinhas, atualizarLinha, apagarLinha, getJSON } from "./storage.mjs";
import { resumoHistorico } from "./historico.mjs";

export const COLECAO_PUB = "palco_publicacoes";
const texto = (x, max) => String(x ?? "").slice(0, max);
const idOk = (x) => (typeof x === "string" && /^[\w.-]{1,80}$/.test(x) ? x : null);

/** Limpa o resumo de um espetáculo (o que o vídeo mostrou), para mostrar na página pública. */
function limparResumo(r) {
  if (!r || typeof r !== "object") return {};
  const linha = (l) => ({ id: idOk(l?.id), nome: texto(l?.nome, 80), valor: texto(l?.valor, 40), pos: Number.isFinite(Number(l?.pos)) ? Number(l.pos) : undefined });
  return {
    tipo: ["ranking", "duelo", "torneio", "jogo", "grafico", "votacao", "historia"].includes(r.tipo) ? r.tipo : "jogo",
    titulo: texto(r.titulo, 140),
    medida: texto(r.medida, 80),
    linhas: Array.isArray(r.linhas) ? r.linhas.slice(0, 12).map(linha) : [],
    vencedor: r.vencedor ? linha(r.vencedor) : null,
    placar: texto(r.placar, 20),
    nota: texto(r.nota, 200),
  };
}

export async function guardarPublicacao(p) {
  if (!p || typeof p !== "object") return 0;
  await adicionarLinhas(COLECAO_PUB, [
    {
      espetaculo: texto(p.espetaculo, 30),
      titulo: texto(p.titulo, 160),
      tema: texto(p.tema, 30),
      formato: texto(p.formato, 8),
      link: "",
      visivel: true,
      dados: { legenda: texto(p.legenda, 600), resumo: limparResumo(p.resumo) },
    },
  ]);
  return 1;
}

export async function listarPublicacoes({ todas = false } = {}) {
  const l = (await lerLinhas(COLECAO_PUB)).sort((a, b) => (b.criado || "").localeCompare(a.criado || ""));
  return todas ? l : l.filter((x) => x.visivel !== false);
}

export async function mudarPublicacao(id, campos) {
  const c = {};
  if (typeof campos.titulo === "string") c.titulo = texto(campos.titulo, 160);
  if (typeof campos.link === "string") {
    const u = campos.link.trim();
    if (u && !/^https:\/\/[^\s"<>]+$/.test(u)) {
      const e = new Error("O link tem de começar por https://");
      e.status = 400;
      throw e;
    }
    c.link = u;
  }
  if (typeof campos.visivel === "boolean") c.visivel = campos.visivel;
  await atualizarLinha(COLECAO_PUB, id, c);
}

export async function apagarPublicacao(id) {
  await apagarLinha(COLECAO_PUB, id);
}

/** Tudo o que a página pública precisa, só com os dados que lá aparecem. */
export async function dadosPublicos() {
  const [ds, pubs, hist, db] = await Promise.all([getJSON("dataset"), listarPublicacoes(), resumoHistorico(), getJSON("db")]);
  const canal = { nome: "Placar dos Youtubers", youtube: "", tiktok: "", instagram: "", ...(db?.settings?.canal || {}) };
  const usadas = new Set();
  for (const p of pubs.slice(0, 30)) {
    const r = p.dados?.resumo || {};
    for (const l of [...(r.linhas || []), r.vencedor].filter(Boolean)) if (l.id) usadas.add(l.id);
  }
  const top = (campo, n = 8) =>
    Object.entries(hist.pessoas || {})
      .filter(([, d]) => d[campo] > 0)
      .sort((a, b) => b[1][campo] - a[1][campo])
      .slice(0, n)
      .map(([id, d]) => (usadas.add(id), { id, n: d[campo], v: d.v, d: d.d }));
  const hall = {
    estrelas: top("estrelas"),
    coroas: top("coroas"),
    vitorias: top("v"),
    classicos: (hist.classicos || []).slice(0, 8).map((c) => (c.par.forEach((x) => usadas.add(x)), c)),
  };
  const pessoas = {};
  for (const p of ds?.people || []) if (usadas.has(p.id)) pessoas[p.id] = { name: p.name, photo: p.photo || "", category: p.category || "" };
  return {
    canal,
    publicacoes: pubs.slice(0, 30).map((p) => ({ id: p.id, criado: p.criado, espetaculo: p.espetaculo, titulo: p.titulo, formato: p.formato, link: p.link || "", resumo: p.dados?.resumo || {} })),
    hall,
    pessoas,
  };
}
