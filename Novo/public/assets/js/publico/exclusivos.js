// Exclusivos: espetáculos do Palco que correm no browser de quem vê (não são vídeos gravados).
// O painel escolhe o espetáculo, as opções, o tema e o formato; aqui carrega-se em play.

import { esc } from "../format.js";
import { modo } from "../modo.js";
import { toast } from "../ui.js";
import { animarBlocos } from "./animar.js";

const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>`;

export function cartaoExclusivo(x) {
  const [a = "#c3123e", b = "#5c0619", c = "#f4b942"] = x.cores || [];
  const ate = x.ate ? new Date(x.ate).toLocaleDateString("pt-PT", { day: "numeric", month: "long" }) : "";
  return `<article class="vidro px" data-anim-item>
    <button type="button" class="px-capa" data-tocar="${esc(x.id)}" style="--a:${a};--b:${b};--c:${c}" aria-label="Ver ${esc(x.titulo)}">
      <span class="px-esp">${esc(x.nomeEsp || "Palco")}</span>
      <span class="px-play">${PLAY}</span>
      <span class="px-fmt">${x.formato === "9x16" ? "9:16" : "16:9"}</span>
    </button>
    <div class="px-texto">
      <h3>${esc(x.titulo)}</h3>
      ${x.texto ? `<p>${esc(x.texto)}</p>` : ""}
      ${ate ? `<small>Disponível até ${esc(ate)}</small>` : ""}
    </div>
    <button type="button" class="btn btn-primario px-ver" data-tocar="${esc(x.id)}">${PLAY} Ver agora</button>
  </article>`;
}

/** Carrega uma folha de estilos (os estilos do Palco só vêm quando alguém carrega em play). */
function css(href) {
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = l.onerror = () => resolve();
    document.head.appendChild(l);
  });
}

let aTocar = false;

/** Corre o espetáculo em ecrã inteiro, aqui no browser de quem vê. */
export async function tocar(x, botao) {
  if (aTocar || !x) return;
  aTocar = true;
  const textoAntes = botao?.innerHTML;
  if (botao?.classList.contains("btn")) botao.innerHTML = `<span class="mini-roda"></span> A preparar`;
  let palco = null;
  try {
    const [{ Palco, ESPETACULOS, eAbortado }, { carregarHistorico }, { som }] = await Promise.all([import("../stage/stage.js"), import("../stage/historico.js"), import("../audio.js"), css("/assets/css/palco.css"), css("/assets/css/cenas.css")]);
    const esp = ESPETACULOS.find((e) => e.id === x.esp);
    if (!esp) throw new Error("Este espetáculo já não existe.");
    const [mod] = await Promise.all([import(`../stage/${esp.mod.replace(/^\.\//, "")}`), carregarHistorico()]);
    som.definir(true);
    som.desbloquear();
    palco = new Palco({ formato: x.formato, manual: false, tema: x.tema, velocidade: x.velocidade, modo: "video", completo: x.efeitos !== "cores" });
    try {
      await mod.correr(palco, { ...x.opts });
      await palco.esperar(800, { exato: true });
    } catch (e) {
      if (!eAbortado(e)) {
        console.error(e);
        palco.cena.innerHTML = `<div class="palco-erro"><h2>Não foi possível continuar</h2><p>${esc(e.message)}</p></div>`;
        await palco.esperar(3500).catch(() => {});
      }
    }
  } catch (e) {
    console.error(e);
    toast(`Não foi possível abrir: ${e.message}`, { erro: true });
  } finally {
    palco?.sair();
    aTocar = false;
    if (botao && textoAntes) botao.innerHTML = textoAntes;
  }
}

/** Liga os botões de play de uma parte da página. */
export function ligarExclusivos(raiz) {
  raiz.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tocar]");
    if (!b) return;
    tocar((modo.extra.exclusivos || []).find((x) => x.id === b.dataset.tocar), b);
  });
}

export async function render(main) {
  main.dataset.titulo = "Exclusivos";
  const lista = modo.extra.exclusivos || [];
  main.innerHTML = `<div class="wrap pub-pagina">
    <div class="pub-cabeca"><h1>Exclusivos</h1><p>Espetáculos que só existem aqui. Carrega em play e vê, com música e efeitos.</p></div>
    <div data-animacao="subir">${lista.length ? `<div class="px-grelha">${lista.map(cartaoExclusivo).join("")}</div>` : `<div class="vidro pub-vazio"><p class="muted">Em breve há novidades aqui.</p></div>`}</div>
  </div>`;
  ligarExclusivos(main);
  return animarBlocos(main);
}
