// "Quem fez mais?": perguntas variadas, 5 segundos para pensar, resposta revelada.
// Quem está a apresentar pode responder com as setas (← →), as teclas 1 e 2 ou tocando num lado.

import { esc, mesNome as nomeMes } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, baralhar, contagem } from "./stage.js";
import { METRICAS, melhores } from "./metricas.js";

const TIPOS = [
  { id: "views", pergunta: (m) => `Quem fez mais views em ${nomeMes(m, { ano: false })}?`, met: "views" },
  { id: "subs", pergunta: () => "Quem tem mais subscritores?", met: "subs" },
  { id: "total", pergunta: () => "Quem tem mais views de sempre?", met: "total" },
  { id: "videos", pergunta: () => "Quem publicou mais vídeos nos últimos 30 dias?", met: "videos30" },
  { id: "subsMes", pergunta: (m) => `Quem ganhou mais subscritores em ${nomeMes(m, { ano: false })}?`, met: "subsMes" },
  { id: "indice", pergunta: () => "Quem tem o Índice de Influência mais alto?", met: "indice" },
  { id: "antigo", pergunta: () => "Quem começou primeiro no YouTube?", antigo: true },
];

function valor(t, p, m) {
  if (t.antigo) return p.since ? -new Date(p.since).getTime() : null;
  return METRICAS[t.met].valor(p, m);
}
function mostrarValor(t, v) {
  if (t.antigo) return String(new Date(-v).getFullYear());
  return METRICAS[t.met].fmt(v);
}

function criarRondas(pool, n, m, misto) {
  const tipos = misto ? TIPOS : TIPOS.slice(0, 1);
  const usados = new Set();
  const out = [];
  let tentativas = 0;
  while (out.length < n && tentativas++ < 2000) {
    const t = tipos[(out.length + Math.floor(tentativas / 50)) % tipos.length];
    const x = pool[Math.floor(Math.random() * pool.length)];
    const y = pool[Math.floor(Math.random() * pool.length)];
    if (!x || !y || x.id === y.id || usados.has(x.id) || usados.has(y.id)) continue;
    const vx = valor(t, x, m);
    const vy = valor(t, y, m);
    if (vx === null || vy === null || vx === undefined || vy === undefined || vx === vy) continue;
    if (t.antigo) {
      if (Math.abs(new Date(-vx).getFullYear() - new Date(-vy).getFullYear()) < 1) continue;
    } else {
      const r = Math.max(vx, vy) / Math.max(1, Math.min(vx, vy));
      if (r < 1.05 || r > 6) continue; // nem empate nem óbvio demais
    }
    usados.add(x.id);
    usados.add(y.id);
    out.push({ t, x, y, vx, vy });
  }
  return baralhar(out);
}

export async function correr(palco, opts) {
  const m = opts.m;
  const pool = melhores(Number(opts.top) || 80);
  const rondas = criarRondas(pool, Number(opts.n) || 8, m, opts.tipo !== "views");
  if (rondas.length < 2) throw new Error("Há poucos Youtubers com dados para este jogo.");
  const vertical = palco.vertical;
  const cena = palco.cena;
  let respondidas = 0;
  let certas = 0;

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Quiz", titulo: "Quem fez\nmais?", sub: `${rondas.length} perguntas, 5 segundos cada. Responde com ← →, 1 e 2, ou toca num lado.` });

  for (const [i, r] of rondas.entries()) {
    const lado = (z, k) => `<div class="qz-lado" data-escolha="${k}">${avatarPalco(z, vertical ? 220 : 280)}<div><b>${esc(z.name)}</b><small>${esc(z.category || "")}</small><div class="qz-valor">?</div></div></div>`;
    cena.innerHTML = `<div class="qz-pergunta p-entra">${esc(r.t.pergunta(m))}</div>
      <div class="qz-ronda">Pergunta ${i + 1} de ${rondas.length}</div>
      <div class="qz-duelo"><div class="p-entra">${lado(r.x, 0)}</div><div class="qz-vs p-slam" style="animation-delay:.3s">VS</div><div class="p-entra" style="animation-delay:.15s">${lado(r.y, 1)}</div></div>
      <div class="qz-tempo"><i></i></div>`;
    palco.tocar("whoosh");
    await palco.esperar(1100);
    const lados = cena.querySelectorAll(".qz-lado");
    let escolha = null;
    const parar = palco.ouvir((ev) => {
      let k = null;
      if (ev.escolha !== undefined) k = Number(ev.escolha);
      if (ev.tecla === "ArrowLeft" || ev.tecla === "1") k = 0;
      if (ev.tecla === "ArrowRight" || ev.tecla === "2") k = 1;
      if (k === null || escolha !== null) return false;
      escolha = k;
      lados[k].classList.add("escolhido");
      palco.tocar("clique");
      return true;
    });
    const vs = cena.querySelector(".qz-vs");
    vs.classList.add("qz-conta");
    cena.querySelector(".qz-tempo i").classList.add("a-correr");
    await contagem(palco, vs, 5);
    parar();
    vs.textContent = "VS";
    vs.classList.remove("qz-conta");
    [r.vx, r.vy].forEach((v, k) => {
      const el = lados[k].querySelector(".qz-valor");
      if (r.t.antigo) el.textContent = mostrarValor(r.t, v);
      else contar(el, v, { formato: (x) => mostrarValor(r.t, x), duracao: 900 });
    });
    await palco.esperar(1000);
    const ganha = r.vx > r.vy ? 0 : 1;
    lados[ganha].classList.add("ganha");
    lados[1 - ganha].classList.add("perde");
    if (escolha !== null) {
      respondidas++;
      if (escolha === ganha) {
        certas++;
        palco.tocar("acerto");
        palco.explodir(ganha === 0 ? palco.L * 0.25 : palco.L * 0.75, palco.A * 0.5, { n: 50, forca: 0.6 });
      } else palco.tocar("falha");
    } else palco.tocar("acerto");
    await palco.passo(2600);
  }

  const resultado = respondidas ? `Acertaste ${certas} de ${respondidas}` : "Quantas acertaste?";
  cena.innerHTML = `<div class="p-centro"><h1 class="p-titulo p-slam" style="font-size:${vertical ? 96 : 112}px">${esc(resultado)}</h1><p class="p-sub p-entra" style="animation-delay:.4s">${respondidas ? (certas / respondidas >= 0.7 ? "Sabes tudo sobre os Youtubers portugueses." : "Há que estudar o Placar!") : "Diz nos comentários."}</p></div>`;
  if (!respondidas || certas / respondidas >= 0.5) palco.festa({ forca: 0.7 });
  else palco.tocar("falha");
  await palco.passo(5000);
  await palco.fecho();
}

