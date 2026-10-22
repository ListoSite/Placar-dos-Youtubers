// Ligar as pessoas da folha antiga aos canais do YouTube.

import { esc, curto, inteiro, norm } from "../format.js";
import { $, $$, toast, confirmar } from "../ui.js";
import { adm, chamar, cartaoCanal, lerDb } from "./common.js";

export async function render(alvo) {
  let vista = "sugestao";
  let aParar = false;

  const desenhar = () => {
    const pessoas = Object.values(adm.db.people);
    const total = pessoas.length;
    const ligados = pessoas.filter((p) => p.channels.length).length;
    const pendentes = pessoas.filter((p) => !p.channels.length && !p.noMatch);
    const comSug = pendentes.filter((p) => adm.db.suggestions[p.id]?.list?.length);
    const semSug = pendentes.filter((p) => !adm.db.suggestions[p.id]?.list?.length);
    const porTentar = semSug.filter((p) => !adm.db.suggestions[p.id]).length;
    const ignorados = pessoas.filter((p) => p.noMatch && !p.channels.length);
    const lista = vista === "sugestao" ? comSug : vista === "sem" ? semSug : ignorados;

    alvo.innerHTML = `
      <div class="painel ed-bloco">
        <h3>Progresso</h3>
        <div class="ed-progresso"><i style="width:${((ligados / Math.max(1, total)) * 100).toFixed(1)}%"></i></div>
        <p class="soft" style="margin-top:8px">${inteiro(ligados)} de ${inteiro(total)} Youtubers já têm canal. ${porTentar ? `${inteiro(porTentar)} ainda não foram procurados.` : ""}</p>
        <p class="muted" style="font-size:var(--t-sm)">A procura automática experimenta o nome como @handle (por exemplo "Alex Santos" vira @alexsantos). Gasta 1 a 3 unidades da quota por pessoa. Confirmas cada canal antes de ficar ligado.</p>
        <div class="ed-acoes" style="justify-content:flex-start">
          <button class="btn btn-primario" id="mt-auto" ${porTentar ? "" : "disabled"}>Procurar automaticamente</button>
          <button class="btn" id="mt-parar" hidden>Parar</button>
          <span id="mt-estado" class="muted"></span>
        </div>
      </div>
      ${duplicados()}
      <div class="segmentos" style="margin:20px 0 14px">
        <button data-v="sugestao" aria-pressed="${vista === "sugestao"}">Para confirmar (${comSug.length})</button>
        <button data-v="sem" aria-pressed="${vista === "sem"}">Sem sugestão (${semSug.length})</button>
        <button data-v="ignorados" aria-pressed="${vista === "ignorados"}">Ignorados (${ignorados.length})</button>
      </div>
      <div id="mt-lista">${lista.length ? lista.slice(0, 60).map(linha).join("") : `<div class="vazio"><h3>${vista === "sugestao" ? "Nada para confirmar" : "Lista vazia"}</h3><p>${vista === "sugestao" ? "Carrega em Procurar automaticamente para encontrar canais." : ""}</p></div>`}</div>
      ${lista.length > 60 ? `<p class="muted">A mostrar 60 de ${lista.length}. Resolve estes para veres os seguintes.</p>` : ""}`;

    $$("[data-v]", alvo).forEach((b) =>
      b.addEventListener("click", () => {
        vista = b.dataset.v;
        desenhar();
      }),
    );
    $("#mt-auto", alvo).addEventListener("click", async () => {
      aParar = false;
      $("#mt-auto", alvo).disabled = true;
      $("#mt-parar", alvo).hidden = false;
      let feitos = 0;
      let achados = 0;
      try {
        while (!aParar) {
          $("#mt-estado", alvo).textContent = `A procurar… ${feitos} feitos, ${achados} canais encontrados.`;
          const r = await chamar("match/guess", { limit: 20 }, { recarregar: false });
          feitos += r.tried;
          achados += r.found;
          if (!r.tried || !r.remaining) break;
        }
      } catch {
        /* erro já mostrado */
      }
      await lerDb();
      toast(`Procura terminada: ${achados} canais encontrados em ${feitos} pessoas.`);
      vista = "sugestao";
      desenhar();
    });
    $("#mt-parar", alvo).addEventListener("click", () => {
      aParar = true;
      $("#mt-estado", alvo).textContent = "A parar depois deste lote…";
    });
    ligarAcoes();
  };

  const linha = (p) => {
    const sug = adm.db.suggestions[p.id];
    const leg = p.legacy || {};
    const pista = [leg.subs ? `${curto(leg.subs)} subs` : "", leg.totalViews ? `${curto(leg.totalViews)} views` : "", leg.createdAt ? `criado em ${leg.createdAt.slice(0, 4)}` : ""].filter(Boolean).join(", ");
    return `<div class="painel ed-bloco mt-pessoa" data-pessoa="${esc(p.id)}">
      <div class="ed-cabeca" style="margin-bottom:10px"><div><h3>${esc(p.name)}</h3><small class="muted">${esc(p.category || "sem categoria")}${pista ? `. Na folha: ${esc(pista)}` : ""}</small></div></div>
      ${(sug?.list || []).map((c) => cartaoCanal(c, c.linkedTo ? "" : `<button class="btn btn-primario btn-pequeno" data-ligar="${esc(c.id)}" data-a-esperar="A ligar">É este</button>`)).join("")}
      ${sug && !sug.list?.length ? `<p class="muted" style="font-size:var(--t-sm)">A procura por ${sug.method === "search" ? "nome" : "@handle"} não encontrou nada.</p>` : ""}
      <div class="mt-acoes">
        <input class="input" data-link placeholder="Colar link do canal certo" style="flex:1;min-width:200px">
        <button class="btn btn-pequeno" data-colar data-a-esperar="A ligar">Ligar link</button>
        <button class="btn btn-pequeno" data-procurar data-a-esperar="A procurar" title="Gasta 100 unidades da quota">Procurar pelo nome</button>
        ${sug?.list?.length ? `<button class="btn btn-pequeno" data-nao>Nenhum destes</button>` : ""}
        ${p.noMatch ? `<button class="btn btn-pequeno" data-voltar>Voltar a procurar</button>` : `<button class="btn btn-pequeno btn-perigo" data-ignorar>Ignorar</button>`}
      </div>
    </div>`;
  };

  const ligarAcoes = () => {
    $$(".mt-pessoa", alvo).forEach((bloco) => {
      const pid = bloco.dataset.pessoa;
      $$("[data-ligar]", bloco).forEach((b) =>
        b.addEventListener("click", async () => {
          await chamar("channel/link", { personId: pid, channelId: b.dataset.ligar, role: "principal" }, { botao: b, sucesso: "Canal ligado." }).catch(() => {});
          desenhar();
        }),
      );
      $("[data-colar]", bloco).addEventListener("click", async (e) => {
        const input = $("[data-link]", bloco).value.trim();
        if (!input) return toast("Cola o link do canal.", { erro: true });
        await chamar("channel/link", { personId: pid, input, role: "principal" }, { botao: e.currentTarget, sucesso: "Canal ligado." }).catch(() => {});
        desenhar();
      });
      $("[data-procurar]", bloco).addEventListener("click", async (e) => {
        await chamar("match/search", { personId: pid }, { botao: e.currentTarget, recarregar: false }).catch(() => {});
        await lerDb();
        vista = "sugestao";
        desenhar();
        document.querySelector(`[data-pessoa="${CSS.escape(pid)}"]`)?.scrollIntoView({ block: "center" });
      });
      $("[data-nao]", bloco)?.addEventListener("click", async () => {
        await chamar("match/clear", { personId: pid }, {}).catch(() => {});
        desenhar();
      });
      $("[data-ignorar]", bloco)?.addEventListener("click", async () => {
        if (!(await confirmar("Ignorar esta pessoa na procura de canais?", { sim: "Ignorar" }))) return;
        await chamar("match/clear", { personId: pid, noMatch: true }, {}).catch(() => {});
        desenhar();
      });
      $("[data-voltar]", bloco)?.addEventListener("click", async () => {
        await chamar("person", { person: { id: pid, noMatch: false } }, {}).catch(() => {});
        desenhar();
      });
    });
  };

  desenhar();
}

