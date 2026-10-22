// Batalha: dois Youtubers, categoria a categoria.

import { estado, pessoa, indice, views, mediaMeses, recordes, projetosDe } from "../data.js";
import { esc, curto, inteiro, mesNome, decimal } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, confetes } from "./stage.js";

function escolherAoAcaso(excluir) {
  const top = [...estado.posIndice.entries()].filter(([id, pos]) => pos <= 60 && id !== excluir).map(([id]) => id);
  return pessoa(top[Math.floor(Math.random() * top.length)]);
}

export async function correr(palco, opts) {
  const a = pessoa(opts.a) || escolherAoAcaso();
  const b = pessoa(opts.b) || escolherAoAcaso(a?.id);
  if (!a || !b || a.id === b.id) throw new Error("Escolhe dois Youtubers diferentes.");
  const ref = estado.ref;
  const ra = recordes(a);
  const rb = recordes(b);
  const anos = (p) => (p.since ? new Date().getFullYear() - new Date(p.since).getFullYear() : null);
  const rondas = [
    { nome: "Índice de Influência", f: (p) => indice(p.id).total, fmt: inteiro },
    { nome: `Views em ${mesNome(ref, { ano: false })}`, f: (p) => views(p, ref), fmt: curto },
    { nome: "Média de 3 meses", f: (p) => mediaMeses(p, ref, 3), fmt: curto },
    { nome: "Melhor mês de sempre", f: (p) => (p === a ? ra : rb).melhor?.v ?? null, fmt: curto },
    { nome: "Meses no top 10", f: (p) => (p === a ? ra : rb).top10, fmt: inteiro },
    { nome: "Subscritores", f: (p) => p.totals?.subs ?? null, fmt: curto },
    { nome: "Views totais", f: (p) => p.totals?.views ?? null, fmt: curto },
    { nome: "Vídeos em 30 dias", f: (p) => p.vid?.up30 ?? null, fmt: inteiro },
    { nome: "Views por vídeo", f: (p) => p.vid?.med ?? null, fmt: curto },
    { nome: "Envolvimento", f: (p) => (p.vid?.eng ? p.vid.eng * 100 : null), fmt: (x) => decimal(x, 1) + "%" },
    { nome: "Projetos", f: (p) => projetosDe(p.id).length || null, fmt: inteiro },
    { nome: "Anos no YouTube", f: anos, fmt: inteiro },
  ]
    .map((r) => ({ ...r, va: r.f(a), vb: r.f(b) }))
    .filter((r) => r.va !== null && r.va !== undefined && r.vb !== null && r.vb !== undefined);
  if (rondas.length < 3) throw new Error("Estes dois Youtubers têm poucos números para comparar.");

  const vertical = palco.formato === "9x16";
  const cena = palco.cena;
  const tam = vertical ? 200 : 150;

  // Apresentação
  palco.musica("tensao", 1);
  cena.innerHTML = `<div class="p-centro" style="flex-direction:${vertical ? "column" : "row"};gap:${vertical ? 40 : 90}px">
    <div class="p-entra" style="display:flex;flex-direction:column;align-items:center;gap:30px">${avatarPalco(a, vertical ? 300 : 340)}<div class="p-titulo" style="font-size:${vertical ? 90 : 100}px">${esc(a.name)}</div></div>
    <div class="qz-vs p-slam" style="animation-delay:.5s;font-size:${vertical ? 150 : 200}px">VS</div>
    <div class="p-entra" style="display:flex;flex-direction:column;align-items:center;gap:30px;animation-delay:.25s">${avatarPalco(b, vertical ? 300 : 340)}<div class="p-titulo" style="font-size:${vertical ? 90 : 100}px">${esc(b.name)}</div></div></div>`;
  palco.tocar("whoosh");
  palco.tocar("impacto", {}, 0.55);
  await palco.passo(3400);

  cena.innerHTML = `
    <div class="bt-topo">
      <div class="bt-lado">${avatarPalco(a, tam)}<b>${esc(a.name)}</b></div>
      <div class="bt-placar"><span id="bt-a">0</span><i>–</i><span id="bt-b">0</span></div>
      <div class="bt-lado dir">${avatarPalco(b, tam)}<b>${esc(b.name)}</b></div>
    </div>
    <div class="bt-rondas"></div>`;
  palco.musica("epico", 1);
  const lista = cena.querySelector(".bt-rondas");
  const maxVisiveis = vertical ? 9 : 7;
  let pa = 0;
  let pb = 0;
  for (const [i, r] of rondas.entries()) {
    const row = document.createElement("div");
    row.className = "bt-ronda";
    row.innerHTML = `<span class="val"></span><span class="rotulo">${esc(r.nome)}</span><span class="val dir"></span>`;
    lista.appendChild(row);
    while (lista.children.length > maxVisiveis) lista.firstElementChild.remove();
    const [ea, eb] = row.querySelectorAll(".val");
    palco.tocar("virar");
    contar(ea, r.va, { formato: r.fmt, duracao: 900 });
    contar(eb, r.vb, { formato: r.fmt, duracao: 900 });
    await palco.esperar(1100);
    if (r.va !== r.vb) {
      const ganhaA = r.va > r.vb;
      (ganhaA ? ea : eb).classList.add("ganha");
      (ganhaA ? eb : ea).classList.add("perde");
      if (ganhaA) pa++;
      else pb++;
      const alvo = cena.querySelector(ganhaA ? "#bt-a" : "#bt-b");
      alvo.textContent = ganhaA ? pa : pb;
      alvo.classList.remove("mudou");
      void alvo.offsetWidth;
      alvo.classList.add("mudou");
      palco.tocar("ponto");
    }
    if (i === rondas.length - 3) palco.musica("epico", 2);
    await palco.passo(1500);
  }

  // Resultado
  await palco.esperar(600);
  const vencedor = pa === pb ? null : pa > pb ? a : b;
  cena.innerHTML = vencedor
    ? `<div class="p-centro">${avatarPalco(vencedor, vertical ? 360 : 300)}
        <p class="p-sub p-entra" style="margin-top:44px">Vencedor da batalha</p>
        <h1 class="p-titulo p-slam" style="font-size:${vertical ? 130 : 170}px;margin-top:10px">${esc(vencedor.name)}</h1>
        <p class="p-sub p-entra" style="animation-delay:.4s;font-family:var(--f-placar);font-weight:800;font-size:90px;color:var(--porcelana)">${Math.max(pa, pb)} – ${Math.min(pa, pb)}</p></div>`
    : `<div class="p-centro"><h1 class="p-titulo p-slam" style="font-size:180px">Empate</h1><p class="p-sub">${pa} – ${pb}</p></div>`;
  palco.tocar("vitoria");
  if (vencedor) confetes(cena);
  await palco.passo(6000);
}
