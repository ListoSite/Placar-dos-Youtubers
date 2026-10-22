// O Início da página pública: o cabeçalho e os blocos, pela ordem escolhida no painel.

import { esc } from "../format.js";
import { modo } from "../modo.js";
import { blocoHtml, montarBlocos } from "./blocos.js";
import { animarBlocos } from "./animar.js";

export async function render(main) {
  const cfg = modo.cfg.inicio;
  const h = cfg.heroi;
  main.dataset.titulo = "";
  const titulo = esc(h.titulo || "Placar dos Youtubers");
  // "Placar dos Youtubers" fica com a segunda parte a cor (como no logótipo)
  const tituloHtml = titulo.replace(/^(\S+)\s+(.+)$/, "$1<br><span>$2</span>");
  main.innerHTML = `<div class="wrap pub-pagina pub-inicio">
    ${
      h.visivel
        ? `<section class="pub-heroi">
      ${h.etiqueta ? `<span class="pub-etiqueta">${esc(h.etiqueta)}</span>` : ""}
      <h1 class="placar">${tituloHtml}</h1>
      ${h.texto ? `<p class="pub-sub">${esc(h.texto)}</p>` : ""}
    </section>`
        : ""
    }
    ${cfg.blocos.map(blocoHtml).join("")}
  </div>`;
  const limparGraficos = await montarBlocos(main);
  const limparAnim = animarBlocos(main);
  return () => {
    limparGraficos();
    limparAnim();
  };
}
