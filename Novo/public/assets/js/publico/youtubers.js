// Todos os Youtubers do Placar (os que não estão escondidos no painel), com pesquisa e categorias.

import { estado, indice, views } from "../data.js";
import { esc, norm, plural, curto } from "../format.js";
import { avatar, $ } from "../ui.js";
import { modo } from "../modo.js";
import { ligacaoPessoa } from "./comum.js";

export async function render(main, { query }) {
  const cfg = modo.cfg.youtubers;
  main.dataset.titulo = "Youtubers";
  const f = { q: query.get("q") || "", cat: cfg.categorias ? query.get("cat") || "" : "" };
  const ordenar = (a, b) =>
    cfg.ordem === "nome"
      ? a.name.localeCompare(b.name, "pt")
      : cfg.ordem === "views"
        ? (views(b, estado.ref) || 0) - (views(a, estado.ref) || 0)
        : (estado.posIndice.get(a.id) || 1e9) - (estado.posIndice.get(b.id) || 1e9);
  const todos = [...estado.ds.people].sort(ordenar);
  main.innerHTML = `<div class="wrap pub-pagina">
    <div class="pub-cabeca"><h1>Youtubers</h1><p>${plural(todos.length, "Youtuber português", "Youtubers portugueses")} no Placar.</p></div>
    <div class="pub-filtros">
      ${cfg.pesquisa ? `<label class="campo cresce"><span>Procurar</span><input class="input" id="yt-q" type="search" placeholder="Nome do Youtuber" value="${esc(f.q)}"></label>` : ""}
    </div>
    ${cfg.categorias ? `<div class="pub-chips pub-chips-rolar" id="yt-cats"><button class="chip" data-cat="">Todas</button>${estado.ds.categories.map((c) => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
    <div class="yt-grelha" id="yt-lista"></div>
  </div>`;
  const desenhar = () => {
    main.querySelectorAll("[data-cat]").forEach((b) => b.classList.toggle("ativo", b.dataset.cat === f.cat));
    const t = norm(f.q);
    const lista = todos.filter((p) => (!f.cat || p.category === f.cat) && (!t || norm(p.name).includes(t)));
    $("#yt-lista", main).innerHTML = lista.length
      ? lista
          .slice(0, 400)
          .map((p) => {
            const href = ligacaoPessoa(p);
            const pos = estado.posIndice.get(p.id);
            const corpo = `${avatar(p, 60)}<b>${esc(p.name)}</b><small>${esc(p.category || "")}</small>${pos ? `<span class="yt-pos">${pos}.º</span>` : ""}${p.totals?.subs ? `<em>${curto(p.totals.subs)} subs</em>` : ""}`;
            return href ? `<a class="vidro yt-cartao" href="${href}">${corpo}</a>` : `<div class="vidro yt-cartao">${corpo}</div>`;
          })
          .join("")
      : `<div class="vidro pub-vazio"><p class="muted">Nenhum Youtuber com esse nome.</p></div>`;
  };
  $("#yt-q", main)?.addEventListener("input", (e) => {
    f.q = e.target.value;
    desenhar();
  });
  main.querySelectorAll("[data-cat]").forEach((b) =>
    b.addEventListener("click", () => {
      f.cat = b.dataset.cat;
      desenhar();
    }),
  );
  desenhar();
}

export { indice };
