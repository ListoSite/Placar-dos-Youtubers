// Bloco da área de edição para a estimativa dos meses em falta.

import { esc, inteiro } from "../format.js";
import { $, toast, confirmar } from "../ui.js";
import { adm, chamar, lerDb, avisarMudanca } from "./common.js";
import { carregar } from "../data.js";

export function blocoEstimativa(alvo, antesDe = null) {
  const caixa = document.createElement("div");
  caixa.className = "painel ed-bloco";
  if (antesDe) alvo.insertBefore(caixa, antesDe);
  else alvo.prepend(caixa);
  let aParar = false;
  const resultados = [];

  const desenhar = () => {
    const pessoas = Object.values(adm.db.people);
    const comCanal = pessoas.filter((p) => p.channels.length);
    const feitas = comCanal.filter((p) => p.estimativa && !p.estimativa.falhou);
    const pendentes = comCanal.filter((p) => !p.estimativa);
    const falhadas = comCanal.filter((p) => p.estimativa?.falhou);
    caixa.innerHTML = `
      <h3>Meses em falta: estimativa automática</h3>
      <p class="soft">Para os meses sem dados (por exemplo de agosto 2025 até ao início da recolha), o site vai buscar todos os vídeos de cada canal com as views de hoje e a data de publicação, e reparte essas views pelos meses, seguindo a forma como um vídeo costuma ganhar views. Depois afina o cálculo com os meses que já conhecemos da folha. Os valores ficam marcados como estimativa (≈) e são substituídos sempre que houver dados reais.</p>
      <p class="muted" style="font-size:var(--t-sm)">A recolha automática já faz isto sozinha, 4 Youtubers por hora. Aqui podes acelerar. Cada Youtuber gasta entre 2 e 40 unidades da quota (conforme o número de vídeos).</p>
      <div class="ed-progresso"><i style="width:${((feitas.length / Math.max(1, comCanal.length)) * 100).toFixed(1)}%"></i></div>
      <p class="soft" style="margin-top:8px">${inteiro(feitas.length)} de ${inteiro(comCanal.length)} Youtubers com canal já têm estimativa.${pendentes.length ? ` Faltam ${inteiro(pendentes.length)}.` : ""}${falhadas.length ? ` ${falhadas.length} falharam.` : ""}${pessoas.length - comCanal.length ? ` ${pessoas.length - comCanal.length} ainda não têm canal ligado e não podem ser estimados.` : ""}</p>
      <div class="ed-acoes" style="justify-content:flex-start">
        <button class="btn btn-primario" id="es-todos" ${pendentes.length + falhadas.length ? "" : "disabled"}>Estimar os que faltam</button>
        <button class="btn" id="es-refazer" ${feitas.length ? "" : "disabled"}>Refazer todos</button>
        <button class="btn" id="es-parar" hidden>Parar</button>
        <button class="btn btn-perigo btn-pequeno" id="es-apagar">Apagar estimativas</button>
        <span id="es-estado" class="muted"></span>
      </div>
      ${resultados.length ? `<div class="ed-hist" style="margin-top:12px">${resultados
        .slice(-12)
        .reverse()
        .map((r) => `<div><span>${esc(r.nome || r.personId)}</span><span class="muted">${r.falhou ? esc(r.falhou) : `${r.meses} meses, ${r.videos} vídeos${r.erro !== null && r.erro !== undefined ? `, erro típico ±${r.erro}%` : ", sem meses para afinar"}`}</span></div>`)
        .join("")}</div>` : ""}`;

    const correr = async (lista) => {
      aParar = false;
      $("#es-parar", caixa).hidden = false;
      $("#es-todos", caixa).disabled = true;
      $("#es-refazer", caixa).disabled = true;
      let i = 0;
      for (const p of lista) {
        if (aParar) break;
        i++;
        $("#es-estado", caixa).textContent = `A estimar ${p.name} (${i} de ${lista.length})…`;
        try {
          const r = await chamar("estimate", { personId: p.id }, { recarregar: false });
          resultados.push(r.result);
        } catch (e) {
          resultados.push({ personId: p.id, nome: p.name, falhou: e.message });
          if (/quota/i.test(e.message)) break;
        }
      }
      await lerDb();
      await carregar({ forcar: true });
      avisarMudanca();
      toast(`Estimativa feita para ${i} Youtubers.`);
      desenhar();
    };
    $("#es-todos", caixa).addEventListener("click", () => correr([...pendentes, ...falhadas]));
    $("#es-refazer", caixa).addEventListener("click", () => correr(feitas));
    $("#es-parar", caixa).addEventListener("click", () => {
      aParar = true;
      $("#es-estado", caixa).textContent = "A parar depois deste Youtuber…";
    });
    $("#es-apagar", caixa).addEventListener("click", async () => {
      if (!(await confirmar("Apagar todas as estimativas? Os dados reais ficam como estão.", { sim: "Apagar estimativas", perigo: true }))) return;
      const r = await chamar("estimate/clear", {}, {}).catch(() => null);
      if (r) toast(`${inteiro(r.removed)} meses estimados apagados.`);
      desenhar();
    });
  };
  desenhar();
}
