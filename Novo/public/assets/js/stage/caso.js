// O Caso no Palco: as notícias aparecem do nada, como uma emissão interrompida.
// Interferência, alarme de ÚLTIMA HORA, o título a aparecer letra a letra, quem está envolvido
// (escondido e depois revelado) e o que o público diz: o termómetro de stress e a pergunta.
//
// - cenaNoticia: a cena que se junta a qualquer espetáculo (no roteiro, a meio por defeito).
// - correr: o espetáculo sozinho, com várias notícias e a mais quente no fim.

import { api, pessoa, estado } from "../data.js";
import { esc, inteiro } from "../format.js";
import { avatarPalco, qrSvg } from "./stage.js";
import { animate, stagger, spring } from "../../vendor/anime.esm.min.js";

export const TEMAS = {
  noticia: { nome: "Notícia", icone: "📰", cor: "#5aa8ff" },
  stress: { nome: "Polémica", icone: "🔥", cor: "#ff4d4d" },
  boa: { nome: "Coisas boas", icone: "💚", cor: "#4fe3a0" },
  colab: { nome: "Colaboração", icone: "🤝", cor: "#b58cff" },
  marco: { nome: "Marco", icone: "🏆", cor: "#f4b942" },
  rumor: { nome: "Rumor", icone: "👀", cor: "#ff9b6b" },
  evento: { nome: "Evento", icone: "📅", cor: "#5fd6d6" },
  pausa: { nome: "Pausa ou saída", icone: "👋", cor: "#a77f8b" },
};
const EMOJI = { fogo: "🔥", pipoca: "🍿", choque: "😮", raiva: "😡", triste: "😢", riso: "😂", palmas: "👏", amor: "❤️" };
/** A etiqueta de cima, conforme o tema (para as coisas boas não parecer um alarme). */
const ALERTA = { boa: "BOAS NOTÍCIAS", marco: "MOMENTO HISTÓRICO", rumor: "RUMOR", evento: "ATENÇÃO", colab: "EM PRIMEIRA MÃO" };
const nivel = (q) => {
  const v = Math.round((q || 0) * 100);
  return v >= 60 ? "A ferver" : v >= 35 ? "Quente" : v >= 15 ? "Morno" : "Calmo";
};

/** O que guardar de uma notícia (para a cena e para os exclusivos repetirem igual). */
export function retratoNoticia(n) {
  const nomes = {};
  for (const id of n.pessoas || []) nomes[id] = pessoa(id)?.name || id;
  return {
    id: n.id,
    tema: n.tema,
    titulo: n.titulo,
    texto: n.texto || "",
    data: n.data,
    pessoas: (n.pessoas || []).slice(0, 4),
    nomes,
    pergunta: n.pergunta || "",
    opcoes: n.opcoes || [],
    conta: n.conta || { r: {}, o: {}, n: 0, quente: 0 },
  };
}

const cara = (id, nomes, tam) => {
  const p = pessoa(id) || estado.pessoas?.get(id);
  if (p) return avatarPalco(p, tam);
  const nome = nomes?.[id] || "?";
  return `<span class="vo-letra" style="width:${tam}px;height:${tam}px">${esc(nome.slice(0, 1))}</span>`;
};

/** A interferência: o ecrã treme, chuvisco e uma frase a piscar. */
async function interferencia(palco, frase) {
  const el = document.createElement("div");
  el.className = "nx-estatica";
  el.innerHTML = frase ? `<b>${esc(frase)}</b>` : "";
  palco.mundo.appendChild(el);
  palco.tela.classList.add("nx-glitch");
  palco.tocar("estatica", { dur: 0.9 });
  palco.tremer(0.8);
  await palco.esperar(1100, { exato: true });
  palco.tela.classList.remove("nx-glitch");
  return el;
}

/**
 * A sequência de uma notícia. Fica numa camada por cima do que estiver no ecrã.
 * opcoes: { completa (mostra o texto e demora mais), apelo (o "vota no site" no fim), sozinha (sem interferência à entrada) }
 */
