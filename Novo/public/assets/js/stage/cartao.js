// Cartão de Youtuber: um perfil em destaque, número a número.

import { estado, pessoa, indice, views, mediaMeses, recordes, rankingMes } from "../data.js";
import { esc, curto, inteiro, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, confetes } from "./stage.js";

export async function correr(palco, opts) {
  const p = pessoa(opts.id) || pessoa([...estado.posIndice.entries()].find(([, pos]) => pos === 1)?.[0]);
  if (!p) throw new Error("Escolhe um Youtuber.");
  const ref = estado.ref;
  const vertical = palco.formato === "9x16";
  const ind = indice(p.id);
  const pos = estado.posIndice.get(p.id);
  const rec = recordes(p);
  const posMes = rankingMes(ref).find((x) => x.p.id === p.id)?.pos;
  const janela = estado.janela;
  const serie = janela.map((m) => views(p, m) || 0);
  const max = Math.max(...serie, 1);
  const numeros = [
    { nome: `Views em ${mesNome(ref)}`, v: views(p, ref), extra: posMes ? `${posMes}.º lugar` : "" },
    { nome: "Média de 3 meses", v: mediaMeses(p, ref, 3) },
    { nome: "Subscritores", v: p.totals?.subs },
    { nome: "Views totais", v: p.totals?.views },
    { nome: "Melhor mês", v: rec.melhor?.v, extra: rec.melhor ? mesNome(rec.melhor.m) : "" },
    { nome: "Meses no top 10", v: rec.top10, fmt: inteiro },
  ].filter((n) => n.v !== null && n.v !== undefined);

  const cena = palco.cena;
  palco.musica("leve", 1);
  cena.innerHTML = `<div class="ct-grelha">
    <div class="p-slam">${avatarPalco(p, vertical ? 360 : 420)}</div>
    <div>
      <div class="ct-nome p-entra" style="animation-delay:.3s">${esc(p.name)}</div>
      <div class="ct-cat p-entra" style="animation-delay:.45s">${esc([p.category, p.location].filter(Boolean).join(", "))}</div>
      ${ind.total !== null ? `<div class="ct-indice p-entra" style="animation-delay:.6s"><b id="ct-ind">0</b><span>Índice de Influência${pos ? `<br>${pos}.º em Portugal` : ""}</span></div>` : ""}
      <div class="ct-numeros"></div>
      <div class="ct-barras"></div>
    </div></div>`;
  palco.tocar("whoosh");
  palco.tocar("impacto", {}, 0.2);
  const indEl = cena.querySelector("#ct-ind");
  if (indEl) {
    contar(indEl, ind.total, { formato: inteiro, duracao: 1600, atraso: 600 });
    palco.tocar("brilho", {}, 2.2);
  }
  await palco.esperar(2600);
  const grelha = cena.querySelector(".ct-numeros");
  for (const n of numeros) {
    const d = document.createElement("div");
    d.className = "ct-num p-entra";
    d.innerHTML = `<span>${esc(n.nome)}</span><b>0</b>${n.extra ? `<span style="font-size:24px">${esc(n.extra)}</span>` : ""}`;
    grelha.appendChild(d);
    contar(d.querySelector("b"), n.v, { formato: n.fmt || curto, duracao: 900 });
    palco.tocar("virar");
    await palco.passo(1100);
  }
  const barras = cena.querySelector(".ct-barras");
  const iMax = serie.indexOf(Math.max(...serie));
  barras.innerHTML = serie.map((v, i) => `<i class="${i === iMax && v ? "melhor" : ""}" style="height:${Math.max(3, (v / max) * 100)}%;animation-delay:${i * 60}ms" title="${esc(mesNome(janela[i]))}"></i>`).join("");
  palco.tocar("subida", { dur: 0.9 });
  await palco.passo(4500);
  if (pos && pos <= 10) {
    confetes(cena, 80);
    palco.tocar("vitoria");
    await palco.passo(3500);
  }
}
