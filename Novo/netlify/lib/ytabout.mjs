// Dados do "Acerca de" dos canais do YouTube, lidos pelo marcador "Placar ⇄ YouTube".
// Ficam no canal ligado (link.about), só no painel: emails e links privados nunca vão para o site público.

const REDES_OK = new Set(["instagram", "tiktok", "twitch", "x", "kick", "site"]);
const txt = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
const num = (x) => (x === null || x === undefined || x === "" || !Number.isFinite(Number(x)) ? null : Math.max(0, Math.round(Number(x))));
const httpsUrl = (u) => {
  try {
    const x = new URL(String(u || ""));
    return /^https?:$/.test(x.protocol) ? x.href.slice(0, 500) : "";
  } catch {
    return "";
  }
};
const imagem = (u) => (/^https:\/\/[\w.-]*(ggpht|googleusercontent|ytimg)\.com\//.test(String(u || "")) ? String(u).slice(0, 600) : "");

/** Valida o que vem do marcador (é texto vindo de fora). */
export function limparAbout(c) {
  if (!c || typeof c !== "object" || !/^UC[\w-]{22}$/.test(c.id || "")) return null;
  return {
    titulo: txt(c.titulo, 120),
    handle: /^@[\w.-]{1,60}$/.test(c.handle || "") ? c.handle : "",
    descricao: txt(c.descricao, 5000),
    pais: txt(c.pais, 60),
    subs: num(c.subs),
    views: num(c.views),
    videos: num(c.videos),
    desde: /^\d{4}-\d{2}-\d{2}$/.test(c.desde || "") ? c.desde : "",
    links: (Array.isArray(c.links) ? c.links : [])
      .slice(0, 30)
      .map((l) => ({ titulo: txt(l?.titulo, 120), url: httpsUrl(l?.url), ...(l?.daDescricao ? { daDescricao: 1 } : {}) }))
      .filter((l) => l.url),
    emails: (Array.isArray(c.emails) ? c.emails : []).map((e) => txt(e, 120)).filter((e) => /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(e)).slice(0, 5),
    temEmailNegocio: Boolean(c.temEmailNegocio),
    foto: imagem(c.foto),
    banner: imagem(c.banner),
    palavras: txt(c.palavras, 500),
    lido: /^\d{4}-\d{2}-\d{2}T/.test(c.lido || "") ? c.lido.slice(0, 24) : new Date().toISOString(),
  };
}

/** Canal mínimo (para ligar sem a chave da API do YouTube). */
export function canalDoAbout(id, a) {
  return { id, title: a.titulo || id, handle: a.handle || "", thumb: a.foto || "", subs: a.subs, views: a.views, videos: a.videos };
}

/**
 * Aplica um canal lido à pessoa. Opções (escolhidas no painel):
 *   redes: { instagram: url, … }  só entram onde ainda não há link (a não ser substituirRedes)
 *   bio, local, ano, foto: só se pedidos e (a bio/local/ano) ainda vazios ou substituir
 *   notas: linhas novas (emails, outros links) acrescentadas às notas privadas, sem repetir
 */
export function aplicarAbout(db, channelId, about, op = {}) {
  const link = db.channels[channelId];
  const p = link && db.people[link.personId];
  if (!p) return null;
  link.about = about;
  if (about.handle && !link.handle) link.handle = about.handle;
  if (about.foto) link.thumb = link.thumb || about.foto;
  const feito = { redes: 0, bio: false, local: false, ano: false, foto: false, notas: 0 };

  p.socials ||= {};
  for (const [rede, u] of Object.entries(op.redes || {})) {
    const url = httpsUrl(u);
    if (!REDES_OK.has(rede) || !url) continue;
    if (p.socials[rede]?.url && !op.substituirRedes) continue;
    if (p.socials[rede]?.url === url) continue;
    p.socials[rede] = { ...(p.socials[rede] || {}), url, entries: p.socials[rede]?.entries || [] };
    feito.redes++;
  }
  if (op.bio && about.descricao && (!p.bio || op.substituir)) {
    p.bio = txt(op.bioTexto || about.descricao, 2000);
    feito.bio = true;
  }
  if (op.local && about.pais && (!p.location || op.substituir)) {
    p.location = about.pais;
    feito.local = true;
  }
  if (op.ano && about.desde && (!p.startedYear || op.substituir)) {
    p.startedYear = Number(about.desde.slice(0, 4));
    feito.ano = true;
  }
  if (op.foto && about.foto) {
    p.photo = about.foto;
    feito.foto = true;
  }
  const notas = (Array.isArray(op.notas) ? op.notas : []).map((l) => txt(l, 300)).filter(Boolean);
  const atuais = String(p.notes || "");
  const novas = notas.filter((l) => !atuais.includes(l));
  if (novas.length) {
    p.notes = (atuais ? atuais.replace(/\s+$/, "") + "\n\n" : "") + `YouTube (${about.lido.slice(0, 10)}):\n` + novas.join("\n");
    feito.notas = novas.length;
  }
  p.updatedAt = new Date().toISOString();
  return feito;
}
