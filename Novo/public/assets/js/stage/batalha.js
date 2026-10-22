// Batalha: combate com barras de vida. Cada ronda ganha tira vida ao adversário, até ao K.O.

import { estado, pessoa, indice, recordes, projetosDe } from "../data.js";
import { esc, inteiro, decimal } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, baralhar } from "./stage.js";
import { METRICAS } from "./metricas.js";
import { linhaConfronto, momentoDoDuelo, estrelasHtml } from "./historico.js";

function escolherAoAcaso(excluir) {
  const top = [...estado.posIndice.entries()].filter(([id, pos]) => pos <= 60 && id !== excluir).map(([id]) => id);
  return pessoa(top[Math.floor(Math.random() * top.length)]);
}

export async function correr(palco, opts) {
  const a = pessoa(opts.a) || pessoa(palco.foco) || escolherAoAcaso();
  palco.contexto = { metrica: "indice" };
  const b = pessoa(opts.b) || escolherAoAcaso(a?.id);
  if (!a || !b || a.id === b.id) throw new Error("Escolhe dois Youtubers diferentes.");
  const ref = estado.ref;
  const ra = recordes(a);
  const rb = recordes(b);
  const daMetrica = (k) => ({ nome: METRICAS[k].nome(ref), f: (p) => METRICAS[k].valor(p, ref), fmt: METRICAS[k].fmt });
  let rondas = [
    daMetrica("views"),
    daMetrica("media3"),
    daMetrica("subs"),
    daMetrica("total"),
    daMetrica("videos30"),
    daMetrica("porVideo"),
    daMetrica("subsMes"),
    daMetrica("crescimento"),
    daMetrica("anos"),
    daMetrica("tiktok"),
    { nome: "Melhor mês de sempre", f: (p) => (p === a ? ra : rb).melhor?.v ?? null, fmt: METRICAS.views.fmt },
    { nome: "Meses no top 10", f: (p) => (p === a ? ra : rb).top10 || null, fmt: inteiro },
    { nome: "Envolvimento do público", f: (p) => (p.vid?.eng ? p.vid.eng * 100 : null), fmt: (x) => decimal(x, 1) + "%" },
    { nome: "Projetos", f: (p) => projetosDe(p.id).length || null, fmt: inteiro },
  ]
    .map((r) => ({ ...r, va: r.f(a), vb: r.f(b) }))
    .filter((r) => r.va !== null && r.va !== undefined && r.vb !== null && r.vb !== undefined && Number.isFinite(r.va) && Number.isFinite(r.vb));
  // A última ronda é sempre o Índice (o "golpe final"), as outras vêm baralhadas
  rondas = baralhar(rondas).slice(0, 8);
  const ia = indice(a.id).total;
  const ib = indice(b.id).total;
  if (ia !== null && ib !== null) rondas.push({ nome: "Golpe final: Índice de Influência", va: ia, vb: ib, fmt: inteiro, final: true });
  if (rondas.length < 3) throw new Error("Estes dois Youtubers têm poucos números para comparar.");

  const vertical = palco.vertical;
  const cena = palco.cena;

  // ---------- Apresentação ----------
  palco.musica("tensao", 1);
  cena.innerHTML = `<div class="bt-intro">
    <div class="bt-intro-lado a">${avatarPalco(a, vertical ? 360 : 420)}<div class="p-titulo">${esc(a.name)}</div><small>${esc(a.category || "")}${estrelasHtml(palco.historico, a.id)}</small></div>
    <div class="bt-intro-vs">VS</div>
    <div class="bt-intro-lado b">${avatarPalco(b, vertical ? 360 : 420)}<div class="p-titulo">${esc(b.name)}</div><small>${esc(b.category || "")}${estrelasHtml(palco.historico, b.id)}</small></div></div>
    <div class="hi-linha bt-historial p-entra" style="animation-delay:.9s">${linhaConfronto(palco.historico, a, b)}</div>`;
  palco.tocar("whoosh");
  palco.tocar("whoosh", {}, 0.25);
  await palco.esperar(700, { exato: true });
  palco.tocar("impacto");
  if (!palco.evento("duelo", { a: cena.querySelector(".bt-intro-lado.a .palco-avatar"), b: cena.querySelector(".bt-intro-lado.b .palco-avatar") })) palco.tocar("_abertura", {}, 0.1);
  palco.flash(0.8);
  palco.tremer(1.2);
  palco.explodir(palco.L / 2, palco.A / 2, { n: 120 });
  await palco.passo(3200);

  // ---------- Arena ----------
  cena.innerHTML = `
    <div class="bt-vidas">
      <div class="bt-vida a"><div class="bt-vida-nome">${avatarPalco(a, vertical ? 84 : 92)}<b>${esc(a.name)}</b><span class="bt-hp" id="hp-a">100</span></div><div class="bt-barra"><i class="dano"></i><i class="vida"></i></div></div>
      <div class="bt-ronda-num" id="bt-num">1</div>
      <div class="bt-vida b"><div class="bt-vida-nome"><span class="bt-hp" id="hp-b">100</span><b>${esc(b.name)}</b>${avatarPalco(b, vertical ? 84 : 92)}</div><div class="bt-barra"><i class="dano"></i><i class="vida"></i></div></div>
    </div>
    <div class="bt-arena">
      <div class="bt-lutador a">${avatarPalco(a, vertical ? 300 : 340)}</div>
      <div class="bt-golpe-info"></div>
      <div class="bt-lutador b">${avatarPalco(b, vertical ? 300 : 340)}</div>
    </div>
    <div class="bt-anuncio"></div>`;
  // Tema Futebol completo: a batalha é um jogo, com marcador, minutos e golos em vez de vida
  const jogo = palco.kit?.id === "estadio";
  const sigla = (p) => p.name.normalize("NFD").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "???";
  const golos = { a: 0, b: 0 };
  if (jogo) {
    palco.tela.classList.add("bt-jogo");
    cena.insertAdjacentHTML("afterbegin", `<div class="bt-marcador"><div class="eq a">${avatarPalco(a, vertical ? 70 : 64)}<b>${esc(sigla(a))}</b></div><div class="res"><b id="gl-a">0</b><i>–</i><b id="gl-b">0</b></div><div class="eq b"><b>${esc(sigla(b))}</b>${avatarPalco(b, vertical ? 70 : 64)}</div><div class="min" id="bt-min">0'</div></div>`);
  }
  const anuncio = cena.querySelector(".bt-anuncio");
  const info = cena.querySelector(".bt-golpe-info");
  const luta = { a: cena.querySelector(".bt-lutador.a"), b: cena.querySelector(".bt-lutador.b") };
  const barra = { a: cena.querySelector(".bt-vida.a .bt-barra"), b: cena.querySelector(".bt-vida.b .bt-barra") };
  const hpEl = { a: cena.querySelector("#hp-a"), b: cena.querySelector("#hp-b") };
  const hp = { a: 100, b: 100 };
  const ganhas = { a: 0, b: 0 };

  const anunciar = async (texto, classe = "") => {
    anuncio.className = `bt-anuncio ${classe}`;
    anuncio.innerHTML = `<div class="p-titulo">${esc(texto)}</div>`;
    anuncio.firstElementChild.classList.add("p-slam");
    await palco.esperar(900, { exato: true });
    anuncio.innerHTML = "";
  };
  const acertar = (quem, dano, critico) => {
    const outro = quem === "a" ? "b" : "a";
    if (jogo) {
      golos[quem]++;
      setTimeout(() => {
        if (palco.terminado) return;
        const el = cena.querySelector(`#gl-${quem}`);
        el.textContent = golos[quem];
        el.animate([{ transform: "scale(2.2)", color: "#ffe14d" }, { transform: "scale(1)" }], { duration: 700, easing: "cubic-bezier(.2,1.4,.4,1)" });
      }, 800);
    } else hp[outro] = Math.max(0, hp[outro] - dano);
    // O atacante avança, o atingido recua e pisca
    luta[quem].animate([{ transform: "translateX(0)" }, { transform: `translateX(${(quem === "a" ? 1 : -1) * (vertical ? 120 : 220)}px) scale(1.08)` }, { transform: "translateX(0)" }], { duration: 420, easing: "cubic-bezier(.3,1.4,.5,1)" });
    setTimeout(() => {
      luta[outro].animate([{ transform: "translateX(0)", filter: "none" }, { transform: `translateX(${outro === "a" ? -40 : 40}px) rotate(${outro === "a" ? -8 : 8}deg)`, filter: "brightness(2.4) saturate(0)" }, { transform: "translateX(0)", filter: "none" }], { duration: 380, easing: "ease-out" });
      if (jogo) {
        palco.evento("golpe", { de: luta[quem], alvo: luta[outro], critico });
        return;
      }
      const vida = barra[outro].querySelector(".vida");
      const sombra = barra[outro].querySelector(".dano");
      vida.style.width = hp[outro] + "%";
      setTimeout(() => (sombra.style.width = hp[outro] + "%"), 520);
      barra[outro].classList.toggle("pouca", hp[outro] <= 30);
      contar(hpEl[outro], hp[outro], { formato: (x) => String(Math.round(x)), duracao: 500 });
      const num = document.createElement("div");
      num.className = `bt-dano ${critico ? "critico" : ""}`;
      num.textContent = `−${dano}`;
      luta[outro].appendChild(num);
      setTimeout(() => num.remove(), 1400);
      if (!palco.evento("golpe", { de: luta[quem], alvo: luta[outro], critico })) palco.tocar("golpe");
      palco.tremer(critico ? 1.1 : 0.45);
      const r = luta[outro].getBoundingClientRect();
      const t = palco.tela.getBoundingClientRect();
      const k = palco.L / t.width;
      palco.explodir((r.left + r.width / 2 - t.left) * k, (r.top + r.height / 2 - t.top) * k, { n: critico ? 70 : 30, forca: critico ? 0.8 : 0.45 });
      if (critico) palco.flash(0.5);
    }, 200);
  };

  palco.musica("epico", 1);
  if (jogo) await anunciar("Apito inicial", "grande");
  else {
    await anunciar("Ronda 1");
    await anunciar("Lutem!", "grande");
  }
  palco.tocar("impacto");

  let ko = null;
  for (const [i, r] of rondas.entries()) {
    if (i === Math.floor(rondas.length / 2)) await palco.meio();
    cena.querySelector("#bt-num").textContent = i + 1;
    if (jogo) cena.querySelector("#bt-min").textContent = `${Math.round(((i + 1) / rondas.length) * 90)}'`;
    if (r.final) {
      await anunciar(jogo ? "Último lance" : "Golpe final", "grande");
      palco.musica("epico", 2);
    }
    info.innerHTML = `<div class="bt-cat p-slam">${esc(r.nome)}</div><div class="bt-valores"><span class="val a"></span><i>vs</i><span class="val b"></span></div>`;
    const [ea, eb] = info.querySelectorAll(".val");
    palco.tocar("virar");
    contar(ea, r.va, { formato: r.fmt, duracao: 900 });
    contar(eb, r.vb, { formato: r.fmt, duracao: 900 });
    await palco.esperar(1200);
    if (r.va === r.vb) {
      info.querySelector(".bt-valores i").textContent = "empate";
      palco.tocar("falha");
    } else {
      const quem = r.va > r.vb ? "a" : "b";
      ganhas[quem]++;
      (quem === "a" ? ea : eb).classList.add("ganha");
      (quem === "a" ? eb : ea).classList.add("perde");
      const diferenca = Math.abs(r.va - r.vb) / Math.max(Math.abs(r.va), Math.abs(r.vb), 1e-9);
      let dano = Math.round(9 + 29 * Math.min(1, diferenca));
      if (r.final) dano = Math.max(dano, 26);
      const critico = dano >= 28;
      acertar(quem, dano, critico);
      if (critico && !jogo) setTimeout(() => !palco.terminado && anunciar("Crítico!", "critico"), 350);
      await palco.esperar(jogo ? 1600 : 800, { exato: true });
      if (!jogo && (hp.a <= 0 || hp.b <= 0)) {
        ko = hp.a <= 0 ? "b" : "a";
        break;
      }
    }
    if (i === rondas.length - 4) palco.musica("epico", 2);
    await palco.passo(1700);
  }

  // ---------- Resultado ----------
  let penaltis = false;
  let vencedorLado = ko || (hp.a === hp.b ? null : hp.a > hp.b ? "a" : "b");
  if (jogo) {
    vencedorLado = golos.a === golos.b ? null : golos.a > golos.b ? "a" : "b";
    palco.tocar("apito", { longo: true });
    if (!vencedorLado) {
      // Empate: decide-se nos penáltis, pelo Índice de Influência
      await anunciar("Penáltis!", "grande");
      penaltis = true;
      vencedorLado = (ia ?? 0) >= (ib ?? 0) ? "a" : "b";
      palco.evento("golpe", { de: luta[vencedorLado], alvo: luta[vencedorLado === "a" ? "b" : "a"], critico: true });
      await palco.esperar(1800, { exato: true });
    }
  }
  info.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
  if (ko) {
    if (!palco.evento("ko", { vencedor: luta[ko], perdedor: luta[ko === "a" ? "b" : "a"] })) palco.tocar("ko");
    palco.flash(1);
    palco.tremer(1.6);
    anuncio.className = "bt-anuncio ko";
    anuncio.innerHTML = `<div class="p-titulo p-slam">K.O.</div>`;
    luta[ko === "a" ? "b" : "a"].classList.add("caido");
    await palco.esperar(2600, { exato: true });
  } else {
    await anunciar(jogo ? "Fim do jogo" : vencedorLado ? "Tempo!" : "Empate!", "grande");
  }
  palco.tela.classList.remove("bt-jogo");
  const vencedor = vencedorLado === "a" ? a : vencedorLado === "b" ? b : null;
  const perdedor = vencedor === a ? b : a;
  const momento = vencedor ? momentoDoDuelo(palco.historico, vencedor, perdedor) : "";
  if (vencedor) palco.registar({ tipo: "duelo", espetaculo: "batalha", a: a.id, b: b.id, vence: vencedor.id, ko: Boolean(ko), penaltis, placar: jogo ? `${golos.a}-${golos.b}` : `${ganhas.a}-${ganhas.b}` });
  palco.musica("epico", 1);
  cena.innerHTML = vencedor
    ? `<div class="p-centro">${avatarPalco(vencedor, vertical ? 380 : 320)}
        <div class="ab-etiqueta" style="margin:50px 0 0">${jogo ? (penaltis ? `Vitória nos penáltis (${golos.a}–${golos.b})` : `Vitória por ${Math.max(golos.a, golos.b)}–${Math.min(golos.a, golos.b)}`) : ko ? "Vitória por K.O." : "Vitória por pontos"}</div>
        <h1 class="p-titulo p-slam" style="font-size:${vertical ? 96 : 116}px;margin-top:26px">${esc(vencedor.name)}</h1>
        ${momento ? `<div class="hi-momento p-slam" style="animation-delay:1.2s">${esc(momento)}</div>` : ""}
        <p class="p-sub p-entra" style="animation-delay:.4s">${jogo ? `${esc(a.name)} ${golos.a} – ${golos.b} ${esc(b.name)}` : `${ganhas[vencedorLado]} rondas ganhas, ${hp[vencedorLado]} de vida no fim`}</p></div>`
    : `<div class="p-centro"><h1 class="p-titulo p-slam" style="font-size:180px">Empate</h1><p class="p-sub">${ganhas.a} – ${ganhas.b} em rondas</p></div>`;
  if (vencedor) {
    palco.festa({ som: !palco.evento("vencedor", { alvo: cena.querySelector(".palco-avatar"), p: vencedor }) });
  }
  await palco.passo(6000);
  await palco.fecho();
}
