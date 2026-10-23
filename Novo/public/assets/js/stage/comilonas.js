// Bolas comilonas: cada Youtuber é uma bola do tamanho dos seus números (ou ao acaso).
// As bolas andam pela arena; a maior come a mais pequena e cresce. A arena vai encolhendo.
// Ganha a última bola. Como no agar.io.

import { esc } from "../format.js";
import { cabecalho } from "./grafico.js";
import { aleatorio } from "./sorte.js";
import { jogadores, forcas, textoMedida, arena, simular, chocar, paredes, bolaHtml, mover, faixa, partida, vencedor, CORES } from "./jogos.js";

export async function correr(palco, opts) {
  const pessoas = jogadores(palco, opts, { min: 4, max: 20, padrao: 12 });
  const medida = opts.tamanho || "views";
  const forca = forcas(pessoas, medida, opts.m);
  const vertical = palco.vertical;
  const A = arena(palco, { topo: vertical ? 380 : 230 });
  const rMin = vertical ? 36 : 34;
  const rMax = vertical ? 112 : 104;
  const rTeto = vertical ? 300 : 270;
  palco.contexto = { metrica: "indice", cat: opts.cat };

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Simulação", titulo: "Bolas\ncomilonas", sub: `${pessoas.length} Youtubers. A maior come a mais pequena. Quem fica?` });

  // Posições iniciais espalhadas numa grelha com um pouco de sorte
  const cols = Math.ceil(Math.sqrt((pessoas.length * (A.x1 - A.x0)) / (A.y1 - A.y0)));
  const linhas = Math.ceil(pessoas.length / cols);
  const cw = (A.x1 - A.x0) / cols;
  const ch = (A.y1 - A.y0) / linhas;
  const bolas = pessoas.map((p, i) => {
    const k = i;
    const r = rMin + forca.get(p.id) * (rMax - rMin);
    return {
      i,
      p,
      r,
      r0: r,
      x: A.x0 + cw * ((k % cols) + 0.5) + (aleatorio() - 0.5) * cw * 0.3,
      y: A.y0 + ch * (Math.floor(k / cols) + 0.5) + (aleatorio() - 0.5) * ch * 0.3,
      vx: 0,
      vy: 0,
      ang: aleatorio() * Math.PI * 2,
      vivo: true,
      comeu: 0,
    };
  });

  const cena = palco.cena;
  cena.innerHTML = `${cabecalho("Bolas comilonas", textoMedida(medida, opts.m), `Restam <span data-restam>${bolas.length}</span>`)}
    <div class="jg-arena" style="left:${A.x0}px;top:${A.y0}px;width:${A.x1 - A.x0}px;height:${A.y1 - A.y0}px"></div>
    <div class="jg-mundo">${bolas.map((b) => bolaHtml(b.p, b.i, b.r * 2)).join("")}${bolas.map((b) => `<div class="jg-nome" data-n="${b.i}">${esc(b.p.name)}</div>`).join("")}<div class="jg-coroa">👑</div></div>`;
  const elArena = cena.querySelector(".jg-arena");
  const els = bolas.map((b) => cena.querySelector(`.jg-bola[data-i="${b.i}"]`));
  const nomes = bolas.map((b) => cena.querySelector(`.jg-nome[data-n="${b.i}"]`));
  const coroa = cena.querySelector(".jg-coroa");
  const restam = cena.querySelector("[data-restam]");
  const noticia = faixa(cena);
  const desenhar = () => {
    let maior = null;
    for (const b of bolas) {
      if (!b.vivo) continue;
      mover(els[b.i], b.x, b.y, b.r / b.r0);
      const n = nomes[b.i];
      n.style.transform = `translate(${b.x}px, ${b.y + b.r + 8}px) translateX(-50%)`;
      n.style.fontSize = `${Math.min(34, 16 + b.r * 0.08)}px`;
      if (!maior || b.r > maior.r) maior = b;
    }
    if (maior) coroa.style.transform = `translate(${maior.x}px, ${maior.y - maior.r - 34}px) translateX(-50%)`;
    elArena.style.cssText = `left:${lim.x0}px;top:${lim.y0}px;width:${lim.x1 - lim.x0}px;height:${lim.y1 - lim.y0}px`;
  };
  const lim = { ...A };
  desenhar();
  els.forEach((el, k) => el.animate([{ transform: `${el.style.transform} scale(0)` }, { transform: el.style.transform }], { duration: 600, delay: k * 50, easing: "cubic-bezier(.2,1.4,.4,1)" }));
  await palco.esperar(1400);
  await palco.meio();
  await partida(palco, cena, "Comam!");
  palco.musica("tensao", 1);

  const vel = (r) => 330 * Math.sqrt(40 / r);
  let t = 0;
  let vivos = bolas.length;
  let epico = false;
  const comer = (a, b) => {
    b.vivo = false;
    a.comeu++;
    a.r = Math.min(rTeto, Math.sqrt(a.r * a.r + b.r * b.r * 0.85));
    vivos--;
    b.fim = { por: a, pos: vivos + 1 };
    // Efeitos (sem sorte do jogo)
    const el = els[b.i];
    el.animate([{ opacity: 1 }, { opacity: 0, transform: `${el.style.transform} scale(.2)` }], { duration: 260, fill: "forwards" });
    nomes[b.i].remove();
    palco.explodir(b.x, b.y, { n: 30, forca: 0.5 });
    palco.tocar(vivos % 2 ? "golpe" : "moeda");
    noticia(`<b style="color:${CORES[a.i % CORES.length]}">${esc(a.p.name)}</b> comeu <b>${esc(b.p.name)}</b>`, CORES[a.i % CORES.length]);
    restam.textContent = vivos;
    if (vivos <= 3 && !epico) {
      epico = true;
      palco.musica("epico", 1);
    }
  };

  await simular(palco, {
    hz: 120,
    maxSeg: 95,
    acabou: () => vivos <= 1,
    passo: (dt, n) => {
      t += dt;
      // A arena encolhe depois dos 12 segundos (até 45% do tamanho)
      if (t > 12) {
        const cx = (A.x0 + A.x1) / 2;
        const cy = (A.y0 + A.y1) / 2;
        const k = Math.max(0.45, 1 - (t - 12) * 0.012);
        lim.x0 = cx - ((A.x1 - A.x0) / 2) * k;
        lim.x1 = cx + ((A.x1 - A.x0) / 2) * k;
        lim.y0 = cy - ((A.y1 - A.y0) / 2) * k;
        lim.y1 = cy + ((A.y1 - A.y0) / 2) * k;
      }
      const vivas = bolas.filter((b) => b.vivo);
      // Decidir para onde ir (a cada 6 passos): caçar a mais pequena perto, fugir da maior, ou passear
      if (n % 6 === 0) {
        for (const b of vivas) {
          b.ang += (aleatorio() - 0.5) * 0.9;
          let dx = Math.cos(b.ang) * 0.6;
          let dy = Math.sin(b.ang) * 0.6;
          for (const o of vivas) {
            if (o === b) continue;
            const ox = o.x - b.x;
            const oy = o.y - b.y;
            const d = Math.hypot(ox, oy) || 1;
            if (o.r < b.r * 0.88 && d < 560) {
              dx += (ox / d) * (420 / d);
              dy += (oy / d) * (420 / d);
            } else if (o.r * 0.88 > b.r && d < 420) {
              dx -= (ox / d) * (520 / d);
              dy -= (oy / d) * (520 / d);
            }
          }
          const s = Math.hypot(dx, dy) || 1;
          b.dx = dx / s;
          b.dy = dy / s;
        }
      }
      for (const b of vivas) {
        const v = vel(b.r);
        b.vx += ((b.dx ?? 0) * v - b.vx) * 0.06;
        b.vy += ((b.dy ?? 0) * v - b.vy) * 0.06;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (paredes(b, lim)) b.ang += Math.PI * (0.5 + aleatorio() * 0.5);
      }
      // Encontros: comer ou ressaltar (entre quase iguais, a maior rouba um bocadinho)
      for (let i = 0; i < vivas.length; i++) {
        const a = vivas[i];
        if (!a.vivo) continue;
        for (let j = i + 1; j < vivas.length; j++) {
          const b = vivas[j];
          if (!b.vivo || !a.vivo) continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const [g, p] = a.r >= b.r ? [a, b] : [b, a];
          if (p.r < g.r * 0.88) {
            if (d < g.r - p.r * 0.35) comer(g, p);
          } else if (d < a.r + b.r) {
            chocar(a, b, { restituicao: 0.9 });
            const [maior, menor] = g.r === p.r ? (aleatorio() < 0.5 ? [g, p] : [p, g]) : [g, p];
            const tira = menor.r * menor.r * 0.04;
            menor.r = Math.sqrt(Math.max(menor.r * menor.r - tira, 16));
            maior.r = Math.min(rTeto, Math.sqrt(maior.r * maior.r + tira));
          }
        }
      }
    },
    desenhar,
  });

  const vivosFim = bolas.filter((b) => b.vivo).sort((a, b) => b.r - a.r);
  const campeao = vivosFim[0];
  for (const b of vivosFim.slice(1)) {
    els[b.i].animate([{ opacity: 1 }, { opacity: 0.25 }], { duration: 400, fill: "forwards" });
  }
  palco.tocar("rufo", { dur: 1.2 });
  els[campeao.i].classList.add("jg-ganha");
  await palco.esperar(1400);
  const ranking = [campeao, ...vivosFim.slice(1), ...bolas.filter((b) => !b.vivo).sort((a, b) => a.fim.pos - b.fim.pos)];
  await vencedor(palco, campeao.p, {
    espetaculo: "comilonas",
    etiqueta: "A última bola",
    frase: `Comeu ${campeao.comeu} ${campeao.comeu === 1 ? "Youtuber" : "Youtubers"}`,
    linhas: ranking.slice(0, 10).map((b, k) => ({ id: b.p.id, nome: b.p.name, valor: k === 0 ? "1.º" : b.fim ? `comido por ${b.fim.por.p.name}` : "sobreviveu", pos: k + 1 })),
    nota: `Bolas comilonas · ${pessoas.length} Youtubers`,
  });
  await palco.fecho();
}
