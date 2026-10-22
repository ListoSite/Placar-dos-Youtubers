// Bolhas: cada Youtuber é uma bolha do tamanho dos seus números. As bolhas entram, empurram-se
// e mudam de tamanho quando a medida muda (views, subscritores, Índice).

import { estado } from "../data.js";
import { esc, mesNome } from "../format.js";
import { avatarPalco, comFoco } from "./stage.js";
import { METRICAS, rankingPor } from "./metricas.js";
import { animar, ciclo, cabecalho } from "./grafico.js";

export async function correr(palco, opts) {
  const m = opts.m || estado.ref;
  const n = Math.min(30, Math.max(8, Number(opts.n) || 20));
  palco.contexto = { metrica: "views", m, cat: opts.cat };
  let base = rankingPor("views", m, { cat: opts.cat, n }).map((x) => x.p);
  base = comFoco(base, palco);
  if (base.length < 5) throw new Error("Há poucos Youtubers com dados para as bolhas.");
  const fases = ["views", "subs", "indice"]
    .map((k) => ({ k, met: METRICAS[k], vals: base.map((p) => METRICAS[k].valor(p, m)) }))
    .filter((f) => f.vals.filter((v) => v > 0).length >= Math.min(5, base.length));
  const vertical = palco.vertical;
  const cena = palco.cena;
  const regiao = vertical ? { x: 60, y: 380, w: 960, h: 1180 } : { x: 80, y: 190, w: 1760, h: 720 };
  const cx = regiao.x + regiao.w / 2;
  const cy = regiao.y + regiao.h / 2;

  // Raios de cada fase: a soma das áreas ocupa ~52% da região
  const raios = (vals) => {
    const pos = vals.map((v) => (v > 0 ? v : 0));
    const soma = pos.reduce((a, v) => a + v, 0) || 1;
    const k = Math.sqrt((regiao.w * regiao.h * 0.4) / (Math.PI * soma));
    return pos.map((v) => Math.max(26, Math.min(regiao.h * 0.36, Math.sqrt(v) * k)));
  };

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Gráfico", titulo: "As bolhas\ndo YouTube", sub: `Quanto maior a bolha, maior o número${opts.cat ? `. ${opts.cat}` : ""}` });

  cena.innerHTML = `${cabecalho(fases[0].met.nome(m), opts.cat ? `Top ${base.length} em ${opts.cat}` : `Top ${base.length} de Portugal`, mesNome(m, { curto: true }))}
    <div class="bl-campo">${base
      .map((p, i) => `<div class="bl-bolha" data-i="${i}">${avatarPalco(p, 100)}<div class="bl-rotulo"><b>${esc(p.name)}</b><span></span></div></div>`)
      .join("")}</div>
    <div class="bb-faixa"></div>`;
  const els = [...cena.querySelectorAll(".bl-bolha")];
  const faixa = cena.querySelector(".bb-faixa");
  const cab = cena.querySelector(".gf-cabeca h2");
  const corpos = base.map((p, i) => {
    const ang = Math.random() * Math.PI * 2;
    const d = Math.max(palco.L, palco.A) * 0.75;
    return { i, x: cx + Math.cos(ang) * d, y: cy + Math.sin(ang) * d, vx: 0, vy: 0, r: 0, alvo: 0, ativo: false };
  });

  // ---------- Física ----------
  const desenhar = () => {
    for (const c of corpos) {
      const el = els[c.i];
      el.style.transform = `translate(${c.x - c.r}px, ${c.y - c.r}px)`;
      el.style.width = el.style.height = c.r * 2 + "px";
      el.style.setProperty("--tam", c.r * 2 + "px");
      el.classList.toggle("grande", c.r >= 70);
    }
  };
  const parar = ciclo(palco, (dt) => {
    const ativos = corpos.filter((c) => c.ativo);
    for (const c of ativos) {
      c.r += (c.alvo - c.r) * Math.min(1, dt * 5);
      // Atração ao centro sem inércia (estável): cada bolha aproxima-se um pouco por frame
      const k = Math.min(1, dt * (c.r > 0 && Math.hypot(cx - c.x, cy - c.y) > regiao.h ? 3.2 : 1.4));
      c.x += (cx - c.x) * k * (vertical ? 0.7 : 1);
      c.y += (cy - c.y) * k * (vertical ? 1 : 1.6);
    }
    for (let it = 0; it < 8; it++) {
      for (let a = 0; a < ativos.length; a++) {
        for (let b = a + 1; b < ativos.length; b++) {
          const A = ativos[a];
          const B = ativos[b];
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const min = A.r + B.r + 8;
          if (dist < min) {
            const falta = min - dist;
            const ux = dx / dist;
            const uy = dy / dist;
            const pa = B.r / (A.r + B.r);
            A.x -= ux * falta * pa;
            A.y -= uy * falta * pa;
            B.x += ux * falta * (1 - pa);
            B.y += uy * falta * (1 - pa);
          }
        }
      }
      for (const c of ativos) {
        c.x = Math.max(regiao.x + c.r, Math.min(regiao.x + regiao.w - c.r, c.x));
        c.y = Math.max(regiao.y + c.r, Math.min(regiao.y + regiao.h - c.r, c.y));
      }
    }
    desenhar();
  });

  try {
    palco.musica("epico", 1);
    for (const [fi, f] of fases.entries()) {
      const rs = raios(f.vals);
      els.forEach((el, i) => (el.querySelector(".bl-rotulo span").textContent = f.vals[i] > 0 ? f.met.fmt(f.vals[i]) : "–"));
      if (fi === 0) {
        // Entram da maior para a mais pequena
        const ordem = corpos.map((c) => c.i).sort((a, b) => rs[b] - rs[a]);
        for (const i of ordem) {
          const c = corpos[i];
          c.ativo = true;
          c.alvo = rs[i];
          c.r = rs[i] * 0.3;
          els[i].classList.add("visivel");
          palco.tocar("tique");
          await palco.esperar(ordem.indexOf(i) < 5 ? 260 : 110);
        }
        palco.tocar("whoosh");
      } else {
        cab.textContent = f.met.nome(m);
        cab.parentElement.classList.remove("p-entra");
        void cab.offsetWidth;
        cab.parentElement.classList.add("p-entra");
        faixa.innerHTML = `<b class="p-slam">E ${f.k === "subs" ? "por subscritores" : "pelo Índice"}?</b>`;
        palco.tocar("whoosh");
        palco.tremer(0.25);
        await palco.esperar(900, { exato: true });
        faixa.innerHTML = "";
        corpos.forEach((c) => (c.alvo = rs[c.i]));
        for (let k = 0; k < 5; k++) palco.tocar("boing", {}, k * 0.12);
      }
      await palco.passo(fi === 0 ? 3200 : 2600);

      // A maior bolha desta fase
      const maior = corpos.reduce((a, c) => (f.vals[c.i] > f.vals[a.i] ? c : a), corpos[0]);
      els.forEach((el) => el.classList.remove("destaque"));
      els[maior.i].classList.add("destaque");
      faixa.innerHTML = `<span class="p-entra"><b>${esc(base[maior.i].name)}</b> é a maior bolha: ${esc(f.met.fmt(f.vals[maior.i]))}</span>`;
      const ultimaFase = fi === fases.length - 1;
      if (!palco.evento(ultimaFase ? "vencedor" : "revelar", { alvo: { x: maior.x, y: maior.y, w: maior.r * 2, h: maior.r * 2 }, p: base[maior.i], pos: 1 })) palco.tocar(ultimaFase ? "_destaque" : "revelar");
      palco.explodir(maior.x, maior.y - maior.r * 0.6, { n: 60, forca: 0.6 });
      await palco.passo(3000);
      els[maior.i].classList.remove("destaque");
      faixa.innerHTML = "";
      if (fi === 0) await palco.meio();
    }
    palco.festa({ forca: 0.6 });
    await palco.passo(2500);
  } finally {
    parar();
  }
  // Rebentam todas antes do fecho
  for (const c of [...corpos].sort((a, b) => a.r - b.r)) {
    els[c.i].classList.add("rebenta");
    palco.explodir(c.x, c.y, { n: 8, forca: 0.3 });
  }
  palco.tocar("whoosh");
  await animar(palco, 500, () => {});
  const L = (p, valor = "", pos) => ({ id: p.id, nome: p.name, valor: String(valor), pos });
  palco.resumir({ tipo: "grafico", medida: `Os maiores em ${mesNome(m)}`, linhas: base.slice(0, 10).map((p, i) => L(p, fases[0].met.fmt(fases[0].vals[i]))) });
  await palco.fecho();
}
