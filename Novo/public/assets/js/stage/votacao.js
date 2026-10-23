// O público escolheu: os resultados de uma votação do site.
// Lista do último ao primeiro; confrontos frente a frente; torneios ronda a ronda até ao campeão;
// nas previsões, a resposta certa e quantos acertaram.

import { api, pessoa } from "../data.js";
import { esc, inteiro } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco } from "./stage.js";
import { animar, cabecalho } from "./grafico.js";

const NOME_RONDA = (n, total) => (total - n === 0 ? "A final" : total - n === 1 ? "Meias-finais" : total - n === 2 ? "Quartos de final" : total - n === 3 ? "Oitavos de final" : `Ronda ${n}`);
const pctDe = (n, total) => (total ? Math.round((n / total) * 100) : 0);
const cara = (o, tam) => (o.p ? avatarPalco(o.p, tam) : `<span class="vo-letra" style="width:${tam}px;height:${tam}px">${esc(o.nome.slice(0, 1))}</span>`);

export async function correr(palco, opts) {
  const r = await palco.captura("votacoes", () => api(`votacoes?t=${Date.now()}`));
  const lista = r.votacoes || [];
  if (String(opts.votacao || "").startsWith("g:")) return torneio(palco, lista.filter((v) => v.grupo === opts.votacao.slice(2) && v.estado !== "rascunho"));
  const v = lista.find((x) => x.id === opts.votacao) || lista.find((x) => !x.grupo && x.votos && x.total);
  if (!v) throw new Error("Escolhe uma votação com votos (em Votações).");
  if (!v.votos) throw new Error("Os resultados desta votação ainda estão escondidos. Fecha-a ou ativa 'Mostrar os votos enquanto está aberta'.");
  if (!v.total) throw new Error("Esta votação ainda não tem votos.");
  if (v.opcoes.length === 2) return frente(palco, v);
  return listaVotos(palco, v);
}

function opcoesDe(v) {
  return v.opcoes.map((o) => ({ ...o, p: o.pessoa ? pessoa(o.pessoa) : null, n: v.votos?.[o.id] || 0 })).sort((a, b) => b.n - a.n);
}

/** Do último ao primeiro, com suspense no fim. */
async function listaVotos(palco, v) {
  const total = v.total;
  const lista = opcoesDe(v);
  const mostrar = lista.slice(0, palco.vertical ? 8 : 10);
  const vertical = palco.vertical;
  const cena = palco.cena;
  const previsao = v.modo === "previsao" || v.tipo === "previsao";
  palco.contexto = { metrica: "indice" };

  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: previsao ? "As vossas previsões" : "O público escolheu", titulo: v.titulo.length > 34 ? (previsao ? "Quem\nacertou?" : "Os vossos\nvotos") : v.titulo, sub: `${inteiro(total)} ${total === 1 ? "voto" : "votos"}${v.titulo.length > 34 ? ` · ${v.titulo}` : ""}`, tamanho: v.titulo.length > 22 && v.titulo.length <= 34 ? (vertical ? 76 : 92) : undefined });

  const alturaLinha = Math.min(vertical ? 170 : 120, ((vertical ? 1300 : 720) - (mostrar.length - 1) * 12) / mostrar.length);
  cena.innerHTML = `${cabecalho(v.titulo, `${inteiro(total)} ${total === 1 ? "voto" : "votos"} no site do Placar`)}
    <div class="vo-lista" style="--h:${alturaLinha}px">${mostrar
      .map((o, i) => `<div class="vo-linha" data-i="${i}">
        <span class="vo-pos">${i + 1}</span>
        ${cara(o, Math.round(alturaLinha * 0.78))}
        <div class="vo-barra"><i></i><b>${esc(o.nome)}</b></div>
        <span class="vo-pct">0%</span></div>`)
      .join("")}</div>`;
  const linhas = [...cena.querySelectorAll(".vo-linha")];
  const max = mostrar[0].n || 1;
  palco.musica("epico", 1);
  await palco.esperar(500);
  for (let i = mostrar.length - 1; i >= 0; i--) {
    if (i === 0) {
      palco.tocar("rufo", { dur: 2 });
      await palco.esperar(2100, { exato: true });
    }
    if (i === Math.floor(mostrar.length / 2)) await palco.meio();
    const el = linhas[i];
    const o = mostrar[i];
    el.classList.add("visivel");
    contar(el.querySelector(".vo-pct"), (o.n / total) * 100, { formato: (x) => `${Math.round(x)}%`, duracao: 700 });
    const barra = el.querySelector(".vo-barra i");
    palco.tocar(i === 0 ? "impacto" : "virar");
    await animar(palco, 650, (_, e) => (barra.style.width = `${(o.n / max) * 100 * e}%`));
    if (i === 0) {
      el.classList.add("lider");
      if (o.p && !previsao) palco.registar({ tipo: "coroa", espetaculo: "votacao", vence: o.p.id });
      palco.flash(0.5);
      const alvo = el.querySelector(".palco-avatar, .vo-letra");
      palco.festa({ som: !palco.evento("vencedor", { alvo, p: o.p || { name: o.nome } }) });
    } else await palco.esperar(i > 3 ? 650 : 1100);
  }
  await palco.passo(4500);
  if (v.resultado) await respostaCerta(palco, v, lista);
  palco.resumir({ tipo: "votacao", titulo: v.titulo, linhas: mostrar.map((o, i) => ({ id: o.p?.id, nome: o.nome, valor: `${pctDe(o.n, total)}%`, pos: i + 1 })), vencedor: { id: mostrar[0].p?.id, nome: mostrar[0].nome, valor: `${pctDe(mostrar[0].n, total)}%` } });
  await palco.fecho();
}

