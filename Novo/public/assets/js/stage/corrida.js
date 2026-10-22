// Corrida das views: barras que se ultrapassam mês a mês.

import { estado, views } from "../data.js";
import { esc, curto, mesNome } from "../format.js";
import { avatar } from "../ui.js";
import { confetes, avatarPalco } from "./stage.js";

export async function correr(palco, opts) {
  const ds = estado.ds;
  const n = Number(opts.n) || 10;
  const meses = ds.months.filter((m) => m >= opts.de && m <= opts.ate && m < ds.currentMonth);
  if (meses.length < 2) throw new Error("Escolhe pelo menos dois meses.");
  const acumulado = opts.modo === "acumulado";
  const pessoas = ds.people.filter((p) => !opts.cat || p.category === opts.cat);

  // Valores de cada pessoa em cada mês
  const valores = new Map();
  for (const p of pessoas) {
    let soma = 0;
    valores.set(
      p.id,
      meses.map((m) => {
        const v = views(p, m) || 0;
        soma += v;
        return acumulado ? soma : v;
      }),
    );
  }
  // Só entram na animação os que alguma vez estiveram no top
  const candidatos = new Set();
  meses.forEach((_, i) => {
    [...valores.entries()]
      .sort((a, b) => b[1][i] - a[1][i])
      .slice(0, n + 3)
      .forEach(([id]) => candidatos.add(id));
  });
  const vertical = palco.formato === "9x16";
  const cena = palco.cena;
  cena.innerHTML = `
    <div class="cr-titulo p-entra"><h2>${acumulado ? "Views acumuladas" : "Quem fez mais views"}</h2><p>${esc(mesNome(meses[0]))} a ${esc(mesNome(meses[meses.length - 1]))}${opts.cat ? `, ${esc(opts.cat)}` : ""}</p></div>
    <div class="cr-mes"></div>
    <div class="cr-barras"></div>`;
  const area = cena.querySelector(".cr-barras");
  const mesEl = cena.querySelector(".cr-mes");
  const W = area.clientWidth || (vertical ? 980 : 1740);
  const H = area.clientHeight || 700;
  const passoY = H / n;
  const alturaBarra = Math.min(72, passoY * 0.78);
  const largMax = W - (vertical ? 520 : 640);

  const els = new Map();
  for (const id of candidatos) {
    const p = ds.people.find((x) => x.id === id);
    const el = document.createElement("div");
    el.className = "cr-barra";
    el.style.height = alturaBarra + "px";
    el.style.opacity = "0";
    el.innerHTML = `<span class="pos"></span><div class="fill" style="background:var(--rubi)"></div><div class="fim">${avatar(p, Math.round(alturaBarra * 0.86))}<span class="nome">${esc(p.name)}</span><b></b></div>`;
    area.appendChild(el);
    els.set(id, { el, fill: el.querySelector(".fill"), val: el.querySelector("b"), pos: el.querySelector(".pos"), rank: 999 });
  }

  palco.musica("epico", 1);
  palco.tocar("whoosh");
  await palco.passo(1600);
  const lideres = new Map();
  let ultimoSom = 0;

  const desenhar = (i, t) => {
    const lista = [...candidatos].map((id) => {
      const a = valores.get(id)[i];
      const b = valores.get(id)[Math.min(i + 1, meses.length - 1)];
      return { id, v: a + (b - a) * t };
    });
    lista.sort((x, y) => y.v - x.v);
    const max = lista[0].v || 1;
    lista.forEach((x, rank) => {
      const e = els.get(x.id);
      const visivel = rank < n && x.v > 0;
      e.el.style.transform = `translateY(${(visivel ? rank : n + 0.5) * passoY}px)`;
      e.el.style.opacity = visivel ? "1" : "0";
      e.fill.style.width = Math.max(6, (x.v / max) * largMax) + "px";
      e.fill.style.background = rank === 0 ? "var(--ouro)" : "var(--rubi)";
      e.val.textContent = curto(x.v);
      e.pos.textContent = visivel ? rank + 1 : "";
      if (visivel && rank < e.rank && e.rank < 999 && performance.now() - ultimoSom > 160) {
        palco.tocar("virar");
        ultimoSom = performance.now();
      }
      e.rank = visivel ? rank : 999;
    });
    return lista[0].id;
  };

  // Animação contínua entre meses, respeitando a pausa
  const duracao = Math.max(1100, Math.min(2400, 26000 / meses.length));
  for (let i = 0; i < meses.length; i++) {
    mesEl.textContent = mesNome(meses[i], { curto: !vertical ? false : true });
    if (i === meses.length - 1) {
      desenhar(i, 0);
      break;
    }
    await new Promise((resolve, reject) => {
      let feito = 0;
      let antes = performance.now();
      const frame = (agora) => {
        if (palco.terminado) return reject(new Error("abortado"));
        if (!palco.pausado) feito += agora - antes;
        antes = agora;
        const t = Math.min(1, feito / duracao);
        desenhar(i, t);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    }).catch((e) => {
      throw e;
    });
    const lider = [...candidatos].sort((a, b) => valores.get(b)[i] - valores.get(a)[i])[0];
    lideres.set(lider, (lideres.get(lider) || 0) + 1);
  }
  const ultimo = [...candidatos].sort((a, b) => valores.get(b)[meses.length - 1] - valores.get(a)[meses.length - 1])[0];
  lideres.set(ultimo, (lideres.get(ultimo) || 0) + 1);
  palco.tocar("vitoria");
  confetes(cena, 90);
  await palco.passo(4200);

  // Resumo: quem esteve mais vezes em primeiro
  const [rei, vezes] = [...lideres.entries()].sort((a, b) => b[1] - a[1])[0];
  const p = ds.people.find((x) => x.id === rei);
  cena.innerHTML = `<div class="p-centro">
    ${avatarPalco(p, vertical ? 320 : 260)}
    <h1 class="p-titulo p-entra" style="font-size:${vertical ? 72 : 90}px;margin-top:50px">${esc(p.name)}</h1>
    <p class="p-sub p-entra" style="animation-delay:.3s">Em primeiro lugar em ${vezes} de ${meses.length} ${meses.length === 1 ? "mês" : "meses"}</p></div>`;
  palco.tocar("brilho");
  await palco.passo(5000);
}
