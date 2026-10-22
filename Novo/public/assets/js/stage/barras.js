// Gráfico de barras: as colunas crescem fora de ordem, depois ordenam-se sozinhas e o líder sobe ao topo.

import { estado } from "../data.js";
import { esc, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, baralhar, comFoco } from "./stage.js";
import { METRICAS, rankingPor } from "./metricas.js";
import { animar, cabecalho, pontoDe, escala } from "./grafico.js";

export async function correr(palco, opts) {
  const m = opts.m || estado.ref;
  const chave = METRICAS[opts.metric] ? opts.metric : "views";
  const met = METRICAS[chave];
  const n = Math.min(12, Math.max(5, Number(opts.n) || 10));
  palco.contexto = { metrica: chave, m, cat: opts.cat };
  let lista = rankingPor(chave, m, { cat: opts.cat, n });
  lista = comFoco(lista, palco, { chave: (x) => x.p, criar: (p) => ({ p, v: met.valor(p, m) }) }).filter((x) => x.v !== null && x.v !== undefined);
  if (lista.length < 3) throw new Error("Há poucos Youtubers com dados para este gráfico.");
  lista.sort((a, b) => b.v - a.v);
  const vertical = palco.vertical;
  const cena = palco.cena;
  const N = lista.length;
  const titulo = met.nome(m);

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Gráfico", titulo: `Top ${N}\nem barras`, sub: `${titulo}${opts.cat ? `, ${opts.cat}` : ""}` });

  // ---------- Montagem ----------
  const area = vertical ? { x: 110, y: 470, w: 900, h: 940 } : { x: 190, y: 250, w: 1600, h: 490 };
  const positivos = lista.every((x) => x.v >= 0);
  const esc_ = escala(Math.max(...lista.map((x) => Math.abs(x.v))));
  const Y = (v) => (Math.abs(v) / esc_.max) * area.h;
  const slot = area.w / N;
  const larg = Math.min(vertical ? 74 : 110, slot * 0.68);
  const tamAv = Math.min(vertical ? 70 : 92, slot * 0.82);
  const ordemInicial = baralhar(lista.map((_, i) => i));
  cena.innerHTML = `${cabecalho(titulo, opts.cat ? `Categoria ${opts.cat}` : "Youtubers portugueses", mesNome(m, { curto: true }))}
    <div class="gf-plano" style="left:${area.x}px;top:${area.y}px;width:${area.w}px;height:${area.h}px">
      ${esc_.marcas.map((v) => `<div class="gf-grelha" style="bottom:${Y(v)}px"><span>${esc(met.fmt(v))}</span></div>`).join("")}
      <div class="bb-media" hidden><span></span></div>
      ${lista
        .map(
          (x, i) => `<div class="bb-col${x.v < 0 ? " neg" : ""}" data-i="${i}" style="left:${ordemInicial.indexOf(i) * slot + (slot - larg) / 2}px;width:${larg}px">
          <div class="bb-val"></div>
          <div class="bb-fill"></div>
          <div class="bb-pessoa" style="--av:${tamAv}px;width:${slot - 4}px">${avatarPalco(x.p, tamAv)}<small>${esc(x.p.name)}</small></div>
        </div>`,
        )
        .join("")}
    </div>
    <div class="bb-faixa"></div>`;
  const cols = [...cena.querySelectorAll(".bb-col")];
  const faixa = cena.querySelector(".bb-faixa");
  animate_(cena.querySelectorAll(".gf-grelha"), palco);
  palco.musica("epico", 1);
  await palco.esperar(600);

  // ---------- As colunas crescem (fora de ordem) ----------
  for (const i of ordemInicial) {
    const col = cols[i];
    const alvo = Y(lista[i].v);
    col.classList.add("visivel");
    contar(col.querySelector(".bb-val"), lista[i].v, { formato: met.fmt, duracao: 650 });
    palco.tocar("tique");
    await animar(palco, 420, (_, e) => (col.querySelector(".bb-fill").style.height = alvo * e + "px"));
    col.querySelector(".bb-val").style.bottom = alvo + 14 + "px";
  }
  await palco.passo(900);

  // ---------- Ordenar ----------
  faixa.innerHTML = `<b class="p-slam">Por ordem!</b>`;
  palco.tocar("whoosh");
  palco.tremer(0.3);
  await palco.esperar(600, { exato: true });
  cols.forEach((col, i) => {
    col.style.transitionDelay = `${(N - i) * 45}ms`;
    col.style.left = i * slot + (slot - larg) / 2 + "px";
  });
  for (let k = 0; k < 4; k++) palco.tocar("virar", {}, k * 0.18);
  await palco.esperar(1500, { exato: true });
  faixa.innerHTML = "";
  await palco.meio();

  // ---------- O líder ----------
  const lider = cols[0];
  lider.classList.add("lider");
  const p0 = pontoDe(palco, lider.querySelector(".bb-val"));
  palco.flash(0.4);
  palco.tocar("_destaque");
  palco.explodir(p0.x, p0.y, { n: 90, forca: 0.7 });
  faixa.innerHTML = `<span class="p-entra">${avatarPalco(lista[0].p, vertical ? 84 : 72)}<b>${esc(lista[0].p.name)}</b> em 1.º com ${esc(met.fmt(lista[0].v))}</span>`;
  await palco.passo(3000);

  // ---------- Linha da média ----------
  if (positivos) {
    const media = lista.reduce((a, x) => a + x.v, 0) / N;
    const linha = cena.querySelector(".bb-media");
    linha.hidden = false;
    linha.style.bottom = Y(media) + "px";
    linha.querySelector("span").textContent = `Média ${met.fmt(media)}`;
    palco.tocar("subida");
    await animar(palco, 900, (_, e) => (linha.style.width = e * 100 + "%"));
    const acima = lista.filter((x) => x.v > media).length;
    cols.forEach((col, i) => col.classList.toggle("abaixo", lista[i].v <= media));
    faixa.innerHTML = `<span class="p-entra"><b>${acima}</b> de ${N} acima da média</span>`;
    palco.tocar("ponto");
    await palco.passo(3200);
    cols.forEach((col) => col.classList.remove("abaixo"));
  }
  faixa.innerHTML = "";
  palco.festa({ forca: 0.6, x: p0.x, y: p0.y });
  await palco.passo(3000);
  await palco.fecho();
}

function animate_(els, palco) {
  els.forEach((el, i) => el.animate([{ opacity: 0, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)" }], { duration: 600, delay: i * 70 * palco.fator, easing: "cubic-bezier(.2,.9,.3,1)", fill: "backwards" }));
}
