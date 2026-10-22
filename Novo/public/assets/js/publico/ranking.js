// O ranking da página pública: as medidas, os períodos e os filtros que o painel deixar.

import { estado, indice } from "../data.js";
import { esc, mesNome, norm, plural } from "../format.js";
import { movimento, $ } from "../ui.js";
import { MEDIDAS, rankingPeriodo, mesesDoPeriodo, rotuloPeriodo } from "../periodo.js";
import { modo } from "../modo.js";
import { animarBlocos } from "./animar.js";
import { ligacaoPessoa } from "./comum.js";
import { avatar } from "../ui.js";

export async function render(main, { query }) {
  const cfg = modo.cfg.ranking;
  main.dataset.titulo = "Ranking";
  const medidas = cfg.metricas.length ? cfg.metricas : ["views"];
  const completos = estado.ds.months.filter((m) => m < estado.ds.currentMonth);
  const anos = [...new Set(completos.map((m) => m.slice(0, 4)))].reverse();
  const per0 = cfg.periodo;
  const f = {
    medida: medidas.includes(query.get("medida")) ? query.get("medida") : medidas[0],
    per: query.get("per") ? lerPer(query.get("per")) : per0,
    cat: cfg.filtroCategoria ? query.get("cat") || "" : "",
    q: "",
    n: 50,
  };

  main.innerHTML = `<div class="wrap pub-pagina">
    <div class="pub-cabeca"><h1>Ranking</h1><p id="rk-sub"></p></div>
    <div class="pub-filtros">
      ${medidas.length > 1 ? `<div class="pub-chips" id="rk-medidas">${medidas.map((m) => `<button class="chip" data-medida="${m}">${esc(MEDIDAS[m].nome)}</button>`).join("")}</div>` : ""}
      ${
        cfg.escolherPeriodo
          ? `<label class="campo" id="rk-campo-per"><span>Período</span><select class="input" id="rk-per">
        <optgroup label="Mês">${[...completos].reverse().map((m) => `<option value="m:${m}">${mesNome(m)}</option>`).join("")}</optgroup>
        <optgroup label="Ano">${anos.map((a) => `<option value="a:${a}">${a}</option>`).join("")}</optgroup>
        <optgroup label="Últimos meses">${[3, 6, 12].map((n) => `<option value="u:${n}">Últimos ${n} meses</option>`).join("")}</optgroup>
      </select></label>`
          : ""
      }
      ${cfg.filtroCategoria ? `<label class="campo"><span>Categoria</span><select class="input" id="rk-cat"><option value="">Todas</option>${estado.ds.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>` : ""}
      <label class="campo cresce"><span>Procurar</span><input class="input" id="rk-q" type="search" placeholder="Nome do Youtuber"></label>
    </div>
    <div id="rk-lista"></div>
  </div>`;

  if ($("#rk-per", main)) $("#rk-per", main).value = escreverPer(f.per, completos);
  if ($("#rk-cat", main)) $("#rk-cat", main).value = f.cat;

  let parar = () => {};
  const desenhar = () => {
    const med = MEDIDAS[f.medida];
    main.querySelectorAll("[data-medida]").forEach((b) => b.classList.toggle("ativo", b.dataset.medida === f.medida));
    const campoPer = $("#rk-campo-per", main);
    if (campoPer) campoPer.hidden = !med.periodo;
    const meses = mesesDoPeriodo(f.per);
    let lista = rankingPeriodo(f.medida, f.per, { cat: f.cat, n: cfg.n });
    $("#rk-sub", main).textContent = `${med.periodo ? med.frase(rotuloPeriodo(meses)) : med.nome}${f.cat ? ` · ${f.cat}` : ""}`;
    if (f.q) {
      const t = norm(f.q);
      lista = lista.filter((x) => norm(x.p.name).includes(t));
    }
    const alvo = $("#rk-lista", main);
    if (!lista.length) {
      alvo.innerHTML = `<div class="vidro pub-vazio"><p class="muted">Ninguém aparece com estes filtros.</p></div>`;
      return;
    }
    const mostrar = lista.slice(0, f.n);
    const fmt = med.fmt;
    alvo.innerHTML = `<ol class="pb-lista rk-lista" data-animacao="${esc(cfg.animacao)}">${mostrar
      .map((x) => {
        const href = ligacaoPessoa(x.p);
        const ind = indice(x.p.id).total;
        const quem = `${avatar(x.p, 42)}<span class="pb-nome"><b>${esc(x.p.name)}</b><small>${esc(x.p.category || "")}${f.medida !== "indice" && ind !== null ? ` · Índice ${ind}` : ""}</small></span>`;
        return `<li class="pb-linha ${x.pos <= 3 ? "top" + x.pos : ""}" data-anim-item data-ordem="${x.pos}"><span class="pb-pos">${x.pos}</span>${href ? `<a class="pb-quem" href="${href}">${quem}</a>` : `<span class="pb-quem">${quem}</span>`}<span class="pb-valor"><b>${fmt(x.v)}</b>${cfg.movimento && x.ant !== undefined ? movimento(x.pos, x.ant) : ""}</span></li>`;
      })
      .join("")}</ol>
      ${lista.length > f.n ? `<p class="pub-mais"><button class="btn" id="rk-mais">Mostrar mais (${lista.length - f.n})</button></p>` : `<p class="muted pub-mais">${plural(lista.length, "Youtuber", "Youtubers")} neste ranking.</p>`}`;
    parar();
    parar = animarBlocos(alvo);
    $("#rk-mais", alvo)?.addEventListener("click", () => {
      f.n += 100;
      desenhar();
    });
  };
  main.querySelectorAll("[data-medida]").forEach((b) =>
    b.addEventListener("click", () => {
      f.medida = b.dataset.medida;
      desenhar();
    }),
  );
  $("#rk-per", main)?.addEventListener("change", (e) => {
    f.per = lerPer(e.target.value);
    desenhar();
  });
  $("#rk-cat", main)?.addEventListener("change", (e) => {
    f.cat = e.target.value;
    desenhar();
  });
  $("#rk-q", main).addEventListener("input", (e) => {
    f.q = e.target.value;
    desenhar();
  });
  desenhar();
  return () => parar();
}

function lerPer(v) {
  const [t, x] = String(v).split(":");
  if (t === "m") return { tipo: "mes", mes: x };
  if (t === "a") return { tipo: "ano", ano: Number(x) };
  if (t === "u") return { tipo: "ultimos", n: Number(x) };
  return { tipo: "ultimo" };
}

function escreverPer(per, completos) {
  if (per.tipo === "mes") return `m:${per.mes}`;
  if (per.tipo === "ano") return `a:${per.ano}`;
  if (per.tipo === "ultimos") return `u:${[3, 6, 12].includes(per.n) ? per.n : 6}`;
  return `m:${estado.ref || completos[completos.length - 1]}`;
}