/** Nas previsões (e quando marcaste o vencedor): a resposta certa e quantos acertaram. */
async function respostaCerta(palco, v, lista) {
  const certo = lista.find((o) => o.id === v.resultado);
  if (!certo) return;
  const previsao = v.modo === "previsao" || v.tipo === "previsao";
  const pct = pctDe(certo.n, v.total);
  palco.cena.innerHTML = `<div class="p-centro vo-certo">
    <div class="vv-etiqueta">${previsao ? "A resposta certa" : "O vencedor"}</div>
    ${cara(certo, palco.vertical ? 360 : 280)}
    <h2 class="p-titulo">${esc(certo.nome)}</h2>
    ${previsao ? `<p class="vo-acertaram"><b data-n>0%</b> acertaram</p>` : `<p class="vo-acertaram"><b>${pct}%</b> dos votos</p>`}</div>`;
  const raiz = palco.cena.firstElementChild;
  palco.tocar("rufo", { dur: 1.4 });
  await palco.esperar(1500, { exato: true });
  raiz.classList.add("revelado");
  palco.tocar("impacto");
  palco.flash(0.6);
  if (previsao) contar(raiz.querySelector("[data-n]"), pct, { formato: (x) => `${Math.round(x)}%`, duracao: 1200 });
  if (certo.p) palco.registar({ tipo: "coroa", espetaculo: "votacao", vence: certo.p.id });
  palco.festa({ som: !palco.evento("vencedor", { alvo: raiz.querySelector(".palco-avatar, .vo-letra"), p: certo.p || { name: certo.nome } }) });
  await palco.passo(4500);
}

