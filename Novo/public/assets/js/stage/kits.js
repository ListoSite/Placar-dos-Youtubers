// Tema completo: cada tema tem um "kit" que desenha à sua maneira os momentos dos espetáculos.
//
// Os espetáculos não sabem nada de futebol ou de coliseus: dizem só o que aconteceu, com
// palco.evento("golpe", { de, alvo, critico }), e o kit do tema decide como isso aparece no ecrã
// e como soa. Cada evento devolve true quando o kit tratou o som (o espetáculo não toca o seu).
//
// Eventos:
//   inicio                     arranque do espetáculo (ambiente de fundo)
//   duelo     { a, b }         dois frente a frente (batalha, torneio, quiz)
//   golpe     { de, alvo, critico }
//   ko        { vencedor, perdedor }
//   acerto    { alvo }         resposta certa / ponto ganho
//   erro      { alvo }         resposta errada / ponto perdido
//   revelar   { alvo, p, pos } entra alguém num ranking (pos 1 = o primeiro)
//   lider     { alvo, p }      novo líder
//   subida    { alvo }         subiu muito
//   queda     { alvo }         caiu muito
//   vencedor  { alvo, p }      o grande vencedor do espetáculo
// Os alvos são elementos do ecrã (ou pontos { x, y }) onde o efeito acontece.

import { esc } from "../format.js";
import { pontoDe } from "./grafico.js";

// ---------- Desenhos ----------
const SVG = {
  bola: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#fff" stroke="#111" stroke-width="3"/><path d="M50 30 66 42 60 61H40L34 42z" fill="#111"/><path d="M50 30V8M66 42l20-8M60 61l13 18M40 61 27 79M34 42 14 34" stroke="#111" stroke-width="3"/><path d="M14 34 6 50l5 17M86 34l8 16-5 17M27 79l9 12h28l9-12M50 8 36 4M50 8l14-4" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  taca: `<svg viewBox="0 0 100 120"><defs><linearGradient id="kt-ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".45" stop-color="#f4c430"/><stop offset="1" stop-color="#a3740a"/></linearGradient></defs><path d="M22 8h56v22c0 22-12 38-28 40C34 68 22 52 22 30z" fill="url(#kt-ouro)"/><path d="M22 16H8c0 18 8 28 18 30M78 16h14c0 18-8 28-18 30" fill="none" stroke="url(#kt-ouro)" stroke-width="7"/><path d="M44 70h12v16H44z" fill="url(#kt-ouro)"/><path d="M30 86h40l6 16H24z" fill="url(#kt-ouro)"/><rect x="20" y="102" width="60" height="12" rx="3" fill="#5a3b0a"/><path d="M38 22l8 4 4-8 4 8 8-4-3 10H41z" fill="#fff8" /></svg>`,
  louros: `<svg viewBox="0 0 200 120"><g fill="#f4c430" stroke="#8a6200" stroke-width="2">${Array.from({ length: 7 }, (_, i) => {
    const a = (200 - i * 22) * (Math.PI / 180);
    const x = 100 + Math.cos(a) * 80;
    const y = 100 - Math.sin(a) * 80;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="15" ry="7" transform="rotate(${(-(200 - i * 22) + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/><ellipse cx="${(200 - x).toFixed(1)}" cy="${y.toFixed(1)}" rx="15" ry="7" transform="rotate(${((200 - i * 22) - 90).toFixed(0)} ${(200 - x).toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join("")}</g></svg>`,
  polegar: `<svg viewBox="0 0 100 100"><path d="M30 20h26c6 0 10 4 9 10l-2 8h17c6 0 10 5 9 11l-5 26c-1 5-5 8-10 8H44c-5 0-9-2-12-6L20 62V28c0-5 4-8 10-8z" fill="#f2c9a0" stroke="#5b3a1e" stroke-width="4" transform="rotate(180 50 50)"/><rect x="66" y="8" width="18" height="40" rx="5" fill="#8b1d1d" transform="rotate(180 50 50)"/></svg>`,
  pin: `<svg viewBox="0 0 60 80"><path d="M30 78C22 60 4 46 4 28a26 26 0 0 1 52 0c0 18-18 32-26 50z" fill="var(--rubi)" stroke="#fff" stroke-width="4"/><circle cx="30" cy="28" r="10" fill="#fff"/></svg>`,
  chapeu: `<svg viewBox="0 0 120 100"><path d="M30 60c-18 0-26-12-22-24s18-16 28-10c4-14 18-22 30-18 10-10 30-6 34 8 14-4 26 8 22 22s-16 22-30 22z" fill="#fff" stroke="#ccc" stroke-width="3"/><rect x="28" y="60" width="64" height="30" rx="6" fill="#fff" stroke="#ccc" stroke-width="3"/><path d="M40 66v18M52 66v18M64 66v18M76 66v18" stroke="#ddd" stroke-width="3"/></svg>`,
  estatueta: `<svg viewBox="0 0 60 140"><defs><linearGradient id="kt-ouro2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a3740a"/><stop offset=".5" stop-color="#fff3b0"/><stop offset="1" stop-color="#a3740a"/></linearGradient></defs><circle cx="30" cy="14" r="10" fill="url(#kt-ouro2)"/><path d="M18 28h24l-2 30 4 50H16l4-50z" fill="url(#kt-ouro2)"/><rect x="10" y="108" width="40" height="10" fill="url(#kt-ouro2)"/><rect x="6" y="118" width="48" height="18" rx="2" fill="#2a1a05"/></svg>`,
  placa: `<svg viewBox="0 0 120 150"><defs><linearGradient id="kt-placa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#e3b22b"/><stop offset="1" stop-color="#8a6200"/></linearGradient></defs><rect x="4" y="4" width="112" height="142" rx="8" fill="#1b1b1b" stroke="url(#kt-placa)" stroke-width="8"/><rect x="26" y="40" width="68" height="48" rx="14" fill="url(#kt-placa)"/><path d="M52 52v24l20-12z" fill="#1b1b1b"/><rect x="30" y="112" width="60" height="6" rx="3" fill="url(#kt-placa)"/></svg>`,
  coracao: `<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" fill="#ff4fa3" stroke="#fff" stroke-width="1.2"/></svg>`,
  coracaoPartido: `<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6l-1.5 4 3 2-2 3 1.5 6z" fill="#ff4fa3" stroke="#fff" stroke-width="1.2"/><path d="M13 21l-1.5-6 2-3-3-2L12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-8.5 9-8.5 9z" fill="#ff4fa3" stroke="#fff" stroke-width="1.2"/></svg>`,
  estrela: `<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" fill="#ffd54a" stroke="#fff" stroke-width="1"/></svg>`,
  nota: `<svg viewBox="0 0 24 24"><path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h6V3z" fill="currentColor"/></svg>`,
  rosa: `<svg viewBox="0 0 24 24"><path d="M12 9c-3 0-5-2-5-4 2 0 3 1 4 2 0-2 1-4 3-5 1 2 1 3 0 5 1-1 3-2 4-2 0 3-3 4-6 4z" fill="#e0103a"/><path d="M12 9v13" stroke="#2e7d32" stroke-width="1.6"/><path d="M12 15c-2-1-4-1-5 0 2 2 4 1 5 0z" fill="#2e7d32"/></svg>`,
  chave: `<svg viewBox="0 0 24 24"><path d="M14.5 2a5.5 5.5 0 0 0-5.2 7.3L2 16.6V21h4.4l1.4-1.4V18h1.6l1-1v-1.6h1.6l1.3-1.3A5.5 5.5 0 1 0 14.5 2z" fill="currentColor"/></svg>`,
};

