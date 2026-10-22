// Partículas do Palco (canvas): ambiente de cada tema e explosões de festa.

import { ICONES } from "./temas-gerados.js";

const calmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const aleat = (a, b) => a + Math.random() * (b - a);
const escolher = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Imagem de um ponto com brilho, desenhada uma vez por cor (muito mais rápido do que shadowBlur). */
const sprites = new Map();
function brilho(cor, raio = 32) {
  const chave = cor + raio;
  if (sprites.has(chave)) return sprites.get(chave);
  const c = document.createElement("canvas");
  c.width = c.height = raio * 2;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(raio, raio, 0, raio, raio, raio);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.18, cor);
  grad.addColorStop(0.45, cor + "88");
  grad.addColorStop(1, cor + "00");
  g.fillStyle = grad;
  g.fillRect(0, 0, raio * 2, raio * 2);
  sprites.set(chave, c);
  return c;
}
function estrelaSprite(cor) {
  const chave = "estrela" + cor;
  if (sprites.has(chave)) return sprites.get(chave);
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.translate(32, 32);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 30);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.3, cor);
  grad.addColorStop(1, cor + "00");
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 5 : 30;
    const a = (i * Math.PI) / 4;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  sprites.set(chave, c);
  return c;
}

/** Caminho (Path2D) de cada ícone, criado uma vez. */
const caminhos = new Map();
function caminho(nome) {
  if (!caminhos.has(nome)) caminhos.set(nome, new Path2D((ICONES[nome] || ICONES.estrela).d));
  return caminhos.get(nome);
}
function desenharIcone(g, nome, x, y, r, rot, cor) {
  const i = ICONES[nome] || ICONES.estrela;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(r / 12, r / 12);
  g.translate(-12, -12);
  if (i.traco) {
    g.strokeStyle = cor;
    g.lineWidth = 1.8;
    g.stroke(caminho(nome));
  } else {
    g.fillStyle = cor;
    g.fill(caminho(nome), i.par ? "evenodd" : "nonzero");
  }
  g.restore();
}

export class Ambiente {
  constructor(canvas, palco, tema) {
    this.c = canvas;
    this.g = canvas.getContext("2d");
    this.palco = palco;
    this.tema = tema;
    this.W = canvas.width = palco.L;
    this.H = canvas.height = palco.A;
    this.fundo = [];
    this.festa = [];
    this.raios = [];
    this.fator = calmo() ? 0.25 : 1;
    this.criarFundo();
    this.ultimo = performance.now();
    this.loop = (t) => {
      if (this.palco.terminado) return;
      const dt = Math.min(0.05, (t - this.ultimo) / 1000);
      this.ultimo = t;
      if (!this.palco.pausado) this.atualizar(dt);
      this.desenhar();
      requestAnimationFrame(this.loop);
    };
    requestAnimationFrame(this.loop);
  }

