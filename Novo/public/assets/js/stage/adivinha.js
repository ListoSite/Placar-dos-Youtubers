// Adivinha quem é: foto desfocada e pistas uma a uma, até à revelação.

import { estado, indice, views, recordes } from "../data.js";
import { esc, curto, mesNome } from "../format.js";
import { avatarPalco, baralhar } from "./stage.js";
import { melhores } from "./metricas.js";

function pistas(p) {
  const ref = estado.ref;
  const out = [];
  if (p.category) out.push({ t: "Categoria", v: p.category });
  if (p.since) out.push({ t: "No YouTube desde", v: String(new Date(p.since).getFullYear()) });
  if (p.totals?.subs) out.push({ t: "Subscritores", v: curto(p.totals.subs) });
  const v = views(p, ref);
  if (v) out.push({ t: `Views em ${mesNome(ref, { ano: false })}`, v: curto(v) });
  const rec = recordes(p);
  if (rec.melhor) out.push({ t: "Melhor mês", v: `${curto(rec.melhor.v)} em ${mesNome(rec.melhor.m, { curto: true })}` });
  const pos = estado.posIndice.get(p.id);
  if (pos) out.push({ t: "Índice de Influência", v: `${indice(p.id).total} (${pos}.º)` });
  const nome = p.name.trim();
  out.push({ t: "O nome", v: `Começa por “${nome[0].toUpperCase()}” e tem ${nome.replace(/\s/g, "").length} letras` });
  // As pistas mais vagas primeiro, a do nome sempre no fim
  const ultima = out.pop();
  return [...out.slice(0, 4), ultima];
}

export async function correr(palco, opts) {
  const n = Number(opts.n) || 6;
  const pool = baralhar(melhores(Number(opts.dif) || 60));
  const comFoto = pool.filter((p) => p.photo);
  const escolhidos = (comFoto.length >= n ? comFoto : pool).slice(0, n);
  if (escolhidos.length < 2) throw new Error("Há poucos Youtubers para este jogo.");
  const vertical = palco.vertical;
  const cena = palco.cena;

  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: "Jogo", titulo: "Adivinha\nquem é", sub: "Uma foto desfocada e pistas a aparecer. Diz o nome antes da revelação." });

  const desfoque = [46, 32, 22, 14, 8, 0];
  for (const [i, p] of escolhidos.entries()) {
    const ps = pistas(p);
    const temFoto = Boolean(p.photo);
    cena.innerHTML = `<div class="av-topo">Ronda ${i + 1} de ${escolhidos.length}</div>
      <div class="av-mesa">
        <div class="av-misterio"><div class="av-foto" style="--blur:${desfoque[0]}px">${temFoto ? avatarPalco(p, vertical ? 460 : 520) : `<div class="av-silhueta"><span>?</span></div>`}</div><div class="av-anel"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47"/></svg></div></div>
        <div class="av-pistas">${ps.map((x, k) => `<div class="av-pista" data-k="${k}"><small>${esc(x.t)}</small><b>${esc(x.v)}</b></div>`).join("")}</div>
      </div>
      <div class="av-nome"></div>`;
    palco.tocar("whoosh");
    const foto = cena.querySelector(".av-foto");
    const anel = cena.querySelector(".av-anel circle");
    const tempoTotal = ps.length * 2400;
    anel.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 295 }], { duration: tempoTotal * palco.fator, fill: "forwards", easing: "linear" });
    for (let k = 0; k < ps.length; k++) {
      const el = cena.querySelector(`.av-pista[data-k="${k}"]`);
      el.classList.add("visivel");
      palco.tocar(k === ps.length - 1 ? "_destaque" : "virar");
      foto.style.setProperty("--blur", `${desfoque[Math.min(k + 1, desfoque.length - 2)]}px`);
      await palco.esperar(2400);
    }
    // Revelação
    palco.tocar("rufo", { dur: 1.2 });
    await palco.esperar(1200, { exato: true });
    foto.style.setProperty("--blur", "0px");
    if (!temFoto) foto.innerHTML = avatarPalco(p, vertical ? 460 : 520);
    foto.classList.add("revelado");
    cena.querySelector(".av-nome").innerHTML = `<div class="p-titulo p-slam">${esc(p.name)}</div>`;
    palco.flash(0.7);
    palco.tocar("impacto");
    palco.tocar("_destaque", {}, 0.2);
    palco.explodir(vertical ? palco.L / 2 : palco.L * 0.3, vertical ? palco.A * 0.33 : palco.A * 0.5, { n: 90 });
    await palco.passo(3200);
  }

  cena.innerHTML = `<div class="p-centro"><h1 class="p-titulo p-slam" style="font-size:${vertical ? 100 : 120}px">Quantos<br>adivinhaste?</h1><p class="p-sub p-entra" style="animation-delay:.4s">Diz nos comentários.</p></div>`;
  palco.festa({ forca: 0.7 });
  await palco.passo(4500);
  await palco.fecho();
}
