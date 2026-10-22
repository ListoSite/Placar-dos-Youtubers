// A história de um Youtuber: a linha das views desenha-se mês a mês, com os momentos marcantes.

import { estado, pessoa, views, recordes, indice } from "../data.js";
import { esc, curto, inteiro, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, letras } from "./stage.js";
import { animate, stagger, spring } from "../../vendor/anime.esm.min.js";

export async function correr(palco, opts) {
  const p = pessoa(opts.id) || pessoa(palco.foco) || pessoa([...estado.posIndice.entries()].find(([, pos]) => pos === 1)?.[0]);
  if (!p) throw new Error("Escolhe um Youtuber.");
  const meses = estado.ds.months.filter((m) => m < estado.ds.currentMonth);
  const pontos = meses.map((m, i) => ({ m, i, v: views(p, m) })).filter((x) => x.v !== null);
  if (pontos.length < 3) throw new Error(`${p.name} ainda tem poucos meses com dados.`);
  const vertical = palco.vertical;
  const cena = palco.cena;
  const rec = recordes(p);

  // ---------- Momentos ----------
  const momentos = new Map();
  const juntar = (m, t) => momentos.set(m, [...(momentos.get(m) || []), t]);
  juntar(pontos[0].m, { titulo: "O início", texto: `${curto(pontos[0].v)} views em ${mesNome(pontos[0].m)}` });
  const milhao = pontos.find((x) => x.v >= 1e6);
  if (milhao && milhao !== pontos[0]) juntar(milhao.m, { titulo: "Primeiro milhão", texto: `Mais de 1 milhão de views num mês, em ${mesNome(milhao.m)}` });
  if (rec.melhorPos) juntar(rec.melhorPos.m, { titulo: "Melhor posição", texto: `${rec.melhorPos.pos}.º lugar no ranking de ${mesNome(rec.melhorPos.m)}` });
  if (rec.melhor) juntar(rec.melhor.m, { titulo: "Melhor mês de sempre", texto: `${curto(rec.melhor.v)} views em ${mesNome(rec.melhor.m)}`, ouro: true });
  const ultimo = pontos[pontos.length - 1];
  if (!momentos.has(ultimo.m)) juntar(ultimo.m, { titulo: "Hoje", texto: `${curto(ultimo.v)} views em ${mesNome(ultimo.m)}` });

  // ---------- Abertura ----------
  palco.musica("tensao", 1);
  cena.innerHTML = `<div class="p-centro">${avatarPalco(p, vertical ? 380 : 320)}
    <div class="ab-etiqueta" style="margin:50px 0 0">A história de</div>
    <h1 class="p-titulo" style="font-size:${vertical ? 104 : 124}px;margin-top:24px">${letras(p.name)}</h1>
    <p class="p-sub ab-sub">${esc([p.category, p.since ? `no YouTube desde ${new Date(p.since).getFullYear()}` : ""].filter(Boolean).join(", "))}</p></div>`;
  animate(cena.querySelectorAll(".ab-letra"), { translateY: [120, 0], opacity: [0, 1], delay: stagger(40, { start: 400 }), duration: 900, ease: spring({ stiffness: 130, damping: 12 }) });
  animate(cena.querySelector(".palco-avatar"), { scale: [0.3, 1], rotate: [-25, 0], duration: 1000, ease: spring({ stiffness: 110, damping: 11 }) });
  animate(cena.querySelectorAll(".ab-sub"), { opacity: [0, 1], translateY: [30, 0], delay: 1100, duration: 700 });
  palco.tocar("_abertura", {}, 0.2);
  await palco.passo(4000);
  await palco.sair_(cena.firstElementChild);

  // ---------- Gráfico ----------
  palco.tela.classList.add("denso");
  const area = vertical ? { x: 90, y: 560, w: 920, h: 820 } : { x: 150, y: 260, w: 1640, h: 620 };
  const max = Math.max(...pontos.map((x) => x.v)) * 1.12;
  const X = (i) => area.x + ((i - pontos[0].i) / Math.max(1, ultimo.i - pontos[0].i)) * area.w;
  const Y = (v) => area.y + area.h - (v / max) * area.h;
  const d = pontos.map((x, k) => `${k ? "L" : "M"}${X(x.i).toFixed(1)} ${Y(x.v).toFixed(1)}`).join("");
  const dArea = `${d}L${X(ultimo.i)} ${area.y + area.h}L${X(pontos[0].i)} ${area.y + area.h}Z`;
  const linhasY = [0.25, 0.5, 0.75, 1].map((k) => max * k / 1.12);
  cena.innerHTML = `<div class="hs-cabeca">${avatarPalco(p, vertical ? 110 : 96)}<div><b>${esc(p.name)}</b><small>Views por mês</small></div></div>
    <svg class="hs-grafico" viewBox="0 0 ${palco.L} ${palco.A}" width="${palco.L}" height="${palco.A}">
      <defs>
        <linearGradient id="hs-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--rubi);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--rubi);stop-opacity:0"/></linearGradient>
        <clipPath id="hs-clip"><rect x="0" y="0" width="0" height="${palco.A}"/></clipPath>
      </defs>
      ${linhasY.map((v) => `<line class="hs-grelha" x1="${area.x}" x2="${area.x + area.w}" y1="${Y(v)}" y2="${Y(v)}"/><text class="hs-eixo" x="${area.x - 16}" y="${Y(v) + 8}" text-anchor="end">${curto(v)}</text>`).join("")}
      <g clip-path="url(#hs-clip)"><path class="hs-area" d="${dArea}"/><path class="hs-linha" d="${d}"/></g>
      ${[...momentos.keys()].map((m) => {
        const x = pontos.find((y) => y.m === m);
        return `<circle class="hs-marco" data-m="${m}" cx="${X(x.i)}" cy="${Y(x.v)}" r="12"/>`;
      }).join("")}
      <circle class="hs-cabeca-ponto" r="16" cx="${X(pontos[0].i)}" cy="${Y(pontos[0].v)}"/>
    </svg>
    <div class="hs-mes"><span></span><b></b></div>
    <div class="hs-popup"></div>`;
  const rect = cena.querySelector("#hs-clip rect");
  const cabeca = cena.querySelector(".hs-cabeca-ponto");
  const mesEl = cena.querySelector(".hs-mes span");
  const valEl = cena.querySelector(".hs-mes b");
  const popup = cena.querySelector(".hs-popup");
  palco.musica("epico", 1);

  const irAte = (k0, k1, dur) =>
    new Promise((resolve, reject) => {
      let feito = 0;
      let antes = performance.now();
      let ultimoK = -1;
      const frame = (agora) => {
        if (palco.terminado) return reject(new Error("abortado"));
        if (!palco.pausado) feito += agora - antes;
        antes = agora;
        const t = Math.min(1, feito / dur);
        const pos = k0 + (k1 - k0) * t;
        const a = pontos[Math.floor(pos)];
        const b = pontos[Math.min(pontos.length - 1, Math.floor(pos) + 1)];
        const f = pos - Math.floor(pos);
        const x = X(a.i) + (X(b.i) - X(a.i)) * f;
        const y = Y(a.v) + (Y(b.v) - Y(a.v)) * f;
        rect.setAttribute("width", x);
        cabeca.setAttribute("cx", x);
        cabeca.setAttribute("cy", y);
        const k = Math.round(pos);
        if (k !== ultimoK) {
          ultimoK = k;
          mesEl.textContent = mesNome(pontos[k].m);
          valEl.textContent = curto(pontos[k].v);
          if (t < 1) palco.tocar("tique");
        }
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

  const paragens = [...momentos.keys()].map((m) => pontos.findIndex((x) => x.m === m)).sort((a, b) => a - b);
  const porPonto = Math.max(140, Math.min(600, 11000 / pontos.length)) * palco.fator;
  let atual = 0;
  for (const k of paragens) {
    if (k > atual) await irAte(atual, k, (k - atual) * porPonto);
    atual = k;
    const x = pontos[k];
    const itens = momentos.get(x.m);
    const ouro = itens.some((y) => y.ouro);
    cena.querySelector(`.hs-marco[data-m="${x.m}"]`)?.classList.add("aceso", ...(ouro ? ["ouro"] : []));
    const t = palco.tela.getBoundingClientRect();
    const px = X(x.i);
    const py = Y(x.v);
    popup.className = `hs-popup visivel ${ouro ? "ouro" : ""} ${px > palco.L * 0.6 ? "esq" : ""}`;
    popup.style.left = px + "px";
    popup.style.top = Math.max(vertical ? 380 : 170, py - (vertical ? 260 : 220)) + "px";
    popup.innerHTML = itens.map((y) => `<div><small>${esc(y.titulo)}</small><b>${esc(y.texto)}</b></div>`).join("");
    popup.animate([{ transform: `${px > palco.L * 0.6 ? "translateX(-100%) " : ""}scale(.5)`, opacity: 0 }, { transform: `${px > palco.L * 0.6 ? "translateX(-100%) " : ""}scale(1)`, opacity: 1 }], { duration: 450, easing: "cubic-bezier(.2,1.4,.4,1)" });
    palco.tocar(ouro ? "_destaque" : "revelar");
    if (ouro) {
      palco.flash(0.4);
      palco.explodir(px, py, { n: 80, forca: 0.7 });
    }
    await palco.passo(ouro ? 3000 : 2400);
    popup.classList.remove("visivel");
    void t;
  }

  // ---------- Resumo ----------
  const ind = indice(p.id);
  const pos = estado.posIndice.get(p.id);
  const subsAno = p.sb?.s ? Object.values(p.sb.s).slice(-12).reduce((a, b) => a + b, 0) : null;
  const numeros = [
    { nome: "Índice de Influência", v: ind.total, fmt: inteiro, extra: pos ? `${pos}.º em Portugal` : "" },
    { nome: "Views totais", v: p.totals?.views, fmt: curto },
    { nome: "Subscritores", v: p.totals?.subs, fmt: curto },
    { nome: "Meses no top 10", v: rec.top10, fmt: inteiro },
    { nome: "Subscritores ganhos num ano", v: subsAno || null, fmt: curto },
  ].filter((x) => x.v !== null && x.v !== undefined);
  cena.innerHTML = `<div class="hs-resumo">
    <div class="hs-resumo-topo">${avatarPalco(p, vertical ? 220 : 200)}<div class="p-titulo" style="font-size:${vertical ? 76 : 88}px">${esc(p.name)}</div></div>
    <div class="hs-numeros">${numeros.map((x) => `<div class="hs-num"><span>${esc(x.nome)}</span><b data-v="${x.v}">0</b>${x.extra ? `<small>${esc(x.extra)}</small>` : ""}</div>`).join("")}</div></div>`;
  animate(cena.querySelectorAll(".hs-num"), { translateY: [80, 0], opacity: [0, 1], delay: stagger(140, { start: 300 }), duration: 900, ease: spring({ stiffness: 140, damping: 13 }) });
  cena.querySelectorAll(".hs-num b").forEach((b, k) => contar(b, Number(b.dataset.v), { formato: numeros[k].fmt, duracao: 1200, atraso: 400 + k * 140 }));
  palco.festa({ forca: 0.8 });
  await palco.passo(6500);
  await palco.fecho();
}