  // ---------- Ambiente ----------
  criarFundo() {
    const { W, H } = this;
    const tipo = this.tema.particulas;
    const n = Math.round(({ poeira: 55, bolhas: 42, brasas: 130, neve: 170, neon: 46, estrelas: 260, brilhos: 90, flashes: 0, vapor: 26, velocidade: 40, pixels: 60, codigo: 90, notas: 34, pop: 40, icones: 26 }[tipo] || 0) * this.fator);
    for (let i = 0; i < n; i++) this.fundo.push(this.novaFundo(tipo, true));
    this.proximoRaio = 2.5;
  }
  novaFundo(tipo, inicio = false) {
    const { W, H } = this;
    const cores = this.tema.cores;
    const p = { tipo, x: aleat(0, W), y: inicio ? aleat(0, H) : 0, vida: 0, fase: aleat(0, 6.28) };
    if (tipo === "poeira") Object.assign(p, { y: inicio ? p.y : H + 20, r: aleat(1.5, 4), vy: -aleat(8, 26), vx: aleat(-6, 6), a: aleat(0.15, 0.45), cor: escolher(["#ffb3c6", "#f4b942", "#ffffff"]) });
    if (tipo === "bolhas") Object.assign(p, { y: inicio ? p.y : H + 60, r: aleat(8, 46), vy: -aleat(10, 34), vx: aleat(-10, 10), a: aleat(0.06, 0.2), cor: escolher(["#ffc857", "#ff7a59", "#19b6c9", "#ffffff"]) });
    if (tipo === "brasas") Object.assign(p, { y: inicio ? p.y : H + 10, r: aleat(2, 6), vy: -aleat(90, 260), vx: aleat(-30, 30), a: aleat(0.5, 1), cor: escolher(["#ffb300", "#ff6d00", "#ff3d00", "#ffe082"]) });
    if (tipo === "neve") {
      const z = aleat(0.3, 1);
      Object.assign(p, { y: inicio ? p.y : -10, r: 1.5 + z * 4, vy: 30 + z * 90, vx: aleat(-10, 10), a: 0.35 + z * 0.55, cor: "#ffffff", z });
    }
    if (tipo === "neon") Object.assign(p, { y: inicio ? p.y : H + 20, r: aleat(3, 8), vy: -aleat(14, 40), vx: 0, a: aleat(0.3, 0.8), cor: escolher(["#ff2bd6", "#00e5ff", "#b26bff"]), forma: Math.random() < 0.5 ? "mais" : "quadrado" });
    if (tipo === "estrelas") Object.assign(p, { r: Math.random() < 0.08 ? aleat(2.5, 4) : aleat(0.6, 2), a: aleat(0.3, 1), cor: escolher(["#ffffff", "#ffffff", "#b9a8ff", "#9be7ff"]), vx: -aleat(2, 10), vy: 0 });
    if (tipo === "brilhos") Object.assign(p, { y: inicio ? p.y : -20, r: aleat(6, 16), vy: aleat(12, 40), vx: aleat(-8, 8), a: 0, cor: escolher(["#f7d774", "#fff3c4", "#e8b84a"]) });
    if (tipo === "vapor") Object.assign(p, { y: inicio ? aleat(H * 0.4, H) : H + 60, r: aleat(50, 120), vy: -aleat(30, 70), vx: aleat(-12, 12), a: aleat(0.05, 0.12), cor: "#ffffff", cresce: aleat(8, 20) });
    if (tipo === "velocidade") Object.assign(p, { x: inicio ? p.x : W + aleat(0, 400), y: aleat(0, H), comp: aleat(80, 360), vy: 0, vx: -aleat(1400, 3200), a: aleat(0.12, 0.35), cor: Math.random() < 0.2 ? "#ff2a2a" : "#ffffff", r: aleat(1.5, 3.5) });
    if (tipo === "pixels") Object.assign(p, { y: inicio ? p.y : H + 20, r: escolher([6, 8, 10, 14]), vy: -aleat(20, 60), vx: 0, a: aleat(0.35, 0.8), cor: escolher(cores) });
    if (tipo === "codigo") Object.assign(p, { y: inicio ? p.y : -30, r: aleat(16, 30), vy: aleat(70, 200), vx: 0, a: aleat(0.12, 0.45), cor: escolher(["#00e0b0", "#3d8bff", "#9bffea"]), ch: escolher(["0", "1", "0", "1", "<", ">", "/", "{", "}", ";"]) });
    if (tipo === "notas") Object.assign(p, { y: inicio ? p.y : H + 40, r: aleat(28, 64), vy: -aleat(30, 80), vx: aleat(-10, 10), a: aleat(0.25, 0.6), cor: escolher(cores), ch: escolher(["♪", "♫", "♩", "♬"]), rot: aleat(-0.4, 0.4) });
    if (tipo === "pop") Object.assign(p, { y: inicio ? p.y : H + 60, r: aleat(10, 40), vy: -aleat(20, 50), vx: aleat(-10, 10), a: aleat(0.12, 0.3), cor: escolher(["#ff2e63", "#2ec4ff", "#ffffff", "#ff9f1c"]) });
    if (tipo === "icones") {
      const z = aleat(0.35, 1);
      Object.assign(p, { y: inicio ? p.y : H + 80, r: 14 + z * 34, vy: -(18 + z * 46), vx: aleat(-8, 8), a: 0.08 + z * 0.22, cor: escolher(cores.slice(0, 3)), ic: escolher(this.tema.icones || ["estrela"]), rot: aleat(-0.5, 0.5), vrot: aleat(-0.4, 0.4) });
    }
    return p;
  }
  atualizarFundo(dt) {
    const { W, H } = this;
    for (let i = 0; i < this.fundo.length; i++) {
      const p = this.fundo[i];
      p.vida += dt;
      p.x += p.vx * dt + (p.tipo === "neve" || p.tipo === "brasas" || p.tipo === "notas" || p.tipo === "icones" ? Math.sin(p.vida * 1.6 + p.fase) * (p.tipo === "brasas" ? 40 : 18) * dt : 0);
      if (p.cresce) p.r += p.cresce * dt;
      if (p.vrot) p.rot += p.vrot * dt;
      p.y += p.vy * dt;
      if (p.tipo === "estrelas") {
        if (p.x < -10) p.x = W + 10;
        continue;
      }
      const fora = p.y < -160 || p.y > H + 160 || p.x < -420 || p.x > W + 420 || (p.tipo === "vapor" && p.vida > 9);
      if (fora) this.fundo[i] = this.novaFundo(p.tipo);
    }
    // Estrelas cadentes e flashes da bancada
    if (this.tema.particulas === "estrelas") {
      this.proximoRaio -= dt;
      if (this.proximoRaio <= 0) {
        this.proximoRaio = aleat(2.5, 6);
        this.raios.push({ x: aleat(W * 0.2, W * 1.1), y: aleat(-50, H * 0.4), vx: -aleat(900, 1400), vy: aleat(300, 600), vida: 0, dur: 0.9 });
      }
    }
    if (this.tema.particulas === "flashes" && Math.random() < 14 * dt * this.fator) {
      this.raios.push({ flash: true, x: aleat(0, W), y: aleat(H * 0.7, H), vida: 0, dur: aleat(0.08, 0.2), r: aleat(4, 10) });
    }
    for (const r of this.raios) {
      r.vida += dt;
      if (!r.flash) {
        r.x += r.vx * dt;
        r.y += r.vy * dt;
      }
    }
    this.raios = this.raios.filter((r) => r.vida < r.dur);
  }

