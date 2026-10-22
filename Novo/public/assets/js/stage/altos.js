// Altos e baixos: quem subiu e quem caiu mais no ranking do mês.

import { rankingMes, mesAnterior } from "../data.js";
import { esc, curto, mesNome } from "../format.js";
import { avatarPalco } from "./stage.js";

export async function correr(palco, opts) {
  const m = opts.m;
  const ant = mesAnterior(m);
  if (!ant) throw new Error("Este mês não tem mês anterior para comparar.");
  const limite = Number(opts.top) || 100;
  const n = Number(opts.n) || 5;
  const r = rankingMes(m).filter((x) => x.ant !== null && x.ant !== undefined && (x.pos <= limite || x.ant <= limite));
  const subidas = r.filter((x) => x.ant > x.pos).sort((a, b) => b.ant - b.pos - (a.ant - a.pos) || a.pos - b.pos).slice(0, n);
  const quedas = r.filter((x) => x.pos > x.ant).sort((a, b) => b.pos - b.ant - (a.pos - a.ant) || a.pos - b.pos).slice(0, n);
  if (subidas.length < 2 && quedas.length < 2) throw new Error("Não há mudanças suficientes neste mês.");
  const vertical = palco.vertical;
  const cena = palco.cena;
  const pct = (x) => (x.vAnt ? `${x.v >= x.vAnt ? "+" : "−"}${Math.abs(Math.round(((x.v - x.vAnt) / x.vAnt) * 100))}%` : "");

  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: mesNome(m), titulo: "Altos e\nbaixos", sub: `Quem subiu e quem caiu no ranking de views, face a ${mesNome(ant)}.` });

  const secao = async (lista, sobe) => {
    if (!lista.length) return;
    cena.innerHTML = `<div class="al-cabeca ${sobe ? "sobe" : "desce"}"><span class="al-seta">${sobe ? "▲" : "▼"}</span><div class="p-titulo">${sobe ? "Quem subiu" : "Quem caiu"}</div></div><div class="al-lista"></div><div class="al-fundo ${sobe ? "sobe" : "desce"}"></div>`;
    const caixa = cena.querySelector(".al-lista");
    palco.tocar(sobe ? "subida" : "whoosh", { dur: 1.4 });
    palco.musica(sobe ? "epico" : "tensao", 1);
    await palco.esperar(1500);
    // Do menor ao maior movimento, para acabar no maior
    for (const x of [...lista].reverse()) {
      const d = Math.abs(x.ant - x.pos);
      const linha = document.createElement("div");
      linha.className = `al-linha ${sobe ? "sobe" : "desce"}`;
      linha.innerHTML = `${avatarPalco(x.p, vertical ? 110 : 120)}
        <div class="al-quem"><b>${esc(x.p.name)}</b><small>${curto(x.vAnt)} → ${curto(x.v)} views <i>${pct(x)}</i></small></div>
        <div class="al-pos"><span class="al-de">${x.ant}.º</span><span class="al-para">→</span><b class="al-novo">${x.ant}</b></div>
        <div class="al-delta">${sobe ? "+" : "−"}${d}</div>`;
      caixa.prepend(linha);
      linha.animate([{ transform: `translateY(${sobe ? 160 : -160}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 650, easing: "cubic-bezier(.2,1.3,.4,1)" });
      palco.tocar("virar");
      // A posição roda do lugar antigo para o novo
      const el = linha.querySelector(".al-novo");
      const inicio = performance.now() + 400;
      const passo = (t) => {
        const k = Math.min(1, Math.max(0, (t - inicio) / 1200));
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = `${Math.round(x.ant + (x.pos - x.ant) * e)}.º`;
        if (k < 1 && !palco.terminado) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      palco.tocar(sobe ? "ponto" : "falha", {}, 1.5);
      await palco.passo(2300);
    }
    const maior = lista[0];
    palco.tocar(sobe ? "_destaque" : "trovao");
    palco.tremer(sobe ? 0.5 : 0.9);
    if (sobe) palco.explodir(palco.L / 2, vertical ? 420 : 300, { n: 80 });
    await palco.passo(2200);
    return maior;
  };

  const rei = await secao(subidas, true);
  await secao(quedas, false);

  if (rei) {
    cena.innerHTML = `<div class="p-centro">
      <div class="ab-etiqueta">A maior subida de ${esc(mesNome(m, { ano: false }))}</div>
      ${avatarPalco(rei.p, vertical ? 320 : 280)}
      <h1 class="p-titulo p-slam" style="font-size:${vertical ? 96 : 112}px;margin-top:40px">${esc(rei.p.name)}</h1>
      <p class="p-sub p-entra" style="animation-delay:.4s">Do ${rei.ant}.º para o ${rei.pos}.º lugar, ${rei.ant - rei.pos} posições acima</p></div>`;
    palco.musica("epico", 2);
    palco.festa();
    await palco.passo(6000);
  }
  await palco.fecho();
}
