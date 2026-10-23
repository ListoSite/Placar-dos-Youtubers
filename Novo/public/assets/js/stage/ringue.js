// Batalha no ringue: cada Youtuber é uma bola com vida (pelos números, ou ao acaso). As bolas ressaltam
// num ringue redondo; em cada choque as duas perdem vida (com golpes críticos ao acaso). O ringue
// vai fechando. A última bola de pé ganha.

import { esc } from "../format.js";
import { cabecalho } from "./grafico.js";
import { aleatorio } from "./sorte.js";
import { jogadores, forcas, textoMedida, simular, chocar, rapidez, lancar, bolaHtml, mover, faixa, partida, vencedor, CORES } from "./jogos.js";

export async function correr(palco, opts) {
  const pessoas = jogadores(palco, opts, { min: 3, max: 16, padrao: 8 });
  const medida = opts.tamanho || "views";
  const forca = forcas(pessoas, medida, opts.m);
  const vertical = palco.vertical;
  const cx = vertical ? 540 : 960;
  const cy = vertical ? 1080 : 640;
  const R0 = vertical ? 480 : 395;
  const r = pessoas.length > 10 ? (vertical ? 40 : 34) : vertical ? 50 : 42;
  const V = vertical ? 470 : 430;
  palco.contexto = { metrica: "indice", cat: opts.cat };

  const bolas = pessoas.map((p, i) => {
    const f = forca.get(p.id);
    const a = (i / pessoas.length) * Math.PI * 2;
    const b = { i, p, r, x: cx + Math.cos(a) * R0 * 0.6, y: cy + Math.sin(a) * R0 * 0.6, vx: 0, vy: 0, f, vida: Math.round(90 + f * 110), max: 0, vivo: true, golpes: 0, fim: null };
    b.max = b.vida;
    lancar(b, V);
    return b;
  });

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Simulação", titulo: "Batalha\nno ringue", sub: `${pessoas.length} bolas, um ringue que fecha. Só uma fica de pé.` });

  const cena = palco.cena;
  cena.innerHTML = `${cabecalho("Batalha no ringue", `${textoMedida(medida, opts.m).replace("Tamanho", "Vida")}`, `Restam <span data-restam>${bolas.length}</span>`)}
    <div class="jg-ringue" style="left:${cx}px;top:${cy}px;width:${R0 * 2}px;height:${R0 * 2}px"></div>
    <div class="jg-mundo">${bolas.map((b) => bolaHtml(b.p, b.i, r * 2, `<span class="jg-vida" style="--v:1"></span><b class="jg-vida-n">${b.vida}</b>`)).join("")}</div>`;
  const ringue = cena.querySelector(".jg-ringue");
  const els = bolas.map((b) => cena.querySelector(`.jg-bola[data-i="${b.i}"]`));
  const restam = cena.querySelector("[data-restam]");
  const noticia = faixa(cena);
  const eventos = [];
  let R = R0;
  let vivos = bolas.length;
  let ultimoSom = -1;
  const desenhar = (tempo) => {
    ringue.style.width = ringue.style.height = `${R * 2}px`;
    for (const b of bolas) if (b.vivo) mover(els[b.i], b.x, b.y);
    while (eventos.length) {
      const e = eventos.shift();
      if (e.tipo === "golpe") {
        for (const [b, dano, critico] of e.danos) {
          const el = els[b.i];
          el.querySelector(".jg-vida").style.setProperty("--v", Math.max(0, b.vida / b.max));
          el.querySelector(".jg-vida-n").textContent = Math.max(0, b.vida);
          const n = document.createElement("b");
          n.className = `jg-dano ${critico ? "critico" : ""}`;
          n.textContent = critico ? `-${dano}!` : `-${dano}`;
          n.style.transform = `translate(${b.x}px, ${b.y - b.r - 10}px)`;
          cena.querySelector(".jg-mundo").appendChild(n);
          n.animate([{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "0 -70px" }], { duration: 900, fill: "forwards" });
          setTimeout(() => n.remove(), 950);
        }
        if (tempo - ultimoSom > 0.06) {
          ultimoSom = tempo;
          palco.tocar(e.danos.some((d) => d[2]) ? "golpe" : "tique");
        }
        if (e.danos.some((d) => d[2])) palco.tremer(0.4);
      }
      if (e.tipo === "fora") {
        const el = els[e.b.i];
        el.animate([{ opacity: 1 }, { opacity: 0, transform: `${el.style.transform} scale(1.8)` }], { duration: 360, fill: "forwards" });
        palco.explodir(e.b.x, e.b.y, { n: 45, forca: 0.7 });
        palco.tocar("ko");
        const cor = CORES[e.por.i % CORES.length];
        noticia(`<b style="color:${cor}">${esc(e.por.p.name)}</b> eliminou <b>${esc(e.b.p.name)}</b>`, cor);
        restam.textContent = vivos;
        if (vivos === 2) palco.musica("epico", 1);
      }
    }
  };
  desenhar(0);
  await palco.esperar(900);
  await palco.meio();
  await partida(palco, cena, "Lutem!");
  palco.musica("tensao", 1);

  const pausa = new Map();
  let t = 0;
  await simular(palco, {
    hz: 120,
    maxSeg: 90,
    acabou: () => vivos <= 1,
    passo: (dt) => {
      t += dt;
      // O ringue fecha depois dos 15 segundos (até 45%)
      if (t > 15) R = Math.max(R0 * 0.45, R0 * (1 - (t - 15) * 0.012));
      const vivas = bolas.filter((b) => b.vivo);
      for (const b of vivas) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const dx = b.x - cx;
        const dy = b.y - cy;
        const d = Math.hypot(dx, dy) || 0.0001;
        if (d + b.r > R) {
          const nx = dx / d;
          const ny = dy / d;
          b.x = cx + nx * (R - b.r);
          b.y = cy + ny * (R - b.r);
          const vn = b.vx * nx + b.vy * ny;
          if (vn > 0) {
            b.vx -= 2 * vn * nx;
            b.vy -= 2 * vn * ny;
          }
          const a = Math.atan2(b.vy, b.vx) + (aleatorio() - 0.5) * 0.4;
          b.vx = Math.cos(a) * V;
          b.vy = Math.sin(a) * V;
        }
      }
      for (let i = 0; i < vivas.length; i++) {
        for (let j = i + 1; j < vivas.length; j++) {
          const a = vivas[i];
          const b = vivas[j];
          if (!a.vivo || !b.vivo) continue;
          if (!chocar(a, b)) continue;
          const chave = a.i * 100 + b.i;
          if ((pausa.get(chave) || 0) > t) continue;
          pausa.set(chave, t + 0.35);
          // Cada uma bate na outra: dano ao acaso, um pouco mais forte com mais números, às vezes crítico
          const bater = (de) => {
            const critico = aleatorio() < 0.12;
            return [Math.round((4 + aleatorio() * 8) * (1 + de.f * 0.35) * (critico ? 2 : 1)), critico];
          };
          const [da, ca] = bater(b);
          const [db, cb] = bater(a);
          a.vida -= da;
          b.vida -= db;
          a.golpes++;
          b.golpes++;
          eventos.push({ tipo: "golpe", danos: [[a, da, ca], [b, db, cb]] });
          // Se as duas caem no mesmo choque, a que ficou com mais vida aguenta-se com 1
          if (a.vida <= 0 && b.vida <= 0) {
            const fica = a.vida === b.vida ? (aleatorio() < 0.5 ? a : b) : a.vida > b.vida ? a : b;
            fica.vida = 1;
          }
          for (const [x, y] of [[a, b], [b, a]]) {
            if (x.vida <= 0 && x.vivo) {
              x.vivo = false;
              vivos--;
              x.fim = { por: y, pos: vivos + 1 };
              eventos.push({ tipo: "fora", b: x, por: y });
            }
          }
        }
      }
      for (const b of vivas) if (b.vivo) rapidez(b, V);
    },
    desenhar,
  });
  const ficaram = bolas.filter((b) => b.vivo).sort((a, b) => b.vida - a.vida);
  const campeao = ficaram[0] || [...bolas].sort((a, b) => b.vida - a.vida)[0];
  els[campeao.i].classList.add("jg-ganha");
  palco.tocar("impacto");
  await palco.esperar(1200);
  const ordem = [campeao, ...ficaram.slice(1), ...bolas.filter((b) => !b.vivo).sort((a, b) => a.fim.pos - b.fim.pos)];
  await vencedor(palco, campeao.p, {
    espetaculo: "ringue",
    etiqueta: "O último de pé",
    frase: `Ficou com ${Math.max(0, campeao.vida)} de vida`,
    linhas: ordem.slice(0, 10).map((b, k) => ({ id: b.p.id, nome: b.p.name, valor: k === 0 ? "1.º" : b.fim ? `eliminado por ${b.fim.por.p.name}` : `${b.vida} de vida`, pos: k + 1 })),
    nota: `Batalha no ringue · ${pessoas.length} Youtubers`,
  });
  await palco.fecho();
}
