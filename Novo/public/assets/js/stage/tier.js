// Tier list: cada Youtuber aparece em grande e cai na sua fila (S, A, B, C ou D).

import { esc, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, baralhar, comFoco } from "./stage.js";
import { METRICAS, rankingPor } from "./metricas.js";

const FILAS = [
  { id: "S", nome: "Lendas" },
  { id: "A", nome: "Gigantes" },
  { id: "B", nome: "Fortes" },
  { id: "C", nome: "A subir" },
  { id: "D", nome: "A crescer" },
];

/** Filas pela posição dentro do grupo escolhido: 10% S, 20% A, 30% B, 25% C e o resto D. */
function classificar(lista) {
  const n = lista.length;
  const cortes = [Math.max(1, Math.round(n * 0.1)), Math.round(n * 0.3), Math.round(n * 0.6), Math.round(n * 0.85)];
  return lista.map((x, i) => ({ ...x, fila: i < cortes[0] ? "S" : i < cortes[1] ? "A" : i < cortes[2] ? "B" : i < cortes[3] ? "C" : "D" }));
}

export async function correr(palco, opts) {
  const chave = ["views", "indiceKarma", "indiceNumeros"].includes(opts.metric) ? opts.metric : "indice";
  const met = METRICAS[chave];
  palco.contexto = { metrica: chave, m: opts.m, cat: opts.cat };
  let top = rankingPor(chave, opts.m, { cat: opts.cat, n: Number(opts.n) || 16 });
  top = comFoco(top, palco, { chave: (x) => x.p, criar: (p) => ({ p, v: met.valor(p, opts.m) }) }).filter((x) => x.v !== null && x.v !== undefined).sort((a, b) => b.v - a.v);
  if (top.length < 5) throw new Error("Há poucos Youtubers com dados para a tier list.");
  const lista = classificar(top);
  const ordem = baralhar(lista);
  const vertical = palco.vertical;
  const cena = palco.cena;
  const sub = `${met.nome(opts.m)}${opts.cat ? `, ${opts.cat}` : ""}`;

  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: "Tier list", titulo: chave === "indice" ? "Tier list\ndos Youtubers" : `Tier list de\n${mesNome(opts.m, { ano: false })}`, sub });
  palco.tela.classList.add("denso");

  cena.innerHTML = `<div class="tl-titulo">${esc(sub)}</div>
    <div class="tl-filas">${FILAS.map((f) => `<div class="tl-fila f-${f.id}"><div class="tl-rotulo"><b>${f.id}</b><small>${esc(f.nome)}</small></div><div class="tl-itens" data-fila="${f.id}"></div></div>`).join("")}</div>
    <div class="tl-palco"></div>`;
  const destaque = cena.querySelector(".tl-palco");
  palco.tocar("whoosh");
  palco.musica("epico", 1);
  await palco.esperar(900);

  for (const [i, x] of ordem.entries()) {
    if (i === Math.floor(ordem.length / 2)) await palco.meio();
    destaque.innerHTML = `<div class="tl-grande">${avatarPalco(x.p, vertical ? 300 : 320)}<div class="tl-nome">${esc(x.p.name)}</div><div class="tl-v" data-v="${x.v}">0</div></div>`;
    const grande = destaque.firstElementChild;
    grande.animate([{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 450, easing: "cubic-bezier(.2,1.4,.4,1)" });
    palco.tocar("virar");
    contar(grande.querySelector(".tl-v"), x.v, { formato: met.fmt, duracao: 800 });
    await palco.esperar(i < 3 ? 1700 : 1250);
    // Cai na fila
    const filaEl = cena.querySelector(`.tl-itens[data-fila="${x.fila}"]`);
    const item = document.createElement("div");
    item.className = "tl-item";
    item.innerHTML = `${avatarPalco(x.p, vertical ? 84 : 92).replace("palco-avatar", "")}<span>${esc(x.p.name)}</span>`;
    item.style.opacity = "0";
    filaEl.appendChild(item);
    const de = grande.querySelector(".avatar").getBoundingClientRect();
    const para = item.getBoundingClientRect();
    const t = palco.tela.getBoundingClientRect();
    const k = palco.L / t.width;
    const voo = document.createElement("div");
    voo.className = "tl-voo";
    voo.innerHTML = avatarPalco(x.p, vertical ? 300 : 320).replace("palco-avatar", "");
    Object.assign(voo.style, { left: (de.left - t.left) * k + "px", top: (de.top - t.top) * k + "px" });
    cena.appendChild(voo);
    grande.style.opacity = "0";
    palco.tocar("whoosh", { dur: 0.35 });
    const escala = para.width / de.width;
    await voo
      .animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${(para.left - de.left) * k}px, ${(para.top - de.top) * k}px) scale(${escala})` }], { duration: 520, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" })
      .finished.catch(() => {});
    voo.remove();
    item.style.opacity = "";
    item.animate([{ transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 350, easing: "cubic-bezier(.2,1.4,.4,1)" });
    filaEl.parentElement.animate([{ filter: "brightness(1.6)" }, { filter: "brightness(1)" }], { duration: 500 });
    if (x.fila === "S") {
      if (!palco.evento("revelar", { alvo: item, p: x.p, pos: 1 })) palco.tocar("_destaque");
      palco.flash(0.4);
      palco.explodir(para.left * k - t.left * k + 40, (para.top - t.top) * k + 40, { n: 60, forca: 0.6 });
    } else if (x.fila === "D") {
      if (!palco.evento("queda", { alvo: item, p: x.p })) palco.tocar("falha");
    } else palco.tocar("ponto");
    await palco.esperar(350);
  }
  destaque.innerHTML = "";
  // No vertical, as filas crescem para ocupar o espaço do destaque (que já não é preciso)
  if (vertical) {
    cena.classList.add("tl-fim");
    await palco.esperar(850);
  }
  const primeiro = cena.querySelector('.tl-itens[data-fila="S"] .tl-item .avatar');
  if (!(primeiro && palco.evento("vencedor", { alvo: primeiro, p: ordem.find((x) => x.fila === "S")?.p }))) palco.tocar("vitoria");
  palco.ambiente.chuva({ n: 120 });
  await palco.passo(6500);
  palco.tela.classList.remove("denso");
  const L = (p, valor = "", pos) => ({ id: p.id, nome: p.name, valor: String(valor), pos });
  palco.resumir({ tipo: "ranking", medida: met.nome(opts.m), linhas: lista.filter((x) => x.fila === "S" || x.fila === "A").map((x) => L(x.p, `Fila ${x.fila}`)), vencedor: lista[0] ? L(lista[0].p, "Fila S", 1) : null });
  await palco.fecho();
}
