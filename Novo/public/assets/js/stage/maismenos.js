// Mais ou menos: o próximo Youtuber tem mais ou menos do que o anterior? Uma corrente.
// Responde com ↑ / ↓, as teclas + e −, ou tocando nos botões.

import { esc } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, baralhar, contagem } from "./stage.js";
import { METRICAS, melhores } from "./metricas.js";

function corrente(pool, n, valor) {
  const com = baralhar(pool.map((p) => ({ p, v: valor(p) })).filter((x) => x.v !== null && x.v !== undefined && x.v > 0));
  if (com.length < 3) return [];
  const usados = new Set();
  const out = [com[0]];
  usados.add(com[0].p.id);
  while (out.length < n + 1) {
    const atual = out[out.length - 1];
    const prox = com.find((x) => !usados.has(x.p.id) && x.v !== atual.v && Math.max(x.v, atual.v) / Math.min(x.v, atual.v) >= 1.12 && Math.max(x.v, atual.v) / Math.min(x.v, atual.v) <= 5);
    const alternativa = prox || com.find((x) => !usados.has(x.p.id) && x.v !== atual.v);
    if (!alternativa) break;
    usados.add(alternativa.p.id);
    out.push(alternativa);
  }
  return out;
}

export async function correr(palco, opts) {
  const chave = METRICAS[opts.metric] ? opts.metric : "views";
  const met = METRICAS[chave];
  const lista = corrente(melhores(Number(opts.top) || 100), Number(opts.n) || 10, (p) => met.valor(p, opts.m));
  if (lista.length < 3) throw new Error("Há poucos Youtubers com dados para este jogo.");
  const vertical = palco.vertical;
  const cena = palco.cena;
  const palavra = chave === "subs" ? "subscritores" : "views";
  let serie = 0;
  let melhorSerie = 0;
  let respondidas = 0;
  let certas = 0;

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Jogo", titulo: "Mais ou\nmenos?", sub: `${met.nome(opts.m)}. Responde com ↑ ↓ ou toca nos botões.` });
  palco.musica("epico", 1);

  const cartao = (x, conhecido, classe) => `<div class="mm-cartao ${classe}">
      ${avatarPalco(x.p, vertical ? 230 : 280)}
      <div class="mm-nome">${esc(x.p.name)}</div>
      <div class="mm-valor">${conhecido ? esc(met.fmt(x.v)) : "?"}</div>
      <div class="mm-unid">${esc(met.unidade)}</div></div>`;

  for (let i = 1; i < lista.length; i++) {
    const a = lista[i - 1];
    const b = lista[i];
    cena.innerHTML = `<div class="mm-topo"><span>Ronda ${i} de ${lista.length - 1}</span><span class="mm-serie">Sequência <b>${serie}</b></span></div>
      <div class="mm-pergunta p-entra">${esc(b.p.name)} tem mais ou menos ${palavra} do que ${esc(a.p.name)}?</div>
      <div class="mm-mesa">
        ${cartao(a, true, "conhecido")}
        <div class="mm-botoes"><button class="mm-btn mais" data-escolha="mais">▲ Mais</button><div class="mm-conta">5</div><button class="mm-btn menos" data-escolha="menos">▼ Menos</button></div>
        ${cartao(b, false, "novo p-entra")}
      </div>
      <div class="qz-tempo"><i></i></div>`;
    palco.tocar("whoosh");
    await palco.esperar(900);
    let escolha = null;
    const parar = palco.ouvir((ev) => {
      let e = ev.escolha || null;
      if (ev.tecla === "ArrowUp" || ev.tecla === "+") e = "mais";
      if (ev.tecla === "ArrowDown" || ev.tecla === "-") e = "menos";
      if (!e || escolha) return false;
      escolha = e;
      cena.querySelector(`.mm-btn.${e}`).classList.add("escolhido");
      palco.tocar("clique");
      return true;
    });
    cena.querySelector(".qz-tempo i").classList.add("a-correr");
    await contagem(palco, cena.querySelector(".mm-conta"), 5);
    parar();
    const certa = b.v > a.v ? "mais" : "menos";
    const valorEl = cena.querySelector(".mm-cartao.novo .mm-valor");
    contar(valorEl, b.v, { formato: met.fmt, duracao: 1100 });
    palco.tocar("subida", { dur: 1 });
    await palco.esperar(1250);
    cena.querySelector(`.mm-btn.${certa}`).classList.add("certa");
    cena.querySelector(`.mm-btn.${certa === "mais" ? "menos" : "mais"}`).classList.add("errada");
    const novo = cena.querySelector(".mm-cartao.novo");
    novo.classList.add(certa);
    if (escolha) {
      respondidas++;
      if (escolha === certa) {
        certas++;
        serie++;
        melhorSerie = Math.max(melhorSerie, serie);
        palco.tocar("acerto");
        palco.tocar("moeda", {}, 0.2);
        palco.explodir(vertical ? palco.L / 2 : palco.L * 0.78, vertical ? palco.A * 0.72 : palco.A * 0.5, { n: 50, forca: 0.6 });
        if (serie > 0 && serie % 5 === 0) {
          palco.flash(0.5);
          palco.tocar("_destaque", {}, 0.3);
        }
      } else {
        serie = 0;
        palco.tocar("falha");
        palco.tremer(0.6);
      }
      cena.querySelector(".mm-serie b").textContent = serie;
    } else {
      palco.tocar("ponto");
    }
    await palco.passo(2200);
  }

  const titulo = respondidas ? `${certas} de ${respondidas}` : "Quantas\nacertaste?";
  cena.innerHTML = `<div class="p-centro"><h1 class="p-titulo p-slam" style="font-size:${vertical ? 110 : 130}px">${esc(titulo).replace("\n", "<br>")}</h1>
    <p class="p-sub p-entra" style="animation-delay:.4s">${respondidas ? `Melhor sequência: ${melhorSerie}` : "Diz nos comentários até onde chegaste."}</p></div>`;
  palco.festa({ forca: 0.8 });
  await palco.passo(5000);
  await palco.fecho();
}
