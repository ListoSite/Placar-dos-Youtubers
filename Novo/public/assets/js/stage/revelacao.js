// Revelação do top N: do último ao primeiro, com suspense no pódio.

import { estado, rankingMes, indice } from "../data.js";
import { esc, curto, inteiro, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, confetes } from "./stage.js";

const LOGO = `<svg class="p-logo" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg-revelacao" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d70"/><stop offset=".55" stop-color="#c3123e"/><stop offset="1" stop-color="#6e0820"/></linearGradient></defs><rect width="40" height="40" rx="13" fill="url(#lg-revelacao)"/><path class="marca-play" d="M16 12.6c0-1.5 1.6-2.4 2.9-1.6l10.1 6.4c1.2.8 1.2 2.5 0 3.3l-10.1 6.4c-1.3.8-2.9-.1-2.9-1.6z" fill="#fff"/><circle class="marca-ponto" cx="32" cy="8" r="4.2" fill="#f4b942" stroke="#12060b" stroke-width="2"/></svg>`;

function lista(opts) {
  const n = Number(opts.n) || 10;
  if (opts.metric === "indice") {
    return estado.ds.people
      .filter((p) => (!opts.cat || p.category === opts.cat) && indice(p.id).total !== null)
      .map((p) => ({ p, v: indice(p.id).total }))
      .sort((a, b) => b.v - a.v)
      .slice(0, n)
      .map((x, i) => ({ ...x, pos: i + 1, ant: undefined }));
  }
  return rankingMes(opts.m, { categoria: opts.cat }).slice(0, n);
}

function movimento(x) {
  if (x.ant === undefined) return "";
  if (x.ant === null) return `<div class="rv-mov novo">Entrada no ranking</div>`;
  const d = x.ant - x.pos;
  if (d > 0) return `<div class="rv-mov sobe">▲ Subiu ${d} ${d === 1 ? "lugar" : "lugares"}</div>`;
  if (d < 0) return `<div class="rv-mov desce">▼ Desceu ${-d} ${d === -1 ? "lugar" : "lugares"}</div>`;
  return `<div class="rv-mov igual">Mantém o lugar</div>`;
}

export async function correr(palco, opts) {
  const top = lista(opts);
  if (top.length < 3) throw new Error("Há poucos Youtubers com dados para este ranking.");
  const vertical = palco.formato === "9x16";
  const ehIndice = opts.metric === "indice";
  const fmt = ehIndice ? inteiro : curto;
  const unidade = ehIndice ? "Índice" : "views";
  const titulo = ehIndice ? "Os mais influentes" : `Top ${top.length} de ${mesNome(opts.m, { ano: false })}`;
  const sub = ehIndice ? `Índice de Influência, dados até ${mesNome(estado.ref)}` : `Views ganhas em ${mesNome(opts.m)}${opts.cat ? `, categoria ${opts.cat}` : ""}`;
  const cena = palco.cena;

  // Abertura
  palco.musica("tensao", 1);
  cena.innerHTML = `<div class="p-centro">${LOGO}
    <h1 class="p-titulo p-entra" style="font-size:${vertical ? 90 : 114}px;margin-top:50px;animation-delay:.35s">${esc(titulo)}</h1>
    <p class="p-sub p-entra" style="animation-delay:.6s">${esc(sub)}</p></div>`;
  palco.tocar("revelar", {}, 0.3);
  await palco.passo(3600);
  cena.firstElementChild.classList.add("p-sai");
  await palco.esperar(450);

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
      ${misterio ? "" : `<div class="rv-valor p-entra" style="animation-delay:.45s"><b data-v="${x.v}">0</b><span>${unidade}</span></div>${movimento(x)}`}`;
    palco.tocar("whoosh");
    palco.tocar("virar", {}, 0.05);
    const b = cartao.querySelector("[data-v]");
    if (b) {
      contar(b, x.v, { formato: fmt, duracao: 1400, atraso: 450 });
      palco.tocar("ponto", {}, 1.85);
    }
  };
  const paraLista = (x) => {
    const row = document.createElement("div");
    row.className = "rv-linha";
    row.innerHTML = `<span class="n">${x.pos}</span>${avatarPalco(x.p, 52).replace("palco-avatar", "")}<b>${esc(x.p.name)}</b><span class="v">${fmt(x.v)}</span>`;
    listaEl.appendChild(row);
    while (listaEl.children.length > maxLista) listaEl.firstElementChild.remove();
  };

  for (let i = top.length - 1; i >= 3; i--) {
    await mostrar(top[i]);
    await palco.passo(i > 6 ? 3600 : 4200);
    cartao.firstElementChild?.classList.add("p-sai");
    paraLista(top[i]);
    await palco.esperar(350);
  }

  // Pódio
  cartao.innerHTML = `<div class="p-titulo p-entra" style="font-size:${vertical ? 78 : 102}px">E agora,<br>o pódio</div>`;
  palco.musica("epico", 1);
  palco.tocar("subida", { dur: 2.6 });
  await palco.esperar(2900);

  await mostrar(top[2], { cor: "bronze" });
  palco.tocar("impacto", {}, 0.1);
  await palco.passo(4300);
  paraLista(top[2]);
  await mostrar(top[1], { cor: "prata" });
  palco.tocar("impacto", {}, 0.1);
  palco.musica("epico", 2);
  await palco.passo(4300);
  paraLista(top[1]);

  // O primeiro lugar, com suspense
  await mostrar(top[0], { cor: "ouro", misterio: true });
  palco.tocar("rufo", { dur: 3.2 });
  await palco.esperar(3400);
  await mostrar(top[0], { cor: "ouro" });
  palco.tocar("vitoria");
  confetes(cena);
  await palco.passo(6500);

  // Pódio final
  const degrau = (x, altura, cor) => `<div class="rv-degrau">
      ${avatarPalco(x.p, vertical ? 170 : 200)}
      <b>${esc(x.p.name)}</b><small>${fmt(x.v)} ${unidade}</small>
      <div class="bloco" style="height:${altura}px;background:${cor}">${x.pos}</div></div>`;
  cena.innerHTML = `<div class="cr-titulo p-entra"><h2>${ehIndice ? "Os 3 mais influentes" : `O pódio de ${esc(mesNome(opts.m))}`}</h2><p>${esc(sub)}</p></div><div class="rv-podio">
    ${degrau(top[1], vertical ? 380 : 260, "var(--prata)")}
    ${degrau(top[0], vertical ? 520 : 360, "var(--ouro)")}
    ${degrau(top[2], vertical ? 280 : 190, "var(--bronze)")}</div>`;
  palco.tocar("brilho", {}, 0.4);
  await palco.passo(7000);
}
