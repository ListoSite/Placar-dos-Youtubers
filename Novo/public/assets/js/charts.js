// Gráficos (D3). Todos têm dica ao passar o rato e redesenham quando a largura muda.

import { eixo, inteiro, curto, mesNome, data, esc } from "./format.js";
import { mostrarDica, moverDica, esconderDica, fonteDados } from "./ui.js";

export const SERIES = ["#4a86ff", "#d95926", "#199e70", "#c98500"];
const COR_YT = "#4a86ff";
const COR_OUTRA = "#7a8fc9";
const SUPERFICIE = "#0e1a3d";

function semD3(el) {
  if (window.d3) return false;
  el.innerHTML = `<p class="muted">Não foi possível carregar os gráficos.</p>`;
  return true;
}

/** Redesenha quando o contentor muda de largura. Devolve função para parar. */
function responsivo(el, desenhar) {
  let largura = 0;
  const ro = new ResizeObserver(() => {
    const w = Math.floor(el.clientWidth);
    if (w && w !== largura) {
      largura = w;
      desenhar(w);
    }
  });
  ro.observe(el);
  return () => ro.disconnect();
}

function padraoTracejado(svg, id, cor) {
  const defs = svg.append("defs");
  const p = defs.append("pattern").attr("id", id).attr("width", 6).attr("height", 6).attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
  p.append("rect").attr("width", 6).attr("height", 6).attr("fill", cor).attr("fill-opacity", 0.18);
  p.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6).attr("stroke", cor).attr("stroke-width", 2.5);
}