  // ---------- Festa ----------
  /** Explosão de partículas no ponto (x, y) da tela. */
  explodir(x, y, { n = 120, estilo = this.tema.festa, forca = 1 } = {}) {
    n = Math.round(n * (calmo() ? 0.3 : 1));
    const cores = this.tema.cores;
    for (let i = 0; i < n; i++) {
      const ang = aleat(0, Math.PI * 2);
      const vel = aleat(250, 1100) * forca;
      const p = { x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - aleat(150, 500) * forca, vida: 0, dur: aleat(1.4, 3), cor: escolher(cores), rot: aleat(0, 6.28), vr: aleat(-12, 12), estilo };
      if (estilo === "confetes" || estilo === "ouro") Object.assign(p, { w: aleat(10, 22), h: aleat(6, 12), g: 900, ar: 1.6 });
      if (estilo === "faiscas") Object.assign(p, { r: aleat(2, 5), g: 700, ar: 1.2, dur: aleat(0.8, 1.8) });
      if (estilo === "neve") Object.assign(p, { r: aleat(3, 8), g: 120, ar: 2.4, cor: escolher(["#ffffff", "#e6f7ff", "#9be7ff"]) });
      if (estilo === "neon") Object.assign(p, { r: aleat(3, 7), g: 300, ar: 1.8 });
      if (estilo === "estrelas") Object.assign(p, { r: aleat(14, 34), g: 150, ar: 2 });
      if (estilo === "pixels") Object.assign(p, { r: escolher([8, 12, 16]), g: 900, ar: 1.4, vr: 0 });
      if (estilo === "icones") this.comoIcone(p);
      this.festa.push(p);
    }
  }
  /** Chuva de confetes a cair do topo. */
  chuva({ n = 160, estilo = this.tema.festa } = {}) {
    n = Math.round(n * (calmo() ? 0.3 : 1));
    for (let i = 0; i < n; i++) {
      const p = { x: aleat(0, this.W), y: aleat(-this.H * 0.6, -20), vx: aleat(-80, 80), vy: aleat(150, 420), vida: 0, dur: aleat(3.5, 6), cor: escolher(this.tema.cores), rot: aleat(0, 6.28), vr: aleat(-8, 8), estilo, g: 120, ar: 0.6 };
      if (estilo === "confetes" || estilo === "ouro") Object.assign(p, { w: aleat(12, 24), h: aleat(7, 12) });
      else if (estilo === "icones") {
        this.comoIcone(p);
        p.vr = aleat(-3, 3);
      } else Object.assign(p, { r: estilo === "estrelas" ? aleat(12, 26) : aleat(3, 7) });
      this.festa.push(p);
    }
  }
  /** Festa dos temas gerados: metade ícones do tema, metade confetes. */
  comoIcone(p) {
    if (Math.random() < 0.45) Object.assign(p, { ic: escolher(this.tema.icones || ["estrela"]), r: aleat(16, 38), g: p.g ?? 700, ar: p.ar ?? 1.5, vr: aleat(-5, 5) });
    else Object.assign(p, { estilo: "confetes", w: aleat(10, 22), h: aleat(6, 12), g: p.g ?? 900, ar: p.ar ?? 1.6 });
  }
  atualizarFesta(dt) {
    for (const p of this.festa) {
      p.vida += dt;
      p.vy += (p.g || 600) * dt;
      p.vx *= 1 - (p.ar || 1) * dt;
      p.vy *= 1 - (p.ar || 1) * dt * 0.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.festa = this.festa.filter((p) => p.vida < p.dur && p.y < this.H + 80);
  }

  atualizar(dt) {
    this.atualizarFundo(dt);
    this.atualizarFesta(dt);
  }

  // ---------- Desenho ----------
  desenhar() {
    const { g, W, H } = this;
    g.clearRect(0, 0, W, H);
    const t = performance.now() / 1000;
    for (const p of this.fundo) {
      if (p.tipo === "estrelas") {
        g.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(t * 2 + p.fase));
        g.fillStyle = p.cor;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, 6.283);
        g.fill();
        continue;
      }
      if (p.tipo === "vapor") {
        g.globalAlpha = p.a * Math.min(1, p.vida / 1.5) * Math.max(0, 1 - p.vida / 9);
        g.drawImage(brilho("#ffffff", 64), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        continue;
      }
      if (p.tipo === "velocidade") {
        g.globalAlpha = p.a;
        g.strokeStyle = p.cor;
        g.lineWidth = p.r;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x + p.comp, p.y);
        g.stroke();
        continue;
      }
      if (p.tipo === "pixels") {
        g.globalAlpha = p.a * (Math.sin(t * 4 + p.fase) > -0.6 ? 1 : 0.3);
        g.fillStyle = p.cor;
        g.fillRect(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4, p.r, p.r);
        continue;
      }
      if (p.tipo === "icones") {
        g.globalAlpha = p.a;
        desenharIcone(g, p.ic, p.x, p.y, p.r, p.rot, p.cor);
        continue;
      }
      if (p.tipo === "codigo" || p.tipo === "notas") {
        g.globalAlpha = p.a;
        g.fillStyle = p.cor;
        g.font = `${p.tipo === "codigo" ? "700" : "400"} ${Math.round(p.r)}px ${p.tipo === "codigo" ? "ui-monospace, monospace" : "system-ui, sans-serif"}`;
        g.save();
        g.translate(p.x, p.y);
        if (p.rot) g.rotate(p.rot + Math.sin(t + p.fase) * 0.2);
        g.fillText(p.ch, 0, 0);
        g.restore();
        continue;
      }
      if (p.tipo === "neve" || p.tipo === "bolhas" || p.tipo === "poeira" || p.tipo === "pop") {
        g.globalAlpha = p.a;
        g.fillStyle = p.cor;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, 6.283);
        g.fill();
        continue;
      }
      g.globalCompositeOperation = "lighter";
      if (p.tipo === "brasas") {
        g.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 14 + p.fase)) * Math.min(1, (p.y / H) * 1.6);
        const s = brilho(p.cor);
        g.drawImage(s, p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      } else if (p.tipo === "neon") {
        g.globalAlpha = p.a;
        g.strokeStyle = p.cor;
        g.lineWidth = 2.5;
        g.shadowColor = p.cor;
        g.shadowBlur = 0;
        if (p.forma === "mais") {
          g.beginPath();
          g.moveTo(p.x - p.r, p.y);
          g.lineTo(p.x + p.r, p.y);
          g.moveTo(p.x, p.y - p.r);
          g.lineTo(p.x, p.y + p.r);
          g.stroke();
        } else g.strokeRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      } else if (p.tipo === "brilhos") {
        g.globalAlpha = Math.max(0, Math.sin(t * 3 + p.fase)) * 0.9;
        const s = estrelaSprite(p.cor);
        g.drawImage(s, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      g.globalCompositeOperation = "source-over";
    }
    // Estrelas cadentes e flashes
    for (const r of this.raios) {
      const k = 1 - r.vida / r.dur;
      g.globalCompositeOperation = "lighter";
      if (r.flash) {
        g.globalAlpha = k;
        const s = brilho("#ffffff", 32);
        g.drawImage(s, r.x - r.r * 4, r.y - r.r * 4, r.r * 8, r.r * 8);
      } else {
        const grad = g.createLinearGradient(r.x, r.y, r.x - r.vx * 0.18, r.y - r.vy * 0.18);
        grad.addColorStop(0, "rgba(255,255,255,0.95)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.globalAlpha = k;
        g.strokeStyle = grad;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(r.x, r.y);
        g.lineTo(r.x - r.vx * 0.18, r.y - r.vy * 0.18);
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";
    }
    // Festa
    for (const p of this.festa) {
      const k = Math.min(1, (p.dur - p.vida) * 2);
      g.globalAlpha = Math.max(0, k);
      if (p.estilo === "confetes" || p.estilo === "ouro") {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.scale(1, Math.cos(p.rot * 1.7));
        g.fillStyle = p.cor;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
        if (p.estilo === "ouro" && Math.random() < 0.05) {
          g.globalCompositeOperation = "lighter";
          g.drawImage(estrelaSprite("#fff3c4"), p.x - 14, p.y - 14, 28, 28);
          g.globalCompositeOperation = "source-over";
        }
      } else if (p.estilo === "icones") {
        desenharIcone(g, p.ic, p.x, p.y, p.r, p.rot * 0.3, p.cor);
      } else if (p.estilo === "pixels") {
        g.fillStyle = p.cor;
        g.fillRect(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4, p.r, p.r);
      } else if (p.estilo === "estrelas") {
        g.globalCompositeOperation = "lighter";
        g.drawImage(estrelaSprite(p.cor), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        g.globalCompositeOperation = "source-over";
      } else if (p.estilo === "faiscas") {
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = p.cor;
        g.lineWidth = p.r;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        g.stroke();
        g.drawImage(brilho(p.cor, 16), p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
        g.globalCompositeOperation = "source-over";
      } else {
        g.globalCompositeOperation = p.estilo === "neon" ? "lighter" : "source-over";
        g.fillStyle = p.cor;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, 6.283);
        g.fill();
        g.globalCompositeOperation = "source-over";
      }
    }
    g.globalAlpha = 1;
  }
}
