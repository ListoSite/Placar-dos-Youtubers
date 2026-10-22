// Motor de som do Placar: todos os efeitos e músicas são gerados aqui (Web Audio),
// sem ficheiros de terceiros, por isso não há problemas de direitos de autor.

const CHAVE = "placar-som";
let ctx = null;
let mestre = null;
let busEfeitos = null;
let busMusica = null;
let reverb = null;
let atraso = null;
let ruidoBuf = null;
const ouvintes = new Set();

function ler() {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

function iniciarCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  mestre = ctx.createGain();
  mestre.gain.value = 0.9;
  mestre.connect(comp).connect(ctx.destination);
  busEfeitos = ctx.createGain();
  busEfeitos.gain.value = 0.8;
  busEfeitos.connect(mestre);
  busMusica = ctx.createGain();
  busMusica.gain.value = 0.42;
  busMusica.connect(mestre);

  // Ruído branco reutilizável
  ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = ruidoBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // Reverb (resposta de impulso gerada)
  reverb = ctx.createConvolver();
  const len = ctx.sampleRate * 2.4;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = ir.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  reverb.buffer = ir;
  const rvGain = ctx.createGain();
  rvGain.gain.value = 0.32;
  reverb.connect(rvGain).connect(mestre);

  // Eco
  atraso = ctx.createDelay(1);
  atraso.delayTime.value = 0.375;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const atGain = ctx.createGain();
  atGain.gain.value = 0.28;
  atraso.connect(fb).connect(atraso);
  atraso.connect(atGain).connect(mestre);
  return ctx;
}

function ruido(t, dur) {
  const s = ctx.createBufferSource();
  s.buffer = ruidoBuf;
  s.start(t, Math.random() * 1.5, dur + 0.05);
  return s;
}

function env(g, t, { a = 0.005, pico = 1, d = 0.2, sus = 0, r = 0.05, dur = 0 } = {}) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pico, t + a);
  if (dur) {
    g.gain.setTargetAtTime(Math.max(0.0001, pico * sus), t + a, d / 3);
    g.gain.setTargetAtTime(0.0001, t + a + dur, r / 3);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
}

function saida(no, { bus = busEfeitos, rev = 0, eco = 0 } = {}) {
  no.connect(bus);
  if (rev) {
    const g = ctx.createGain();
    g.gain.value = rev;
    no.connect(g).connect(reverb);
  }
  if (eco) {
    const g = ctx.createGain();
    g.gain.value = eco;
    no.connect(g).connect(atraso);
  }
}

const nota = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ---------- Instrumentos ----------
function bombo(t, { vol = 0.9, bus = busMusica } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
  env(g, t, { a: 0.002, pico: vol, d: 0.36 });
  o.connect(g);
  saida(g, { bus });
  o.start(t);
  o.stop(t + 0.45);
}

function tarola(t, { vol = 0.4, bus = busMusica, rev = 0.25 } = {}) {
  const n = ruido(t, 0.2);
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1400;
  const g = ctx.createGain();
  env(g, t, { a: 0.001, pico: vol, d: 0.16 });
  n.connect(f).connect(g);
  saida(g, { bus, rev });
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
  const g2 = ctx.createGain();
  env(g2, t, { a: 0.001, pico: vol * 0.6, d: 0.09 });
  o.connect(g2);
  saida(g2, { bus });
  o.start(t);
  o.stop(t + 0.15);
}

function prato(t, { vol = 0.12, aberto = false, bus = busMusica } = {}) {
  const n = ruido(t, aberto ? 0.4 : 0.06);
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 7500;
  const g = ctx.createGain();
  env(g, t, { a: 0.001, pico: vol, d: aberto ? 0.35 : 0.045 });
  n.connect(f).connect(g);
  saida(g, { bus });
}

function baixo(t, n, dur, { vol = 0.32, bus = busMusica } = {}) {
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = nota(n);
  const o2 = ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.value = nota(n - 12);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 6;
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(180, t + dur);
  const g = ctx.createGain();
  env(g, t, { a: 0.006, pico: vol, d: dur * 0.9 });
  o.connect(f);
  o2.connect(f);
  f.connect(g);
  saida(g, { bus });
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

function pad(t, notas, dur, { vol = 0.07, bus = busMusica, brilho = 1400 } = {}) {
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = brilho;
  f.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.6, dur * 0.4));
  g.gain.setTargetAtTime(0.0001, t + dur - 0.1, 0.25);
  f.connect(g);
  saida(g, { bus, rev: 0.6 });
  for (const n of notas) {
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = nota(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 1);
    }
  }
}

function pluck(t, n, { vol = 0.12, bus = busMusica, tipo = "triangle", dur = 0.35, eco = 0.35 } = {}) {
  const o = ctx.createOscillator();
  o.type = tipo;
  o.frequency.value = nota(n);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(5000, t);
  f.frequency.exponentialRampToValueAtTime(700, t + dur);
  const g = ctx.createGain();
  env(g, t, { a: 0.003, pico: vol, d: dur });
  o.connect(f).connect(g);
  saida(g, { bus, eco, rev: 0.2 });
  o.start(t);
  o.stop(t + dur + 0.05);
}

function sino(t, n, { vol = 0.16, bus = busEfeitos } = {}) {
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const mg = ctx.createGain();
  car.frequency.value = nota(n);
  mod.frequency.value = nota(n) * 3.5;
  mg.gain.setValueAtTime(nota(n) * 2.2, t);
  mg.gain.exponentialRampToValueAtTime(1, t + 1.2);
  mod.connect(mg).connect(car.frequency);
  const g = ctx.createGain();
  env(g, t, { a: 0.002, pico: vol, d: 1.4 });
  car.connect(g);
  saida(g, { bus, rev: 0.5 });
  car.start(t);
  mod.start(t);
  car.stop(t + 1.5);
  mod.stop(t + 1.5);
}

function metal(t, notas, dur, { vol = 0.13, bus = busEfeitos } = {}) {
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 2;
  f.frequency.setValueAtTime(500, t);
  f.frequency.linearRampToValueAtTime(3200, t + 0.12);
  f.frequency.setTargetAtTime(1500, t + 0.15, 0.3);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.setTargetAtTime(vol * 0.7, t + 0.1, 0.2);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.2);
  f.connect(g);
  saida(g, { bus, rev: 0.45 });
  for (const n of notas) {
    for (const det of [-6, 0, 6]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = nota(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 1);
    }
  }
}

