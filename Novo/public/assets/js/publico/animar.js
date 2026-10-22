// Animações dos blocos da página pública (escolhidas no painel para cada bloco).
// Correm quando o bloco aparece no ecrã. Quem pede menos movimento vê tudo parado.

import { curto, inteiro } from "../format.js";

const calmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const FORMATOS = { curto, inteiro, pct: (x) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x))}%`, texto: (x) => String(x) };

function contarNumero(el, atraso = 0) {
  const ate = Number(el.dataset.n);
  const fmt = FORMATOS[el.dataset.fmt] || curto;
  if (!Number.isFinite(ate)) return;
  const dur = 1300;
  const ini = performance.now() + atraso;
  el.textContent = fmt(0);
  const passo = (t) => {
    const k = Math.min(1, Math.max(0, (t - ini) / dur));
    const e = 1 - Math.pow(1 - k, 4);
    el.textContent = fmt(ate * e);
    if (k < 1) requestAnimationFrame(passo);
    else el.textContent = fmt(ate);
  };
  requestAnimationFrame(passo);
}

const ANIM = {
  subir(bloco, itens) {
    itens.forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(26px)" }, { opacity: 1, transform: "none" }], { duration: 650, delay: i * 70, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" }));
  },
  deslizar(bloco, itens) {
    itens.forEach((el, i) => el.animate([{ opacity: 0, transform: `translateX(${i % 2 ? 60 : -60}px)` }, { opacity: 1, transform: "none" }], { duration: 700, delay: i * 90, easing: "cubic-bezier(.2,1.2,.3,1)", fill: "backwards" }));
  },
  // Do último para o primeiro, com suspense no fim (como na Revelação do Palco)
  revelar(bloco, itens) {
    const ordem = [...itens].sort((a, b) => Number(b.dataset.ordem || 0) - Number(a.dataset.ordem || 0));
    let t = 0;
    ordem.forEach((el, i) => {
      const ultimo = i === ordem.length - 1;
      t += ultimo ? 650 : 280;
      el.animate(
        ultimo
          ? [{ opacity: 0, transform: "scale(.4) rotate(-6deg)", filter: "brightness(3)" }, { opacity: 1, transform: "scale(1.08)", filter: "brightness(1.4)", offset: 0.7 }, { opacity: 1, transform: "none", filter: "none" }]
          : [{ opacity: 0, transform: "translateY(40px) scale(.9)" }, { opacity: 1, transform: "none" }],
        { duration: ultimo ? 900 : 600, delay: t, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" },
      );
    });
    bloco.querySelectorAll("[data-n]").forEach((el) => contarNumero(el, 300));
  },
  contar(bloco, itens) {
    ANIM.subir(bloco, itens);
    bloco.querySelectorAll("[data-n]").forEach((el, i) => contarNumero(el, i * 120));
  },
  crescer(bloco, itens) {
    ANIM.subir(bloco, itens);
    bloco.querySelectorAll("[data-w]").forEach((el, i) => el.animate([{ width: "0%" }, { width: el.dataset.w }], { duration: 1100, delay: 200 + i * 60, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" }));
    bloco.querySelectorAll("[data-n]").forEach((el, i) => contarNumero(el, 200 + i * 60));
  },
  nenhuma() {},
};

/** Anima cada bloco [data-animacao] quando aparece no ecrã (uma vez). */
export function animarBlocos(raiz) {
  const blocos = [...raiz.querySelectorAll("[data-animacao]")];
  if (calmo() || !("IntersectionObserver" in window)) {
    blocos.forEach((b) => b.classList.add("animado"));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const b = e.target;
        b.classList.add("animado");
        const f = ANIM[b.dataset.animacao] || ANIM.subir;
        f(b, [...b.querySelectorAll("[data-anim-item]")]);
      }
    },
    // threshold 0 (com margem): um bloco mais alto do que o ecrã também tem de animar
    { threshold: 0, rootMargin: "0px 0px -12% 0px" },
  );
  blocos.forEach((b) => {
    if (b.dataset.animacao === "nenhuma") b.classList.add("animado");
    else io.observe(b);
  });
  return () => io.disconnect();
}