/** Pares de nomes que parecem ser a mesma pessoa ou um canal de clips. */
function duplicados() {
  const pessoas = Object.values(adm.db.people);
  const porNome = new Map(pessoas.map((p) => [norm(p.name), p]));
  const pares = [];
  for (const p of pessoas) {
    const n = norm(p.name);
    let m = /^(.*\S)\s+(2|3|ii|extra|mais|vlogs?|shorts|gaming|games|podcast|live|lives|tv|clips)$/.exec(n);
    let base = m ? porNome.get(m[1]) : null;
    let tipo = m ? (m[2].startsWith("clip") ? "clips" : "segundo canal") : "";
    if (!base) {
      m = /^(?:clips?|cortes?|o melhor) d[oae]s?\s+(.*)$/.exec(n);
      if (m && porNome.get(m[1])) {
        base = porNome.get(m[1]);
        tipo = "clips";
      }
    }
    if (base && base.id !== p.id) pares.push({ p, base, tipo });
  }
  if (!pares.length) return "";
  return `<div class="painel ed-bloco"><h3>Possíveis canais da mesma pessoa</h3>
    <p class="muted">Encontrei nomes parecidos. Se forem da mesma pessoa, abre o segundo e usa "Juntar". Canais de clips feitos por outras pessoas podem ficar separados ou ser apagados.</p>
    <div class="ed-hist">${pares
      .map(({ p, base, tipo }) => `<div><span><a href="#/editar/youtubers?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a> e <a href="#/editar/youtubers?id=${encodeURIComponent(base.id)}">${esc(base.name)}</a></span><span class="etiqueta">${esc(tipo)}</span></div>`)
      .join("")}</div></div>`;
}