function palmas(t, { vol = 0.3, bus = busMusica } = {}) {
  for (const [k, dt] of [[1, 0], [0.8, 0.011], [0.65, 0.022]]) {
    const n = ruido(t + dt, 0.14);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1350;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    env(g, t + dt, { a: 0.001, pico: vol * k, d: dt ? 0.03 : 0.13 });
    n.connect(f).connect(g);
    saida(g, { bus, rev: 0.2 });
  }
}

function tom(t, n, { vol = 0.7, bus = busMusica, dur = 0.6 } = {}) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(nota(n) * 1.7, t);
  o.frequency.exponentialRampToValueAtTime(nota(n), t + 0.09);
  const g = ctx.createGain();
  env(g, t, { a: 0.002, pico: vol, d: dur });
  o.connect(g);
  saida(g, { bus, rev: 0.35 });
  o.start(t);
  o.stop(t + dur + 0.05);
  const r = ruido(t, 0.08);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  const g2 = ctx.createGain();
  env(g2, t, { a: 0.001, pico: vol * 0.35, d: 0.07 });
  r.connect(f).connect(g2);
  saida(g2, { bus });
}

function marimba(t, n, { vol = 0.14, bus = busMusica, dur = 0.45 } = {}) {
  for (const [mult, k] of [[1, 1], [4, 0.22], [10, 0.05]]) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = nota(n) * mult;
    const g = ctx.createGain();
    env(g, t, { a: 0.002, pico: vol * k, d: dur / mult ** 0.3 });
    o.connect(g);
    saida(g, { bus, rev: 0.25, eco: mult === 1 ? 0.15 : 0 });
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

let curvaDist = null;
function curva() {
  if (!curvaDist) {
    curvaDist = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curvaDist[i] = Math.tanh(x * 7);
    }
  }
  return curvaDist;
}
function baixoDist(t, n, dur, { vol = 0.22, bus = busMusica } = {}) {
  curva();
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = nota(n);
  const o2 = ctx.createOscillator();
  o2.type = "square";
  o2.frequency.value = nota(n) * 1.005;
  const ws = ctx.createWaveShaper();
  ws.curve = curvaDist;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(2200, t);
  f.frequency.exponentialRampToValueAtTime(400, t + dur);
  const g = ctx.createGain();
  env(g, t, { a: 0.004, pico: vol, d: dur * 0.95 });
  o.connect(ws);
  o2.connect(ws);
  ws.connect(f).connect(g);
  saida(g, { bus });
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

function sub(t, n, dur, { vol = 0.4, bus = busMusica } = {}) {
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = nota(n);
  const g = ctx.createGain();
  env(g, t, { a: 0.02, pico: vol, d: dur });
  o.connect(g);
  saida(g, { bus });
  o.start(t);
  o.stop(t + dur + 0.05);
}

// ---------- Efeitos ----------
const EFEITOS = {
  clique(t) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(1800, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
    const g = ctx.createGain();
    env(g, t, { a: 0.001, pico: 0.12, d: 0.05 });
    o.connect(g);
    saida(g);
    o.start(t);
    o.stop(t + 0.08);
  },
  virar(t) {
    // Placa de placar a virar
    const n = ruido(t, 0.05);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2200 + Math.random() * 1600;
    f.Q.value = 3;
    const g = ctx.createGain();
    env(g, t, { a: 0.001, pico: 0.5, d: 0.035 });
    n.connect(f).connect(g);
    saida(g);
  },
  tique(t) {
    pluck(t, 96, { vol: 0.08, bus: busEfeitos, tipo: "square", dur: 0.05, eco: 0 });
  },
  whoosh(t, { dur = 0.6 } = {}) {
    const n = ruido(t, dur);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(4200, t + dur * 0.55);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.35, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g);
    saida(g, { rev: 0.3 });
  },
  subida(t, { dur = 2.4 } = {}) {
    // Suspense a crescer
    const n = ruido(t, dur);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    n.connect(f).connect(g);
    saida(g, { rev: 0.4 });
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(880, t + dur);
    const fo = ctx.createBiquadFilter();
    fo.type = "lowpass";
    fo.frequency.value = 1800;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.09, t + dur);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(fo).connect(g2);
    saida(g2);
    o.start(t);
    o.stop(t + dur + 0.1);
  },
  rufo(t, { dur = 2 } = {}) {
    let x = 0;
    while (x < dur) {
      const k = x / dur;
      tarola(t + x, { vol: 0.12 + 0.3 * k, bus: busEfeitos, rev: 0.1 });
      x += 0.075 - 0.035 * k;
    }
  },
  impacto(t) {
    bombo(t, { vol: 1, bus: busEfeitos });
    const n = ruido(t, 1.2);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(5000, t);
    f.frequency.exponentialRampToValueAtTime(200, t + 1);
    const g = ctx.createGain();
    env(g, t, { a: 0.002, pico: 0.38, d: 1.1 });
    n.connect(f).connect(g);
    saida(g, { rev: 0.6 });
    abaixarMusica(t, 1.4);
  },
  brilho(t) {
    [84, 88, 91, 96].forEach((n, i) => sino(t + i * 0.07, n, { vol: 0.08 }));
  },
  ponto(t) {
    pluck(t, 84, { vol: 0.12, bus: busEfeitos, tipo: "square", dur: 0.08, eco: 0.2 });
    pluck(t + 0.08, 91, { vol: 0.12, bus: busEfeitos, tipo: "square", dur: 0.14, eco: 0.2 });
  },
  revelar(t) {
    EFEITOS.whoosh(t, { dur: 0.45 });
    sino(t + 0.18, 79, { vol: 0.1 });
    sino(t + 0.18, 86, { vol: 0.07 });
  },
  vitoria(t) {
    abaixarMusica(t, 3);
    bombo(t, { vol: 1, bus: busEfeitos });
    prato(t, { vol: 0.25, aberto: true, bus: busEfeitos });
    metal(t, [60, 64, 67], 0.28);
    metal(t + 0.3, [62, 65, 69], 0.28);
    metal(t + 0.6, [64, 67, 72, 76], 1.8, { vol: 0.16 });
    [84, 88, 91, 96, 100].forEach((n, i) => sino(t + 0.6 + i * 0.09, n, { vol: 0.07 }));
  },
  falha(t) {
    pluck(t, 64, { vol: 0.14, bus: busEfeitos, tipo: "square", dur: 0.18, eco: 0 });
    pluck(t + 0.16, 58, { vol: 0.14, bus: busEfeitos, tipo: "square", dur: 0.4, eco: 0 });
  },
  acerto(t) {
    [72, 76, 79, 84].forEach((n, i) => pluck(t + i * 0.06, n, { vol: 0.11, bus: busEfeitos, tipo: "triangle", dur: 0.25, eco: 0.25 }));
  },
  fogo(t) {
    // Rugido grave e estalidos de lume
    const r = ruido(t, 1.4);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(180, t);
    f.frequency.linearRampToValueAtTime(900, t + 0.35);
    f.frequency.exponentialRampToValueAtTime(140, t + 1.4);
    const g = ctx.createGain();
    env(g, t, { a: 0.08, pico: 0.55, d: 1.3 });
    r.connect(f).connect(g);
    saida(g, { rev: 0.5 });
    for (let i = 0; i < 22; i++) {
      const tt = t + Math.random() * 1.1;
      const c = ruido(tt, 0.02);
      const fc = ctx.createBiquadFilter();
      fc.type = "highpass";
      fc.frequency.value = 2500 + Math.random() * 3000;
      const gc = ctx.createGain();
      env(gc, tt, { a: 0.001, pico: 0.12 + Math.random() * 0.2, d: 0.015 });
      c.connect(fc).connect(gc);
      saida(gc);
    }
    abaixarMusica(t, 1.2);
  },
  cristal(t) {
    [88, 91, 95, 98, 100, 103].forEach((n, i) => sino(t + i * 0.055 + Math.random() * 0.02, n, { vol: 0.06 }));
    const r = ruido(t, 1);
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 9000;
    const g = ctx.createGain();
    env(g, t, { a: 0.2, pico: 0.07, d: 0.8 });
    r.connect(f).connect(g);
    saida(g, { rev: 0.6 });
  },
  laser(t) {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(2400, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.32);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 3500;
    const g = ctx.createGain();
    env(g, t, { a: 0.002, pico: 0.14, d: 0.32 });
    o.connect(f).connect(g);
    saida(g, { eco: 0.45, rev: 0.2 });
    o.start(t);
    o.stop(t + 0.4);
    pad(t, [64, 71, 76], 0.9, { vol: 0.05, bus: busEfeitos, brilho: 4000 });
  },
  estrela(t) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(3600, t + 0.5);
    const g = ctx.createGain();
    env(g, t, { a: 0.05, pico: 0.09, d: 0.55 });
    o.connect(g);
    saida(g, { eco: 0.5, rev: 0.5 });
    o.start(t);
    o.stop(t + 0.6);
    sino(t + 0.45, 96, { vol: 0.08 });
    sino(t + 0.55, 103, { vol: 0.05 });
  },
  buzina(t) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.04);
    g.gain.setTargetAtTime(0.13, t + 0.1, 0.1);
    g.gain.setTargetAtTime(0.0001, t + 0.95, 0.08);
    f.connect(g);
    saida(g, { rev: 0.5 });
    for (const fr of [233, 293, 349]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(fr * 0.94, t);
      o.frequency.exponentialRampToValueAtTime(fr, t + 0.12);
      o.connect(f);
      o.start(t);
      o.stop(t + 1.3);
    }
  },
  multidao(t, { dur = 3, vol = 1, grave = false } = {}) {
    // Público a festejar: ruído filtrado com ondulação
    for (const [fr0, q, v0] of [[700, 0.7, 0.32], [1800, 0.9, 0.2], [3200, 1.2, 0.08]]) {
      const fr = grave ? fr0 * 0.55 : fr0;
      const v = v0 * vol;
      const r = ruido(t, dur);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = fr;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.35);
      g.gain.setTargetAtTime(v * 0.75, t + 0.6, 0.4);
      g.gain.setTargetAtTime(0.0001, t + dur - 0.6, 0.35);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5 + Math.random() * 3;
      const lg = ctx.createGain();
      lg.gain.value = v * 0.25;
      lfo.connect(lg).connect(g.gain);
      r.connect(f).connect(g);
      saida(g, { rev: 0.5 });
      lfo.start(t);
      lfo.stop(t + dur + 0.2);
    }
  },
  onda(t) {
    const r = ruido(t, 2);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.7);
    f.frequency.exponentialRampToValueAtTime(250, t + 1.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.95);
    r.connect(f).connect(g);
    saida(g, { rev: 0.4 });
    [79, 84, 88].forEach((n, i) => marimba(t + 0.5 + i * 0.09, n, { vol: 0.1, bus: busEfeitos }));
  },
  trovao(t) {
    const r = ruido(t, 2.6);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(1600, t);
    f.frequency.exponentialRampToValueAtTime(90, t + 2.4);
    const g = ctx.createGain();
    env(g, t, { a: 0.01, pico: 0.7, d: 2.4 });
    r.connect(f).connect(g);
    saida(g, { rev: 0.6 });
    bombo(t, { vol: 1, bus: busEfeitos });
    abaixarMusica(t, 2);
  },
  moeda(t) {
    pluck(t, 83, { vol: 0.1, bus: busEfeitos, tipo: "square", dur: 0.07, eco: 0 });
    pluck(t + 0.07, 88, { vol: 0.1, bus: busEfeitos, tipo: "square", dur: 0.3, eco: 0.2 });
  },
  golpe(t) {
    bombo(t, { vol: 1, bus: busEfeitos });
    const r = ruido(t, 0.18);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.15);
    const g = ctx.createGain();
    env(g, t, { a: 0.001, pico: 0.6, d: 0.16 });
    r.connect(f).connect(g);
    saida(g, { rev: 0.3 });
  },
  ko(t) {
    abaixarMusica(t, 3);
    EFEITOS.trovao(t);
    metal(t + 0.05, [36, 43, 48], 2.2, { vol: 0.16 });
    tom(t + 0.05, 33, { vol: 1, bus: busEfeitos, dur: 1.6 });
  },
  tambor(t) {
    tom(t, 38, { vol: 0.9, bus: busEfeitos, dur: 0.8 });
  },
  ding(t) {
    sino(t, 88, { vol: 0.2 });
    sino(t + 0.02, 100, { vol: 0.08 });
  },
  motor(t) {
    // Motor a acelerar: serra e quadrada distorcidas com o tom a subir
    const ws = ctx.createWaveShaper();
    ws.curve = curva();
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(600, t);
    f.frequency.linearRampToValueAtTime(2600, t + 0.9);
    f.frequency.exponentialRampToValueAtTime(500, t + 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.1);
    g.gain.setTargetAtTime(0.13, t + 0.9, 0.2);
    g.gain.setTargetAtTime(0.0001, t + 1.4, 0.15);
    ws.connect(f).connect(g);
    saida(g, { rev: 0.2 });
    const trem = ctx.createOscillator();
    trem.frequency.setValueAtTime(18, t);
    trem.frequency.linearRampToValueAtTime(46, t + 0.9);
    const tg = ctx.createGain();
    tg.gain.value = 0.06;
    trem.connect(tg).connect(g.gain);
    for (const [tipo, mult] of [["sawtooth", 1], ["square", 0.5]]) {
      const o = ctx.createOscillator();
      o.type = tipo;
      o.frequency.setValueAtTime(55 * mult, t);
      o.frequency.exponentialRampToValueAtTime(190 * mult, t + 0.9);
      o.frequency.exponentialRampToValueAtTime(120 * mult, t + 1.5);
      o.connect(ws);
      o.start(t);
      o.stop(t + 1.8);
    }
    trem.start(t);
    trem.stop(t + 1.8);
  },
  boing(t) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.6);
    const vib = ctx.createOscillator();
    vib.frequency.value = 22;
    const vg = ctx.createGain();
    vg.gain.value = 30;
    vib.connect(vg).connect(o.frequency);
    const g = ctx.createGain();
    env(g, t, { a: 0.005, pico: 0.3, d: 0.65 });
    o.connect(g);
    saida(g, { rev: 0.2 });
    o.start(t);
    vib.start(t);
    o.stop(t + 0.7);
    vib.stop(t + 0.7);
  },
  powerup(t) {
    [60, 64, 67, 72, 76, 79, 84, 88].forEach((n, i) => pluck(t + i * 0.045, n, { vol: 0.09, bus: busEfeitos, tipo: "square", dur: 0.08, eco: 0.1 }));
  },
  bip(t) {
    pluck(t, 91, { vol: 0.1, bus: busEfeitos, tipo: "sine", dur: 0.09, eco: 0.2 });
    pluck(t + 0.11, 96, { vol: 0.1, bus: busEfeitos, tipo: "sine", dur: 0.12, eco: 0.3 });
  },
  fritar(t) {
    const r = ruido(t, 1.3);
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 3500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.08);
    g.gain.setTargetAtTime(0.0001, t + 1, 0.15);
    r.connect(f).connect(g);
    saida(g);
  },
  sino(t) {
    sino(t, 84, { vol: 0.16 });
    sino(t + 0.25, 84, { vol: 0.12 });
  },

  // ---------- Sons dos temas completos ----------
  apito(t, { longo = false } = {}) {
    // Apito de árbitro: tom agudo com trilo (a bolinha a vibrar) e sopro
    const toques = longo ? [[0, 0.18], [0.26, 0.18], [0.52, 0.9]] : [[0, 0.32]];
    for (const [d, dur] of toques) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = 2650;
      const trilo = ctx.createOscillator();
      trilo.type = "square";
      trilo.frequency.value = 34;
      const tg = ctx.createGain();
      tg.gain.value = 140;
      trilo.connect(tg).connect(o.frequency);
      const g = ctx.createGain();
      env(g, t + d, { a: 0.01, pico: 0.16, d: 0.05, sus: 0.85, r: 0.06, dur });
      o.connect(g);
      const r = ruido(t + d, dur);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 2600;
      f.Q.value = 3;
      const gr = ctx.createGain();
      env(gr, t + d, { a: 0.01, pico: 0.05, d: 0.05, sus: 0.8, r: 0.05, dur });
      r.connect(f).connect(gr);
      saida(g, { rev: 0.25 });
      saida(gr, { rev: 0.2 });
      o.start(t + d);
      trilo.start(t + d);
      o.stop(t + d + dur + 0.15);
      trilo.stop(t + d + dur + 0.15);
    }
  },
  golo(t) {
    // A bola bate na rede e o estádio explode
    const r = ruido(t, 0.5);
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1800;
    const g = ctx.createGain();
    env(g, t, { a: 0.005, pico: 0.25, d: 0.45 });
    r.connect(f).connect(g);
    saida(g);
    bombo(t, { vol: 0.8, bus: busEfeitos });
    EFEITOS.multidao(t + 0.08, { dur: 4.2, vol: 1.5 });
    EFEITOS.buzina(t + 0.5);
    abaixarMusica(t, 3);
  },
  vaia(t) {
    // "Uuuuh" do público: ruído grave com formante a descer
    const r = ruido(t, 2.2);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(520, t);
    f.frequency.exponentialRampToValueAtTime(260, t + 2);
    f.Q.value = 2.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.35);
    g.gain.setTargetAtTime(0.0001, t + 1.6, 0.2);
    r.connect(f).connect(g);
    saida(g, { rev: 0.5 });
  },
  ooh(t) {
    // "Ooooh!" de espanto do público: formante a subir
    const r = ruido(t, 1.6);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(380, t);
    f.frequency.exponentialRampToValueAtTime(820, t + 0.9);
    f.Q.value = 2.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.42, t + 0.3);
    g.gain.setTargetAtTime(0.0001, t + 1.1, 0.18);
    r.connect(f).connect(g);
    saida(g, { rev: 0.55 });
  },
  espada(t) {
    // Lâmina a cortar o ar e a bater no metal
    const r = ruido(t, 0.3);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(7000, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + 0.22);
    f.Q.value = 1.4;
    const g = ctx.createGain();
    env(g, t, { a: 0.01, pico: 0.35, d: 0.25 });
    r.connect(f).connect(g);
    saida(g, { rev: 0.2 });
    metal(t + 0.16, [79, 86, 91], 0.9, { vol: 0.12 });
    bombo(t + 0.16, { vol: 0.5, bus: busEfeitos });
  },
  rugido(t) {
    // Rugido do coliseu: multidão grave e um tambor
    EFEITOS.multidao(t, { dur: 3.6, vol: 1.6, grave: true });
    tom(t, 31, { vol: 1, bus: busEfeitos, dur: 1.4 });
    tom(t + 0.3, 31, { vol: 0.8, bus: busEfeitos, dur: 1.2 });
  },
  camara(t) {
    // Obturador: dois cliques e o motor do flash
    for (const d of [0, 0.07]) {
      const r = ruido(t + d, 0.03);
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 2500;
      const g = ctx.createGain();
      env(g, t + d, { a: 0.001, pico: 0.5, d: 0.03 });
      r.connect(f).connect(g);
      saida(g, { rev: 0.1 });
    }
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(3000, t + 0.1);
    o.frequency.exponentialRampToValueAtTime(7000, t + 0.6);
    const g = ctx.createGain();
    env(g, t + 0.1, { a: 0.01, pico: 0.02, d: 0.5 });
    o.connect(g);
    saida(g);
    o.start(t + 0.1);
    o.stop(t + 0.7);
  },
  fofo(t) {
    // Brilhinho fofo: arpejo agudo de marimba e um sininho
    [84, 88, 91, 96].forEach((n, i) => marimba(t + i * 0.06, n, { vol: 0.11, bus: busEfeitos, dur: 0.3 }));
    sino(t + 0.26, 103, { vol: 0.07 });
  },
  bolha(t) {
    // "Pop" de notificação
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(1300, t + 0.08);
    const g = ctx.createGain();
    env(g, t, { a: 0.002, pico: 0.25, d: 0.12 });
    o.connect(g);
    saida(g, { rev: 0.15 });
    o.start(t);
    o.stop(t + 0.2);
  },
  pneu(t) {
    // Pneus a chiar na curva
    const r = ruido(t, 1.1);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(2400, t);
    f.frequency.linearRampToValueAtTime(1900, t + 1);
    f.Q.value = 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.6, t + 0.08);
    g.gain.setTargetAtTime(0.0001, t + 0.8, 0.12);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 13;
    const lg = ctx.createGain();
    lg.gain.value = 140;
    lfo.connect(lg).connect(f.frequency);
    r.connect(f).connect(g);
    saida(g, { rev: 0.2 });
    lfo.start(t);
    lfo.stop(t + 1.2);
  },
  urgente(t) {
    // Genérico de última hora: três golpes de metais e um tímpano
    [0, 0.16, 0.42].forEach((d, i) => {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 2200;
      const g = ctx.createGain();
      env(g, t + d, { a: 0.01, pico: 0.12, d: i === 2 ? 0.9 : 0.14 });
      f.connect(g);
      saida(g, { rev: 0.4 });
      for (const n of i === 2 ? [57, 61, 64, 69] : [57, 60, 64]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = nota(n);
        o.connect(f);
        o.start(t + d);
        o.stop(t + d + (i === 2 ? 1.1 : 0.2));
      }
    });
    tom(t + 0.42, 33, { vol: 0.9, bus: busEfeitos, dur: 1.1 });
  },
  gameover(t) {
    [72, 67, 64, 60, 55, 48].forEach((n, i) => pluck(t + i * 0.13, n, { vol: 0.1, bus: busEfeitos, tipo: "square", dur: 0.14, eco: 0.1 }));
  },
  combo(t) {
    [76, 83, 88].forEach((n, i) => pluck(t + i * 0.05, n, { vol: 0.09, bus: busEfeitos, tipo: "square", dur: 0.06, eco: 0.15 }));
  },
  aplauso(t, { dur = 2.5 } = {}) {
    // Palmas do público: muitos estalidos curtos ao acaso
    const n = Math.round(dur * 70);
    for (let i = 0; i < n; i++) {
      const d = Math.random() * dur * (0.6 + 0.4 * Math.random());
      const r = ruido(t + d, 0.02);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1200 + Math.random() * 1600;
      f.Q.value = 1.2;
      const g = ctx.createGain();
      env(g, t + d, { a: 0.001, pico: 0.05 + Math.random() * 0.05, d: 0.03 });
      r.connect(f).connect(g);
      saida(g, { rev: 0.3 });
    }
  },
};