const EMOJI = {
  reacao: ["😱", "😂", "🤯", "😳", "🔥", "💀", "😭", "👀"],
  bom: ["🔥", "😍", "👏", "🙌", "💯"],
  mau: ["😬", "🤦", "💀", "😵"],
  fofo: ["💖", "✨", "🎀", "💕", "🌸", "⭐"],
  viagem: ["📍", "✈️", "🌍", "📸", "🏝️"],
  natureza: ["🌿", "🐾", "🐟", "🌊", "☀️"],
  comida: ["🍕", "🌶️", "🍰", "🥐", "🍳"],
  musica: ["🎵", "🎶", "🎤", "🎸", "🥁"],
  ciencia: ["⚛️", "🧪", "🔬", "💡", "🚀"],
  livro: ["📚", "✒️", "📜", "🖋️"],
};
const escolher = (a) => a[Math.floor(Math.random() * a.length)];

// ---------- Ferramentas comuns ----------
function ferramentas(palco, kitId) {
  const camada = document.createElement("div");
  camada.className = `kt-camada kt-${kitId}`;
  palco.mundo.appendChild(camada);
  const timers = new Set();
  const depois = (ms, f) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!palco.terminado) f();
    }, ms);
    timers.add(id);
  };
  const ponto = (alvo) => {
    if (!alvo) return { x: palco.L / 2, y: palco.A / 2, w: 0, h: 0 };
    if (typeof alvo.x === "number") return { w: 0, h: 0, ...alvo };
    try {
      return pontoDe(palco, alvo);
    } catch {
      return { x: palco.L / 2, y: palco.A / 2, w: 0, h: 0 };
    }
  };
  const novo = (html, cls, { x, y }, estilo = "") => {
    const el = document.createElement("div");
    el.className = `kt-el ${cls}`;
    el.innerHTML = html;
    el.style.cssText = `left:${x}px;top:${y}px;${estilo}`;
    camada.appendChild(el);
    return el;
  };
  // Mantém um elemento centrado em x dentro do ecrã (com margem)
  const dentro = (el, x) => {
    const meia = el.offsetWidth / 2 + 30;
    if (meia * 2 < palco.L) el.style.left = Math.min(palco.L - meia, Math.max(meia, x)) + "px";
  };
  // A curva vai só no primeiro quadro (entrada): uma curva com ressalto no tempo todo
  // passaria pelos quadros de saída a meio da animação e o elemento piscava.
  const anim = (el, quadros, { easing, ...opts }) => {
    if (easing && quadros.length > 2) quadros = [{ ...quadros[0], easing }, ...quadros.slice(1)];
    return el.animate(quadros, { fill: "both", ...opts, ...(quadros.length <= 2 && easing ? { easing } : {}) });
  };
  const tirar = (el, ms) => depois(ms, () => el.remove());

  const k = {
    palco,
    camada,
    estado: {},
    depois,
    ponto,
    novo,
    som(nome, atraso = 0, op) {
      palco.tocar(nome, op, atraso);
    },
    /** Texto grande a bater no ecrã (ou junto de um alvo). */
    banner(texto, { cls = "", dur = 1900, alvo, y, escala = 1 } = {}) {
      const p = alvo ? ponto(alvo) : { x: palco.L / 2, y: y ?? palco.A * 0.42 };
      const el = novo(`<span>${esc(texto)}</span>`, `kt-banner ${cls}`, { x: p.x, y: Math.max(140, p.y - (alvo ? p.h / 2 + 40 : 0)) }, `--s:${escala}`);
      dentro(el, p.x);
      anim(el, [{ transform: "scale(2.6) rotate(-6deg)", opacity: 0, filter: "blur(6px)" }, { transform: "scale(1) rotate(-3deg)", opacity: 1, filter: "blur(0)", offset: 0.25 }, { transform: "scale(1.04) rotate(-3deg)", opacity: 1, offset: 0.8 }, { transform: "scale(.9) rotate(-3deg)", opacity: 0 }], { duration: dur, easing: "cubic-bezier(.2,1.3,.4,1)" });
      tirar(el, dur + 50);
      return el;
    },
    /** Rótulo em baixo, estilo televisão. */
    rotulo(titulo, texto, { cls = "", dur = 2600 } = {}) {
      const el = novo(`<b>${esc(titulo)}</b><span>${esc(texto)}</span>`, `kt-rotulo ${cls}`, { x: palco.vertical ? 40 : 90, y: palco.A - (palco.vertical ? 330 : 190) });
      anim(el, [{ transform: "translateX(-120%)" }, { transform: "translateX(0)", offset: 0.12 }, { transform: "translateX(0)", offset: 0.88 }, { transform: "translateX(-120%)" }], { duration: dur, easing: "cubic-bezier(.3,1.2,.4,1)" });
      tirar(el, dur + 50);
      return el;
    },
    /** Carimbo sobre um alvo. */
    carimbo(alvo, texto, { cls = "", dur = 1800, rot = -12 } = {}) {
      const p = ponto(alvo);
      const el = novo(`<span>${esc(texto)}</span>`, `kt-carimbo ${cls}`, p, `--r:${rot}deg`);
      dentro(el, p.x);
      anim(el, [{ transform: `scale(3) rotate(${rot}deg)`, opacity: 0 }, { transform: `scale(1) rotate(${rot}deg)`, opacity: 1, offset: 0.12 }, { transform: `scale(1) rotate(${rot}deg)`, opacity: 1, offset: 0.85 }, { transform: `scale(1) rotate(${rot}deg)`, opacity: 0 }], { duration: dur, easing: "cubic-bezier(.3,1.6,.5,1)" });
      tirar(el, dur + 50);
      return el;
    },
    /** Objetos (emoji ou SVG) a saltar de um ponto em todas as direções. */
    explosao(alvo, itens, { n = 12, raio = 260, dur = 1300, tam = 64 } = {}) {
      const p = ponto(alvo);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const r = raio * (0.6 + Math.random() * 0.6);
        const el = novo(escolher(itens), "kt-item", p, `font-size:${tam}px;width:${tam}px;height:${tam}px`);
        anim(el, [{ transform: "translate(0,0) scale(.2) rotate(0)", opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r - 60}px) scale(1) rotate(${(Math.random() - 0.5) * 120}deg)`, opacity: 1, offset: 0.7 }, { transform: `translate(${Math.cos(a) * r * 1.1}px, ${Math.sin(a) * r + 80}px) scale(.8)`, opacity: 0 }], { duration: dur * (0.8 + Math.random() * 0.4), easing: "cubic-bezier(.2,.8,.3,1)" });
        tirar(el, dur * 1.3);
      }
    },
    /** Objetos a subir desde baixo (corações de direto, bolhas). */
    subir(itens, { n = 8, dur = 3200, tam = 56, lado } = {}) {
      for (let i = 0; i < n; i++) {
        const x = lado === "dir" ? palco.L - 120 + (Math.random() - 0.5) * 120 : lado === "esq" ? 120 + (Math.random() - 0.5) * 120 : Math.random() * palco.L;
        const el = novo(escolher(itens), "kt-item", { x, y: palco.A + 40 }, `font-size:${tam}px;width:${tam}px;height:${tam}px`);
        const d = dur * (0.7 + Math.random() * 0.6);
        anim(el, [{ transform: "translate(0,0) scale(.6)", opacity: 0 }, { opacity: 1, offset: 0.1 }, { transform: `translate(${(Math.random() - 0.5) * 160}px, ${-palco.A * (0.5 + Math.random() * 0.4)}px) scale(1.1)`, opacity: 0 }], { duration: d, delay: i * 120, easing: "ease-out" });
        tirar(el, d + i * 120 + 100);
      }
    },
    /** Um objeto que aparece sobre o alvo. */
    icone(alvo, html, { cls = "", dur = 1600, tam = 140, dy = 0, entrada = "pop" } = {}) {
      const p = ponto(alvo);
      const el = novo(html, `kt-icone ${cls}`, { x: p.x, y: p.y + dy }, `width:${tam}px;height:${tam}px;font-size:${tam}px`);
      const entra = { pop: "scale(0) rotate(-30deg)", cai: `translateY(${-palco.A * 0.6}px)`, sobe: "translateY(200px) scale(.6)" }[entrada];
      anim(el, [{ transform: entra, opacity: 0 }, { transform: "none", opacity: 1, offset: 0.2 }, { transform: "none", opacity: 1, offset: 0.85 }, { transform: "scale(.8)", opacity: 0 }], { duration: dur, easing: "cubic-bezier(.2,1.4,.4,1)" });
      tirar(el, dur + 50);
      return el;
    },
    /** Um objeto a voar de um ponto para outro. */
    voar(html, de, para, { cls = "", dur = 700, tam = 90, arco = 160, voltas = 2 } = {}) {
      const a = ponto(de);
      const b = ponto(para);
      const el = novo(html, `kt-icone ${cls}`, a, `width:${tam}px;height:${tam}px;font-size:${tam}px`);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      anim(el, [{ transform: "translate(0,0) rotate(0)" }, { transform: `translate(${dx / 2}px, ${dy / 2 - arco}px) rotate(${voltas * 180}deg)`, offset: 0.5 }, { transform: `translate(${dx}px, ${dy}px) rotate(${voltas * 360}deg)` }], { duration: dur, easing: "cubic-bezier(.4,0,.6,1)" });
      tirar(el, dur + 30);
      return new Promise((r) => depois(dur, r));
    },
    /** Moldura à volta de um alvo (polaroid, scanner, holofote…). */
    moldura(alvo, cls, { dur = 2200, html = "", folga = 30 } = {}) {
      const p = ponto(alvo);
      const w = Math.max(160, p.w + folga * 2);
      const h = Math.max(160, p.h + folga * 2);
      const el = novo(html, `kt-moldura ${cls}`, p, `width:${w}px;height:${h}px`);
      anim(el, [{ opacity: 0, transform: "scale(1.3)" }, { opacity: 1, transform: "scale(1)", offset: 0.12 }, { opacity: 1, transform: "scale(1)", offset: 0.85 }, { opacity: 0, transform: "scale(1)" }], { duration: dur, easing: "cubic-bezier(.2,1.2,.4,1)" });
      tirar(el, dur + 50);
      return el;
    },
    /** Linha entre dois pontos (laser, corte de espada, rasto). */
    linha(de, para, { cls = "", dur = 500, larg = 14 } = {}) {
      const a = ponto(de);
      const b = ponto(para);
      const comp = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const el = novo("", `kt-linha ${cls}`, a, `width:${comp}px;height:${larg}px;transform-origin:0 50%;rotate:${ang}rad`);
      anim(el, [{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(1)", opacity: 1, offset: 0.4 }, { transform: "scaleX(1)", opacity: 0 }], { duration: dur, easing: "ease-out" });
      tirar(el, dur + 30);
    },
    /** Corte em diagonal sobre um alvo. */
    corte(alvo, { cls = "", cruzado = false } = {}) {
      const p = ponto(alvo);
      const r = Math.max(140, (p.w || 200) * 0.7);
      k.linha({ x: p.x - r, y: p.y - r * 0.8 }, { x: p.x + r, y: p.y + r * 0.8 }, { cls: `kt-corte ${cls}`, dur: 520, larg: 16 });
      if (cruzado) depois(130, () => k.linha({ x: p.x + r, y: p.y - r * 0.8 }, { x: p.x - r, y: p.y + r * 0.8 }, { cls: `kt-corte ${cls}`, dur: 520, larg: 16 }));
    },
    /** Repete f de ms em ms enquanto o espetáculo corre (sem contar a pausa). */
    sempre(ms, f) {
      const id = setInterval(() => {
        if (palco.terminado) return clearInterval(id);
        if (!palco.pausado) f();
      }, ms);
      timers.add(id);
    },
    limpar() {
      for (const id of timers) {
        clearTimeout(id);
        clearInterval(id);
      }
      camada.remove();
    },
  };
  return k;
}

// ---------- Kits ----------
const pos1 = (d) => d.pos === 1;

const KITS = {
  // Futebol: golos, cartões, apito, bancada a cantar e a taça
  estadio: {
    inicio(k) {
      k.som("apito", 0.2, { longo: true });
      k.som("multidao", 0.4, { dur: 5, vol: 0.5 });
      k.sempre(9000, () => k.som("multidao", 0, { dur: 9.5, vol: 0.28 }));
    },
    duelo(k, d) {
      k.banner("Pontapé de saída", { cls: "kt-campo" });
      k.som("apito");
      return true;
    },
    golpe(k, d) {
      k.voar(SVG.bola, d.de, d.alvo, { dur: 520, tam: 96 }).then(() => {
        k.moldura(d.alvo, "kt-rede", { dur: 900, folga: 10 });
        k.banner(d.critico ? "GOLAÇO!" : "GOLO!", { alvo: d.de, cls: "kt-golo", dur: 1600 });
        if (d.critico) k.depois(500, () => k.icone(d.alvo, `<i class="kt-cartao amarelo"></i>`, { tam: 150, dur: 1700, dy: -40 }));
      });
      k.som("golo", 0.45);
      if (d.critico) k.som("apito", 0.9);
      return true;
    },
    ko(k, d) {
      k.som("apito", 0, { longo: true });
      k.icone(d.perdedor, `<i class="kt-cartao vermelho"></i>`, { tam: 200, dur: 2600, dy: -60, entrada: "sobe" });
      k.banner("Expulso!", { alvo: d.perdedor, cls: "kt-cartao-txt", dur: 2400 });
      k.som("vaia", 0.6);
      return true;
    },
    acerto(k, d) {
      k.voar(SVG.bola, { x: k.palco.L / 2, y: k.palco.A + 60 }, d.alvo, { dur: 500, tam: 80 }).then(() => k.banner("GOLO!", { alvo: d.alvo, cls: "kt-golo", dur: 1200 }));
      k.som("golo", 0.4);
      return true;
    },
    erro(k, d) {
      k.banner(escolher(["Ao poste!", "Fora!", "Fora de jogo!"]), { alvo: d.alvo, cls: "kt-fora", dur: 1300 });
      k.som("vaia");
      return true;
    },
    revelar(k, d) {
      k.moldura(d.alvo, "kt-camisola", { html: `<b>${d.pos}</b>`, dur: 2000 });
      if (d.pos <= 3) {
        k.som("multidao", 0.1, { dur: 3, vol: pos1(d) ? 1.4 : 0.9 });
        k.banner(pos1(d) ? "O número 1!" : `${d.pos}.º lugar`, { y: k.palco.A * 0.16, cls: "kt-cachecol", dur: 2200 });
      }
      return false;
    },
    lider(k, d) {
      k.banner("Vira o jogo!", { cls: "kt-golo", y: k.palco.A * 0.2 });
      k.som("multidao", 0, { dur: 2.5, vol: 1 });
      return true;
    },
    vencedor(k, d) {
      k.icone(d.alvo, SVG.taca, { tam: 260, dur: 4200, dy: -((k.ponto(d.alvo).h || 200) / 2 + 120), entrada: "sobe", cls: "kt-taca" });
      k.banner("Campeão!", { alvo: d.alvo, cls: "kt-golo", dur: 3000 });
      k.explosao(d.alvo, [SVG.bola, "⚽", "🏆"], { n: 14, tam: 70 });
      k.som("golo");
      k.som("apito", 1.2, { longo: true });
      return true;
    },
    subida(k, d) {
      k.banner("Remontada!", { alvo: d.alvo, cls: "kt-golo" });
      k.som("multidao", 0, { dur: 2, vol: 1 });
      return true;
    },
    queda(k, d) {
      k.icone(d.alvo, `<i class="kt-cartao amarelo"></i>`, { tam: 120, dur: 1500 });
      k.som("vaia");
      return true;
    },
  },

  // Coliseu: espadas, rugido do público, louros e o polegar do imperador
  coliseu: {
    inicio(k) {
      k.som("rugido", 0.2);
      k.sempre(7000, () => k.som("multidao", 0, { dur: 7.5, vol: 0.32, grave: true }));
      k.sempre(4200, () => k.som("tambor"));
    },
    duelo(k) {
      k.banner("Que comece o combate!", { cls: "kt-arena", dur: 1800 });
      k.som("rugido");
      return true;
    },
    golpe(k, d) {
      k.corte(d.alvo, { cruzado: d.critico });
      k.explosao(d.alvo, ["🔥", "✦", "⚔️"], { n: d.critico ? 14 : 7, tam: 50, raio: 200 });
      k.som("espada");
      if (d.critico) {
        k.banner("Golpe brutal!", { alvo: d.alvo, cls: "kt-arena" });
        k.som("rugido", 0.2);
      }
      return true;
    },
    ko(k, d) {
      k.icone({ x: k.palco.L / 2, y: k.palco.A * 0.3 }, SVG.polegar, { tam: 260, dur: 2800, entrada: "cai", cls: "kt-polegar" });
      k.banner("O público decidiu", { cls: "kt-arena", y: k.palco.A * 0.62, dur: 2600 });
      k.som("rugido", 0.4);
      k.som("ko", 0.2);
      return true;
    },
    acerto(k, d) {
      k.corte(d.alvo);
      k.banner("Vitória!", { alvo: d.alvo, cls: "kt-arena" });
      k.som("espada");
      k.som("rugido", 0.3);
      return true;
    },
    erro(k, d) {
      k.icone(d.alvo, "🛡️", { tam: 120, dur: 1300, cls: "kt-parte" });
      k.som("vaia");
      return true;
    },
    revelar(k, d) {
      k.explosao(d.alvo, ["🔥"], { n: 8, tam: 60, raio: 180 });
      k.som("tambor");
      if (d.pos <= 3) k.som("rugido", 0.1);
      return false;
    },
    lider(k) {
      k.banner("Novo campeão da arena", { cls: "kt-arena", y: k.palco.A * 0.2 });
      k.som("rugido");
      return true;
    },
    vencedor(k, d) {
      const p = k.ponto(d.alvo);
      k.icone(d.alvo, SVG.louros, { tam: Math.max(260, p.w * 1.5), dur: 4200, dy: -(p.h || 200) * 0.25, cls: "kt-louros" });
      k.banner("Glória!", { alvo: d.alvo, cls: "kt-arena", dur: 3000 });
      k.som("rugido");
      k.som("tambor", 0.6);
      k.som("tambor", 0.9);
      return true;
    },
    subida(k, d) {
      k.banner("Ergue-se!", { alvo: d.alvo, cls: "kt-arena" });
      k.som("rugido");
      return true;
    },
    queda(k, d) {
      k.corte(d.alvo);
      k.som("espada");
      return true;
    },
  },

  // Arcada: combos, HIT, K.O., GAME OVER e recordes
  arcada: {
    inicio(k) {
      k.estado.combo = 0;
      k.som("powerup", 0.2);
    },
    duelo(k) {
      k.banner("Ronda 1 · Lutem!", { cls: "kt-pixel" });
      k.som("powerup");
      return true;
    },
    golpe(k, d) {
      k.estado.combo = (k.estado.combo || 0) + 1;
      k.banner(d.critico ? "CRÍTICO!" : "HIT!", { alvo: d.alvo, cls: "kt-pixel", dur: 900 });
      if (k.estado.combo >= 2) k.banner(`COMBO x${k.estado.combo}`, { cls: "kt-pixel kt-combo", y: k.palco.A * 0.18, dur: 1000 });
      k.explosao(d.alvo, ["<i class='kt-px'></i>"], { n: 16, tam: 22, raio: 220 });
      k.som(d.critico ? "laser" : "golpe");
      k.som("combo", 0.1);
      return true;
    },
    ko(k, d) {
      k.estado.combo = 0;
      k.banner("K.O.", { cls: "kt-pixel kt-ko", dur: 2200, escala: 2 });
      k.banner("GAME OVER", { alvo: d.perdedor, cls: "kt-pixel kt-over", dur: 2400 });
      k.som("ko");
      k.som("gameover", 0.6);
      return true;
    },
    acerto(k, d) {
      k.banner("+100", { alvo: d.alvo, cls: "kt-pixel kt-pontos", dur: 1100 });
      k.som("moeda");
      return true;
    },
    erro(k, d) {
      k.banner("MISS", { alvo: d.alvo, cls: "kt-pixel kt-over", dur: 1100 });
      k.som("gameover");
      return true;
    },
    revelar(k, d) {
      k.banner(pos1(d) ? "HIGH SCORE!" : `NÍVEL ${d.pos}`, { alvo: d.alvo, cls: "kt-pixel", dur: 1200 });
      if (pos1(d)) k.som("powerup");
      return false;
    },
    lider(k) {
      k.banner("NOVO RECORDE", { cls: "kt-pixel", y: k.palco.A * 0.2 });
      k.som("powerup");
      return true;
    },
    vencedor(k, d) {
      k.banner("JOGADOR 1 VENCE", { alvo: d.alvo, cls: "kt-pixel", dur: 3000 });
      k.explosao(d.alvo, ["<i class='kt-px'></i>", "🪙"], { n: 24, tam: 30, raio: 320 });
      k.som("powerup");
      k.som("moeda", 0.4);
      k.som("moeda", 0.55);
      return true;
    },
    subida(k, d) {
      k.banner("LEVEL UP!", { alvo: d.alvo, cls: "kt-pixel" });
      k.som("powerup");
      return true;
    },
    queda(k, d) {
      k.banner("-1 VIDA", { alvo: d.alvo, cls: "kt-pixel kt-over" });
      k.som("gameover");
      return true;
    },
  },

  // Reações: emojis, comentários de direto e corações
  reacao: {
    inicio(k) {
      k.sempre(1800, () => k.subir(EMOJI.reacao.concat(["❤️"]), { n: 2, lado: "dir", tam: 52 }));
    },
    duelo(k) {
      k.banner("Quem ganha? 👀", { cls: "kt-chat" });
      k.som("bolha");
      return true;
    },
    golpe(k, d) {
      k.explosao(d.alvo, d.critico ? ["😱", "🤯", "💥"] : ["😳", "💥", "👀"], { n: d.critico ? 12 : 7, tam: 64 });
      if (d.critico) k.banner("NÃO ACREDITO 😱", { alvo: d.alvo, cls: "kt-chat" });
      k.som("bolha");
      k.som("golpe", 0.05);
      return true;
    },
    ko(k, d) {
      k.icone(d.perdedor, "💀", { tam: 220, dur: 2400 });
      k.banner("Acabou-se 💀", { cls: "kt-chat", dur: 2200 });
      k.subir(["😂", "💀", "😭"], { n: 14 });
      k.som("boing");
      k.som("ooh", 0.2);
      return true;
    },
    acerto(k, d) {
      k.explosao(d.alvo, EMOJI.bom, { n: 10, tam: 60 });
      k.banner(escolher(["BRUTAL 🔥", "LENDA 👑", "SIMMM 🙌"]), { alvo: d.alvo, cls: "kt-chat" });
      k.som("bolha");
      k.som("acerto", 0.1);
      return true;
    },
    erro(k, d) {
      k.explosao(d.alvo, EMOJI.mau, { n: 8, tam: 60 });
      k.banner("OOF 😬", { alvo: d.alvo, cls: "kt-chat" });
      k.som("ooh");
      return true;
    },
    revelar(k, d) {
      k.icone(d.alvo, pos1(d) ? "🤯" : escolher(["😳", "👀", "🔥", "😮"]), { tam: 110, dur: 1500, dy: -((k.ponto(d.alvo).h || 200) / 2) });
      k.subir(["❤️", "🔥"], { n: pos1(d) ? 16 : 4, lado: "dir" });
      k.som("bolha");
      return false;
    },
    lider(k) {
      k.banner("PLOT TWIST 😳", { cls: "kt-chat", y: k.palco.A * 0.2 });
      k.som("ooh");
      return true;
    },
    vencedor(k, d) {
      k.icone(d.alvo, "👑", { tam: 160, dur: 4000, dy: -((k.ponto(d.alvo).h || 200) / 2 + 60), entrada: "cai" });
      k.subir(["❤️", "😍", "👏", "🔥"], { n: 30 });
      k.som("aplauso", 0, { dur: 3 });
      k.som("bolha", 0.2);
      return true;
    },
    subida(k, d) {
      k.explosao(d.alvo, ["📈", "🔥", "🚀"], { n: 8 });
      k.som("bolha");
      return false;
    },
    queda(k, d) {
      k.explosao(d.alvo, ["📉", "😬", "💀"], { n: 8 });
      k.som("ooh");
      return true;
    },
  },

  // Fofo: corações, brilhos, laços e tiaras
  fofo: {
    inicio(k) {
      k.sempre(2200, () => k.subir([SVG.coracao, "✨", "🎀"], { n: 2, tam: 46 }));
    },
    duelo(k) {
      k.banner("Quem é a mais fofa? 💕", { cls: "kt-fofo" });
      k.som("fofo");
      return true;
    },
    golpe(k, d) {
      k.explosao(d.alvo, [SVG.coracao, "✨", SVG.estrela], { n: d.critico ? 14 : 8, tam: 54 });
      k.banner(d.critico ? "Super fofo! ✨" : "Pim!", { alvo: d.alvo, cls: "kt-fofo", dur: 1100 });
      k.som("fofo");
      return true;
    },
    ko(k, d) {
      k.icone(d.perdedor, SVG.coracaoPartido, { tam: 220, dur: 2400, cls: "kt-parte" });
      k.banner("Ups… 💔", { alvo: d.perdedor, cls: "kt-fofo", dur: 2200 });
      k.som("boing");
      return true;
    },
    acerto(k, d) {
      k.explosao(d.alvo, [SVG.coracao, "💖", "✨"], { n: 10, tam: 56 });
      k.banner("Perfeito ✨", { alvo: d.alvo, cls: "kt-fofo" });
      k.som("fofo");
      return true;
    },
    erro(k, d) {
      k.icone(d.alvo, SVG.coracaoPartido, { tam: 120, dur: 1300 });
      k.som("boing");
      return true;
    },
    revelar(k, d) {
      k.moldura(d.alvo, "kt-laco", { html: "<i>🎀</i>", dur: 2000 });
      k.explosao(d.alvo, [SVG.coracao, "✨"], { n: pos1(d) ? 14 : 5, tam: 44, raio: 200 });
      k.som("fofo");
      return false;
    },
    lider(k) {
      k.banner("Nova rainha! 👑", { cls: "kt-fofo", y: k.palco.A * 0.2 });
      k.som("fofo");
      return true;
    },
    vencedor(k, d) {
      k.icone(d.alvo, "👑", { tam: 150, dur: 4000, dy: -((k.ponto(d.alvo).h || 200) / 2 + 50), entrada: "cai" });
      k.subir([SVG.coracao, "💕", "✨", "🌸"], { n: 34 });
      k.som("fofo");
      k.som("fofo", 0.4);
      k.som("aplauso", 0.3, { dur: 2 });
      return true;
    },
    subida(k, d) {
      k.explosao(d.alvo, [SVG.coracao, "✨"], { n: 8 });
      k.som("fofo");
      return true;
    },
    queda(k, d) {
      k.icone(d.alvo, SVG.coracaoPartido, { tam: 110 });
      k.som("boing");
      return true;
    },
  },

  // Viagem: polaroids, pins no mapa, carimbos de passaporte e aviões
  viagem: {
    inicio(k) {
      k.sempre(6500, () => {
        const y = 120 + Math.random() * k.palco.A * 0.3;
        const el = k.novo("✈️", "kt-item", { x: -80, y }, "font-size:60px;width:60px;height:60px");
        el.animate([{ transform: "translateX(0)" }, { transform: `translateX(${k.palco.L + 160}px)` }], { duration: 5200, easing: "linear", fill: "both" });
        k.depois(5300, () => el.remove());
      });
    },
    duelo(k) {
      k.banner("Partida!", { cls: "kt-postal" });
      k.som("camara");
      return true;
    },
    golpe(k, d) {
      k.icone(d.alvo, SVG.pin, { tam: 110, dur: 1300, entrada: "cai", dy: -((k.ponto(d.alvo).h || 200) / 2) });
      k.palco.flash(0.3);
      k.som("camara");
      if (d.critico) k.carimbo(d.alvo, "Inesquecível", { cls: "kt-passaporte" });
      return true;
    },
    ko(k, d) {
      k.carimbo(d.perdedor, "Fim da viagem", { cls: "kt-passaporte", dur: 2400 });
      k.som("camara");
      k.som("tambor", 0.2);
      return true;
    },
    acerto(k, d) {
      k.carimbo(d.alvo, "✓ Visitado", { cls: "kt-passaporte verde" });
      k.som("camara");
      return true;
    },
    erro(k, d) {
      k.carimbo(d.alvo, "Destino errado", { cls: "kt-passaporte" });
      k.som("falha");
      return true;
    },
    revelar(k, d) {
      k.moldura(d.alvo, "kt-polaroid", { html: `<span>#${d.pos} ${esc(d.p?.name || "")}</span>`, dur: 2400, folga: 24 });
      k.palco.flash(0.35);
      k.som("camara");
      return false;
    },
    lider(k) {
      k.banner("Nova rota!", { cls: "kt-postal", y: k.palco.A * 0.2 });
      k.som("camara");
      return true;
    },
    vencedor(k, d) {
      k.moldura(d.alvo, "kt-polaroid", { html: `<span>O n.º 1 ✈️</span>`, dur: 4200, folga: 30 });
      k.carimbo({ x: k.ponto(d.alvo).x + 180, y: k.ponto(d.alvo).y + 120 }, "Destino: 1.º lugar", { cls: "kt-passaporte verde", dur: 3800 });
      k.palco.flash(0.5);
      k.som("camara");
      k.som("camara", 0.5);
      k.som("aplauso", 0.4);
      return true;
    },
    subida(k, d) {
      k.icone(d.alvo, "✈️", { tam: 100, entrada: "sobe" });
      k.som("whoosh");
      return true;
    },
    queda(k, d) {
      k.icone(d.alvo, "🧳", { tam: 100, entrada: "cai" });
      return false;
    },
  },

  // Notícias: rótulos de televisão, última hora, carimbos de verificação e a primeira página
  noticias: {
    inicio(k) {
      k.som("urgente", 0.2);
    },
    duelo(k, d) {
      k.rotulo("Em direto", "Frente a frente: quem leva a melhor?");
      k.som("bip");
      return true;
    },
    golpe(k, d) {
      k.rotulo(d.critico ? "Exclusivo" : "Agora", d.critico ? "Golpe decisivo no duelo" : "Mais um ponto no frente a frente", { dur: 1800 });
      k.som(d.critico ? "urgente" : "bip");
      return true;
    },
    ko(k, d) {
      k.rotulo("Última hora", "Está decidido: temos vencedor", { cls: "urgente", dur: 3000 });
      k.som("urgente");
      return true;
    },
    acerto(k, d) {
      k.carimbo(d.alvo, "Verdadeiro", { cls: "kt-verifica verde" });
      k.som("bip");
      return true;
    },
    erro(k, d) {
      k.carimbo(d.alvo, "Falso", { cls: "kt-verifica" });
      k.som("falha");
      return true;
    },
    revelar(k, d) {
      k.rotulo(pos1(d) ? "Última hora" : `${d.pos}.º lugar`, `${d.p?.name || ""}${pos1(d) ? " é o n.º 1" : ""}`, { cls: pos1(d) ? "urgente" : "", dur: 2600 });
      if (pos1(d)) k.som("urgente");
      return false;
    },
    lider(k, d) {
      k.rotulo("Última hora", `${d.p?.name || "Temos"} novo líder`, { cls: "urgente" });
      k.som("urgente");
      return true;
    },
    vencedor(k, d) {
      const nome = esc(d.p?.name || "");
      const el = k.novo(`<div class="kt-jornal-topo">O PLACAR</div><div class="kt-jornal-data">${new Date().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })} · Edição especial</div><h3>${nome} é o grande vencedor</h3><p>Os números não enganam: ninguém fez melhor.</p>`, "kt-jornal", { x: k.palco.L / 2, y: k.palco.A * 0.5 });
      el.animate([{ transform: "scale(.05) rotate(-720deg)", opacity: 0 }, { transform: "scale(1) rotate(-4deg)", opacity: 1, offset: 0.3 }, { transform: "scale(1) rotate(-4deg)", opacity: 1, offset: 0.9 }, { transform: "scale(1.05) rotate(-4deg)", opacity: 0 }], { duration: 4200, easing: "cubic-bezier(.2,.9,.3,1)", fill: "both" });
      k.depois(4300, () => el.remove());
      k.som("urgente", 0.6);
      return true;
    },
    subida(k, d) {
      k.rotulo("Em alta", `${d.p?.name || ""} dispara no ranking`);
      return false;
    },
    queda(k, d) {
      k.rotulo("Em queda", `${d.p?.name || ""} perde lugares`);
      return false;
    },
  },

  // Pista: luzes de partida, ultrapassagens, nitro e bandeira de xadrez
  pista: {
    inicio(k) {
      k.som("motor", 0.2);
    },
    duelo(k) {
      const el = k.novo(`<i></i><i></i><i></i><i></i><i></i>`, "kt-semaforo", { x: k.palco.L / 2, y: k.palco.A * 0.2 });
      [...el.children].forEach((l, i) => k.depois(250 + i * 250, () => (l.className = "on")));
      k.depois(1700, () => [...el.children].forEach((l) => (l.className = "")));
      k.depois(2400, () => el.remove());
      k.som("bip", 0.25);
      k.som("bip", 0.5);
      k.som("bip", 0.75);
      k.som("motor", 1.7);
      return true;
    },
    golpe(k, d) {
      k.linha({ x: k.ponto(d.de).x, y: k.ponto(d.alvo).y }, d.alvo, { cls: "kt-rasto", larg: 30, dur: 450 });
      k.banner(d.critico ? "NITRO!" : "Ultrapassagem!", { alvo: d.alvo, cls: "kt-corrida", dur: 1100 });
      if (d.critico) k.explosao(d.alvo, ["🔥"], { n: 10, tam: 54 });
      k.som(d.critico ? "motor" : "pneu");
      return true;
    },
    ko(k, d) {
      k.icone({ x: k.palco.L / 2, y: k.palco.A * 0.32 }, `<i class="kt-xadrez"></i>`, { tam: 300, dur: 2800, entrada: "sobe", cls: "kt-bandeira" });
      k.banner("Bandeira de xadrez", { cls: "kt-corrida", y: k.palco.A * 0.62, dur: 2600 });
      k.som("motor");
      k.som("multidao", 0.3, { dur: 2.5 });
      return true;
    },
    acerto(k, d) {
      k.banner("Na frente!", { alvo: d.alvo, cls: "kt-corrida" });
      k.som("pneu");
      return true;
    },
    erro(k, d) {
      k.explosao(d.alvo, ["💨"], { n: 8, tam: 70, raio: 160 });
      k.banner("Despiste!", { alvo: d.alvo, cls: "kt-corrida kt-mau" });
      k.som("pneu");
      return true;
    },
    revelar(k, d) {
      k.icone(d.alvo, `<b class="kt-placa-box">P${d.pos}</b>`, { tam: 120, dur: 1800, dy: -((k.ponto(d.alvo).h || 200) / 2 + 30) });
      if (pos1(d)) k.som("motor");
      return false;
    },
    lider(k) {
      k.banner("Ultrapassagem!", { cls: "kt-corrida", y: k.palco.A * 0.2 });
      k.som("pneu");
      return true;
    },
    vencedor(k, d) {
      k.icone(d.alvo, `<i class="kt-xadrez"></i>`, { tam: 200, dur: 4000, dy: -((k.ponto(d.alvo).h || 200) / 2 + 120), cls: "kt-bandeira" });
      k.explosao(d.alvo, ["🍾", "✨", "🏁"], { n: 18, tam: 60, raio: 340 });
      k.banner("Vitória!", { alvo: d.alvo, cls: "kt-corrida", dur: 3000 });
      k.som("motor");
      k.som("multidao", 0.4, { dur: 3 });
      return true;
    },
    subida(k, d) {
      k.banner("Ultrapassagem!", { alvo: d.alvo, cls: "kt-corrida" });
      k.som("pneu");
      return true;
    },
    queda(k, d) {
      k.explosao(d.alvo, ["💨"], { n: 6, tam: 60 });
      k.som("pneu");
      return true;
    },
  },

  // Espetáculo: holofotes, aplausos, rosas, bravo e a estatueta
  espetaculo: {
    inicio(k) {
      k.som("aplauso", 0.2, { dur: 2 });
    },
    duelo(k) {
      k.banner("Senhoras e senhores…", { cls: "kt-gala" });
      k.som("rufo", 0, { dur: 1.4 });
      return true;
    },
    golpe(k, d) {
      k.explosao(d.alvo, k.palco.tema.id === "cinema" ? ["🎬", "⭐"] : EMOJI.musica, { n: d.critico ? 12 : 6, tam: 54 });
      if (d.critico) k.banner("Bravo!", { alvo: d.alvo, cls: "kt-gala" });
      k.som(d.critico ? "aplauso" : "brilho", 0, { dur: 1.2 });
      return true;
    },
    ko(k, d) {
      k.banner("Cai o pano", { cls: "kt-gala", dur: 2400 });
      k.moldura(d.perdedor, "kt-sombra", { dur: 2400 });
      k.som("tambor");
      k.som("aplauso", 0.5, { dur: 2.5 });
      return true;
    },
    acerto(k, d) {
      k.moldura(d.alvo, "kt-holofote", { dur: 1600 });
      k.banner("Bravo!", { alvo: d.alvo, cls: "kt-gala" });
      k.som("aplauso", 0, { dur: 1.5 });
      return true;
    },
    erro(k, d) {
      k.moldura(d.alvo, "kt-sombra", { dur: 1400 });
      k.som("ooh");
      return true;
    },
    revelar(k, d) {
      k.moldura(d.alvo, "kt-holofote", { dur: 2400 });
      k.som("aplauso", 0.1, { dur: pos1(d) ? 3 : 1.2 });
      if (pos1(d)) k.subir([SVG.rosa], { n: 16, tam: 60 });
      return false;
    },
    lider(k) {
      k.banner("Nova estrela!", { cls: "kt-gala", y: k.palco.A * 0.2 });
      k.som("aplauso", 0, { dur: 1.5 });
      return true;
    },
    vencedor(k, d) {
      k.moldura(d.alvo, "kt-holofote", { dur: 4200 });
      k.icone({ x: k.ponto(d.alvo).x + (k.palco.vertical ? 260 : 300), y: k.ponto(d.alvo).y }, SVG.estatueta, { tam: 260, dur: 4200, entrada: "sobe", cls: "kt-estatueta" });
      k.subir([SVG.rosa, "🌹"], { n: 24, tam: 64 });
      k.banner("E o vencedor é…", { y: k.palco.A * 0.16, cls: "kt-gala", dur: 2400 });
      k.som("rufo", 0, { dur: 1 });
      k.som("aplauso", 0.9, { dur: 3.5 });
      return true;
    },
    subida(k, d) {
      k.moldura(d.alvo, "kt-holofote", { dur: 1600 });
      k.som("aplauso", 0, { dur: 1 });
      return true;
    },
    queda(k, d) {
      k.moldura(d.alvo, "kt-sombra", { dur: 1400 });
      return false;
    },
  },

  // Laboratório: scanner, lasers, falhas no sistema e hologramas
  laboratorio: {
    inicio(k) {
      k.som("bip", 0.2);
    },
    duelo(k) {
      k.banner("A comparar dados…", { cls: "kt-terminal" });
      k.som("bip");
      return true;
    },
    golpe(k, d) {
      k.linha(d.de, d.alvo, { cls: "kt-laser", larg: 10, dur: 420 });
      k.moldura(d.alvo, "kt-glitch", { dur: 500, folga: 0 });
      if (d.critico) k.banner("Sobrecarga!", { alvo: d.alvo, cls: "kt-terminal" });
      k.som("laser");
      return true;
    },
    ko(k, d) {
      k.moldura(d.perdedor, "kt-glitch longo", { dur: 2200, folga: 0 });
      k.banner("Sistema desligado", { alvo: d.perdedor, cls: "kt-terminal kt-mau", dur: 2400 });
      k.som("gameover");
      return true;
    },
    acerto(k, d) {
      k.banner("✓ Correto", { alvo: d.alvo, cls: "kt-terminal" });
      k.som("bip");
      return true;
    },
    erro(k, d) {
      k.banner("Erro 404", { alvo: d.alvo, cls: "kt-terminal kt-mau" });
      k.moldura(d.alvo, "kt-glitch", { dur: 600, folga: 0 });
      k.som("falha");
      return true;
    },
    revelar(k, d) {
      k.moldura(d.alvo, "kt-scanner", { html: "<i></i>", dur: 1800, folga: 20 });
      k.som("bip");
      return false;
    },
    lider(k) {
      k.banner("Novo líder detetado", { cls: "kt-terminal", y: k.palco.A * 0.2 });
      k.som("bip");
      return true;
    },
    vencedor(k, d) {
      k.moldura(d.alvo, "kt-holograma", { html: "<i></i><i></i><i></i>", dur: 4200, folga: 60 });
      k.banner(`> vencedor: ${d.p?.name || ""}`, { y: k.palco.A * 0.16, cls: "kt-terminal", dur: 3600 });
      k.som("powerup");
      k.som("laser", 0.4);
      return true;
    },
    subida(k, d) {
      k.moldura(d.alvo, "kt-scanner", { html: "<i></i>", dur: 1400, folga: 20 });
      return false;
    },
    queda(k, d) {
      k.moldura(d.alvo, "kt-glitch", { dur: 700, folga: 0 });
      k.som("falha");
      return true;
    },
  },

  // Livro: correções a caneta vermelha, selos de cera, páginas e diplomas
  livro: {
    duelo(k) {
      k.banner("Capítulo I", { cls: "kt-tinta" });
      k.som("virar");
      return true;
    },
    golpe(k, d) {
      k.explosao(d.alvo, ["✒️", "📜", "<i class='kt-tinta-gota'></i>"], { n: 6, tam: 50 });
      k.som("virar");
      if (d.critico) k.carimbo(d.alvo, "Excelente", { cls: "kt-caneta" });
      return false;
    },
    ko(k, d) {
      k.banner("Fim", { cls: "kt-tinta kt-fim", dur: 2400, escala: 1.6 });
      k.som("virar");
      k.som("tambor", 0.3);
      return true;
    },
    acerto(k, d) {
      k.icone(d.alvo, `<i class="kt-visto">✓</i>`, { tam: 160, dur: 1400 });
      k.banner("Muito bem!", { alvo: d.alvo, cls: "kt-caneta-txt" });
      k.som("acerto");
      return true;
    },
    erro(k, d) {
      k.icone(d.alvo, `<i class="kt-visto mau">✗</i>`, { tam: 160, dur: 1400 });
      k.som("falha");
      return true;
    },
    revelar(k, d) {
      k.icone(d.alvo, `<b class="kt-selo">${d.pos}</b>`, { tam: 120, dur: 1800, dy: (k.ponto(d.alvo).h || 200) / 2 - 20 });
      k.som("virar");
      return false;
    },
    lider(k) {
      k.banner("Novo capítulo", { cls: "kt-tinta", y: k.palco.A * 0.2 });
      k.som("virar");
      return true;
    },
    vencedor(k, d) {
      k.icone(d.alvo, `<b class="kt-selo grande">1</b>`, { tam: 180, dur: 4200, dy: (k.ponto(d.alvo).h || 200) / 2 });
      k.banner("Diploma de honra", { y: k.palco.A * 0.16, cls: "kt-tinta", dur: 3200 });
      k.som("sino");
      k.som("aplauso", 0.5, { dur: 2 });
      return true;
    },
  },

  // Cozinha: estrelas de chef, picante, queimado e o chapéu de cozinheiro
  cozinha: {
    inicio(k) {
      k.som("fritar", 0.3);
    },
    duelo(k) {
      k.banner("Mãos à obra!", { cls: "kt-chef" });
      k.som("ding");
      return true;
    },
    golpe(k, d) {
      k.explosao(d.alvo, d.critico ? ["🌶️", "🔥"] : EMOJI.comida, { n: d.critico ? 12 : 6, tam: 56 });
      if (d.critico) k.banner("Picante! 🌶️", { alvo: d.alvo, cls: "kt-chef" });
      k.som(d.critico ? "fogo" : "fritar");
      return true;
    },
    ko(k, d) {
      k.explosao(d.perdedor, ["💨"], { n: 10, tam: 80, raio: 160 });
      k.banner("Queimou!", { alvo: d.perdedor, cls: "kt-chef kt-mau", dur: 2200 });
      k.som("fritar");
      k.som("ding", 0.8);
      return true;
    },
    acerto(k, d) {
      k.banner("Delicioso! ⭐⭐⭐", { alvo: d.alvo, cls: "kt-chef" });
      k.som("ding");
      return true;
    },
    erro(k, d) {
      k.explosao(d.alvo, ["💨"], { n: 6, tam: 64 });
      k.banner("Salgado demais", { alvo: d.alvo, cls: "kt-chef kt-mau" });
      k.som("falha");
      return true;
    },
    revelar(k, d) {
      k.icone(d.alvo, "⭐".repeat(Math.max(1, 4 - Math.min(3, d.pos))), { tam: 64, dur: 1600, dy: -((k.ponto(d.alvo).h || 200) / 2 + 20), cls: "kt-estrelas" });
      k.som("ding");
      return false;
    },
    lider(k) {
      k.banner("Prato do dia!", { cls: "kt-chef", y: k.palco.A * 0.2 });
      k.som("ding");
      return true;
    },
    vencedor(k, d) {
      k.icone(d.alvo, SVG.chapeu, { tam: 220, dur: 4200, dy: -((k.ponto(d.alvo).h || 200) / 2 + 70), entrada: "cai" });
      k.banner("Chef do mês!", { alvo: d.alvo, cls: "kt-chef", dur: 3000 });
      k.explosao(d.alvo, ["⭐", "🍰", "✨"], { n: 16, tam: 56, raio: 320 });
      k.som("ding");
      k.som("aplauso", 0.3, { dur: 2.5 });
      return true;
    },
  },

  // Estúdio (YouTube, rádio, podcast): gostos, sininho, no ar e a placa de ouro
  estudio: {
    inicio(k) {
      if (["podcast"].includes(k.palco.tema.id)) {
        const el = k.novo(`<i></i>No ar`, "kt-noar", { x: k.palco.L - (k.palco.vertical ? 170 : 210), y: k.palco.vertical ? 300 : 90 });
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "both" });
      }
    },
    duelo(k) {
      k.banner("Frente a frente", { cls: "kt-yt" });
      k.som("bip");
      return true;
    },
    golpe(k, d) {
      k.explosao(d.alvo, ["👍", "❤️", "🔔"], { n: d.critico ? 10 : 5, tam: 54 });
      if (d.critico) k.banner("+1 milhão", { alvo: d.alvo, cls: "kt-yt" });
      return false;
    },
    ko(k, d) {
      k.icone(d.perdedor, "👎", { tam: 180, dur: 2200 });
      k.banner("Fim de transmissão", { alvo: d.perdedor, cls: "kt-yt", dur: 2200 });
      return false;
    },
    acerto(k, d) {
      k.icone(d.alvo, "👍", { tam: 130, dur: 1300 });
      k.som("bolha");
      return false;
    },
    erro(k, d) {
      k.icone(d.alvo, "👎", { tam: 120, dur: 1300 });
      return false;
    },
    revelar(k, d) {
      k.icone(d.alvo, "🔔", { tam: 90, dur: 1500, dy: -((k.ponto(d.alvo).h || 200) / 2), cls: "kt-sino" });
      return false;
    },
    vencedor(k, d) {
      k.icone({ x: k.ponto(d.alvo).x + (k.palco.vertical ? 260 : 300), y: k.ponto(d.alvo).y }, SVG.placa, { tam: 240, dur: 4200, entrada: "sobe", cls: "kt-placa" });
      k.banner("Placa de ouro!", { y: k.palco.A * 0.16, cls: "kt-yt", dur: 3000 });
      k.som("sino");
      return false;
    },
  },

  // Natureza: folhas, peixes, patinhas e ondas
  natureza: {
    inicio(k) {
      k.som("onda", 0.3);
    },
    golpe(k, d) {
      k.explosao(d.alvo, EMOJI.natureza, { n: d.critico ? 10 : 5, tam: 52 });
      k.som("onda");
      return true;
    },
    ko(k, d) {
      k.banner("Apanhado!", { alvo: d.perdedor, cls: "kt-postal", dur: 2200 });
      k.icone(d.perdedor, "🎣", { tam: 160, entrada: "cai" });
      return false;
    },
    acerto(k, d) {
      k.banner("Boa pescaria!", { alvo: d.alvo, cls: "kt-postal" });
      k.explosao(d.alvo, ["🐟", "🌿", "✨"], { n: 8 });
      return false;
    },
    erro(k, d) {
      k.icone(d.alvo, "🌧️", { tam: 120 });
      return false;
    },
    revelar(k, d) {
      k.moldura(d.alvo, "kt-polaroid", { html: `<span>#${d.pos}</span>`, dur: 2000, folga: 24 });
      k.som("camara");
      return false;
    },
    vencedor(k, d) {
      k.icone(d.alvo, "🏆", { tam: 170, dur: 4000, dy: -((k.ponto(d.alvo).h || 200) / 2 + 80), entrada: "sobe" });
      k.subir(["🌿", "🦋", "🌸", "🐾"], { n: 26 });
      k.som("onda");
      k.som("aplauso", 0.4);
      return false;
    },
  },
};

