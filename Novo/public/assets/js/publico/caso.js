// O Caso: o que o público acha de cada Youtuber, à parte dos números.
// Apoiar 👍 quem fez algo bom, dizer "estou farto" 👎, e uma reação. Tudo anónimo, com a conta Google.

import { api, estado, indice, procurar } from "../data.js";
import { esc, inteiro } from "../format.js";
import { $, $$, avatar, toast } from "../ui.js";
import { temConta, tokenConta } from "../conta.js";
import { caixaConta } from "./entrar.js";
import { ligacaoPessoa } from "./comum.js";
import { animarBlocos } from "./animar.js";

const POR_PAGINA = 20;

/** Karma para mostrar: de -100 a +100. */
const pontos = (k) => Math.round((k?.k || 0) * 100);
const sinal = (n) => (n > 0 ? `+${n}` : String(n));

export async function render(main) {
  main.dataset.titulo = "O Caso";
  main.innerHTML = `<div class="wrap pub-pagina cs">
    <div class="pub-cabeca"><h1>O Caso</h1><p>Os números dizem uma coisa. E tu? Apoia 👍 quem fez algo bom, diz que estás farto 👎 de quem passou das marcas, e deixa a tua reação. Tudo <b>anónimo</b>.</p></div>
    <div id="cs-corpo"><div class="a-carregar"><div class="roda"></div></div></div>
  </div>`;
  const corpo = $("#cs-corpo", main);
  let dados;
  try {
    dados = await api("caso");
  } catch {
    corpo.innerHTML = `<div class="vidro pub-vazio"><h2>O Caso está fechado</h2><p class="muted">Volta em breve.</p></div>`;
    return;
  }
  const cfg = dados.supabase;
  if (!dados.ligado || !cfg) {
    corpo.innerHTML = `<div class="vidro pub-vazio"><h2>O Caso ainda não abriu</h2><p class="muted">Volta em breve.</p></div>`;
    return;
  }
  const regras = dados.regras;
  const resumo = dados.pessoas || {};
  let meus = {};

  corpo.innerHTML = `<div id="cs-conta"></div>
    <p class="cs-regra">${regras.noIndice ? `O karma mexe no Índice de Influência até ${regras.peso}% (para cima ou para baixo), e só com força total a partir de ${regras.minVotos} votos.` : "O karma fica à parte do Índice de Influência: os números são uma coisa, a opinião do público é outra."} Os votos antigos pesam menos: perdem metade da força em ${regras.meiaVida} dias.</p>
    <div id="cs-destaques"></div>
    <div class="cs-filtros">
      <div class="cs-seg" role="group" aria-label="Mostrar">
        <button data-f="todos" aria-pressed="true">Todos</button><button data-f="apoiados" aria-pressed="false">Apoiados</button><button data-f="criticados" aria-pressed="false">Criticados</button><button data-f="meus" aria-pressed="false">Os meus</button>
      </div>
      <input class="input" type="search" id="cs-procura" placeholder="Procurar Youtuber" autocomplete="off">
    </div>
    <div class="cs-lista" id="cs-lista" data-animacao="subir"></div>
    <div class="cs-mais"><button class="btn" id="cs-mais" hidden>Mostrar mais</button></div>`;

  const conta = await caixaConta($("#cs-conta", corpo), cfg, {
    destino: "#/caso",
    textoFora: "A conta Google serve só para garantir um voto por pessoa. Ninguém vê em quem votaste.",
    textoDentro: "Os teus votos são anónimos. Podes mudar de ideias quando quiseres.",
  });
  if (conta.eu) {
    const t = await tokenConta(cfg);
    if (t) meus = (await api("caso/eu", { metodo: "POST", corpo: { token: t } }).catch(() => ({ meus: {} }))).meus || {};
  }

  let filtro = "todos";
  let quantos = POR_PAGINA;
  let jaAnimou = false;
  const pessoas = estado.ds.people.filter((p) => !p.hidden);
  const porIndice = (a, b) => (estado.posIndice.get(a.id) || 9999) - (estado.posIndice.get(b.id) || 9999);

  // ---------- Peças ----------
  const medidor = (k) => {
    const v = pontos(k);
    return `<div class="cs-medidor" role="img" aria-label="Karma ${sinal(v)}"><i class="cs-meio"></i><i class="cs-barra ${v < 0 ? "neg" : "pos"}" style="${v < 0 ? `right:50%;width:${-v / 2}%` : `left:50%;width:${v / 2}%`}"></i></div>`;
  };
  const cartao = (p) => {
    const k = resumo[p.id];
    const v = pontos(k);
    const meu = meus[p.id] || { karma: 0, reacao: "" };
    const ind = indice(p.id);
    const href = ligacaoPessoa(p);
    const nome = href ? `<a href="${href}">${esc(p.name)}</a>` : esc(p.name);
    const reacoes = regras.reacoes
      ? `<div class="cs-reacoes">${Object.entries(dados.reacoes)
          .map(([id, r]) => `<button class="cs-reacao" data-reacao="${id}" aria-pressed="${meu.reacao === id}" title="${esc(r.nome)}"><span>${r.emoji}</span>${k?.r?.[id] ? `<b>${inteiro(k.r[id])}</b>` : ""}</button>`)
          .join("")}</div>`
      : "";
    return `<article class="vidro cs-cartao" data-p="${esc(p.id)}" data-anim-item>
      <div class="cs-topo">${avatar(p, 52)}<div class="cs-quem"><b>${nome}</b><small>${esc(p.category || "")}${ind.total !== null ? ` · Índice ${inteiro(ind.total)}` : ""}</small></div>
        <div class="cs-karma ${v > 0 ? "pos" : v < 0 ? "neg" : ""}"><b>${k ? sinal(v) : "–"}</b><small>${k ? `${inteiro(k.n)} ${k.n === 1 ? "voto" : "votos"}` : "Sem votos"}</small></div></div>
      ${medidor(k)}
      <div class="cs-botoes">
        <button class="cs-voto pos" data-karma="1" aria-pressed="${meu.karma === 1}">👍 <span>${meu.karma === 1 ? "Apoias" : "Apoiar"}</span>${k?.pos ? `<b>${inteiro(k.pos)}</b>` : ""}</button>
        <button class="cs-voto neg" data-karma="-1" aria-pressed="${meu.karma === -1}">👎 <span>${meu.karma === -1 ? "Estás farto" : "Farto"}</span>${k?.neg ? `<b>${inteiro(k.neg)}</b>` : ""}</button>
      </div>
      ${reacoes}
    </article>`;
  };

  const destaques = () => {
    const com = Object.entries(resumo).filter(([id, k]) => estado.pessoas.get(id) && k.n >= 1);
    const bons = com.filter(([, k]) => k.k > 0).sort((a, b) => b[1].k - a[1].k).slice(0, 3);
    const maus = com.filter(([, k]) => k.k < 0).sort((a, b) => a[1].k - b[1].k).slice(0, 3);
    if (!bons.length && !maus.length) return "";
    const linha = ([id, k]) => {
      const p = estado.pessoas.get(id);
      return `<div class="cs-dest-linha">${avatar(p, 34)}<span>${esc(p.name)}</span><b>${sinal(pontos(k))}</b></div>`;
    };
    return `<div class="cs-destaques">
      ${bons.length ? `<div class="vidro cs-dest pos"><h3>👍 Mais apoiados</h3>${bons.map(linha).join("")}</div>` : ""}
      ${maus.length ? `<div class="vidro cs-dest neg"><h3>👎 Mais criticados</h3>${maus.map(linha).join("")}</div>` : ""}
    </div>`;
  };

  const escolhidos = () => {
    const t = $("#cs-procura", corpo).value.trim();
    let l = t ? procurar(t, 60) : [...pessoas];
    if (filtro === "apoiados") l = l.filter((p) => resumo[p.id]?.k > 0).sort((a, b) => resumo[b.id].k - resumo[a.id].k);
    else if (filtro === "criticados") l = l.filter((p) => resumo[p.id]?.k < 0).sort((a, b) => resumo[a.id].k - resumo[b.id].k);
    else if (filtro === "meus") l = l.filter((p) => meus[p.id]).sort(porIndice);
    else if (!t) l.sort(porIndice);
    return l;
  };

  const desenhar = () => {
    $("#cs-destaques", corpo).innerHTML = destaques();
    const l = escolhidos();
    const lista = $("#cs-lista", corpo);
    lista.dataset.animacao = jaAnimou ? "nenhuma" : "subir";
    lista.innerHTML = l.length
      ? l.slice(0, quantos).map(cartao).join("")
      : `<div class="vidro pub-vazio"><p class="muted">${filtro === "meus" ? "Ainda não votaste em ninguém." : filtro === "apoiados" ? "Ainda ninguém tem karma positivo." : filtro === "criticados" ? "Ainda ninguém tem karma negativo." : "Ninguém com esse nome."}</p></div>`;
    $("#cs-mais", corpo).hidden = l.length <= quantos;
  };

  // ---------- Votar ----------
  const votar = async (id, mudanca, botoes) => {
    if (!temConta()) return conta.pedir("votar");
    if (!regras.votar) return toast("Os votos estão fechados por agora.", { erro: true });
    botoes.forEach((b) => (b.disabled = true));
    try {
      const t = await tokenConta(cfg);
      if (!t) return conta.pedir("votar");
      const r = await api("caso/voto", { metodo: "POST", corpo: { token: t, pessoa: id, ...mudanca } });
      if (r.voto.karma || r.voto.reacao) meus[id] = r.voto;
      else delete meus[id];
      if (r.resumo) resumo[id] = r.resumo;
      else delete resumo[id];
      const el = $(`.cs-cartao[data-p="${CSS.escape(id)}"]`, corpo);
      if (el) {
        el.outerHTML = cartao(estado.pessoas.get(id));
        ligar($(`.cs-cartao[data-p="${CSS.escape(id)}"]`, corpo));
      }
      $("#cs-destaques", corpo).innerHTML = destaques();
      if ("karma" in mudanca) toast(r.voto.karma === 1 ? "Apoias este Youtuber." : r.voto.karma === -1 ? "Disseste que estás farto." : "Tiraste o teu karma.");
    } catch (e) {
      toast(e.message, { erro: true });
      botoes.forEach((b) => (b.disabled = false));
    }
  };
  const ligar = (el) => {
    if (!el) return;
    const id = el.dataset.p;
    const botoes = $$("button", el);
    $$("[data-karma]", el).forEach((b) => b.addEventListener("click", () => votar(id, { karma: (meus[id]?.karma || 0) === Number(b.dataset.karma) ? 0 : Number(b.dataset.karma) }, botoes)));
    $$("[data-reacao]", el).forEach((b) => b.addEventListener("click", () => votar(id, { reacao: meus[id]?.reacao === b.dataset.reacao ? "" : b.dataset.reacao }, botoes)));
  };

  $$("[data-f]", corpo).forEach((b) =>
    b.addEventListener("click", () => {
      filtro = b.dataset.f;
      quantos = POR_PAGINA;
      $$("[data-f]", corpo).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      desenhar();
      $$(".cs-cartao", corpo).forEach(ligar);
    }),
  );
  let espera = null;
  $("#cs-procura", corpo).addEventListener("input", () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      quantos = POR_PAGINA;
      desenhar();
      $$(".cs-cartao", corpo).forEach(ligar);
    }, 180);
  });
  $("#cs-mais", corpo).addEventListener("click", () => {
    quantos += POR_PAGINA;
    desenhar();
    $$(".cs-cartao", corpo).forEach(ligar);
  });

  desenhar();
  $$(".cs-cartao", corpo).forEach(ligar);
  const fim = animarBlocos(main);
  jaAnimou = true;
  return fim;
}

