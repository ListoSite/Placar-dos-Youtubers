// Desafio do Placar: perguntas para quem vê o vídeo responder (pausa, pensa, conta os pontos).
// Tipos: escolha múltipla (adivinha o número), o intruso, ordenar e verdadeiro ou falso.

import { estado, indice, views } from "../data.js";
import { esc, curto, mesNome } from "../format.js";
import { avatarPalco, baralhar, comFoco } from "./stage.js";
import { melhores, rankingPor } from "./metricas.js";
import { animate, stagger, spring } from "../../vendor/anime.esm.min.js";

const LETRAS = ["A", "B", "C", "D"];
const ORDEM_TIPOS = ["numero", "intruso", "vf", "ordena", "numero", "vf", "intruso", "ordena", "numero", "vf", "intruso", "ordena"];

function redondo(n) {
  const e = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, n))) - 1));
  return Math.round(n / e) * e;
}

function criarPerguntas(palco, opts) {
  const m = opts.m;
  const mes = mesNome(m, { ano: false });
  let pool = melhores(Number(opts.top) || 60, { cat: opts.cat }).filter((p) => views(p, m));
  pool = comFoco(pool, palco).filter((p) => views(p, m));
  const top = rankingPor("views", m, { cat: opts.cat });
  const usados = new Set();
  const livre = (lista) => baralhar(lista).filter((p) => !usados.has(p.id));
  const perguntas = [];
  const n = Number(opts.n) || 8;
  for (let i = 0; perguntas.length < n && i < n * 4; i++) {
    const tipo = ORDEM_TIPOS[i % ORDEM_TIPOS.length];
    if (tipo === "numero") {
      const p = livre(pool)[0];
      if (!p) continue;
      const v = views(p, m);
      const fatores = baralhar([0.35, 0.55, 1.8, 2.6, 0.7, 1.5]).slice(0, 3);
      const opcoes = baralhar([{ t: curto(v), certa: true }, ...fatores.map((f) => ({ t: curto(redondo(v * f)) }))]);
      if (new Set(opcoes.map((o) => o.t)).size < 4) continue;
      usados.add(p.id);
      perguntas.push({ tipo, titulo: `Quantas views fez ${p.name} em ${mes}?`, pessoas: [p], opcoes });
    } else if (tipo === "intruso") {
      const dentro = baralhar(top.slice(0, 10)).slice(0, 3).map((x) => x.p);
      const fora = baralhar(top.slice(14, 45))[0]?.p;
      if (dentro.length < 3 || !fora) continue;
      const opcoes = baralhar([...dentro.map((p) => ({ p, t: p.name })), { p: fora, t: fora.name, certa: true }]);
      perguntas.push({ tipo, titulo: `Qual destes NÃO esteve no top 10 de ${mes}?`, opcoes, explica: `${fora.name} ficou em ${top.findIndex((x) => x.p.id === fora.id) + 1}.º lugar.` });
    } else if (tipo === "ordena") {
      const cands = livre(pool).slice(0, 12);
      const escolhidos = [];
      for (const p of cands) {
        const v = views(p, m);
        if (escolhidos.every((q) => Math.max(v, views(q, m)) / Math.min(v, views(q, m)) >= 1.15)) escolhidos.push(p);
        if (escolhidos.length === 4) break;
      }
      if (escolhidos.length < 4) continue;
      escolhidos.forEach((p) => usados.add(p.id));
      const opcoes = escolhidos.map((p) => ({ p, t: p.name, v: views(p, m) }));
      const ordem = [...opcoes].sort((a, b) => b.v - a.v);
      perguntas.push({ tipo, titulo: `Ordena do que fez mais views para o que fez menos, em ${mes}`, opcoes, resposta: ordem.map((o) => LETRAS[opcoes.indexOf(o)]).join(" · ") });
    } else if (tipo === "vf") {
      const [a, b] = livre(pool);
      if (!a || !b) continue;
      const variante = perguntas.filter((q) => q.tipo === "vf").length % 3;
      let frase;
      let verdade;
      let explica;
      if (variante === 0) {
        frase = `${a.name} fez mais views do que ${b.name} em ${mes}.`;
        verdade = views(a, m) > views(b, m);
        explica = `${a.name}: ${curto(views(a, m))} · ${b.name}: ${curto(views(b, m))}`;
      } else if (variante === 1 && a.totals?.subs) {
        const real = a.totals.subs;
        const limite = redondo(real * (Math.random() < 0.5 ? 0.7 : 1.4));
        frase = `${a.name} tem mais de ${curto(limite)} subscritores.`;
        verdade = real > limite;
        explica = `Tem ${curto(real)} subscritores.`;
      } else {
        const pos = estado.posIndice.get(a.id);
        if (!pos) continue;
        frase = `${a.name} está no top 10 do Índice de Influência.`;
        verdade = pos <= 10;
        explica = `Está em ${pos}.º, com ${indice(a.id).total} pontos.`;
      }
      usados.add(a.id);
      perguntas.push({ tipo, titulo: "Verdadeiro ou falso?", frase, pessoas: [a, ...(variante === 0 ? [b] : [])], opcoes: [{ t: "Verdadeiro", certa: verdade }, { t: "Falso", certa: !verdade }], explica });
    }
  }
  return perguntas;
}