const SONS_LEVES = new Set(["bolha", "tique", "bip", "moeda", "combo", "ding", "virar", "camara", "fofo", "clique", "brilho"]);

/** Kit de cada tema (os outros temas usam o kit do grupo mais parecido). */
const KIT_DO_TEMA = {
  rubi: "estudio",
  youtube: "estudio",
  podcast: "estudio",
  chroma: "estudio",
  estadio: "estadio",
  inferno: "coliseu",
  fitness: "coliseu",
  gaming: "arcada",
  neon: "arcada",
  reacts: "reacao",
  comedia: "reacao",
  shorts: "reacao",
  clips: "reacao",
  girly: "fofo",
  kids: "fofo",
  vlog: "viagem",
  verao: "viagem",
  pesca: "natureza",
  animais: "natureza",
  noticias: "noticias",
  politica: "noticias",
  business: "noticias",
  carros: "pista",
  motas: "pista",
  musica: "espetaculo",
  danca: "espetaculo",
  gala: "espetaculo",
  cinema: "espetaculo",
  tech: "laboratorio",
  programacao: "laboratorio",
  ciencia: "laboratorio",
  espaco: "laboratorio",
  gelo: "laboratorio",
  livros: "livro",
  historia: "livro",
  escola: "livro",
  tutorial: "livro",
  religiao: "livro",
  cozinha: "cozinha",
  casa: "cozinha",
};

