// A aba Votar: todas as votações (e os torneios), com o login Google.

import { modo } from "../modo.js";
import { montarVotacoes } from "./votacoes.js";
import { animarBlocos } from "./animar.js";

export async function render(main) {
  const cfg = modo.cfg.votar;
  main.dataset.titulo = "Votar";
  main.innerHTML = `<div class="wrap pub-pagina">
    <div class="pub-cabeca"><h1>Votar</h1>${cfg.explicacao ? `<p>O público também conta: os resultados entram nos vídeos do canal. Um voto por pessoa em cada votação.</p>` : ""}</div>
    <div id="pub-votacoes" data-animacao="subir"></div>
  </div>`;
  await montarVotacoes(main.querySelector("#pub-votacoes"), { filtro: "todas", mostrarFechadas: cfg.fechadas });
  return animarBlocos(main);
}
