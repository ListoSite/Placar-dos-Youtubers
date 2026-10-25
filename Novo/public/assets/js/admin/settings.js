// Definições: pesos do Índice, recolha manual, cópias de segurança, sair.

import { estado, api } from "../data.js";
import { esc, inteiro, ha, curto, mesNome } from "../format.js";
import { $, $$, avatar, toast, confirmar } from "../ui.js";
import { PARTES, calcularIndice, comBonusCanais } from "../score.js";
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
      <h3>Bocas no Palco</h3>
      <p class="muted">Comentários com piada que aparecem nos vídeos (no máximo 4 por vídeo): quando alguém ganha, sobe, cai, passa para a frente ou aparece no pódio e no cartão. Há bocas automáticas, tiradas dos números de cada um (vídeos a mais, último vídeo há muito tempo, mais seguidores no Instagram do que no YouTube…). Aqui juntas as tuas, para todos; as de cada Youtuber escrevem-se na ficha dele.</p>
      <label class="campo"><span>Bocas gerais (uma por linha)</span><textarea class="input" id="st-bocas" rows="5" placeholder="{nome} no pódio? O {noticias} já está a gravar!&#10;Alguém ligue ao {nome}: está no top!">${esc((s.bocas || []).join("\n"))}</textarea><small>{nome} é trocado pelo Youtuber e {noticias} pelo Youtuber de notícias com mais Índice (categoria com "Notícias", "Atualidade", "Comentário"…).</small></label>
      <div class="ed-acoes"><button class="btn btn-primario" id="st-guardar-bocas" data-a-esperar="A guardar">Guardar bocas</button></div>
    </div>

    <div class="painel ed-bloco">
      <h3>O que se mede</h3>
      <p class="muted">Quem tem vários canais: medimos o Youtuber (todos os canais juntos) ou os canais de facto (só o principal)? Vale para os rankings, o Índice e o Palco. Em cada Youtuber podes escolher outra coisa (em Youtubers, Canais do YouTube).</p>
      <div class="ed-medir-opcoes" id="st-medir">
        <label class="ed-check"><input type="radio" name="medir" value="youtuber" ${s.medir !== "principal" ? "checked" : ""}> <span><b>O Youtuber</b><small>Todos os canais que contam, juntos, como se fosse um canal só. As views somam-se; os subscritores repetidos e os vídeos dos outros canais contam só em parte. Ter mais canais dá só o bónus de baixo.</small></span></label>
        <label class="ed-check"><input type="radio" name="medir" value="principal" ${s.medir === "principal" ? "checked" : ""}> <span><b>Só o canal principal</b><small>Mede o canal, não a pessoa: os outros canais não entram nas contas.</small></span></label>
      </div>
      <label class="campo" style="margin-top:14px;max-width:420px"><span>Bónus no Índice por cada canal a mais</span><select class="input" id="st-bonus">${[0, 2, 3, 5, 8, 10, 15].map((v) => `<option value="${v}" ${(s.bonusCanais ?? 5) === v ? "selected" : ""}>${v ? `+${v}% por canal (até +${v * 3}%)` : "Sem bónus"}</option>`).join("")}</select><small>Conta só os canais que contam (os de clips não), até 3 canais a mais. Por exemplo, com +5%: 2 canais dão +5% e 3 canais dão +10% ao Índice.</small></label>
      <div class="ed-acoes"><button class="btn btn-primario" id="st-guardar-medir" data-a-esperar="A guardar">Guardar</button></div>
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

    <div class="painel ed-bloco" id="st-supabase">
      <h3>Base de dados (Supabase)</h3>
      <div id="st-sb-estado"><p class="muted">A verificar…</p></div>
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
      .map((p) => ({ p, t: comBonusCanais(calcularIndice(p, ctx), p, estado.ds.settings.bonusCanais).total, antes: estado.posIndice.get(p.id) }))
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
    const iniciais = { alcance: 35, constancia: 20, atividade: 15, momento: 10, historico: 15, envolvimento: 5, redes: 25 };
    Object.assign(pesos, iniciais);
    topo = 1e7;
    $("#st-topo", alvo).value = topo;
    $$("[data-peso]", alvo).forEach((r) => {
      r.value = pesos[r.dataset.peso];
      r.nextElementSibling.textContent = r.value;
    });
    desenharTop();
  });
  $("#st-guardar-medir", alvo).addEventListener("click", (e) => {
    const medir = $("#st-medir input:checked", alvo)?.value || "youtuber";
    chamar("settings", { settings: { medir, bonusCanais: Number($("#st-bonus", alvo).value) } }, { botao: e.currentTarget, sucesso: medir === "principal" ? "Agora mede-se só o canal principal." : "Agora mede-se o Youtuber, com todos os canais." }).catch(() => {});
  });
  $("#st-guardar-bocas", alvo).addEventListener("click", (e) => chamar("settings", { settings: { bocas: $("#st-bocas", alvo).value } }, { botao: e.currentTarget, sucesso: "Bocas guardadas." }).catch(() => {}));
  $("#st-guardar-canal", alvo).addEventListener("click", (e) => {
    const c = {};
    $$("#st-canal input", alvo).forEach((i) => (c[i.name] = i.value));
    c.hashtags = $("#st-hashtags", alvo).value;
    chamar("settings", { settings: { canal: c } }, { botao: e.currentTarget, sucesso: "Canal guardado." }).catch(() => {});
  });
  estadoSupabase($("#st-sb-estado", alvo));
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

