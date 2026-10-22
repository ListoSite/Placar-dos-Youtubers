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
      if (p === 0) pad(t, acorde.map((n) => n + 12), dur16 * 16, { vol: e.padVol });
      if (e.baixo[p] === "x") baixo(t, acorde[0] - 12, dur16 * 1.6);
      if (forte && e.bombo[p] === "x") bombo(t, { vol: 0.7 });
      if (forte && e.tarola[p] === "x") tarola(t, { vol: 0.22 });
      if (e.prato[p] === "x") prato(t, { vol: p % 4 === 2 ? 0.07 : 0.045 });
      if (this.intensidade >= 2 && e.arp[p] === "x") {
        const n = acorde[(p + compasso) % acorde.length] + 24;
        pluck(t, n, { vol: 0.05, dur: dur16 * 1.5, eco: 0.3 });
      } else if (this.intensidade >= 1 && e.arp[p] === "x" && p % 2 === 0) {
        const n = acorde[(p / 2) % acorde.length] + 24;
        pluck(t, n, { vol: 0.045, dur: dur16 * 2, eco: 0.3 });
      }
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

export const som = {
  ligado: ler(),
  musica,
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
