// Definições: pesos do Índice, recolha manual, cópias de segurança, sair.

import { estado, api } from "../data.js";
import { esc, inteiro, ha, curto, mesNome } from "../format.js";
import { $, $$, avatar, toast, confirmar } from "../ui.js";
import { PARTES, calcularIndice } from "../score.js";
import { adm, chamar, quotaTexto } from "./common.js";
import { sair } from "./admin.js";

export async function render(alvo) {
  const s = adm.db.settings;
  const pesos = { ...s.weights };
  let topo = s.alcanceTopo || 1e7;
  const meta = estado.ds.meta;
  const canal = { nome: "Placar dos Youtubers", youtube: "@placardosyoutubers", tiktok: "", instagram: "", hashtags: "", ...(s.canal || {}) };

  alvo.innerHTML = `
    <div class="painel ed-bloco">
      <h3>Estado</h3>
      <div class="ed-estado">
        <div><span>Chave da API do YouTube</span><b>${adm.hasApiKey ? "Ligada" : "Em falta"}</b></div>
        <div><span>Última recolha diária</span><b>${meta.lastDaily ? esc(ha(meta.lastDaily)) : "Nunca"}</b></div>
        <div><span>Últimos vídeos atualizados</span><b>${meta.lastVideos ? esc(ha(meta.lastVideos)) : "Nunca"}</b></div>
        <div><span>Recolha desde</span><b>${meta.trackingSince ? esc(mesNome(meta.trackingSince)) : "–"}</b></div>
      </div>
      <p class="muted" style="margin-top:12px">${esc(quotaTexto())} A recolha automática corre todos os dias de madrugada (números de todos os canais) e de hora a hora (vídeos de 20 canais e 3 projetos).</p>
      <div class="ed-acoes" style="justify-content:flex-start;flex-wrap:wrap">
        <button class="btn" data-recolha="daily" data-a-esperar="A recolher">Recolher números de todos os canais</button>
        <button class="btn" data-recolha="videos" data-a-esperar="A atualizar">Atualizar vídeos de 15 canais</button>
        <button class="btn" data-recolha="projects" data-a-esperar="A atualizar">Atualizar 4 projetos</button>
      </div>
    </div>

    <div class="painel ed-bloco">
      <h3>Pesos do Índice de Influência</h3>
      <p class="muted">Muda os pesos e vê logo como fica o top 10. Os pesos são relativos: não precisam de somar 100.</p>
      <div class="ed-pesos-grelha">
        <div class="ed-pesos">${PARTES.map((pt) => `<label class="ed-peso"><span><b>${pt.nome}</b><small>${esc(pt.explica)}</small></span><input type="range" min="0" max="60" step="1" data-peso="${pt.id}" value="${pesos[pt.id]}"><output>${pesos[pt.id]}</output></label>`).join("")}
          <label class="campo" style="margin-top:12px"><span>Views por mês que valem nota máxima no Alcance</span><input class="input" type="number" id="st-topo" min="10000" step="100000" value="${topo}"><small>Hoje: ${curto(topo)}. Quem faz isto por mês tem 100 no Alcance.</small></label>
        </div>
        <div><h4 class="soft" style="font-size:var(--t-sm);margin-bottom:8px">Top 10 com estes pesos</h4><ol class="ed-top" id="st-top"></ol></div>
      </div>
      <div class="ed-acoes"><button class="btn" id="st-repor">Repor pesos iniciais</button><button class="btn btn-primario" id="st-guardar" data-a-esperar="A guardar">Guardar pesos</button></div>
    </div>

    <div class="painel ed-bloco">
      <h3>Canal nas redes</h3>
      <p class="muted">Aparece no fim de cada espetáculo do Palco (e a meio, nos vídeos), para quem vê seguir o canal. Também entra nas legendas sugeridas para publicar.</p>
      <div class="ed-grelha" id="st-canal">
        <label class="campo"><span>Nome do canal</span><input class="input" name="nome" value="${esc(canal.nome || "")}"></label>
        <label class="campo"><span>YouTube</span><input class="input" name="youtube" placeholder="@placardosyoutubers" value="${esc(canal.youtube || "")}"></label>
        <label class="campo"><span>TikTok</span><input class="input" name="tiktok" placeholder="@placardosyoutubers" value="${esc(canal.tiktok || "")}"></label>
        <label class="campo"><span>Instagram</span><input class="input" name="instagram" placeholder="@placardosyoutubers" value="${esc(canal.instagram || "")}"></label>
      </div>
      <label class="campo" style="margin-top:12px"><span>Hashtags para as legendas</span><input class="input" id="st-hashtags" value="${esc(canal.hashtags || "")}"></label>
      <div class="ed-acoes"><button class="btn btn-primario" id="st-guardar-canal" data-a-esperar="A guardar">Guardar canal</button></div>
    </div>

    <div class="painel ed-bloco">
      <h3>Cópias de segurança</h3>
      <p class="muted">A cópia guarda tudo: Youtubers, canais, meses, projetos e os registos diários. Faz uma de vez em quando.</p>
      <div class="ed-acoes" style="justify-content:flex-start">
        <button class="btn" id="st-exportar" data-a-esperar="A preparar">Descarregar cópia</button>
        <label class="btn">Repor a partir de uma cópia<input type="file" id="st-importar" accept=".json" hidden></label>
      </div>
    </div>

    <div class="painel ed-bloco">
      <h3>Sessão</h3>
      <p class="muted">A sessão dura 30 dias neste browser.</p>
      <button class="btn" id="st-sair">Sair da área de edição</button>
    </div>`;

  const desenharTop = () => {
    const ctx = { janela: estado.janela, pesos, topo };
    const top = estado.ds.people
      .map((p) => ({ p, t: calcularIndice(p, ctx).total, antes: estado.posIndice.get(p.id) }))
      .filter((x) => x.t !== null)
      .sort((a, b) => b.t - a.t)
      .slice(0, 10);
    $("#st-top", alvo).innerHTML = top
      .map((x, i) => `<li>${avatar(x.p, 26)}<span>${esc(x.p.name)}</span><b>${inteiro(x.t)}</b><small class="muted">${x.antes ? (x.antes === i + 1 ? "igual" : `era ${x.antes}.º`) : ""}</small></li>`)
      .join("");
  };
  $$("[data-peso]", alvo).forEach((r) =>
    r.addEventListener("input", () => {
      pesos[r.dataset.peso] = Number(r.value);
      r.nextElementSibling.textContent = r.value;
      desenharTop();
    }),
  );
  $("#st-topo", alvo).addEventListener("input", (e) => {
    topo = Math.max(10000, Number(e.target.value) || 1e7);
    desenharTop();
  });
  $("#st-repor", alvo).addEventListener("click", () => {
    const iniciais = { alcance: 35, constancia: 20, atividade: 15, momento: 10, historico: 15, envolvimento: 5 };
    Object.assign(pesos, iniciais);
    topo = 1e7;
    $("#st-topo", alvo).value = topo;
    $$("[data-peso]", alvo).forEach((r) => {
      r.value = pesos[r.dataset.peso];
      r.nextElementSibling.textContent = r.value;
    });
    desenharTop();
  });
  $("#st-guardar-canal", alvo).addEventListener("click", (e) => {
    const c = {};
    $$("#st-canal input", alvo).forEach((i) => (c[i.name] = i.value));
    c.hashtags = $("#st-hashtags", alvo).value;
    chamar("settings", { settings: { canal: c } }, { botao: e.currentTarget, sucesso: "Canal guardado." }).catch(() => {});
  });
  $("#st-guardar", alvo).addEventListener("click", (e) => chamar("settings", { settings: { weights: pesos, alcanceTopo: topo } }, { botao: e.currentTarget, sucesso: "Pesos guardados. O Índice foi recalculado." }).catch(() => {}));
  desenharTop();

  $$("[data-recolha]", alvo).forEach((b) =>
    b.addEventListener("click", async () => {
      const r = await chamar("collect", { what: b.dataset.recolha }, { botao: b }).catch(() => null);
      if (!r) return;
      const x = r.result || {};
      toast(x.channels !== undefined ? `Feito: ${x.channels} canais.${x.errors?.length ? ` ${x.errors.length} com erro.` : ""}` : `Feito: ${x.projects || 0} projetos.`);
    }),
  );

  $("#st-exportar", alvo).addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      const dados = await api("admin/export");
      const blob = new Blob([JSON.stringify(dados)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `placar-copia-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast("Cópia descarregada.");
    } catch (err) {
      toast(err.message, { erro: true });
    } finally {
      b.disabled = false;
    }
  });
  $("#st-importar", alvo).addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    let backup;
    try {
      backup = JSON.parse(await f.text());
    } catch {
      return toast("Esse ficheiro não é uma cópia válida.", { erro: true });
    }
    if (!(await confirmar("Repor esta cópia? Os dados atuais são substituídos.", { sim: "Repor cópia", perigo: true }))) return;
    await chamar("import/backup", { backup }, { sucesso: "Cópia reposta." }).catch(() => {});
  });
  $("#st-sair", alvo).addEventListener("click", sair);
}
