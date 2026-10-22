// Roda da sorte: a roda gira, escolhe um Youtuber ao acaso e mostra os números dele.

import { estado, indice, views, recordes } from "../data.js";
import { esc, curto, inteiro, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, baralhar, comFoco } from "./stage.js";
import { melhores } from "./metricas.js";

export async function correr(palco, opts) {
  const n = Math.min(12, Math.max(6, Number(opts.n) || 10));
  const pessoas = baralhar(comFoco(baralhar(melhores(Number(opts.top) || 60, { cat: opts.cat })).slice(0, n), palco));
  palco.contexto = { metrica: "indice", cat: opts.cat };
  if (pessoas.length < 4) throw new Error("Há poucos Youtubers para a roda.");
  const voltas = Math.min(Number(opts.voltas) || 3, pessoas.length - 1);
  const vertical = palco.vertical;
  const cena = palco.cena;
  const N = pessoas.length;
  const fatia = 360 / N;
  const D = vertical ? 900 : 860;
  const R = D / 2;

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Jogo", titulo: "A roda\nda sorte", sub: `${N} Youtubers na roda. Para onde vai parar?` });

  // Fatias em SVG e avatares por cima
  const arco = (i) => {
    const a0 = ((i * fatia - 90 - fatia / 2) * Math.PI) / 180;
    const a1 = (((i + 1) * fatia - 90 - fatia / 2) * Math.PI) / 180;
    return `M${R} ${R} L${R + R * Math.cos(a0)} ${R + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R + R * Math.cos(a1)} ${R + R * Math.sin(a1)} Z`;
  };
  const avat = pessoas
    .map((p, i) => {
      const ang = i * fatia;
      return `<div class="rd-pessoa" data-i="${i}" style="transform:rotate(${ang}deg) translateY(${-R * 0.68}px) rotate(${-ang}deg)">${avatarPalco(p, N > 10 ? 104 : 124).replace("palco-avatar", "")}</div>`;
    })
    .join("");
  cena.innerHTML = `<div class="rd-palco">
      <div class="rd-roda-caixa" style="width:${D}px;height:${D}px">
        <div class="rd-ponteiro"></div>
        <div class="rd-roda">
          <svg viewBox="0 0 ${D} ${D}" width="${D}" height="${D}">${pessoas.map((_, i) => `<path class="rd-fatia f${i % 3}" data-i="${i}" d="${arco(i)}"/>`).join("")}<circle cx="${R}" cy="${R}" r="${R - 4}" class="rd-aro"/></svg>
          <div class="rd-pessoas">${avat}</div>
        </div>
        <div class="rd-centro">${logo()}</div>
      </div>
      <div class="rd-cartao"></div>
    </div>`;
  const roda = cena.querySelector(".rd-roda");
  const cartao = cena.querySelector(".rd-cartao");
  palco.tocar("whoosh");
  roda.animate([{ transform: "scale(.2) rotate(-200deg)", opacity: 0 }, { transform: "scale(1) rotate(0)", opacity: 1 }], { duration: 1100, easing: "cubic-bezier(.2,1.2,.3,1)" });
  await palco.esperar(1400);
  palco.musica("epico", 1);

  let angulo = 0;
  const usados = new Set();
  for (let v = 0; v < voltas; v++) {
    const livres = pessoas.map((_, i) => i).filter((i) => !usados.has(i));
    const alvo = livres[Math.floor(Math.random() * livres.length)];
    usados.add(alvo);
    cartao.innerHTML = `<div class="rd-gira p-entra">A girar…</div>`;
    // Ângulo final: o alvo fica debaixo do ponteiro (topo), com voltas extra
    const desvio = (Math.random() - 0.5) * fatia * 0.7;
    const final = angulo + 360 * (4 + Math.floor(Math.random() * 2)) + (((-(alvo * fatia) - angulo) % 360) + 360) % 360 + desvio;
    const inicio = angulo;
    const dur = 5200 * palco.fator;
    let feito = 0;
    let antes = performance.now();
    let ultimaFatia = Math.floor((inicio + fatia / 2) / fatia);
    palco.tocar("whoosh", { dur: 1 });
    await new Promise((resolve, reject) => {
      const frame = (agora) => {
        if (palco.terminado) return reject(new Error("abortado"));
        if (!palco.pausado) feito += agora - antes;
        antes = agora;
        const t = Math.min(1, feito / dur);
        const e = 1 - Math.pow(1 - t, 4);
        angulo = inicio + (final - inicio) * e;
        roda.style.transform = `rotate(${angulo}deg)`;
        cena.querySelectorAll(".rd-pessoa .avatar").forEach((a) => (a.style.transform = `rotate(${-angulo}deg)`));
        const f = Math.floor((angulo + fatia / 2) / fatia);
        if (f !== ultimaFatia) {
          ultimaFatia = f;
          palco.tocar("tique");
          const p = cena.querySelector(".rd-ponteiro");
          p.classList.remove("bate");
          void p.offsetWidth;
          p.classList.add("bate");
        }
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    angulo = final;
    const p = pessoas[alvo];
    cena.querySelectorAll(".rd-fatia").forEach((f) => f.classList.toggle("escolhida", Number(f.dataset.i) === alvo));
    palco.tocar("impacto");
    palco.tremer(0.6);
    palco.flash(0.4);
    palco.explodir(vertical ? palco.L / 2 : palco.L * 0.3, vertical ? 240 : 140, { n: 70, forca: 0.7 });

    const rec = recordes(p);
    const pos = estado.posIndice.get(p.id);
    const numeros = [
      { nome: `Views em ${mesNome(estado.ref, { ano: false })}`, v: views(p, estado.ref), fmt: curto },
      { nome: "Subscritores", v: p.totals?.subs, fmt: curto },
      { nome: "Índice", v: indice(p.id).total, fmt: inteiro, extra: pos ? `${pos}.º` : "" },
      { nome: "Melhor mês", v: rec.melhor?.v, fmt: curto, extra: rec.melhor ? mesNome(rec.melhor.m, { curto: true }) : "" },
    ].filter((x) => x.v !== null && x.v !== undefined);
    cartao.innerHTML = `<div class="rd-escolhido p-entra">
        ${avatarPalco(p, vertical ? 170 : 190)}
        <div><div class="rd-nome">${esc(p.name)}</div><div class="rd-cat">${esc(p.category || "")}</div></div>
      </div>
      <div class="rd-numeros">${numeros.map((x) => `<div class="rd-num p-entra"><span>${esc(x.nome)}</span><b data-v="${x.v}">0</b>${x.extra ? `<small>${esc(x.extra)}</small>` : ""}</div>`).join("")}</div>`;
    cartao.querySelectorAll(".rd-num b").forEach((b, k) => contar(b, Number(b.dataset.v), { formato: numeros[k].fmt, duracao: 1200, atraso: 300 + k * 200 }));
    if (!palco.evento("revelar", { alvo: cartao.querySelector(".palco-avatar"), p, pos: v + 1 })) palco.tocar("_destaque", {}, 0.3);
    await palco.passo(5600);
    cena.querySelectorAll(".rd-fatia").forEach((f) => f.classList.remove("escolhida"));
    cena.querySelector(`.rd-pessoa[data-i="${alvo}"]`)?.classList.add("usado");
    if (v === 0) await palco.meio();
  }
  palco.festa({ forca: 0.6 });
  await palco.esperar(1500);
  const L = (p, valor = "", pos) => ({ id: p.id, nome: p.name, valor: String(valor), pos });
  palco.resumir({ tipo: "jogo", nota: "A roda da sorte escolheu", linhas: [...usados].map((i) => L(pessoas[i])) });
  await palco.fecho();
}

function logo() {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="13" style="fill:var(--rubi)"/><path d="M16 12.6c0-1.5 1.6-2.4 2.9-1.6l10.1 6.4c1.2.8 1.2 2.5 0 3.3l-10.1 6.4c-1.3.8-2.9-.1-2.9-1.6z" fill="#fff"/></svg>`;
}