function abaixarMusica(t, dur) {
  if (!busMusica) return;
  const g = busMusica.gain;
  const v = musica.volume;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(v * 0.35, t, 0.03);
  g.setTargetAtTime(v, t + dur, 0.4);
}

// ---------- Música ----------
// Cada estilo: tempo, acordes (notas MIDI) e padrões de 16 passos.
const ESTILOS = {
  tensao: {
    bpm: 98,
    acordes: [
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62],
      [52, 56, 59],
    ],
    baixo: "x.x.x.x.x.x.x.x.",
    bombo: "x.......x.......",
    tarola: "........x.......",
    prato: "..x...x...x...x.",
    arp: "x..x..x.x..x..x.",
    padVol: 0.06,
  },
  epico: {
    bpm: 120,
    acordes: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62],
    ],
    baixo: "x.xxx.xxx.xxx.xx",
    bombo: "x...x...x...x...",
    tarola: "....x.......x...",
    prato: "x.x.x.x.x.x.x.x.",
    arp: "xxxxxxxxxxxxxxxx",
    padVol: 0.07,
  },
  leve: {
    bpm: 92,
    acordes: [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
    ],
    baixo: "x.....x...x.....",
    bombo: "x.....x...x.....",
    tarola: "....x.......x...",
    prato: "x.xxx.x.x.xxx.x.",
    arp: "x...x.x...x.x...",
    padVol: 0.075,
  },

  // ---------- Música dos temas do Palco ----------
  verao_calmo: {
    bpm: 102,
    swing: 0.14,
    acordes: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
    baixo: "x..x..x...x..x..",
    bombo: "x.......x.......",
    palmas: "....x.......x...",
    prato: "..x...x...x...x.",
    arp: "x.xx.x.xx.x.x.x.",
    arpTipo: "marimba",
    padVol: 0.035,
    padBrilho: 2200,
  },
  verao_festa: {
    bpm: 120,
    acordes: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
    baixo: "..x...x...x...x.",
    bombo: "x...x...x...x...",
    palmas: "....x.......x...",
    prato: "..x...x...x...x.",
    pratoAberto: true,
    arp: "x.x.xx.x.x.xx.x.",
    arpTipo: "marimba",
    padVol: 0.045,
    padBrilho: 2400,
  },
  inferno_tensao: {
    bpm: 84,
    acordes: [[45, 48, 52], [41, 45, 48], [40, 44, 47], [45, 48, 52]],
    baixo: "x.......x.x.....",
    baixoTipo: "dist",
    baixoDur: 3,
    bombo: "x.......x.......",
    tom: "x.....x...x.....",
    tomNota: 33,
    arp: "x.......x.......",
    arpTipo: "sawtooth",
    arpOitava: 12,
    padVol: 0.08,
    padBrilho: 800,
  },
  inferno_fogo: {
    bpm: 150,
    acordes: [[45, 48, 52], [44, 48, 51], [41, 45, 48], [40, 44, 47]],
    baixo: "xxxxxxxxxxxxxxxx",
    baixoTipo: "dist",
    baixoDur: 0.9,
    bombo: "x.x.x.x.x.x.x.x.",
    bomboVol: 0.6,
    tarola: "....x.......x...",
    tarolaVol: 0.3,
    tom: "x..x..x.........",
    tomNota: 36,
    prato: "x...x...x...x...",
    arp: "x...x...x...x...",
    arpTipo: "sawtooth",
    arpOitava: 12,
    padVol: 0.06,
    padBrilho: 1000,
  },
  gelo_calmo: {
    bpm: 76,
    acordes: [[50, 57, 61, 64], [47, 54, 57, 62], [43, 50, 55, 59], [45, 52, 57, 61]],
    baixo: "x.......x.......",
    baixoTipo: "sub",
    bombo: "x...............",
    prato: "....x.......x...",
    arp: "x...x.x...x...x.",
    arpTipo: "sino",
    arpOitava: 24,
    padVol: 0.085,
    padBrilho: 2600,
  },
  gelo_epico: {
    bpm: 112,
    acordes: [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]],
    baixo: "x.x...x.x.x...x.",
    bombo: "x.....x.x.......",
    tarola: "....x.......x...",
    prato: "x.x.x.x.x.x.x.x.",
    arp: "x.x.x.x.x.x.x.x.",
    arpTipo: "sino",
    padVol: 0.07,
    padBrilho: 2400,
  },
  neon_calmo: {
    bpm: 96,
    acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    baixo: "x.x.x.x.x.x.x.x.",
    baixoOitava: true,
    baixoDur: 1,
    bombo: "x.......x.......",
    tarola: "....x.......x...",
    tarolaVol: 0.26,
    arp: "xxxxxxxxxxxxxxxx",
    arpTipo: "square",
    arpVol: 0.03,
    padVol: 0.07,
    padBrilho: 1800,
  },
  neon_corrida: {
    bpm: 124,
    acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    baixo: "x.xxx.xxx.xxx.xx",
    bombo: "x...x...x...x...",
    tarola: "....x.......x...",
    prato: "..x...x...x...x.",
    pratoAberto: true,
    arp: "xxxxxxxxxxxxxxxx",
    arpTipo: "sawtooth",
    arpVol: 0.035,
    padVol: 0.06,
    padBrilho: 2200,
  },
  espaco_calmo: {
    bpm: 70,
    acordes: [[48, 55, 62, 64], [45, 52, 59, 60], [41, 48, 55, 57], [43, 50, 57, 59]],
    baixo: "x...............",
    baixoTipo: "sub",
    baixoDur: 14,
    arp: "x.....x.....x...",
    arpTipo: "sino",
    arpOitava: 24,
    padVol: 0.1,
    padBrilho: 2000,
  },
  espaco_epico: {
    bpm: 100,
    acordes: [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]],
    baixo: "x.....x.....x...",
    baixoTipo: "sub",
    baixoDur: 5,
    bombo: "x.......x.......",
    tom: "x.....x.....x...",
    tomNota: 31,
    tarola: "....x.......x...",
    arp: "x..x..x..x..x..x",
    arpTipo: "sawtooth",
    arpVol: 0.04,
    padVol: 0.085,
    padBrilho: 1800,
  },
  gala_calmo: {
    bpm: 88,
    swing: 0.22,
    acordes: [[53, 57, 60, 64], [50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59]],
    baixo: "x...x...x...x...",
    baixoDur: 3,
    bombo: "x.....x.........",
    bomboVol: 0.45,
    prato: "x..xx..xx..xx..x",
    arp: "x..x..x.x..x..x.",
    arpTipo: "triangle",
    padVol: 0.06,
    padBrilho: 1700,
  },
  gala_epico: {
    bpm: 112,
    acordes: [[48, 52, 55, 60], [53, 57, 60, 65], [55, 59, 62, 67], [48, 52, 55, 60]],
    baixo: "x...x...x...x...",
    bombo: "x...x...x...x...",
    tom: "x...x...x.x.x...",
    tomNota: 36,
    tarola: "....x.......x...",
    prato: "x.x.x.x.x.x.x.x.",
    arp: "x.xx.xx.x.xx.xx.",
    arpTipo: "sawtooth",
    arpVol: 0.04,
    padVol: 0.08,
    padBrilho: 2600,
  },
  estadio_calmo: {
    bpm: 82,
    acordes: [[52, 55, 59], [48, 52, 55], [50, 53, 57], [52, 55, 59]],
    bombo: "x.x.....x.x.....",
    bomboVol: 0.9,
    palmas: "....x.......x...",
    palmasVol: 0.4,
    baixo: "x.......x.......",
    baixoDur: 4,
    padVol: 0.04,
  },
  cozinha_calmo: {
    bpm: 96,
    swing: 0.18,
    acordes: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]],
    baixo: "x..x....x..x....",
    bombo: "x.......x.......",
    bomboVol: 0.5,
    prato: "x.x.x.x.x.x.x.x.",
    arp: "x..x.x..x..x.x..",
    arpTipo: "marimba",
    padVol: 0.03,
    padBrilho: 2000,
  },
  cozinha_festa: {
    bpm: 116,
    swing: 0.12,
    acordes: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]],
    baixo: "x..x..x.x..x..x.",
    bombo: "x...x...x...x...",
    palmas: "....x.......x...",
    prato: "..x...x...x...x.",
    arp: "x.xx.xx.x.xx.xx.",
    arpTipo: "marimba",
    padVol: 0.035,
  },
  carros_tensao: {
    bpm: 100,
    acordes: [[40, 47, 52], [43, 50, 55], [45, 52, 57], [38, 45, 50]],
    baixo: "x...x...x...x...",
    baixoTipo: "dist",
    baixoDur: 2,
    bombo: "x.......x.......",
    tom: "......x.......x.",
    tomNota: 33,
    arp: "x.......x.......",
    arpTipo: "sawtooth",
    arpOitava: 12,
    padVol: 0.05,
    padBrilho: 900,
  },
  carros_corrida: {
    bpm: 140,
    acordes: [[40, 47, 52], [43, 50, 55], [45, 52, 57], [38, 45, 50]],
    baixo: "x.x.x.x.x.x.x.x.",
    baixoTipo: "dist",
    baixoDur: 1,
    bombo: "x...x.x.x...x.x.",
    tarola: "....x.......x...",
    tarolaVol: 0.3,
    prato: "x.x.x.x.x.x.x.x.",
    arp: "x...x...x...x...",
    arpTipo: "sawtooth",
    arpOitava: 12,
    padVol: 0.04,
    padBrilho: 1200,
  },
  gaming_calmo: {
    bpm: 112,
    acordes: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
    baixo: "x.x.x.x.x.x.x.x.",
    baixoOitava: true,
    baixoDur: 0.8,
    bombo: "x.......x.......",
    tarola: "....x.......x...",
    arp: "xxxxxxxxxxxxxxxx",
    arpTipo: "square",
    arpVol: 0.03,
    arpOitava: 24,
  },
  gaming_epico: {
    bpm: 150,
    acordes: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
    baixo: "x.x.x.x.x.x.x.x.",
    baixoOitava: true,
    baixoDur: 0.7,
    bombo: "x...x...x...x...",
    tarola: "....x.......x...",
    prato: "..x...x...x...x.",
    arp: "xxxxxxxxxxxxxxxx",
    arpTipo: "square",
    arpVol: 0.04,
    arpOitava: 24,
  },
  // Lo-fi: acordes de sétima, swing forte e bateria abafada (Podcast, Rádio, Livros)
  lofi_calmo: {
    bpm: 78,
    swing: 0.28,
    acordes: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 58, 62, 65]],
    baixo: "x.....x...x.....",
    baixoTipo: "sub",
    baixoDur: 3,
    bombo: "x......x..x.....",
    bomboVol: 0.55,
    tarola: "....x.......x...",
    tarolaVol: 0.35,
    prato: "x.x.x.x.x.x.x.x.",
    arp: "x...x..x....x...",
    arpTipo: "sino",
    arpVol: 0.05,
    padVol: 0.055,
    padBrilho: 1100,
  },
  lofi_epico: {
    bpm: 92,
    swing: 0.24,
    acordes: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 58, 62, 65]],
    baixo: "x..x..x...x.x...",
    baixoTipo: "sub",
    baixoDur: 2,
    bombo: "x......x..x.....",
    tarola: "....x.......x...",
    palmas: "....x.......x...",
    palmasVol: 0.3,
    prato: "x.xxx.x.x.xxx.x.",
    arp: "x.x..x.xx.x..x.x",
    arpTipo: "marimba",
    padVol: 0.06,
    padBrilho: 1400,
  },
  // Notícias: pulsar de relógio, tons graves e sino de genérico de telejornal
  noticias_calmo: {
    bpm: 112,
    acordes: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 56]],
    baixo: "x.x.x.x.x.x.x.x.",
    baixoTipo: "sub",
    baixoDur: 0.8,
    tom: "x.......x.....x.",
    tomNota: 33,
    prato: "xxxxxxxxxxxxxxxx",
    arp: "x...............",
    arpTipo: "sino",
    arpOitava: 12,
    arpVol: 0.06,
    padVol: 0.05,
    padBrilho: 1800,
  },
  noticias_epico: {
    bpm: 124,
    acordes: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 56]],
    baixo: "x.xxx.xxx.xxx.xx",
    baixoTipo: "sub",
    baixoDur: 0.8,
    bombo: "x...x...x...x...",
    tom: "x..x..x.x..x..x.",
    tomNota: 33,
    tarola: "....x.......x...",
    prato: "xxxxxxxxxxxxxxxx",
    arp: "x.x.x...x.x.x...",
    arpTipo: "sino",
    arpOitava: 12,
    arpVol: 0.05,
    padVol: 0.07,
    padBrilho: 2600,
  },
  tech_calmo: {
    bpm: 100,
    acordes: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]],
    baixo: "x.......x.......",
    baixoTipo: "sub",
    baixoDur: 6,
    bombo: "x.......x.......",
    prato: "..x...x...x...x.",
    arp: "x..x....x..x....",
    arpTipo: "sino",
    padVol: 0.05,
    padBrilho: 2400,
  },
  tech_epico: {
    bpm: 126,
    acordes: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]],
    baixo: "x.xxx.xxx.xxx.xx",
    bombo: "x...x...x...x...",
    tarola: "....x.......x...",
    prato: "..x...x...x...x.",
    pratoAberto: true,
    arp: "x.x.x.x.x.x.x.x.",
    arpTipo: "sawtooth",
    arpVol: 0.035,
    padVol: 0.05,
    padBrilho: 2200,
  },
  comedia_leve: {
    bpm: 122,
    acordes: [[60, 64, 67], [53, 57, 60], [55, 59, 62], [60, 64, 67]],
    baixo: "x...x...x...x...",
    baixoOitava: true,
    baixoDur: 1.2,
    bombo: "x.......x.......",
    tarola: "....x.......x...",
    arp: "..x...x...x...x.",
    arpTipo: "marimba",
    arpOitava: 12,
  },
  comedia_festa: {
    bpm: 140,
    acordes: [[60, 64, 67], [53, 57, 60], [55, 59, 62], [60, 64, 67]],
    baixo: "x...x...x...x...",
    baixoOitava: true,
    baixoDur: 1,
    bombo: "x...x...x...x...",
    palmas: "....x.......x...",
    prato: "..x...x...x...x.",
    arp: "x.x.x.x.x.x.x.x.",
    arpTipo: "marimba",
    arpOitava: 12,
  },
  musica_calmo: {
    bpm: 100,
    acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    baixo: "x..x..x...x.....",
    bombo: "x.......x.......",
    palmas: "....x.......x...",
    prato: "x.x.x.x.x.x.x.x.",
    arp: "x..x..x.x..x..x.",
    arpTipo: "triangle",
    padVol: 0.07,
  },
  musica_festa: {
    bpm: 124,
    acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    baixo: "..x...x...x...x.",
    bombo: "x...x...x...x...",
    bomboVol: 0.85,
    palmas: "....x.......x...",
    prato: "..x...x...x...x.",
    pratoAberto: true,
    arp: "xxxxxxxxxxxxxxxx",
    arpTipo: "sawtooth",
    arpVol: 0.03,
    padVol: 0.07,
    padBrilho: 2200,
  },
  estadio_epico: {
    bpm: 128,
    acordes: [[52, 55, 59], [48, 52, 55], [50, 53, 57], [55, 59, 62]],
    baixo: "x.x.x.x.x.x.x.x.",
    bombo: "x...x...x...x...",
    palmas: "....x.......x...",
    tarola: "....x.......x...",
    prato: "..x...x...x...x.",
    pratoAberto: true,
    arp: "x.x.x.x.x.x.x.x.",
    arpTipo: "square",
    arpVol: 0.035,
    padVol: 0.05,
  },
};

