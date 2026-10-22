// O público escolheu: os resultados de uma votação, do último ao primeiro, com o vencedor no fim.

import { api, pessoa } from "../data.js";
import { esc, inteiro } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco } from "./stage.js";
import { animar, cabecalho } from "./grafico.js";

export async function correr(palco, opts) {
  const r = await api(`votacoes?t=${Date.now()}`);
  const v = r.votacoes?.find((x) => x.id === opts.votacao) || r.votacoes?.find((x) => x.votos && x.total);
  if (!v) throw new Error("Escolhe uma votação com votos (em Editar, Votações).");
  if (!v.votos) throw new Error("Os resultados desta votação ainda estão escondidos. Fecha-a ou ativa 'Mostrar os resultados'.");
  const total = v.total || 0;
  if (!total) throw new Error("Esta votação ainda não tem votos.");
  const lista = v.opcoes.map((o) => ({ ...o, p: o.pessoa ? pessoa(o.pessoa) : null, n: v.votos[o.id] || 0 })).sort((a, b) => b.n - a.n);
  const mostrar = lista.slice(0, palco.vertical ? 8 : 10);
  const vertical = palco.vertical;
  const cena = palco.cena;
  palco.contexto = { metrica: "indice" };

  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: "O público escolheu", titulo: v.titulo.length > 34 ? "Os vossos\nvotos" : v.titulo, sub: `${inteiro(total)} ${total === 1 ? "voto" : "votos"}${v.titulo.length > 34 ? ` · ${v.titulo}` : ""}`, tamanho: v.titulo.length > 22 && v.titulo.length <= 34 ? (vertical ? 76 : 92) : undefined });

  const alturaLinha = Math.min(vertical ? 170 : 120, ((vertical ? 1300 : 720) - (mostrar.length - 1) * 12) / mostrar.length);
  cena.innerHTML = `${cabecalho(v.titulo, `${inteiro(total)} ${total === 1 ? "voto" : "votos"} no site do Placar`)}
    <div class="vo-lista" style="--h:${alturaLinha}px">${mostrar
      .map((o, i) => `<div class="vo-linha" data-i="${i}">
        <span class="vo-pos">${i + 1}</span>
        ${o.p ? avatarPalco(o.p, Math.round(alturaLinha * 0.78)) : `<span class="vo-letra" style="width:${Math.round(alturaLinha * 0.78)}px;height:${Math.round(alturaLinha * 0.78)}px">${esc(o.nome.slice(0, 1))}</span>`}
        <div class="vo-barra"><i></i><b>${esc(o.nome)}</b></div>
        <span class="vo-pct">0%</span></div>`)
      .join("")}</div>`;
  const linhas = [...cena.querySelectorAll(".vo-linha")];
  const max = mostrar[0].n || 1;
  palco.musica("epico", 1);
  await palco.esperar(500);
  // Do último ao segundo, depois suspense para o primeiro
  for (let i = mostrar.length - 1; i >= 0; i--) {
    if (i === 0) {
      palco.tocar("rufo", { dur: 2 });
      await palco.esperar(2100, { exato: true });
    }
    if (i === Math.floor(mostrar.length / 2)) await palco.meio();
    const el = linhas[i];
    const o = mostrar[i];
    el.classList.add("visivel");
    const pct = (o.n / total) * 100;
    contar(el.querySelector(".vo-pct"), pct, { formato: (x) => `${Math.round(x)}%`, duracao: 700 });
    const barra = el.querySelector(".vo-barra i");
    palco.tocar(i === 0 ? "impacto" : "virar");
    await animar(palco, 650, (_, e) => (barra.style.width = `${(o.n / max) * 100 * e}%`));
    if (i === 0) {
      el.classList.add("lider");
      if (o.p) palco.registar({ tipo: "coroa", espetaculo: "votacao", vence: o.p.id });
      palco.flash(0.5);
      const alvo = el.querySelector(".palco-avatar, .vo-letra");
      palco.festa({ som: !palco.evento("vencedor", { alvo, p: o.p || { name: o.nome } }) });
    } else await palco.esperar(i > 3 ? 650 : 1100);
  }
  await palco.passo(5000);
  await palco.fecho();
}