/** Dois frente a frente: a barra divide-se e o vencedor fica com o ecrã. */
async function frente(palco, v) {
  const [a, b] = v.opcoes.map((o) => ({ ...o, p: o.pessoa ? pessoa(o.pessoa) : null, n: v.votos?.[o.id] || 0 }));
  const total = v.total;
  const tam = palco.vertical ? 330 : 300;
  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: "O público escolheu", titulo: v.titulo.length > 30 ? "Frente a\nfrente" : v.titulo, sub: `${inteiro(total)} ${total === 1 ? "voto" : "votos"}` });
  palco.cena.innerHTML = `${cabecalho(v.titulo, `${inteiro(total)} ${total === 1 ? "voto" : "votos"} no site do Placar`)}
    <div class="vo-frente">
      <div class="vo-lado" data-l="a">${cara(a, tam)}<b>${esc(a.nome)}</b><span class="vo-pct-g">0%</span></div>
      <div class="vo-vs">VS</div>
      <div class="vo-lado" data-l="b">${cara(b, tam)}<b>${esc(b.nome)}</b><span class="vo-pct-g">0%</span></div>
    </div>
    <div class="vo-divisao"><i class="a"></i><i class="b"></i></div>`;
  const c = palco.cena;
  const [la, lb] = c.querySelectorAll(".vo-lado");
  const [ia, ib] = c.querySelectorAll(".vo-divisao i");
  palco.tocar("whoosh");
  await palco.esperar(900);
  palco.musica("epico", 1);
  palco.tocar("rufo", { dur: 2.4 });
  const pa = (a.n / total) * 100;
  // A barra balança de um lado para o outro antes de parar no resultado
  await animar(palco, 2600, (t) => {
    const osc = Math.sin(t * Math.PI * 5) * 30 * (1 - t);
    const x = 50 + (pa - 50) * t + osc;
    ia.style.width = `${x}%`;
    ib.style.width = `${100 - x}%`;
  }, { exato: true });
  contar(la.querySelector(".vo-pct-g"), pa, { formato: (x) => `${Math.round(x)}%`, duracao: 700 });
  contar(lb.querySelector(".vo-pct-g"), 100 - pa, { formato: (x) => `${Math.round(x)}%`, duracao: 700 });
  const vence = v.resultado ? (v.resultado === a.id ? a : b) : a.n >= b.n ? a : b;
  const empate = !v.resultado && a.n === b.n;
  await palco.esperar(800);
  if (!empate) {
    const el = vence === a ? la : lb;
    el.classList.add("vence");
    (vence === a ? lb : la).classList.add("perde");
    palco.tocar("impacto");
    palco.flash(0.6);
    if (vence.p) palco.registar({ tipo: "coroa", espetaculo: "votacao", vence: vence.p.id });
    palco.festa({ som: !palco.evento("vencedor", { alvo: el.querySelector(".palco-avatar, .vo-letra"), p: vence.p || { name: vence.nome } }) });
  }
  await palco.passo(5000);
  palco.resumir({ tipo: "votacao", titulo: v.titulo, linhas: [a, b].map((o, i) => ({ id: o.p?.id, nome: o.nome, valor: `${pctDe(o.n, total)}%`, pos: i + 1 })), vencedor: { id: vence.p?.id, nome: vence.nome, valor: `${pctDe(vence.n, total)}%` } });
  await palco.fecho();
}

