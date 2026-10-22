// Linhas: as views de vários Youtubers mês a mês, todas a desenhar-se ao mesmo tempo,
// com a cara de cada um na ponta da linha e o líder em destaque.

import { estado, views } from "../data.js";
import { esc, curto, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, comFoco } from "./stage.js";
import { animar, cabecalho, escala } from "./grafico.js";

const CORES = ["var(--rubi)", "var(--ouro)", "#4fc3f7", "#4fe3a0", "#b388ff", "#ff8a3d", "#ff5c8a"];

export async function correr(palco, opts) {
  const ds = estado.ds;
  const n = Math.min(7, Math.max(2, Number(opts.n) || 5));
  const todos = ds.months.filter((m) => m < ds.currentMonth && m <= (opts.m || estado.ref));
  const meses = todos.slice(-(Number(opts.meses) || 12));
  if (meses.length < 3) throw new Error("São precisos pelo menos 3 meses com dados.");
  palco.contexto = { metrica: "views", m: meses[meses.length - 1], cat: opts.cat };
  const soma = (p) => meses.reduce((a, m) => a + (views(p, m) || 0), 0);
  let pessoas = ds.people
    .filter((p) => !opts.cat || p.category === opts.cat)
    .map((p) => ({ p, s: soma(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.p);
  pessoas = comFoco(pessoas, palco);
  if (pessoas.length < 2) throw new Error("Há poucos Youtubers com dados neste período.");
  const series = pessoas.map((p, k) => ({ p, cor: CORES[k % CORES.length], v: meses.map((m) => views(p, m)) }));
  const vertical = palco.vertical;
  const cena = palco.cena;

  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: "Gráfico", titulo: "Linha a\nlinha", sub: `${series.length} Youtubers, ${mesNome(meses[0])} a ${mesNome(meses[meses.length - 1])}${opts.cat ? `, ${opts.cat}` : ""}` });

  // ---------- Gráfico ----------
  palco.tela.classList.add("denso");
  const area = vertical ? { x: 150, y: 470, w: 760, h: 900 } : { x: 170, y: 250, w: 1360, h: 610 };
  const esc_ = escala(Math.max(...series.flatMap((s) => s.v.filter((v) => v !== null))) * 1.05);
  const X = (i) => area.x + (i / (meses.length - 1)) * area.w;
  const Y = (v) => area.y + area.h - (v / esc_.max) * area.h;
  const caminho = (s) => {
    let d = "";
    let caneta = false;
    s.v.forEach((v, i) => {
      if (v === null) return (caneta = false);
      d += `${caneta ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
      caneta = true;
    });
    return d;
  };
  const passoMes = Math.max(1, Math.ceil(meses.length / (vertical ? 6 : 12)));
  cena.innerHTML = `${cabecalho("Views por mês", opts.cat ? `Os ${series.length} maiores em ${opts.cat}` : `Os ${series.length} maiores do período`)}
    <svg class="ln-svg" viewBox="0 0 ${palco.L} ${palco.A}" width="${palco.L}" height="${palco.A}">
      <defs><clipPath id="ln-clip"><rect x="0" y="0" width="${area.x}" height="${palco.A}"/></clipPath></defs>
      ${esc_.marcas.map((v) => `<line class="hs-grelha" x1="${area.x}" x2="${area.x + area.w}" y1="${Y(v)}" y2="${Y(v)}"/><text class="hs-eixo" x="${area.x - 18}" y="${Y(v) + 9}" text-anchor="end">${curto(v)}</text>`).join("")}
      ${meses.map((m, i) => (i % passoMes === 0 || i === meses.length - 1 ? `<text class="hs-eixo ln-mes" x="${X(i)}" y="${area.y + area.h + 48}" text-anchor="middle">${esc(mesNome(m, { curto: true, ano: false }))}</text>` : "")).join("")}
      <g clip-path="url(#ln-clip)">${series.map((s, k) => `<path class="ln-linha" data-k="${k}" d="${caminho(s)}" style="stroke:${s.cor}"/>`).join("")}</g>
    </svg>
    ${series.map((s, k) => `<div class="ln-ponta" data-k="${k}" style="--cor:${s.cor}">${avatarPalco(s.p, vertical ? 64 : 58)}<b></b></div>`).join("")}
    <div class="ln-lider"></div>`;
  const rect = cena.querySelector("#ln-clip rect");
  const pontas = [...cena.querySelectorAll(".ln-ponta")];
  const linhas = [...cena.querySelectorAll(".ln-linha")];
  const liderEl = cena.querySelector(".ln-lider");
  const valorEm = (s, pos) => {
    const a = Math.floor(pos);
    const b = Math.min(meses.length - 1, a + 1);
    const va = s.v[a];
    const vb = s.v[b] ?? va;
    if (va === null) return null;
    return va + (vb - va) * (pos - a);
  };
  let lider = null;
  const desenhar = (pos) => {
    rect.setAttribute("width", X(pos));
    const atuais = series.map((s) => valorEm(s, pos));
    // Pontas: evitar que se sobreponham (afasta-as na vertical)
    const ys = atuais.map((v, k) => ({ k, y: v === null ? null : Y(v) })).filter((x) => x.y !== null).sort((a, b) => a.y - b.y);
    const minGap = vertical ? 70 : 62;
    for (let i = 1; i < ys.length; i++) if (ys[i].y - ys[i - 1].y < minGap) ys[i].y = ys[i - 1].y + minGap;
    const yFinal = new Map(ys.map((x) => [x.k, x.y]));
    pontas.forEach((el, k) => {
      const y = yFinal.get(k);
      el.style.opacity = y === undefined ? "0" : "1";
      if (y === undefined) return;
      el.style.transform = `translate(${X(pos)}px, ${y}px)`;
      el.querySelector("b").textContent = curto(atuais[k]);
    });
    const melhor = atuais.reduce((a, v, k) => (v !== null && (a === -1 || v > atuais[a]) ? k : a), -1);
    if (melhor !== -1 && melhor !== lider) {
      if (lider !== null) {
        if (!palco.evento("lider", { alvo: pontas[melhor], p: series[melhor].p })) palco.tocar("virar");
        liderEl.classList.remove("muda");
        void liderEl.offsetWidth;
        liderEl.classList.add("muda");
      }
      lider = melhor;
      pontas.forEach((el, k) => el.classList.toggle("lider", k === melhor));
      linhas.forEach((l, k) => l.classList.toggle("lider", k === melhor));
      liderEl.innerHTML = `<small>Na frente em ${esc(mesNome(meses[Math.round(pos)], { curto: true }))}</small><b>${esc(series[melhor].p.name)}</b>`;
    } else if (melhor !== -1) liderEl.querySelector("small").textContent = `Na frente em ${mesNome(meses[Math.round(pos)], { curto: true })}`;
  };
  desenhar(0);
  palco.musica("epico", 1);
  await palco.esperar(700);
  const porMes = Math.max(420, Math.min(1300, 14000 / meses.length));
  const metade = Math.floor((meses.length - 1) / 2);
  let ultimoTique = -1;
  await animar(palco, porMes * metade, (_, e) => {
    const pos = e * metade;
    if (Math.floor(pos) !== ultimoTique) {
      ultimoTique = Math.floor(pos);
      palco.tocar("tique");
    }
    desenhar(pos);
  }, { easing: (t) => t });
  await palco.meio();
  await animar(palco, porMes * (meses.length - 1 - metade), (_, e) => {
    const pos = metade + e * (meses.length - 1 - metade);
    if (Math.floor(pos) !== ultimoTique) {
      ultimoTique = Math.floor(pos);
      palco.tocar("tique");
    }
    desenhar(pos);
  }, { easing: (t) => t });
  desenhar(meses.length - 1);
  palco.flash(0.35);
  const pl = pontas[lider];
  if (!palco.evento("vencedor", { alvo: pl.querySelector(".palco-avatar"), p: series[lider].p })) palco.tocar("_destaque");
  const tr = pl.style.transform.match(/translate\(([\d.]+)px, ([\d.]+)px\)/);
  if (tr) palco.explodir(Number(tr[1]), Number(tr[2]), { n: 80, forca: 0.6 });
  await palco.passo(2600);

  // ---------- Quem mais cresceu no período ----------
  const cresc = series
    .map((s) => {
      const vals = s.v.filter((v) => v !== null);
      const a = vals[0];
      const b = vals[vals.length - 1];
      return { s, a, b, pct: a > 0 ? ((b - a) / a) * 100 : null };
    })
    .filter((x) => x.pct !== null)
    .sort((x, y) => y.pct - x.pct);
  palco.tela.classList.remove("denso");
  cena.innerHTML = `${cabecalho("Do primeiro ao último mês", `${mesNome(meses[0])} → ${mesNome(meses[meses.length - 1])}`)}
    <div class="ln-cresc">${cresc
      .map(
        (x, i) => `<div class="ln-c" style="--cor:${x.s.cor}">${avatarPalco(x.s.p, vertical ? 96 : 84)}<div><b>${esc(x.s.p.name)}</b><small>${esc(curto(x.a))} → ${esc(curto(x.b))}</small></div><span class="${x.pct >= 0 ? "sobe" : "desce"}" data-v="${x.pct}" data-i="${i}">0%</span></div>`,
      )
      .join("")}</div>`;
  const filas = [...cena.querySelectorAll(".ln-c")];
  filas.forEach((f, i) => f.animate([{ opacity: 0, transform: "translateX(-80px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: i * 140, easing: "cubic-bezier(.2,1.2,.4,1)", fill: "backwards" }));
  cena.querySelectorAll(".ln-c span[data-v]").forEach((el, i) => {
    const v = Number(el.dataset.v);
    contar(el, Math.abs(v), { formato: (x) => `${v >= 0 ? "+" : "−"}${Math.round(x)}%`, duracao: 1100, atraso: 300 + i * 140 });
  });
  palco.tocar("subida");
  await palco.esperar(1200 + filas.length * 140);
  if (filas[0]) {
    filas[0].classList.add("ouro");
    palco.tocar("_destaque");
    palco.festa({ forca: 0.5 });
  }
  await palco.passo(3800);
  const L = (p, valor = "", pos) => ({ id: p.id, nome: p.name, valor: String(valor), pos });
  palco.resumir({ tipo: "grafico", medida: `Views de ${mesNome(meses[0])} a ${mesNome(meses[meses.length - 1])}`, linhas: cresc.map((x) => L(x.s.p, `${x.pct >= 0 ? "+" : "−"}${Math.abs(Math.round(x.pct))}%`)), vencedor: lider !== null ? L(series[lider].p) : null });
  await palco.fecho();
}
