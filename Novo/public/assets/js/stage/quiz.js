// "Quem fez mais?": jogo de adivinhar para vídeos.

import { rankingMes } from "../data.js";
import { esc, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco } from "./stage.js";

function pares(pool, n) {
  const usados = new Set();
  const out = [];
  let tentativas = 0;
  while (out.length < n && tentativas++ < 500) {
    const x = pool[Math.floor(Math.random() * pool.length)];
    const y = pool[Math.floor(Math.random() * pool.length)];
    if (!x || !y || x.p.id === y.p.id || usados.has(x.p.id) || usados.has(y.p.id)) continue;
    const r = Math.max(x.v, y.v) / Math.max(1, Math.min(x.v, y.v));
    if (r < 1.05 || r > 6) continue; // nem empate nem óbvio demais
    usados.add(x.p.id);
    usados.add(y.p.id);
    out.push([x, y]);
  }
  return out;
}

export async function correr(palco, opts) {
  const pool = rankingMes(opts.m).slice(0, Number(opts.top) || 80);
  const rondas = pares(pool, Number(opts.n) || 8);
  if (rondas.length < 2) throw new Error("Há poucos Youtubers com dados neste mês.");
  const vertical = palco.formato === "9x16";
  const cena = palco.cena;
  const mes = mesNome(opts.m);

  palco.musica("leve", 1);
  cena.innerHTML = `<div class="p-centro">
    <h1 class="p-titulo p-slam" style="font-size:${vertical ? 102 : 120}px">Quem fez<br>mais views?</h1>
    <p class="p-sub p-entra" style="animation-delay:.4s">${esc(mes)}. Tens 5 segundos para adivinhar.</p></div>`;
  palco.tocar("revelar");
  await palco.passo(3400);

  for (const [i, [x, y]] of rondas.entries()) {
    const lado = (z) => `<div class="qz-lado" data-id="${esc(z.p.id)}">${avatarPalco(z.p, vertical ? 220 : 280)}<div><b>${esc(z.p.name)}</b><small>${esc(z.p.category || "")}</small><div class="qz-valor">?</div></div></div>`;
    cena.innerHTML = `<div class="qz-pergunta p-entra">Quem fez mais views?</div>
      <div class="qz-ronda">Ronda ${i + 1} de ${rondas.length}, ${esc(mes)}</div>
      <div class="qz-duelo"><div class="p-entra">${lado(x)}</div><div class="qz-vs p-slam" style="animation-delay:.3s">VS</div><div class="p-entra" style="animation-delay:.15s">${lado(y)}</div></div>`;
    palco.tocar("whoosh");
    await palco.esperar(1200);
    const vs = cena.querySelector(".qz-vs");
    vs.classList.remove("p-slam");
    vs.classList.add("qz-conta");
    for (let s = 5; s >= 1; s--) {
      vs.textContent = s;
      vs.classList.remove("p-slam");
      void vs.offsetWidth;
      vs.classList.add("p-slam");
      palco.tocar("tique");
      await palco.passo(1000);
    }
    vs.textContent = "VS";
    vs.classList.remove("qz-conta");
    const lados = cena.querySelectorAll(".qz-lado");
    contar(lados[0].querySelector(".qz-valor"), x.v, { duracao: 900 });
    contar(lados[1].querySelector(".qz-valor"), y.v, { duracao: 900 });
    await palco.esperar(1000);
    const ganha = x.v > y.v ? 0 : 1;
    lados[ganha].classList.add("ganha");
    lados[1 - ganha].classList.add("perde");
    palco.tocar("acerto");
    await palco.passo(2800);
  }

  cena.innerHTML = `<div class="p-centro"><h1 class="p-titulo p-slam" style="font-size:${vertical ? 90 : 108}px">Quantas<br>acertaste?</h1><p class="p-sub p-entra" style="animation-delay:.4s">Diz nos comentários.</p></div>`;
  palco.tocar("vitoria");
  await palco.passo(5000);
}