/** Torneio do público: cada ronda aparece com os confrontos e quem passou; no fim, o campeão. */
async function torneio(palco, jogos) {
  if (!jogos.length) throw new Error("Este torneio ainda não tem confrontos abertos.");
  const base = jogos[0];
  const nome = base.extra?.nomeGrupo || "Torneio do Placar";
  const rondas = base.extra?.rondas || Math.max(...jogos.map((v) => v.ronda || 1));
  const campeaoId = jogos.find((v) => v.extra?.campeao)?.extra.campeao;
  const vertical = palco.vertical;
  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: "Torneio do público", titulo: nome.length > 26 ? "O torneio\ndo público" : nome, sub: `${base.extra?.participantes || ""} Youtubers · votado no site do Placar` });
  palco.musica("epico", 1);
  const ultima = Math.max(...jogos.map((v) => v.ronda || 1));
  let campeao = null;
  for (let r = 1; r <= ultima; r++) {
    const daRonda = jogos.filter((v) => (v.ronda || 1) === r).sort((x, y) => (x.extra?.pos || 0) - (y.extra?.pos || 0));
    const h = Math.min(vertical ? 190 : 110, ((vertical ? 1340 : 760) - (daRonda.length - 1) * 14) / daRonda.length);
    const tam = Math.round(h * 0.62);
    palco.cena.innerHTML = `${cabecalho(NOME_RONDA(r, rondas), nome)}
      <div class="vo-chave" style="--h:${h}px">${daRonda
        .map((v) => {
          const [a, b] = v.opcoes.map((o) => ({ ...o, p: o.pessoa ? pessoa(o.pessoa) : null, n: v.votos?.[o.id] || 0 }));
          return `<div class="vo-jogo" data-id="${esc(v.id)}">
            <div class="vo-j a">${cara(a, tam)}<b>${esc(a.nome)}</b><span>${v.votos ? `${pctDe(a.n, v.total)}%` : ""}</span></div>
            <i class="vo-jvs">VS</i>
            <div class="vo-j b"><span>${v.votos ? `${pctDe(b.n, v.total)}%` : ""}</span><b>${esc(b.nome)}</b>${cara(b, tam)}</div></div>`;
        })
        .join("")}</div>`;
    const els = [...palco.cena.querySelectorAll(".vo-jogo")];
    for (let i = 0; i < els.length; i++) {
      const v = daRonda[i];
      els[i].classList.add("visivel");
      palco.tocar("virar");
      await palco.esperar(daRonda.length > 4 ? 500 : 900);
      const ganhou = v.resultado || (v.votos && v.opcoes[0] && (v.votos[v.opcoes[0].id] || 0) !== (v.votos[v.opcoes[1].id] || 0) && !v.aberta ? [...v.opcoes].sort((x, y) => (v.votos[y.id] || 0) - (v.votos[x.id] || 0))[0].id : null);
      if (ganhou) {
        const lado = v.opcoes[0].id === ganhou ? "a" : "b";
        els[i].querySelector(`.vo-j.${lado}`).classList.add("passa");
        els[i].querySelector(`.vo-j.${lado === "a" ? "b" : "a"}`).classList.add("cai");
        palco.tocar("impacto");
        if (r === rondas) campeao = v.opcoes.find((o) => o.id === ganhou);
      } else els[i].classList.add("a-decorrer");
    }
    if (r === Math.ceil(ultima / 2)) await palco.meio();
    await palco.passo(r === ultima ? 4000 : 3000);
  }
  const final = campeao || (campeaoId && { nome: pessoa(campeaoId)?.name || campeaoId, pessoa: campeaoId });
  if (final) {
    const p = final.pessoa ? pessoa(final.pessoa) : null;
    palco.cena.innerHTML = `<div class="p-centro vo-certo revelado"><div class="vv-etiqueta">🏆 Campeão</div>${cara({ ...final, p }, vertical ? 380 : 300)}<h2 class="p-titulo">${esc(final.nome)}</h2><p class="vo-acertaram">${esc(nome)}</p></div>`;
    palco.tocar("rufo", { dur: 1.2 });
    await palco.esperar(1200, { exato: true });
    palco.flash(0.7);
    if (p) palco.registar({ tipo: "titulo", espetaculo: "torneio", vence: p.id });
    palco.festa({ som: !palco.evento("vencedor", { alvo: palco.cena.querySelector(".palco-avatar, .vo-letra"), p: p || { name: final.nome } }) });
    await palco.passo(5000);
  } else {
    palco.cena.innerHTML = `<div class="p-centro vo-certo revelado"><div class="vv-etiqueta">O torneio continua</div><h2 class="p-titulo">Quem passa?</h2><p class="vo-acertaram">Decide tu: vai votar!</p></div>`;
    await palco.passo(3500);
  }
  palco.resumir(final ? { tipo: "torneio", titulo: nome, vencedor: { id: final.pessoa || "", nome: final.nome, valor: "Campeão" }, nota: "Votado pelo público" } : { tipo: "votacao", titulo: nome, linhas: [] });
  await palco.fecho();
}
