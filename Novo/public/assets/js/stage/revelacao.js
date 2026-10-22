// Revelação do top N: do último ao primeiro, com suspense no pódio.

import { estado } from "../data.js";
import { esc, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco } from "./stage.js";
import { METRICAS, rankingPor } from "./metricas.js";

function movimento(x) {
  if (x.ant === undefined) return "";
  if (x.ant === null) return `<div class="rv-mov novo">Entrada no ranking</div>`;
  const d = x.ant - x.pos;
  if (d > 0) return `<div class="rv-mov sobe">▲ Subiu ${d} ${d === 1 ? "lugar" : "lugares"}</div>`;
  if (d < 0) return `<div class="rv-mov desce">▼ Desceu ${-d} ${d === -1 ? "lugar" : "lugares"}</div>`;
  return `<div class="rv-mov igual">Mantém o lugar</div>`;
}

export async function correr(palco, opts) {
  const chave = METRICAS[opts.metric] ? opts.metric : "views";
  const met = METRICAS[chave];
  const top = rankingPor(chave, opts.m, { cat: opts.cat, n: Number(opts.n) || 10 });
  if (top.length < 3) throw new Error("Há poucos Youtubers com dados para este ranking.");
  const vertical = palco.vertical;
  const porMes = ["views", "subsMes", "crescimento"].includes(chave);
  const titulo = chave === "indice" ? "Os mais\ninfluentes" : chave === "crescimento" ? "Quem mais\ncresceu" : chave === "subsMes" ? "Quem ganhou mais\nsubscritores" : chave === "subs" ? "Os mais\nsubscritos" : chave === "total" ? "Os mais\nvistos de sempre" : `Top ${top.length}\nde ${mesNome(opts.m, { ano: false })}`;
  const sub = `${met.nome(opts.m)}${porMes ? "" : `, dados até ${mesNome(estado.ref)}`}${opts.cat ? `, categoria ${opts.cat}` : ""}`;
  const cena = palco.cena;

  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: chave === "views" ? "Ranking do mês" : `Top ${top.length}`, titulo, sub });

  cena.innerHTML = `<div class="rv-cartao"></div><div class="rv-lista"></div>`;
  const cartao = cena.querySelector(".rv-cartao");
  const listaEl = cena.querySelector(".rv-lista");
  const maxLista = vertical ? 5 : 8;

  const mostrar = async (x, { cor = "", misterio = false } = {}) => {
    cartao.innerHTML = `
      <div class="rv-pos p-slam ${cor}">${x.pos}<small>º</small></div>
      <div class="rv-quem p-entra" style="animation-delay:.25s">
        <span class="${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 300 : 230)}</span>
        <div><div class="rv-nome">${misterio ? "???" : esc(x.p.name)}</div><div class="rv-cat">${misterio ? "Quem será?" : esc(x.p.category || "")}</div></div>
      </div>
      ${misterio ? "" : `<div class="rv-valor p-entra" style="animation-delay:.45s"><b data-v="${x.v}">0</b><span>${esc(met.unidade)}</span></div>${movimento(x)}`}`;
    palco.tocar("whoosh");
    palco.tocar("virar", {}, 0.05);
    const b = cartao.querySelector("[data-v]");
    if (b) {
      contar(b, x.v, { formato: met.fmt, duracao: 1400, atraso: 450 });
      palco.tocar("ponto", {}, 1.85);
    }
  };
  const paraLista = (x) => {
    const row = document.createElement("div");
    row.className = "rv-linha";
    row.innerHTML = `<span class="n">${x.pos}</span>${avatarPalco(x.p, 52).replace("palco-avatar", "")}<b>${esc(x.p.name)}</b><span class="v">${met.fmt(x.v)}</span>`;
    listaEl.appendChild(row);
    while (listaEl.children.length > maxLista) listaEl.firstElementChild.remove();
  };

  for (let i = top.length - 1; i >= 3; i--) {
    await mostrar(top[i]);
    await palco.passo(i > 6 ? 3400 : 4000);
    cartao.firstElementChild?.classList.add("p-sai");
    paraLista(top[i]);
    await palco.esperar(350);
  }

  // Pódio
  cartao.innerHTML = `<div class="p-titulo p-slam" style="font-size:${vertical ? 86 : 112}px">E agora,<br>o pódio</div>`;
  palco.musica("epico", 1);
  palco.tocar("subida", { dur: 2.6 });
  palco.flash(0.4);
  await palco.esperar(2900);

  await mostrar(top[2], { cor: "bronze" });
  palco.tocar("impacto", {}, 0.1);
  palco.tremer(0.5);
  await palco.passo(4200);
  paraLista(top[2]);
  await mostrar(top[1], { cor: "prata" });
  palco.tocar("impacto", {}, 0.1);
  palco.tremer(0.7);
  palco.musica("epico", 2);
  await palco.passo(4200);
  paraLista(top[1]);

  // O primeiro lugar, com suspense
  await mostrar(top[0], { cor: "ouro", misterio: true });
  palco.tocar("rufo", { dur: 3.2 });
  await palco.esperar(3400, { exato: true });
  await mostrar(top[0], { cor: "ouro" });
  palco.tremer(1.2);
  palco.festa();
  await palco.passo(6500);

  // Pódio final
  const degrau = (x, altura, classe) => `<div class="rv-degrau">
      ${avatarPalco(x.p, vertical ? 170 : 200)}
      <b>${esc(x.p.name)}</b><small>${met.fmt(x.v)} ${esc(met.unidade)}</small>
      <div class="bloco ${classe}" style="height:${altura}px">${x.pos}</div></div>`;
  cena.innerHTML = `<div class="cr-titulo p-entra"><h2>${chave === "views" ? `O pódio de ${esc(mesNome(opts.m))}` : "O pódio"}</h2><p>${esc(sub)}</p></div><div class="rv-podio">
    ${degrau(top[1], vertical ? 380 : 260, "prata")}
    ${degrau(top[0], vertical ? 520 : 360, "ouro")}
    ${degrau(top[2], vertical ? 280 : 190, "bronze")}</div>`;
  palco.tocar("_destaque", {}, 0.4);
  palco.explodir(palco.L / 2, palco.A * 0.4, { n: 80 });
  await palco.passo(6500);
  await palco.fecho();
}