/** Estado do Supabase e o botão para copiar os dados do Netlify para lá. */
async function estadoSupabase(alvo) {
  let r;
  try {
    r = await api("admin/supabase");
  } catch (e) {
    alvo.innerHTML = `<p class="muted">${esc(e.message)}</p>`;
    return;
  }
  const passos = `<ol class="ed-passos">
      <li>Em supabase.com, no teu projeto: <b>SQL Editor</b> → <b>New query</b>, cola o ficheiro <b>Novo/supabase/schema.sql</b> do GitHub e carrega em <b>Run</b>. Cria as tabelas e as regras dos votos.</li>
      <li>No Netlify, em <b>Site configuration → Environment variables</b>, junta <b>SUPABASE_URL</b>, <b>SUPABASE_SERVICE_ROLE_KEY</b> (secreta) e <b>SUPABASE_ANON_KEY</b> (pública), e faz um novo deploy.</li>
      <li>Volta aqui e carrega em <b>Copiar dados para o Supabase</b>.</li></ol>`;
  if (!r.configurado) {
    alvo.innerHTML = `<p class="muted">Os dados estão no armazenamento do Netlify. Para passar tudo para o Supabase (e ter votações com login Google):</p>${passos}`;
    return;
  }
  if (!r.ligado) {
    alvo.innerHTML = `<div class="aviso"><p>O Supabase está configurado mas não respondeu: ${esc(r.erro || "")}. Confirma o URL, a chave e se correste o <b>schema.sql</b>.</p></div>${passos}`;
    return;
  }
  if (r.usado && r.migrado) {
    const m = r.migrado;
    alvo.innerHTML = `<div class="ed-estado">
        <div><span>Os dados estão em</span><b>Supabase</b></div>
        <div><span>Copiados em</span><b>${esc(ha(m.at))}</b></div>
        <div><span>Pessoas, canais e projetos</span><b>${inteiro(m.pessoas)} · ${inteiro(m.canais)} · ${inteiro(m.projetos)}</b></div>
      </div>
      <p class="muted" style="margin-top:12px">No Supabase, em <b>Table Editor</b>, vês as tabelas <b>pessoas</b>, <b>canais</b>, <b>projetos</b>, <b>palco_resultados</b>, <b>votacoes</b> e <b>votos</b>. Mudanças feitas no site aparecem lá; para editar, usa de preferência o site (as alterações no Supabase só aparecem no site depois de "Recalcular").</p>`;
    return;
  }
  alvo.innerHTML = `<p>O Supabase está ligado e pronto. Os dados ainda estão no Netlify: copia-os para o Supabase. A cópia não apaga nada do Netlify (fica como reserva) e, a partir daí, o site passa a ler e a gravar no Supabase.</p>
    <div class="ed-acoes" style="justify-content:flex-start"><button class="btn btn-primario" id="st-sb-migrar" data-a-esperar="A copiar">Copiar dados para o Supabase</button></div>`;
  $("#st-sb-migrar", alvo).addEventListener("click", async (e) => {
    if (!(await confirmar("Copiar todos os dados para o Supabase? A partir daí o site passa a usar o Supabase.", { sim: "Copiar" }))) return;
    // A cópia vai por partes (cada pedido ao servidor tem pouco tempo)
    const botao = e.currentTarget;
    let res = null;
    let inicio = 0;
    try {
      do {
        botao.dataset.aEsperar = inicio ? `A copiar (${inicio} de ${res?.total || "?"})` : "A copiar";
        res = await chamar("supabase/migrar", { inicio }, { botao, recarregar: false });
        inicio = res.seguinte || 0;
      } while (res.continuar);
    } catch {
      return;
    }
    toast(`Copiados ${res.documentos} documentos, ${res.pessoas} pessoas e ${res.canais} canais. O site já usa o Supabase.`);
    estadoSupabase(alvo);
  });
}
