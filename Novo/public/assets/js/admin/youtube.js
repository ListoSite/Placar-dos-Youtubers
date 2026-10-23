// Dados do "Acerca de" do YouTube (marcador "Placar ⇄ YouTube"): mostrar o que veio e escolher o que
// passa para o perfil do Youtuber (redes sociais, descrição, localidade, ano, foto e notas privadas).
// Usado em Importar dados e na ficha de cada Youtuber.

import { esc, curto, inteiro, data } from "../format.js";
import { $, $$, avatar, REDES, ICONES } from "../ui.js";

const NOMES = Object.fromEntries(REDES.map((r) => [r.id, r.nome]));
const DOMINIOS = [
  ["instagram", /(^|\.)instagram\.com$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["twitch", /(^|\.)twitch\.tv$/],
  ["x", /(^|\.)(x|twitter)\.com$/],
  ["kick", /(^|\.)kick\.com$/],
];
// Links que não são "o site" de ninguém: vão para as notas
const OUTROS = /(^|\.)(facebook\.com|fb\.me|whatsapp\.com|wa\.me|discord\.(gg|com)|patreon\.com|paypal\.(me|com)|amzn\.to|amazon\.[a-z.]+|t\.me|telegram\.me|spotify\.com|threads\.net|snapchat\.com|linkedin\.com|pinterest\.[a-z.]+|bit\.ly|ko-fi\.com|streamlabs\.com|streamelements\.com|throne\.com|steamcommunity\.com|youtube\.com|youtu\.be)$/;
const AGREGADORES = /(^|\.)(linktr\.ee|beacons\.ai|lnk\.bio|campsite\.bio|linkin\.bio|bio\.link|allmylinks\.com|taplink\.cc|carrd\.co)$/;

const host = (u) => {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};
const semFim = (u) => String(u || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/[/?#]+$/, "").toLowerCase();

/** Para onde vai cada link: uma rede, as notas ou nada. */
export function proposta(about, pessoa) {
  const ocupadas = new Set();
  const atuais = pessoa?.socials || {};
  const linhas = about.links.map((l) => {
    const h = host(l.url);
    let rede = (DOMINIOS.find(([, re]) => re.test(h)) || [null])[0];
    if (!rede && !OUTROS.test(h)) rede = "site";
    let destino = "notas";
    let ja = "";
    if (rede) {
      if (atuais[rede]?.url && semFim(atuais[rede].url) === semFim(l.url)) {
        destino = "nada";
        ja = "Já está no perfil";
      } else if (!ocupadas.has(rede) && !atuais[rede]?.url) {
        destino = rede;
      } else if (atuais[rede]?.url) ja = `${NOMES[rede]} já tem ${semFim(atuais[rede].url)}`;
      ocupadas.add(rede);
    }
    // Um agregador (linktr.ee…) só fica como site se não houver um site a sério
    return { ...l, h, rede, destino, ja };
  });
  // Preferir um site próprio a um agregador
  const site = linhas.filter((l) => l.rede === "site");
  const proprio = site.find((l) => !AGREGADORES.test(l.h));
  if (proprio && proprio.destino !== "site" && !atuais.site?.url) {
    for (const l of site) if (l.destino === "site") l.destino = "notas";
    proprio.destino = "site";
  }
  return linhas;
}

/** Bloco com os dados lidos e as escolhas. O id serve para ler as escolhas depois. */
export function blocoAbout(about, pessoa, { id = "ya", resumo = true } = {}) {
  const linhas = proposta(about, pessoa);
  const opcoes = (l) =>
    [...REDES.map((r) => [r.id, r.nome]), ["notas", "Notas privadas"], ["nada", "Não guardar"]]
      .map(([v, n]) => `<option value="${v}" ${l.destino === v ? "selected" : ""}>${esc(n)}</option>`)
      .join("");
  const p = pessoa || {};
  const ano = about.desde ? Number(about.desde.slice(0, 4)) : null;
  const numeros = [about.subs !== null ? `${curto(about.subs)} subs` : "", about.views !== null ? `${curto(about.views)} views` : "", about.videos !== null ? `${inteiro(about.videos)} vídeos` : "", about.pais, about.desde ? `desde ${data(about.desde)}` : ""].filter(Boolean);
  return `<div class="ya" data-ya="${esc(id)}">
    ${resumo ? `<div class="ya-topo">${avatar({ name: about.titulo, photo: about.foto }, 48)}<div><b>${esc(about.titulo)}</b> <a class="muted" href="https://www.youtube.com/channel/${esc(about.id)}" target="_blank" rel="noopener">${esc(about.handle || about.id)} ↗</a><div class="candidato-num">${numeros.map((n) => `<span>${esc(n)}</span>`).join("")}</div></div></div>` : ""}
    ${about.descricao ? `<details class="ya-desc"><summary>Descrição do canal</summary><p>${esc(about.descricao).replace(/\n/g, "<br>")}</p></details>` : ""}
    ${linhas.length ? `<div class="ya-links">${linhas
      .map(
        (l, i) => `<div class="ya-link"><span class="ya-ic">${ICONES[l.rede] || ICONES.site}</span><span class="ya-url"><a href="${esc(l.url)}" target="_blank" rel="noopener nofollow">${esc(semFim(l.url))}</a><small>${esc(l.titulo || (l.daDescricao ? "Na descrição" : ""))}${l.ja ? ` · ${esc(l.ja)}` : ""}</small></span><select class="input" data-l="${i}">${opcoes(l)}</select></div>`,
      )
      .join("")}</div>` : `<p class="muted" style="font-size:var(--t-sm)">O canal não tem links.</p>`}
    ${about.emails.length ? `<label class="ed-check"><input type="checkbox" data-emails checked> Email nas notas privadas: ${esc(about.emails.join(", "))}</label>` : about.temEmailNegocio ? `<p class="muted" style="font-size:var(--t-xs);margin-top:8px">Tem email para empresas, mas o YouTube só o mostra a quem tem sessão iniciada e passa a verificação.</p>` : ""}
    <div class="ya-mais">
      ${about.descricao ? `<label class="ed-check"><input type="checkbox" data-bio> ${p.bio ? "Trocar a descrição pública pela do canal" : "Usar a descrição do canal como descrição pública"}</label>` : ""}
      ${about.pais && about.pais !== p.location ? `<label class="ed-check"><input type="checkbox" data-local ${p.location ? "" : "checked"}> Localidade: ${esc(about.pais)}${p.location ? ` <small class="muted">(agora: ${esc(p.location)})</small>` : ""}</label>` : ""}
      ${ano && ano !== p.startedYear ? `<label class="ed-check"><input type="checkbox" data-ano> Começou no YouTube em ${ano}${p.startedYear ? ` <small class="muted">(agora: ${p.startedYear})</small>` : ""}</label>` : ""}
      ${about.foto && about.foto !== p.photo ? `<label class="ed-check"><input type="checkbox" data-foto> Usar esta foto (em tamanho grande)</label>` : ""}
    </div>
  </div>`;
}

/** As escolhas feitas num bloco, prontas para a rota import/youtube. */
export function escolhas(el, about) {
  const linhas = proposta(about, null);
  const redes = {};
  const notas = [];
  $$("select[data-l]", el).forEach((s) => {
    const l = linhas[Number(s.dataset.l)];
    if (!l) return;
    if (s.value === "notas") notas.push(`${l.titulo ? l.titulo + ": " : ""}${l.url}`);
    else if (s.value !== "nada" && !redes[s.value]) redes[s.value] = l.url;
  });
  if ($("[data-emails]", el)?.checked) notas.unshift(...about.emails.map((e) => `Email: ${e}`));
  const marcado = (q) => Boolean($(q, el)?.checked);
  const bio = marcado("[data-bio]");
  return { redes, notas, bio, substituir: bio || marcado("[data-local]") || marcado("[data-ano]"), local: marcado("[data-local]"), ano: marcado("[data-ano]"), foto: marcado("[data-foto]"), substituirRedes: true };
}

/** Resumo de uma linha do que foi lido. */
export function resumoAbout(a) {
  if (!a) return "";
  return [a.pais, a.desde ? `desde ${a.desde.slice(0, 4)}` : "", a.links?.length ? `${a.links.length} ${a.links.length === 1 ? "link" : "links"}` : "", a.emails?.length ? "email" : ""].filter(Boolean).join(" · ");
}