const musica = {
  volume: 0.42,
  estilo: null,
  passo: 0,
  proxima: 0,
  timer: null,
  intensidade: 1,
  iniciar(nome = "tensao") {
    if (!som.ligado || !iniciarCtx()) return;
    if (this.estilo === nome && this.timer) return;
    this.parar(0);
    this.estilo = nome;
    this.passo = 0;
    this.proxima = ctx.currentTime + 0.08;
    busMusica.gain.cancelScheduledValues(ctx.currentTime);
    busMusica.gain.setValueAtTime(0.0001, ctx.currentTime);
    busMusica.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 1.2);
    this.timer = setInterval(() => this.agendar(), 25);
  },
  agendar() {
    const e = ESTILOS[this.estilo];
    if (!e) return;
    const dur16 = 60 / e.bpm / 4;
    while (this.proxima < ctx.currentTime + 0.12) {
      const t = this.proxima;
      const p = this.passo % 16;
      const compasso = Math.floor(this.passo / 16);
      const acorde = e.acordes[compasso % e.acordes.length];
      const forte = this.intensidade >= 1;
      const tt = t + (p % 2 === 1 ? (e.swing || 0) * dur16 : 0);
      const tem = (padrao) => padrao && padrao[p] === "x";
      if (p === 0 && e.padVol) pad(t, acorde.map((n) => n + 12), dur16 * 16, { vol: e.padVol, brilho: e.padBrilho || 1400 });
      if (tem(e.baixo)) {
        const nb = acorde[0] - 12 + (e.baixoOitava && p % 4 === 2 ? 12 : 0);
        if (e.baixoTipo === "dist") baixoDist(tt, nb, dur16 * (e.baixoDur || 1.6));
        else if (e.baixoTipo === "sub") sub(tt, nb - 12, dur16 * (e.baixoDur || 6));
        else baixo(tt, nb, dur16 * (e.baixoDur || 1.6));
      }
      if (forte && tem(e.bombo)) bombo(t, { vol: e.bomboVol || 0.7 });
      if (forte && tem(e.tarola)) tarola(t, { vol: e.tarolaVol || 0.22 });
      if (forte && tem(e.palmas)) palmas(t, { vol: e.palmasVol || 0.26 });
      if (forte && tem(e.tom)) tom(tt, e.tomNota || 40, { vol: e.tomVol || 0.55 });
      if (tem(e.prato)) prato(tt, { vol: p % 4 === 2 ? 0.07 : 0.045, aberto: e.pratoAberto && p % 4 === 2 });
      const arpNota = (i) => acorde[i % acorde.length] + (e.arpOitava ?? 24);
      const tocarArp = (n, dur, vol) => {
        if (e.arpTipo === "sino") sino(tt, n, { vol: vol * 1.6, bus: busMusica });
        else if (e.arpTipo === "marimba") marimba(tt, n, { vol: vol * 2.6 });
        else pluck(tt, n, { vol, dur, eco: 0.3, tipo: e.arpTipo || "triangle" });
      };
      const arpVol = e.arpVol || 0.05;
      if (this.intensidade >= 2 && tem(e.arp)) tocarArp(arpNota(p + compasso), dur16 * 1.5, arpVol);
      else if (this.intensidade >= 1 && tem(e.arp) && p % 2 === 0) tocarArp(arpNota(p / 2), dur16 * 2, arpVol * 0.9);
      this.proxima += dur16;
      this.passo++;
    }
  },
  definirIntensidade(n) {
    this.intensidade = n;
  },
  parar(fade = 0.8) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (ctx && busMusica) {
      const t = ctx.currentTime;
      busMusica.gain.cancelScheduledValues(t);
      busMusica.gain.setValueAtTime(busMusica.gain.value, t);
      busMusica.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.01, fade));
    }
    this.estilo = null;
  },
};