export async function correr(palco, opts) {
  palco.contexto = { metrica: "views", m: opts.m, cat: opts.cat };
  const perguntas = criarPerguntas(palco, opts);
  if (perguntas.length < 3) throw new Error("Há poucos Youtubers com dados para o desafio.");
  const vertical = palco.vertical;
  const cena = palco.cena;

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Joga com o vídeo", titulo: "Desafio\ndo Placar", sub: `${perguntas.length} perguntas. Pausa quando precisares, responde e conta 1 ponto por cada certa.` });
  palco.musica("epico", 1);

  for (const [i, q] of perguntas.entries()) {
    if (i === Math.floor(perguntas.length / 2)) await palco.meio();
    const tempo = q.tipo === "ordena" ? 9 : 7;
    const cartaoOpcao = (o, k) => `<div class="df-opcao" data-k="${k}">
        <span class="df-letra">${q.tipo === "vf" ? (k ? "F" : "V") : LETRAS[k]}</span>
        ${o.p ? avatarPalco(o.p, vertical ? 120 : 110) : ""}
        <span class="df-texto">${esc(o.t)}</span>
        <span class="df-extra"></span>
      </div>`;
    cena.innerHTML = `<div class="df-topo"><span>Pergunta ${i + 1} de ${perguntas.length}</span><span class="df-pausa">⏸ Pausa para pensar</span></div>
      <div class="df-pergunta">${esc(q.titulo)}</div>
      ${q.frase ? `<div class="df-frase">“${esc(q.frase)}”</div>` : ""}
      ${q.pessoas && q.tipo === "numero" ? `<div class="df-pessoa">${avatarPalco(q.pessoas[0], vertical ? 240 : 200)}</div>` : ""}
      ${q.pessoas && q.tipo === "vf" ? `<div class="df-pessoas">${q.pessoas.map((p) => avatarPalco(p, vertical ? 170 : 150)).join("")}</div>` : ""}
      <div class="df-opcoes tipo-${q.tipo}">${q.opcoes.map(cartaoOpcao).join("")}</div>
      <div class="df-tempo"><b>${tempo}</b><div class="qz-tempo"><i></i></div></div>`;
    animate(cena.querySelectorAll(".df-opcao"), { translateY: [80, 0], opacity: [0, 1], delay: stagger(110, { start: 250 }), duration: 800, ease: spring({ stiffness: 150, damping: 14 }) });
    palco.tocar("whoosh");
    palco.tocar("_destaque", {}, 0.2);
    await palco.esperar(1100);
    const barra = cena.querySelector(".df-tempo i");
    barra.style.animationDuration = `${tempo}s`;
    barra.classList.add("a-correr");
    const num = cena.querySelector(".df-tempo b");
    for (let s = tempo; s >= 1; s--) {
      num.textContent = s;
      palco.tocar(s <= 3 ? "tique" : "clique");
      await palco.esperar(1000, { exato: true });
    }
    num.textContent = "0";
    // Revelação
    const opEls = [...cena.querySelectorAll(".df-opcao")];
    if (q.tipo === "ordena") {
      const ordem = [...q.opcoes].sort((a, b) => b.v - a.v);
      for (const [pos, o] of [...ordem.entries()].reverse()) {
        const el = opEls[q.opcoes.indexOf(o)];
        el.querySelector(".df-extra").innerHTML = `<b>${pos + 1}.º</b> ${esc(curto(o.v))}`;
        el.classList.add("revelado");
        palco.tocar(pos === 0 ? "acerto" : "virar");
        await palco.esperar(650);
      }
      cena.querySelector(".df-pergunta").innerHTML = `Resposta: <b class="df-resposta">${esc(q.resposta)}</b>`;
    } else {
      opEls.forEach((el, k) => el.classList.add(q.opcoes[k].certa ? "certa" : "errada"));
      if (q.explica) {
        const ex = document.createElement("div");
        ex.className = "df-explica p-entra";
        ex.textContent = q.explica;
        cena.appendChild(ex);
      }
      palco.tocar("acerto");
    }
    const ponto = document.createElement("div");
    ponto.className = "df-ponto";
    ponto.textContent = "+1 ponto se acertaste!";
    cena.appendChild(ponto);
    palco.tocar("moeda", {}, 0.3);
    const certa = opEls.find((el) => el.classList.contains("certa")) || opEls[0];
    const r = certa.getBoundingClientRect();
    const t = palco.tela.getBoundingClientRect();
    const k = palco.L / t.width;
    palco.explodir((r.left - t.left + r.width / 2) * k, (r.top - t.top + r.height / 2) * k, { n: 50, forca: 0.6 });
    await palco.passo(q.tipo === "ordena" ? 3200 : 3000);
  }

  cena.innerHTML = `<div class="p-centro">
    <h1 class="p-titulo p-slam" style="font-size:${vertical ? 104 : 120}px">Quantos pontos<br>fizeste?</h1>
    <div class="df-escala p-entra" style="animation-delay:.5s">
      <div><b>0–${Math.floor(perguntas.length * 0.4)}</b><span>Principiante</span></div>
      <div><b>${Math.floor(perguntas.length * 0.4) + 1}–${Math.floor(perguntas.length * 0.75)}</b><span>Fã do Placar</span></div>
      <div class="topo"><b>${Math.floor(perguntas.length * 0.75) + 1}–${perguntas.length}</b><span>Mestre dos Youtubers</span></div>
    </div>
    <p class="p-sub p-entra" style="animation-delay:.9s">Comenta a tua pontuação!</p></div>`;
  palco.festa({ forca: 0.8 });
  await palco.passo(5500);
  await palco.fecho();
}