/** Caminho de barra com topo arredondado (4px) e base reta. */
function barraPath(x, y, w, h, r = 4) {
  if (h <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Barras de views por mês de uma pessoa.
 * serie: [{ m, v, est, p, cur, src, tem }]
 */
export function barrasMensais(el, serie, { altura = 280, destaque = null } = {}) {
  if (semD3(el)) return () => {};
  const d3 = window.d3;
  const temOutras = serie.some((s) => s.tem && s.src !== "youtube");
  const temYT = serie.some((s) => s.tem && s.src === "youtube");
  const temProj = serie.some((s) => s.tem && s.p);
  el.innerHTML = `<div class="legenda">
      ${temYT ? `<span><i style="background:${COR_YT}"></i>Medido pelo YouTube</span>` : ""}
      ${temOutras ? `<span><i style="background:${COR_OUTRA}"></i>Social Blade, folha antiga ou manual</span>` : ""}
      ${temProj ? `<span><i class="tracejado"></i>Projeção de mês incompleto</span>` : ""}
    </div><div class="grafico"></div>`;
  const alvo = el.querySelector(".grafico");
  return responsivo(alvo, (W) => {
    const M = { t: 16, r: 8, b: 28, l: 48 };
    const w = W - M.l - M.r;
    const h = altura - M.t - M.b;
    alvo.innerHTML = "";
    const svg = d3.select(alvo).append("svg").attr("viewBox", `0 0 ${W} ${altura}`).attr("role", "img").attr("aria-label", "Views por mês");
    padraoTracejado(svg, "trac-mes", COR_YT);
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scaleBand().domain(serie.map((s) => s.m)).range([0, w]).padding(0.28);
    const valor = (s) => (s.p ? s.est ?? s.v : s.v) || 0;
    const maxCompletos = d3.max(serie.filter((s) => !s.p), (s) => s.v || 0) || 0;
    // Uma projeção muito alta não pode esmagar o resto do gráfico
    const max = Math.max(maxCompletos ? Math.min(d3.max(serie, valor), maxCompletos * 1.6) : d3.max(serie, valor), 1);
    const y = d3.scaleLinear().domain([0, max]).nice(4).range([h, 0]);
    g.append("g").attr("class", "grelha").selectAll("line").data(y.ticks(4)).join("line").attr("x1", 0).attr("x2", w).attr("y1", y).attr("y2", y);
    g.append("g").attr("class", "eixo").call(d3.axisLeft(y).ticks(4).tickFormat(eixo).tickSize(0).tickPadding(8)).call((a) => a.select(".domain").remove());
    const passo = Math.ceil(serie.length / Math.max(1, Math.floor(w / 58)));
    g.append("g")
      .attr("class", "eixo")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues(serie.map((s) => s.m).filter((_, i) => i % passo === 0)).tickFormat((m) => mesNome(m, { curto: true })).tickSize(0).tickPadding(10))
      .call((a) => a.select(".domain").attr("stroke", "rgba(160,184,255,.28)"));
    const bw = Math.min(24, x.bandwidth());
    const off = (x.bandwidth() - bw) / 2;
    const grupo = g.append("g");
    for (const s of serie) {
      const x0 = x(s.m) + off;
      if (!s.tem) {
        grupo.append("rect").attr("x", x0).attr("y", h - 2).attr("width", bw).attr("height", 2).attr("fill", "rgba(160,184,255,.22)");
        continue;
      }
      const cor = s.src === "youtube" ? COR_YT : COR_OUTRA;
      if (s.p) {
        const vEst = Math.min(s.est ?? s.v, y.domain()[1]);
        grupo.append("path").attr("d", barraPath(x0, y(vEst), bw, h - y(vEst))).attr("fill", "url(#trac-mes)");
        const vReal = Math.min(s.v, y.domain()[1]);
        grupo.append("path").attr("d", barraPath(x0, y(vReal), bw, h - y(vReal))).attr("fill", cor);
      } else {
        grupo.append("path").attr("d", barraPath(x0, y(s.v), bw, h - y(s.v))).attr("fill", cor).attr("fill-opacity", destaque && destaque !== s.m ? 0.85 : 1);
      }
      if (destaque === s.m) {
        g.append("text").attr("x", x0 + bw / 2).attr("y", y(s.v) - 6).attr("text-anchor", "middle").attr("fill", "#eef2fb").attr("font-size", 11).attr("font-weight", 700).text(curto(s.v));
      }
    }
    // Zonas de interação maiores do que as barras
    g.append("g")
      .selectAll("rect")
      .data(serie)
      .join("rect")
      .attr("x", (s) => x(s.m) - (x.step() * x.paddingInner()) / 2)
      .attr("y", 0)
      .attr("width", x.step())
      .attr("height", h)
      .attr("fill", "transparent")
      .on("mousemove", (ev, s) => {
        const html = !s.tem
          ? `<b>${mesNome(s.m)}</b><br>Sem dados`
          : `<b>${mesNome(s.m)}</b><br>${inteiro(s.v)} views${s.p ? `<br>${s.cur ? "Mês a decorrer" : "Mês incompleto"}: projeção de ${inteiro(s.est)}` : ""}<br><span style="opacity:.7">Fonte: ${fonteDados(s.src)}</span>`;
        mostrarDica(html, ev);
      })
      .on("mouseleave", esconderDica);
  });
}

/**
 * Linhas de várias pessoas (meses no eixo X).
 * series: [{ nome, cor, pontos: [{ m, v }] }]
 */
export function linhasMensais(el, series, meses, { altura = 320 } = {}) {
  if (semD3(el)) return () => {};
  const d3 = window.d3;
  el.innerHTML = `<div class="legenda">${series.map((s) => `<span><i class="linha" style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join("")}</div><div class="grafico"></div>`;
  const alvo = el.querySelector(".grafico");
  return responsivo(alvo, (W) => {
    const M = { t: 16, r: 16, b: 28, l: 52 };
    const w = W - M.l - M.r;
    const h = altura - M.t - M.b;
    alvo.innerHTML = "";
    const svg = d3.select(alvo).append("svg").attr("viewBox", `0 0 ${W} ${altura}`).attr("role", "img").attr("aria-label", "Views por mês, comparação");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scalePoint().domain(meses).range([0, w]).padding(0.3);
    const max = d3.max(series.flatMap((s) => s.pontos.map((p) => p.v))) || 1;
    const y = d3.scaleLinear().domain([0, max]).nice(4).range([h, 0]);
    g.append("g").attr("class", "grelha").selectAll("line").data(y.ticks(4)).join("line").attr("x1", 0).attr("x2", w).attr("y1", y).attr("y2", y);
    g.append("g").attr("class", "eixo").call(d3.axisLeft(y).ticks(4).tickFormat(eixo).tickSize(0).tickPadding(8)).call((a) => a.select(".domain").remove());
    const passo = Math.ceil(meses.length / Math.max(1, Math.floor(w / 58)));
    g.append("g")
      .attr("class", "eixo")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues(meses.filter((_, i) => i % passo === 0)).tickFormat((m) => mesNome(m, { curto: true })).tickSize(0).tickPadding(10))
      .call((a) => a.select(".domain").attr("stroke", "rgba(160,184,255,.28)"));
    const linha = d3
      .line()
      .defined((p) => p.v !== null && p.v !== undefined)
      .x((p) => x(p.m))
      .y((p) => y(p.v))
      .curve(d3.curveMonotoneX);
    for (const s of series) {
      const pts = meses.map((m) => ({ m, v: s.pontos.find((p) => p.m === m)?.v ?? null }));
      g.append("path").datum(pts).attr("fill", "none").attr("stroke", s.cor).attr("stroke-width", 2).attr("stroke-linejoin", "round").attr("stroke-linecap", "round").attr("d", linha);
      const ult = [...pts].reverse().find((p) => p.v !== null);
      if (ult) g.append("circle").attr("cx", x(ult.m)).attr("cy", y(ult.v)).attr("r", 4).attr("fill", s.cor).attr("stroke", SUPERFICIE).attr("stroke-width", 2);
    }
    const guia = g.append("line").attr("y1", 0).attr("y2", h).attr("stroke", "rgba(238,242,251,.35)").attr("stroke-width", 1).style("opacity", 0);
    const pontosHover = g.append("g");
    g.append("rect")
      .attr("width", w)
      .attr("height", h)
      .attr("fill", "transparent")
      .on("mousemove", (ev) => {
        const [mx] = d3.pointer(ev);
        const i = Math.max(0, Math.min(meses.length - 1, Math.round((mx - x(meses[0])) / (x.step() || 1))));
        const m = meses[i];
        guia.attr("x1", x(m)).attr("x2", x(m)).style("opacity", 1);
        pontosHover.selectAll("*").remove();
        const linhas = series
          .map((s) => ({ s, v: s.pontos.find((p) => p.m === m)?.v ?? null }))
          .sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
        for (const { s, v } of linhas) if (v !== null) pontosHover.append("circle").attr("cx", x(m)).attr("cy", y(v)).attr("r", 4.5).attr("fill", s.cor).attr("stroke", SUPERFICIE).attr("stroke-width", 2);
        mostrarDica(`<b>${mesNome(m)}</b>` + linhas.map(({ s, v }) => `<div class="linha-dica"><span><i style="background:${s.cor}"></i>${esc(s.nome)}</span><b>${v === null ? "–" : curto(v)}</b></div>`).join(""), ev);
      })
      .on("mouseleave", () => {
        guia.style("opacity", 0);
        pontosHover.selectAll("*").remove();
        esconderDica();
      });
  });
}

/** Barras de views ganhas por dia (a partir dos registos diários). pontos: [{ d: 'AAAA-MM-DD', v }] */
export function barrasDiarias(el, pontos, { altura = 200 } = {}) {
  if (semD3(el)) return () => {};
  const d3 = window.d3;
  el.innerHTML = `<div class="grafico"></div>`;
  const alvo = el.querySelector(".grafico");
  return responsivo(alvo, (W) => {
    const M = { t: 12, r: 8, b: 26, l: 48 };
    const w = W - M.l - M.r;
    const h = altura - M.t - M.b;
    alvo.innerHTML = "";
    const svg = d3.select(alvo).append("svg").attr("viewBox", `0 0 ${W} ${altura}`).attr("role", "img").attr("aria-label", "Views por dia");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scaleBand().domain(pontos.map((p) => p.d)).range([0, w]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(pontos, (p) => p.v) || 1]).nice(3).range([h, 0]);
    g.append("g").attr("class", "grelha").selectAll("line").data(y.ticks(3)).join("line").attr("x1", 0).attr("x2", w).attr("y1", y).attr("y2", y);
    g.append("g").attr("class", "eixo").call(d3.axisLeft(y).ticks(3).tickFormat(eixo).tickSize(0).tickPadding(8)).call((a) => a.select(".domain").remove());
    const passo = Math.ceil(pontos.length / Math.max(1, Math.floor(w / 60)));
    g.append("g")
      .attr("class", "eixo")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues(pontos.map((p) => p.d).filter((_, i) => i % passo === 0)).tickFormat((d) => `${+d.slice(8)}/${+d.slice(5, 7)}`).tickSize(0).tickPadding(8))
      .call((a) => a.select(".domain").attr("stroke", "rgba(160,184,255,.28)"));
    const bw = Math.min(14, x.bandwidth());
    g.append("g")
      .selectAll("path")
      .data(pontos)
      .join("path")
      .attr("d", (p) => barraPath(x(p.d) + (x.bandwidth() - bw) / 2, y(p.v), bw, h - y(p.v), 3))
      .attr("fill", COR_YT);
    g.append("g")
      .selectAll("rect")
      .data(pontos)
      .join("rect")
      .attr("x", (p) => x(p.d))
      .attr("width", x.step())
      .attr("height", h)
      .attr("fill", "transparent")
      .on("mousemove", (ev, p) => mostrarDica(`<b>${data(p.d)}</b><br>${inteiro(p.v)} views nesse dia`, ev))
      .on("mouseleave", esconderDica);
  });
}

/** Views de cada episódio de um projeto, com a linha da mediana normal do canal. */
export function barrasEpisodios(el, videos, { base = null, altura = 280 } = {}) {
  if (semD3(el)) return () => {};
  const d3 = window.d3;
  el.innerHTML = `<div class="legenda"><span><i style="background:${COR_YT}"></i>Views por episódio</span>${base ? `<span><i class="linha" style="background:#f2b53a"></i>Mediana normal do canal (${curto(base)})</span>` : ""}</div><div class="grafico"></div>`;
  const alvo = el.querySelector(".grafico");
  return responsivo(alvo, (W) => {
    const M = { t: 16, r: 8, b: 28, l: 48 };
    const w = W - M.l - M.r;
    const h = altura - M.t - M.b;
    alvo.innerHTML = "";
    const svg = d3.select(alvo).append("svg").attr("viewBox", `0 0 ${W} ${altura}`).attr("role", "img").attr("aria-label", "Views por episódio");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scaleBand().domain(videos.map((_, i) => i)).range([0, w]).padding(0.25);
    const y = d3.scaleLinear().domain([0, Math.max(d3.max(videos, (v) => v.v) || 1, base || 0)]).nice(4).range([h, 0]);
    g.append("g").attr("class", "grelha").selectAll("line").data(y.ticks(4)).join("line").attr("x1", 0).attr("x2", w).attr("y1", y).attr("y2", y);
    g.append("g").attr("class", "eixo").call(d3.axisLeft(y).ticks(4).tickFormat(eixo).tickSize(0).tickPadding(8)).call((a) => a.select(".domain").remove());
    const passo = Math.ceil(videos.length / Math.max(1, Math.floor(w / 34)));
    g.append("g")
      .attr("class", "eixo")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues(videos.map((_, i) => i).filter((i) => i % passo === 0)).tickFormat((i) => "Ep. " + (i + 1)).tickSize(0).tickPadding(8))
      .call((a) => a.select(".domain").attr("stroke", "rgba(160,184,255,.28)"));
    const bw = Math.min(24, x.bandwidth());
    g.append("g")
      .selectAll("path")
      .data(videos)
      .join("path")
      .attr("d", (v, i) => barraPath(x(i) + (x.bandwidth() - bw) / 2, y(v.v), bw, h - y(v.v)))
      .attr("fill", COR_YT);
    if (base) {
      g.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(base)).attr("y2", y(base)).attr("stroke", "#f2b53a").attr("stroke-width", 2);
    }
    g.append("g")
      .selectAll("rect")
      .data(videos)
      .join("rect")
      .attr("x", (_, i) => x(i))
      .attr("width", x.step())
      .attr("height", h)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mousemove", (ev, v) =>
        mostrarDica(`<b>${esc(v.t)}</b><br>${inteiro(v.v)} views<br>${data(v.p)}${base ? `<br>${(v.v / base).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}× a mediana do canal` : ""}`, ev),
      )
      .on("mouseleave", esconderDica)
      .on("click", (_, v) => window.open(`https://www.youtube.com/watch?v=${v.id}`, "_blank", "noopener"));
  });
}

export { moverDica };
