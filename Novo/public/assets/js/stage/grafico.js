// Peças comuns aos espetáculos de gráficos: animação que respeita a pausa e o cabeçalho do gráfico.

import { esc } from "../format.js";

/** Corre cada(t, e) a cada frame durante dur ms (t de 0 a 1, e com easing). Pára com a pausa. */
export function animar(palco, dur, cada, { easing = (t) => 1 - Math.pow(1 - t, 3), exato = false } = {}) {
  const total = Math.max(1, exato ? dur : dur * palco.fator);
  return new Promise((resolve, reject) => {
    let feito = 0;
    let antes = performance.now();
    const frame = (agora) => {
      if (palco.terminado) return reject(new Error("abortado"));
      if (!palco.pausado) feito += agora - antes;
      antes = agora;
      const t = Math.min(1, feito / total);
      cada(t, easing(t));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

/** Ciclo contínuo (física das bolhas, por exemplo) até parar() ser chamado. */
export function ciclo(palco, cada) {
  let vivo = true;
  let antes = performance.now();
  const frame = (agora) => {
    if (!vivo || palco.terminado) return;
    const dt = Math.min(0.04, (agora - antes) / 1000);
    antes = agora;
    if (!palco.pausado) cada(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return () => (vivo = false);
}

/** Cabeçalho do gráfico: título, subtítulo e (opcional) um selo à direita. */
export function cabecalho(titulo, sub = "", selo = "") {
  return `<div class="gf-cabeca p-entra"><div><h2>${esc(titulo)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${selo ? `<div class="gf-selo">${selo}</div>` : ""}</div>`;
}

/** Posição de um elemento em coordenadas da tela do palco (para explosões no sítio certo). */
export function pontoDe(palco, el) {
  const r = el.getBoundingClientRect();
  const t = palco.tela.getBoundingClientRect();
  const k = palco.L / t.width;
  return { x: (r.left + r.width / 2 - t.left) * k, y: (r.top + r.height / 2 - t.top) * k, w: r.width * k, h: r.height * k };
}

/** Escala "bonita" para eixos: devolve o máximo arredondado e as marcas. */
export function escala(max, marcas = 4) {
  if (!(max > 0)) return { max: 1, marcas: [0, 1] };
  const bruto = max / marcas;
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * pot).find((k) => k >= bruto) || 10 * pot;
  const topo = Math.ceil(max / passo) * passo;
  return { max: topo, marcas: Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo) };
}
