// Caixa de entrada com a conta Google (para as páginas onde o público vota de forma anónima).

import { esc } from "../format.js";
import { $, toast, confirmar } from "../ui.js";
import { temConta, entrarComGoogle, sairDaConta, quemSou, novoNonce, entrarComTokenGoogle, carregarGoogle } from "../conta.js";

const GOOGLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>`;

/**
 * Desenha a caixa dentro de alvo. Devolve { eu, pedir(oque) } — pedir() leva quem não entrou até ao botão.
 * textoFora / textoDentro: as frases da caixa.
 */
export async function caixaConta(alvo, cfg, { destino, textoFora, textoDentro }) {
  const eu = await quemSou(cfg);
  alvo.innerHTML = eu
    ? `<div class="vidro vt-eu">${eu.foto ? `<img src="${esc(eu.foto)}" alt="" referrerpolicy="no-referrer">` : ""}<span><b>Entraste com a conta Google</b><small>${esc(textoDentro)}</small></span><button class="btn btn-pequeno" data-sair>Sair</button></div>`
    : `<div class="vidro vt-eu"><span><b>Entra para votar</b><small>${esc(textoFora)}</small></span><div class="vt-gbotao"></div><button class="btn vt-google" data-entrar ${cfg.google ? "hidden" : ""}>${GOOGLE} Entrar com Google</button></div>`;
  $("[data-entrar]", alvo)?.addEventListener("click", () => entrarComGoogle(cfg, destino));
  $("[data-sair]", alvo)?.addEventListener("click", async () => {
    await sairDaConta(cfg);
    location.reload();
  });
  if (!eu && cfg.google) {
    try {
      const g = await carregarGoogle();
      const nonce = await novoNonce();
      g.accounts.id.initialize({
        client_id: cfg.google,
        nonce: nonce.hash,
        callback: async ({ credential }) => {
          try {
            await entrarComTokenGoogle(cfg, credential, nonce.bruto);
            toast("Entraste. Já podes votar!");
            setTimeout(() => location.reload(), 600);
          } catch (e) {
            toast(e.message, { erro: true, tempo: 6000 });
          }
        },
      });
      const el = $(".vt-gbotao", alvo);
      if (el) g.accounts.id.renderButton(el, { theme: "filled_black", size: "large", shape: "pill", text: "signin_with", locale: "pt-PT" });
    } catch {
      const b = $("[data-entrar]", alvo);
      if (b) b.hidden = false;
    }
  }
  const pedir = async (oque) => {
    if (temConta()) return;
    if (cfg.google && $(".vt-gbotao div", alvo)) {
      toast(`Para ${oque}, entra primeiro com a tua conta Google.`);
      alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (await confirmar(`Para ${oque}, entra com a tua conta Google. Queres entrar agora?`, { sim: "Entrar com Google" })) entrarComGoogle(cfg, destino);
  };
  return { eu, pedir };
}
