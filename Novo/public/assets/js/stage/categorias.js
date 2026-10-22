// Categorias: um donut com a fatia de cada categoria nas views do mês, desenhado fatia a fatia,
// e depois as maiores categorias em destaque com o seu n.º 1.

import { estado, views } from "../data.js";
import { esc, curto, mesNome, inteiro } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco } from "./stage.js";
import { animar, cabecalho } from "./grafico.js";

const PALETA = ["#4fc3f7", "#9c6bff", "#4fe3a0", "#ff8a3d", "#ff5c8a", "#ffe14d", "#2ec4b6"];

export async function correr(palco, opts) {
  const m = opts.m || estado.ref;
  const porCanais = opts.medida === "canais";
  palco.contexto = { metrica: "views", m };
  const grupos = new Map();
  for (const p of estado.ds.people) {
    const v = views(p, m);
    if (v === null || !p.category) continue;
    const g = grupos.get(p.category) || { cat: p.category, v: 0, canais: 0, top: null };
    g.v += v;
    g.canais += 1;
    if (!g.top || v > g.top.v) g.top = { p, v };
    grupos.set(p.category, g);
  }
  let lista = [...grupos.values()].map((g) => ({ ...g, valor: porCanais ? g.canais : g.v })).sort((a, b) => b.valor - a.valor);
  if (lista.length < 3) throw new Error("Há poucas categorias com dados neste mês.");
  const maxFatias = 7;
  if (lista.length > maxFatias) {
    const resto = lista.slice(maxFatias);
    lista = [...lista.slice(0, maxFatias), { cat: `Outras (${resto.length})`, valor: resto.reduce((a, g) => a + g.valor, 0), v: resto.reduce((a, g) => a + g.v, 0), canais: resto.reduce((a, g) => a + g.canais, 0), outras: true }];
  }
  const total = lista.reduce((a, g) => a + g.valor, 0);
  const cores = [palco.tema.id === "chroma" ? "#e0294f" : "var(--rubi)", "var(--ouro)", ...PALETA];
  lista.forEach((g, i) => (g.cor = g.outras ? "rgba(160,160,170,.55)" : cores[i % cores.length]));
  const vertical = palco.vertical;
  const cena = palco.cena;
  const fmt = porCanais ? inteiro : curto;
  const unidade = porCanais ? "canais" : "views";

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Gráfico", titulo: "O bolo\ndas categorias", sub: `${porCanais ? "Quantos canais tem cada categoria" : "Quem fica com as views"} em ${mesNome(m)}` });

  // ---------- Donut ----------
  const R = vertical ? 330 : 300;
  const esp = vertical ? 110 : 100;
  const C = 2 * Math.PI * R;
  const D = (R + esp) * 2;
  const centro = { x: vertical ? palco.L / 2 : 560, y: vertical ? 760 : 590 };
  let acum = 0;
  const fatias = lista.map((g) => {
    const f = { ...g, ini: acum / total, frac: g.valor / total };
    acum += g.valor;
    return f;
  });
  cena.innerHTML = `${cabecalho(porCanais ? "Canais por categoria" : "Views por categoria", `Youtubers portugueses, ${mesNome(m)}`)}
    <div class="ct-donut" style="left:${centro.x - D / 2}px;top:${centro.y - D / 2}px;width:${D}px;height:${D}px">
      <svg viewBox="0 0 ${D} ${D}" width="${D}" height="${D}">
        <circle cx="${D / 2}" cy="${D / 2}" r="${R}" class="ct-trilho" style="stroke-width:${esp}px"/>
        ${fatias.map((f, i) => `<circle class="ct-fatia" data-i="${i}" cx="${D / 2}" cy="${D / 2}" r="${R}" style="stroke:${f.cor};stroke-width:${esp}px;stroke-dasharray:0 ${C};transform:rotate(${-90 + f.ini * 360}deg)"/>`).join("")}
      </svg>
      <div class="ct-centro"><small>Total</small><b>0</b><span>${esc(unidade)}</span></div>
    </div>
    <div class="ct-legenda">${fatias
      .map((f, i) => `<div class="ct-item" data-i="${i}"><i style="background:${f.cor}"></i><span>${esc(f.cat)}</span><b>0%</b></div>`)
      .join("")}</div>`;
  const centroEl = cena.querySelector(".ct-centro");
  contar(centroEl.querySelector("b"), total, { formato: fmt, duracao: 2400 });
  palco.musica("epico", 1);
  await palco.esperar(500);
  const els = [...cena.querySelectorAll(".ct-fatia")];
  const itens = [...cena.querySelectorAll(".ct-item")];
  for (const [i, f] of fatias.entries()) {
    itens[i].classList.add("visivel");
    contar(itens[i].querySelector("b"), f.frac * 100, { formato: (x) => `${x.toFixed(x < 10 ? 1 : 0).replace(".", ",")}%`, duracao: 700 });
    palco.tocar(i < 3 ? "ponto" : "tique");
    const alvo = Math.max(0, f.frac * C - 4);
    await animar(palco, Math.max(260, 900 * f.frac + 220), (_, e) => (els[i].style.strokeDasharray = `${alvo * e} ${C}`));
  }
  await palco.passo(1400);
  await palco.meio();

  // ---------- Destaques ----------
  const destaques = fatias.filter((f) => !f.outras && f.top).slice(0, 3);
  for (const [k, f] of destaques.entries()) {
    const i = fatias.indexOf(f);
    const meio = ((f.ini + f.frac / 2) * 360 - 90) * (Math.PI / 180);
    els.forEach((el, j) => {
      el.classList.toggle("apagada", j !== i);
      el.style.translate = j === i ? `${Math.cos(meio) * 34}px ${Math.sin(meio) * 34}px` : "0 0";
    });
    itens.forEach((it, j) => it.classList.toggle("ativo", j === i));
    centroEl.innerHTML = `<small>${k === 0 ? "A maior" : `${k + 1}.ª maior`}</small><b class="p-slam">${esc(f.cat)}</b><span>${esc(fmt(f.valor))} ${esc(unidade)}</span>`;
    palco.flash(0.25);
    const quem = cena.querySelector(".ct-quem") || cena.appendChild(Object.assign(document.createElement("div"), { className: "ct-quem" }));
    quem.innerHTML = `<div class="p-entra">${avatarPalco(f.top.p, vertical ? 150 : 130)}<div><small>N.º 1 em ${esc(f.cat)}</small><b>${esc(f.top.p.name)}</b><span>${esc(curto(f.top.v))} views${porCanais ? "" : `, ${Math.round((f.top.v / f.v) * 100)}% da categoria`}</span></div></div>`;
    const avQuem = quem.querySelector(".palco-avatar");
    setTimeout(() => {
      if (!palco.terminado && !palco.evento("revelar", { alvo: avQuem, p: f.top.p, pos: k + 1 })) palco.tocar(k === 0 ? "_destaque" : "revelar");
    }, 350);
    if (k === 0) palco.explodir(centro.x + Math.cos(meio) * R, centro.y + Math.sin(meio) * R, { n: 90, forca: 0.7 });
    await palco.passo(3600);
  }
  els.forEach((el) => {
    el.classList.remove("apagada");
    el.style.translate = "0 0";
  });
  itens.forEach((it) => it.classList.remove("ativo"));
  cena.querySelector(".ct-quem")?.remove();
  centroEl.innerHTML = `<small>${esc(mesNome(m))}</small><b class="p-slam">${esc(fmt(total))}</b><span>${esc(unidade)}</span>`;
  palco.festa({ forca: 0.5, x: centro.x, y: centro.y });
  await palco.passo(3000);
  const L = (p, valor = "", pos) => ({ id: p.id, nome: p.name, valor: String(valor), pos });
  palco.resumir({ tipo: "grafico", medida: porCanais ? "Canais por categoria" : `Views por categoria em ${mesNome(m)}`, linhas: fatias.map((f) => ({ nome: f.cat, valor: `${Math.round(f.frac * 100)}%` })) });
  await palco.fecho();
}