let destinoGravacao = null;

export const som = {
  ligado: ler(),
  musica,
  /** Fluxo de áudio do site, para juntar a uma gravação de vídeo. */
  fluxoGravacao() {
    if (!iniciarCtx()) return null;
    if (!destinoGravacao) {
      destinoGravacao = ctx.createMediaStreamDestination();
      mestre.connect(destinoGravacao);
    }
    if (ctx.state === "suspended") ctx.resume();
    return destinoGravacao.stream;
  },
  alternar() {
    this.definir(!this.ligado);
  },
  definir(v) {
    this.ligado = Boolean(v);
    try {
      localStorage.setItem(CHAVE, this.ligado ? "1" : "0");
    } catch {
      /* sem armazenamento */
    }
    if (this.ligado) this.desbloquear();
    else musica.parar(0.3);
    ouvintes.forEach((f) => f(this.ligado));
  },
  aoMudar(f) {
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  },
  desbloquear() {
    if (!iniciarCtx()) return;
    if (ctx.state === "suspended") ctx.resume();
  },
  tocar(nome, opcoes = {}, atrasoSeg = 0) {
    if (!this.ligado || !iniciarCtx()) return;
    if (ctx.state === "suspended") ctx.resume();
    const f = EFEITOS[nome];
    if (f) f(ctx.currentTime + 0.01 + atrasoSeg, opcoes);
  },
};
