// Página de um canal visto à parte (por exemplo o segundo canal ou o de clips de um Youtuber):
// os números só desse canal e os dados escritos para ele no painel. Usa a página do Youtuber.

import { estado, pessoa } from "../data.js";
import { canaisQueContam, perfilDoCanal } from "../canais.js";
import { render as renderPerfil } from "./person.js";

export async function render(main, { params }) {
  const c = estado.canais.get(params[0]);
  const dono = c && pessoa(c.personId);
  if (!c || !dono) {
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Canal não encontrado</h1><p>Pode ter sido removido. <a href="#/">Voltar ao início</a>.</p></div>`;
    return;
  }
  const contam = canaisQueContam(dono, estado.canais);
  return renderPerfil(main, { params, entidade: perfilDoCanal(dono, c, contam) });
}
