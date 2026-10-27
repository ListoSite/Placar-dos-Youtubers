// Peças partilhadas pela área de edição.

import { api, carregar } from "../data.js";
import { esc, curto, inteiro, norm, data } from "../format.js";
import { avatar, toast } from "../ui.js";

export const adm = { db: null, quota: null, hasApiKey: false };

// Avisar as outras janelas do painel abertas neste browser de que os dados mudaram
// (o marcador abre uma janela nova para importar; a que já estava aberta atualiza-se sozinha).
const canal = typeof BroadcastChannel === "function" ? new BroadcastChannel("placar-painel") : null;
export function avisarMudanca() {
  try {
    canal?.postMessage({ t: "dados", em: Date.now() });
  } catch {
    /* sem canal */
  }
  window.dispatchEvent(new Event("placar:painel-gravou"));
}
export function aoMudarNoutraJanela(fn) {
  canal?.addEventListener("message", (e) => e.data?.t === "dados" && fn());
}

export async function lerDb() {
  const r = await api("admin/db");
  adm.db = r.db;
  adm.quota = r.quota;
  adm.hasApiKey = r.hasApiKey;
  return adm.db;
}

/**
 * Chama a API de edição. Mostra erros como aviso, desativa o botão enquanto espera,
 * e depois volta a ler a base de dados e o dataset público.
 */
export async function chamar(rota, corpo, { botao, sucesso, recarregar = true } = {}) {
  const textoOriginal = botao?.innerHTML;
  if (botao) {
    botao.disabled = true;
    botao.innerHTML = `<span class="mini-roda"></span> ${esc(botao.dataset.aEsperar || "A trabalhar")}`;
  }
  try {
    const r = await api("admin/" + rota, { corpo: corpo || {} });
    if (recarregar) {
      await lerDb();
      await carregar({ forcar: true });
      avisarMudanca();
    }
    if (sucesso) toast(typeof sucesso === "function" ? sucesso(r) : sucesso);
    return r;
  } catch (e) {
    toast(e.message, { erro: true, tempo: 6000 });
    if (e.status === 401) location.hash = "#/editar";
    throw e;
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.innerHTML = textoOriginal;
    }
  }
}

export function pessoasOrdenadas() {
  return Object.values(adm.db.people).sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export function categorias() {
  return [...new Set(Object.values(adm.db.people).map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
}

/** Cartão de um canal do YouTube encontrado pela API. */
export function cartaoCanal(c, acoes = "") {
  const pais = c.country ? (c.country === "PT" ? `<span class="etiqueta azul">Portugal</span>` : `<span class="etiqueta">${esc(c.country)}</span>`) : `<span class="etiqueta">País não indicado</span>`;
  return `<div class="candidato" data-canal="${esc(c.id)}">
    ${avatar({ name: c.title, photo: c.thumb }, 56)}
    <div class="candidato-info">
      <b>${esc(c.title)}</b> <a href="https://www.youtube.com/channel/${esc(c.id)}" target="_blank" rel="noopener" class="muted">${esc(c.handle || c.id)}</a>
      <div class="candidato-num">${pais}<span>${c.hiddenSubs ? "subs escondidos" : curto(c.subs) + " subs"}</span><span>${curto(c.views)} views</span><span>${inteiro(c.videos)} vídeos</span>${c.publishedAt ? `<span>desde ${new Date(c.publishedAt).getFullYear()}</span>` : ""}${c.mentions ? `<span class="etiqueta ouro">destacado por ${c.mentions}</span>` : ""}</div>
      ${c.description ? `<p class="candidato-desc">${esc(c.description.slice(0, 220))}${c.description.length > 220 ? "…" : ""}</p>` : ""}
      ${c.linkedTo ? `<p class="aviso" style="margin-top:8px;padding:6px 10px">Já está ligado a ${esc(adm.db.people[c.linkedTo]?.name || c.linkedTo)}.</p>` : ""}
      ${c.rejected ? `<p class="muted" style="margin:6px 0 0;font-size:var(--t-xs)">Rejeitado antes${c.rejected.reason ? `: ${esc(c.rejected.reason)}` : ""}.</p>` : ""}
    </div>
    <div class="candidato-acoes">${acoes}</div>
  </div>`;
}

/** Campo para escolher uma pessoa (com pesquisa). */
export function escolherPessoa(input, aoEscolher, { excluir = [] } = {}) {
  const caixa = document.createElement("div");
  caixa.className = "pesquisa-lista";
  caixa.style.cssText = "left:0;right:auto;width:100%";
  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(caixa);
  input.addEventListener("input", () => {
    const t = norm(input.value);
    const r = t ? pessoasOrdenadas().filter((p) => !excluir.includes(p.id) && norm(p.name).includes(t)).slice(0, 8) : [];
    caixa.innerHTML = r.map((p) => `<button type="button" class="pesquisa-item" style="width:100%;border:0;background:none;text-align:left" data-id="${esc(p.id)}">${avatar({ name: p.name }, 28)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "")}${p.channels.length ? "" : ", sem canal"}</small></span></button>`).join("");
    caixa.classList.toggle("aberta", r.length > 0);
  });
  caixa.addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (!b) return;
    caixa.classList.remove("aberta");
    aoEscolher(adm.db.people[b.dataset.id]);
  });
  input.addEventListener("blur", () => setTimeout(() => caixa.classList.remove("aberta"), 200));
}

export function quotaTexto() {
  const q = adm.quota;
  if (!q) return "Quota da API: ainda nada usado hoje.";
  return `Quota da API hoje: ${inteiro(q.used)} de 10 000 unidades usadas.`;
}

export function fonteEtiqueta(src) {
  const nomes = { youtube: "YouTube", socialblade: "Social Blade", folha: "Folha", manual: "Manual", misto: "Misto", estimativa: "≈ Estimativa" };
  return `<span class="fonte fonte-${esc(src)}">${esc(nomes[src] || src)}</span>`;
}

export function linkSocialBlade(channelId, texto = "Social Blade") {
  return `<a class="link-sb" href="https://socialblade.com/youtube/channel/${esc(channelId)}" target="_blank" rel="noopener">${esc(texto)} ↗</a>`;
}

export { data };