export const NOME_DO_KIT = {
  estudio: "Estúdio: gostos, sininho e placa de ouro",
  estadio: "Futebol: golos, cartões, apito e taça",
  coliseu: "Coliseu: espadas, rugido do público e louros",
  arcada: "Arcada: combos, K.O. e recordes",
  reacao: "Reações: emojis, comentários e corações",
  fofo: "Fofo: corações, laços e tiara",
  viagem: "Viagem: polaroids, pins e carimbos",
  natureza: "Natureza: peixes, folhas e patinhas",
  noticias: "Notícias: última hora e primeira página",
  pista: "Pista: semáforos, ultrapassagens e bandeira de xadrez",
  espetaculo: "Espetáculo: holofotes, aplausos e estatueta",
  laboratorio: "Laboratório: scanner, lasers e hologramas",
  livro: "Livro: caneta vermelha, selos e diploma",
  cozinha: "Cozinha: estrelas de chef, picante e chapéu",
};

export function kitDoTema(id) {
  return KIT_DO_TEMA[id] || "estudio";
}

/** Cria o kit de um palco (ou null no modo "só cores"). */
export function criarKit(palco, completo) {
  if (!completo) return null;
  const id = kitDoTema(palco.tema.id);
  const def = KITS[id];
  let k = null;
  return {
    id,
    evento(nome, dados = {}) {
      // "ponto" é um acerto pequeno (muitos seguidos): mesmo desenho do acerto, só com sons leves
      const leve = nome === "ponto";
      const f = def[leve ? "acerto" : nome];
      if (!f || palco.terminado) return false;
      k ||= ferramentas(palco, id);
      const somNormal = k.som;
      if (leve) k.som = (n, at, op) => SONS_LEVES.has(n) && somNormal(n, at, op);
      try {
        const r = f(k, { ...dados, leve }) === true;
        return leve ? false : r;
      } catch (e) {
        console.error("kit", id, nome, e);
        return false;
      } finally {
        k.som = somNormal;
      }
    },
    limpar() {
      k?.limpar();
    },
  };
}
