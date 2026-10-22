// Categorias: que tipo de conteúdo faz mais views em Portugal.

import { estado, rankingMes, mesesComDados, mesAnterior } from "../data.js";
import { esc, curto, mesNome, pct, plural } from "../format.js";
import { avatar, $, variacao, mostrarDica, esconderDica, saiDica } from "../ui.js";

export async function render(main) {
  main.dataset.titulo = "Categorias";
  const meses = mesesComDados(5).filter((m) => m < estado.ds.currentMonth);
  let mes = estado.ref;
  main.innerHTML = `<div class="wrap">
    <div class="pagina-topo"><h1>Categorias</h1><p>Views do mês somadas por tipo de conteúdo. O tamanho de cada bloco é a parte das views de Portugal nesse mês.</p></div>
    <div class="filtros"><label class="campo"><span>Mês</span><select class="input" id="cat-mes">${[...meses].reverse().map((m) => `<option value="${m}">${mesNome(m)}</option>`).join("")}</select></label></div>
    <div id="cat-mapa" class="grafico" style="height:420px"></div>
    <section class="secao"><div id="cat-tabela"></div></section></div>`;
  $("#cat-mes", main).value = mes;
  let ro = null;

  const desenhar = () => {
    const dados = agrupar(mes);
    const ant = agrupar(mesAnterior(mes));
    const total = dados.reduce((a, b) => a + b.v, 0);
    const alvo = $("#cat-mapa", main);
    const pintar = () => treemap(alvo, dados, total);
    ro?.disconnect();
    ro = new ResizeObserver(pintar);
    ro.observe(alvo);
    $("#cat-tabela", main).innerHTML = `<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Categoria</th><th class="dir">Views em ${esc(mesNome(mes))}</th><th class="dir esconde-movel">Face ao mês anterior</th><th class="dir">Parte</th><th class="dir esconde-movel">Youtubers</th><th>Top 3</th></tr></thead><tbody>
      ${dados
        .map((d) => {
          const a = ant.find((x) => x.c === d.c);
          return `<tr onclick="location.hash='#/ranking?cat=${encodeURIComponent(d.c)}&m=${mes}'"><td><b>${esc(d.c)}</b></td><td class="dir"><span class="valor-grande">${curto(d.v)}</span></td><td class="dir esconde-movel">${a ? variacao(d.v, a.v) : ""}</td><td class="dir">${pct(d.v / total, { casas: 1 })}</td><td class="dir esconde-movel">${d.n}</td><td><span class="pilha">${d.top.map((p) => avatar(p, 28)).join("")}</span></td></tr>`;
        })
        .join("")}</tbody></table></div>`;
  };
  $("#cat-mes", main).addEventListener("change", (e) => {
    mes = e.target.value;
    desenhar();
  });
  desenhar();
  return () => ro?.disconnect();
}

function agrupar(m) {
  if (!m) return [];
  const mapa = new Map();
  for (const x of rankingMes(m)) {
    const c = x.p.category || "Sem categoria";
    const e = mapa.get(c) || { c, v: 0, n: 0, top: [] };
    e.v += x.v;
    e.n++;
    if (e.top.length < 3) e.top.push(x.p);
    mapa.set(c, e);
  }
  return [...mapa.values()].sort((a, b) => b.v - a.v);
}

function treemap(alvo, dados, total) {
  const d3 = window.d3;
  if (!d3) return;
  const W = alvo.clientWidth;
  const H = alvo.clientHeight;
  if (!W) return;
  const raiz = d3.hierarchy({ children: dados }).sum((d) => d.v || 0);
  d3.treemap().size([W, H]).paddingInner(2).round(true)(raiz);
  const max = dados[0]?.v || 1;
  alvo.innerHTML = "";
  const svg = d3.select(alvo).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Views por categoria");
  const nos = svg
    .selectAll("g")
    .data(raiz.leaves())
    .join("g")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
    .style("cursor", "pointer")
    .on("click", (_, d) => (location.hash = `#/ranking?cat=${encodeURIComponent(d.data.c)}`))
    .on("pointermove pointerdown", (ev, d) => mostrarDica(`<b>${esc(d.data.c)}</b><br>${curto(d.data.v)} views, ${pct(d.data.v / total, { casas: 1 })}<br>${plural(d.data.n, "Youtuber", "Youtubers")}`, ev))
    .on("pointerleave", saiDica);
  nos
    .append("rect")
    .attr("width", (d) => Math.max(0, d.x1 - d.x0))
    .attr("height", (d) => Math.max(0, d.y1 - d.y0))
    .attr("rx", 16)
    .attr("fill", "#e0294f")
    .attr("fill-opacity", (d) => 0.25 + 0.75 * Math.sqrt(d.data.v / max));
  nos.each(function (d, i) {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    if (w < 70 || h < 40) return;
    const g0 = d3.select(this);
    g0.append("clipPath").attr("id", "cat-clip-" + i).append("rect").attr("width", w - 6).attr("height", h);
    const g = g0.append("g").attr("clip-path", `url(#cat-clip-${i})`);
    const grande = w > 160 && h > 90;
    g.append("text")
      .attr("x", 10)
      .attr("y", grande ? 30 : 22)
      .attr("fill", "#fff")
      .attr("font-family", "Big Shoulders, sans-serif")
      .attr("font-weight", 800)
      .attr("font-size", grande ? 26 : 17)
      .text(d.data.c);
    if (h > 58)
      g.append("text")
        .attr("x", 10)
        .attr("y", grande ? 52 : 40)
        .attr("fill", "rgba(255,255,255,.85)")
        .attr("font-size", 12)
        .text(`${curto(d.data.v)} views, ${pct(d.data.v / total, { casas: 1 })}`);
  });
}