export async function sequenciaNoticia(palco, n, { completa = false, apelo = true, sozinha = false, link = "", textoBio = "Link na bio" } = {}) {
  const t = TEMAS[n.tema] || TEMAS.noticia;
  const v = palco.vertical;
  const est = sozinha ? null : await interferencia(palco, "⚠ Interrompemos o vídeo");

  const el = document.createElement("div");
  el.className = `nx-camada nx-tema-${esc(n.tema)}`;
  el.style.setProperty("--tc", t.cor);
  el.innerHTML = `<div class="nx-faixa"><span class="nx-luz"></span><b>${ALERTA[n.tema] || "ÚLTIMA HORA"}</b><span class="nx-rolar"><i>${esc(t.icone)} ${esc(t.nome.toUpperCase())} · O CASO · ${esc(t.icone)} ${esc(t.nome.toUpperCase())} · O CASO · ${esc(t.icone)} ${esc(t.nome.toUpperCase())} · O CASO ·</i></span></div>
    <div class="nx-corpo">
      <div class="nx-tema"><span>${t.icone}</span>${esc(t.nome)}</div>
      <h2 class="nx-titulo"></h2>
      ${completa && n.texto ? `<p class="nx-texto">${esc(n.texto.length > (v ? 220 : 260) ? n.texto.slice(0, v ? 217 : 257).trimEnd() + "…" : n.texto)}</p>` : ""}
      ${n.pessoas?.length ? `<div class="nx-caras">${n.pessoas.map((id) => `<div class="nx-cara"><div class="nx-foto"><div class="nx-misterio">?</div>${cara(id, n.nomes, v ? 190 : 130)}</div><span>${esc(n.nomes?.[id] || pessoa(id)?.name || "")}</span></div>`).join("")}</div>` : ""}
      <div class="nx-publico"></div>
    </div>`;
  palco.mundo.appendChild(el);
  palco.tela.classList.add("com-noticia");
  est?.remove();

  // 1) Alarme e faixa de última hora a bater
  palco.tocar(["boa", "marco"].includes(n.tema) ? "_destaque" : "alarme");
  palco.tocar("urgente", {}, 0.25);
  palco.flash(0.6);
  animate(el.querySelector(".nx-faixa"), { scaleY: [0, 1], opacity: [0, 1], duration: 450, ease: "outExpo" });
  animate(el.querySelector(".nx-tema"), { scale: [2.4, 1], opacity: [0, 1], rotate: [-8, 0], delay: 350, duration: 700, ease: spring({ stiffness: 170, damping: 12 }) });
  await palco.esperar(1100);

  // 2) Suspense: reticências e o título letra a letra
  const tit = el.querySelector(".nx-titulo");
  tit.innerHTML = `<span class="nx-pontos"><i>.</i><i>.</i><i>.</i></span>`;
  palco.tocar("rufo", { dur: 1.4 });
  await palco.esperar(1500);
  tit.textContent = "";
  const letras = [...n.titulo];
  const passo = Math.max(18, Math.min(45, 1400 / letras.length));
  for (let i = 0; i < letras.length; i += 2) {
    tit.textContent = letras.slice(0, i + 2).join("");
    if (i % 6 === 0) palco.tocar("tique");
    await palco.esperar(passo * 2);
  }
  tit.classList.add("nx-pronto");
  palco.tocar("impacto");
  palco.tremer(0.3);
  if (completa && n.texto) animate(el.querySelector(".nx-texto"), { translateY: [30, 0], opacity: [0, 1], duration: 700, ease: "outExpo" });
  await palco.esperar(completa ? 1600 : 700);

  // 3) Quem está envolvido: primeiro escondido, depois revelado um a um
  const caras = [...el.querySelectorAll(".nx-cara")];
  if (caras.length) {
    animate(caras, { scale: [0.2, 1], opacity: [0, 1], delay: stagger(120), duration: 700, ease: spring({ stiffness: 160, damping: 13 }) });
    palco.tocar("whoosh");
    await palco.esperar(900);
    for (const c of caras) {
      c.classList.add("revelada");
      palco.tocar("revelar");
      palco.flash(0.25);
      await palco.esperar(550);
    }
    await palco.esperar(500);
  }

  // 4) O que diz o público
  const pub = el.querySelector(".nx-publico");
  const conta = n.conta || { r: {}, o: {}, n: 0, quente: 0 };
  if (conta.n) {
    const top = Object.entries(conta.r || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const totalO = Object.values(conta.o || {}).reduce((a, b) => a + b, 0);
    const q = Math.round((conta.quente || 0) * 100);
    pub.innerHTML = `<div class="nx-pub-titulo">O que diz o público <small>${inteiro(conta.n)} ${conta.n === 1 ? "voto" : "votos"}</small></div>
      <div class="nx-termo"><span>🌡️ Stress</span><div class="nx-termo-barra"><i></i></div><b>${nivel(conta.quente)}</b></div>
      ${top.length ? `<div class="nx-reacoes">${top.map(([k, c]) => `<span><i>${EMOJI[k] || ""}</i>${inteiro(c)}</span>`).join("")}</div>` : ""}
      ${n.pergunta && totalO ? `<div class="nx-pergunta"><b>${esc(n.pergunta)}</b>${n.opcoes
        .map((o, i) => ({ o, i, c: conta.o?.[i] || 0 }))
        .map((x) => `<div class="nx-opcao" data-i="${x.i}"><i></i><span>${esc(x.o)}</span><b>${Math.round((x.c / totalO) * 100)}%</b></div>`)
        .join("")}</div>` : ""}`;
    // No 16:9 não cabe tudo em coluna: o público vai para a direita (e o texto sai)
    el.querySelector(".nx-corpo").classList.add("com-publico");
    animate(pub, { translateY: [60, 0], opacity: [0, 1], duration: 700, ease: "outExpo" });
    await palco.esperar(600);
    // O termómetro sobe devagar (com suspense)
    palco.tocar("subida");
    const barra = pub.querySelector(".nx-termo-barra i");
    animate(barra, { width: ["0%", `${Math.max(4, q)}%`], duration: 1400, ease: "inOutCubic" });
    await palco.esperar(1500);
    if (q >= 35) {
      palco.tocar("fogo");
      palco.tremer(0.4);
    }
    animate(pub.querySelectorAll(".nx-reacoes span"), { scale: [0, 1], opacity: [0, 1], delay: stagger(110), duration: 600, ease: spring({ stiffness: 200, damping: 12 }) });
    await palco.esperar(700);
    const ops = [...pub.querySelectorAll(".nx-opcao")];
    if (ops.length) {
      const max = Math.max(...n.opcoes.map((_, i) => conta.o?.[i] || 0));
      for (const op of ops) {
        const c = conta.o?.[op.dataset.i] || 0;
        animate(op.querySelector("i"), { width: ["0%", `${totalO ? (c / totalO) * 100 : 0}%`], duration: 800, ease: "outExpo" });
        palco.tocar("tique");
        await palco.esperar(350);
      }
      await palco.esperar(500);
      ops.forEach((op) => (conta.o?.[op.dataset.i] || 0) === max && max > 0 && op.classList.add("ganha"));
      palco.tocar("_destaque");
    }
    await palco.passo(completa ? 2600 : 1800);
  } else if (completa) {
    pub.innerHTML = `<div class="nx-pub-titulo">Ainda ninguém reagiu. Sê o primeiro!</div>`;
    animate(pub, { opacity: [0, 1], duration: 600 });
    await palco.passo(1500);
  } else await palco.passo(1200);

  // 5) Vota no site
  if (apelo) {
    const qr = qrSvg(link);
    pub.innerHTML = `<div class="vv-onde nx-apelo"><div class="vv-texto"><b>O que achas tu?</b><span class="vv-bio">👉 ${esc(textoBio)}</span><small>Vota em <b>O Caso</b>, no site do Placar</small></div>${qr ? `<div class="vv-qr">${qr}</div>` : ""}</div>`;
    animate(pub, { translateY: [60, 0], opacity: [0, 1], duration: 700, ease: "outExpo" });
    palco.tocar("whoosh");
    await palco.passo(3200);
  }

  // 6) Sai como entrou: de repente
  const sai = sozinha ? null : await interferencia(palco, "");
  el.remove();
  palco.tela.classList.remove("com-noticia");
  if (sai) {
    await palco.esperar(150, { exato: true });
    sai.remove();
  }
}

/** A cena do roteiro: uma notícia que interrompe o espetáculo. */
export async function cenaNoticia(palco, g) {
  if (!g?.titulo) return;
  await sequenciaNoticia(palco, g, { completa: false, apelo: true, link: g.link, textoBio: g.textoBio });
}

/** O espetáculo sozinho: as notícias, uma a uma, e a mais quente no fim. */
export async function correr(palco, opts) {
  const r = await palco.captura("noticias", async () => {
    const x = await api("admin/caso/noticias");
    return { noticias: (x.noticias || []).filter((n) => n.estado === "publicada").map(retratoNoticia) };
  });
  let lista = r.noticias || [];
  if (opts.noticia) lista = lista.filter((n) => n.id === opts.noticia);
  else {
    if (opts.tema) lista = lista.filter((n) => n.tema === opts.tema);
    lista = lista.slice(0, Math.max(1, Math.min(6, Number(opts.n) || 3)));
  }
  if (!lista.length) throw new Error("Não há notícias publicadas para mostrar (em O Caso, Notícias).");
  const link = `${location.origin}/#/caso`;
  palco.contexto = { metrica: "indice" };
  palco.musica("tensao", 1);

  // Abertura: começa normal e é interrompida
  palco.cena.innerHTML = `<div class="p-centro nx-abre"><div class="ab-etiqueta">O Caso</div><h1 class="p-titulo" style="font-size:${palco.vertical ? 104 : 120}px">O que anda<br>a acontecer</h1><p class="p-sub">${lista.length === 1 ? "Uma notícia" : `${lista.length} notícias`} do YouTube português</p></div>`;
  animate(palco.cena.querySelectorAll(".nx-abre > *"), { translateY: [60, 0], opacity: [0, 1], delay: stagger(140), duration: 800, ease: "outExpo" });
  palco.tocar("_abertura");
  await palco.esperar(1800);
  palco.cena.innerHTML = "";

  for (const [i, n] of lista.entries()) {
    if (i === Math.floor(lista.length / 2) && i > 0) await palco.meio();
    await sequenciaNoticia(palco, n, { completa: true, apelo: false, sozinha: false, link });
  }

  // A mais quente (quando há mais de uma e há votos)
  const comVotos = lista.filter((n) => n.conta?.n);
  if (lista.length > 1 && comVotos.length) {
    const ordem = [...comVotos].sort((a, b) => (b.conta.quente || 0) - (a.conta.quente || 0));
    const quente = ordem[0];
    const t = TEMAS[quente.tema] || TEMAS.noticia;
    palco.tocar("rufo", { dur: 1.6 });
    palco.cena.innerHTML = `<div class="p-centro nx-final" style="--tc:${t.cor}"><div class="vv-etiqueta"><i></i>A notícia mais quente</div><div class="nx-pontos grande"><i>.</i><i>.</i><i>.</i></div></div>`;
    await palco.esperar(1800);
    palco.cena.innerHTML = `<div class="p-centro nx-final" style="--tc:${t.cor}"><div class="vv-etiqueta"><i></i>A notícia mais quente</div><div class="nx-tema">${t.icone} ${esc(t.nome)}</div><h2 class="p-titulo nx-final-titulo">${esc(quente.titulo)}</h2><p class="p-sub">🌡️ ${nivel(quente.conta.quente)} · ${inteiro(quente.conta.n)} ${quente.conta.n === 1 ? "voto" : "votos"}</p></div>`;
    animate(palco.cena.querySelectorAll(".nx-final > *"), { scale: [0.6, 1], opacity: [0, 1], delay: stagger(140), duration: 800, ease: spring({ stiffness: 150, damping: 13 }) });
    palco.festa({ forca: 0.7 });
    palco.resumir({ tipo: "ranking", medida: "Termómetro de stress", linhas: ordem.map((n, k) => ({ id: n.pessoas?.[0] || "", nome: n.titulo, valor: `${Math.round((n.conta.quente || 0) * 100)}%`, pos: k + 1 })).slice(0, 10) });
    await palco.passo(4200);
  }

  // Vota no site
  const qr = qrSvg(link);
  palco.cena.innerHTML = `<div class="p-centro rc-cena"><div class="vv-etiqueta"><i></i>O Caso</div><h2 class="p-titulo rc-titulo">E tu, o que achas?</h2><p class="p-sub">Reage às notícias e dá karma aos Youtubers no site do Placar.</p><div class="vv-onde"><div class="vv-texto"><b>Vai votar!</b><span class="vv-bio">👉 Link na bio</span></div>${qr ? `<div class="vv-qr">${qr}</div>` : ""}</div></div>`;
  animate(palco.cena.querySelectorAll(".rc-cena > *"), { translateY: [60, 0], opacity: [0, 1], delay: stagger(140), duration: 800, ease: "outExpo" });
  await palco.passo(4200);
  await palco.fecho();
}
