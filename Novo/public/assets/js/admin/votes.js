// Página pública: os vídeos gravados que lá aparecem (com o link para cada vídeo) e as votações
// (criar, abrir, fechar e apagar; os votos são dos visitantes, com a conta Google).

import { api, pessoa } from "../data.js";
import { esc, inteiro } from "../format.js";
import { $, $$, avatar, confirmar } from "../ui.js";
import { chamar, escolherPessoa } from "./common.js";

export async function render(raiz) {
  raiz.innerHTML = `<div class="painel ed-bloco"><h3>A página pública</h3><p class="muted">É o que os visitantes veem no endereço principal do site: as votações, os vídeos que gravaste no Palco e o hall da fama. Não tem nenhuma ligação para este painel.</p>
      <div class="ed-acoes" style="justify-content:flex-start"><a class="btn btn-pequeno" href="/" target="_blank" rel="noopener">Ver a página pública</a></div></div>
    <div id="pb-videos"></div><div id="pb-votacoes"></div>`;
  videos(raiz.querySelector("#pb-videos"));
  return votacoes(raiz.querySelector("#pb-votacoes"));
}

/** Vídeos gravados no Palco: título, link do vídeo publicado, mostrar ou esconder. */
async function videos(alvo) {
  let r;
  try {
    r = await api("admin/publicacoes");
  } catch (e) {
    alvo.innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  const lista = r.publicacoes || [];
  alvo.innerHTML = `<div class="painel ed-bloco"><h3>Vídeos na página pública</h3>
    <p class="muted">Cada vídeo que gravas no Palco aparece aqui e na página pública, com o resultado. Depois de o publicares, cola o link (YouTube, TikTok, Instagram) para os visitantes o verem.</p>
    ${
      lista.length
        ? `<div class="pb-lista">${lista
            .map(
              (p) => `<div class="pb-item ${p.visivel === false ? "escondido" : ""}" data-id="${esc(p.id)}">
            <div class="pb-topo"><b>${esc(p.titulo || p.espetaculo)}</b><small>${esc(new Date(p.criado).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }))} · ${esc(p.espetaculo)} · ${esc(p.formato)}</small></div>
            <div class="pb-acoes"><input class="input" placeholder="https://youtube.com/shorts/…" value="${esc(p.link || "")}" data-link>
              <button class="btn btn-pequeno" data-guardar>Guardar link</button>
              <button class="btn btn-pequeno" data-visivel>${p.visivel === false ? "Mostrar" : "Esconder"}</button>
              <button class="btn btn-pequeno btn-texto" data-apagar>Apagar</button></div></div>`,
            )
            .join("")}</div>`
        : `<p class="muted" style="margin-top:10px">Ainda não gravaste nenhum vídeo no Palco.</p>`
    }</div>`;
  $$("[data-id]", alvo).forEach((el) => {
    const p = lista.find((x) => String(x.id) === el.dataset.id);
    $("[data-guardar]", el).addEventListener("click", (e) => chamar("publicacao", { id: p.id, link: $("[data-link]", el).value }, { botao: e.currentTarget, recarregar: false, sucesso: "Link guardado." }).catch(() => {}));
    $("[data-visivel]", el).addEventListener("click", async (e) => {
      await chamar("publicacao", { id: p.id, visivel: p.visivel === false }, { botao: e.currentTarget, recarregar: false }).catch(() => {});
      videos(alvo);
    });
    $("[data-apagar]", el).addEventListener("click", async (e) => {
      if (!(await confirmar("Apagar este vídeo da página pública? Os resultados (rivais, estrelas) ficam.", { sim: "Apagar", perigo: true }))) return;
      await chamar("publicacao/apagar", { id: p.id }, { botao: e.currentTarget, recarregar: false, sucesso: "Apagado." }).catch(() => {});
      videos(alvo);
    });
  });
}

async function votacoes(alvo) {
  const render = () => votacoes(alvo);
  alvo.innerHTML = `<div class="painel ed-bloco"><div class="a-carregar" style="min-height:20vh"><div class="roda"></div></div></div>`;
  let r;
  try {
    r = await api("admin/votacoes");
  } catch (e) {
    alvo.innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  if (!r.ligado) {
    alvo.innerHTML = `<div class="painel ed-bloco"><h3>Votações</h3><p class="muted">As votações usam o Supabase (para o login com Google e um voto por pessoa). Liga-o primeiro em <a href="#/editar/definicoes">Definições</a>, Base de dados.</p></div>`;
    return;
  }
  alvo.innerHTML = `<div class="painel ed-bloco" id="vt-form"></div><div id="vt-admin-lista"></div>`;
  formulario($("#vt-form", alvo), null, () => render(alvo));
  $("#vt-admin-lista", alvo).innerHTML = r.votacoes.length
    ? r.votacoes
        .map((v) => {
          const total = v.total || 0;
          return `<div class="painel ed-bloco" data-id="${esc(v.id)}">
            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><h3 style="margin:0;flex:1">${esc(v.titulo)}</h3><span class="muted">${{ rascunho: "Rascunho", aberta: v.fechou ? "Fechou (prazo)" : "Aberta", fechada: "Fechada" }[v.estado]} · ${inteiro(total)} ${total === 1 ? "voto" : "votos"}</span></div>
            ${v.descricao ? `<p class="muted">${esc(v.descricao)}</p>` : ""}
            <div class="vt-admin-opcoes">${v.opcoes
              .map((o) => {
                const n = v.votos?.[o.id] || 0;
                const pct = total ? Math.round((n / total) * 100) : 0;
                return `<div><span>${esc(o.nome)}</span><i style="width:${pct}%"></i><b>${inteiro(n)} · ${pct}%</b></div>`;
              })
              .join("")}</div>
            <div class="ed-acoes" style="justify-content:flex-start;flex-wrap:wrap">
              ${v.estado !== "aberta" ? `<button class="btn btn-pequeno" data-estado="aberta">Abrir</button>` : ""}
              ${v.estado !== "fechada" ? `<button class="btn btn-pequeno" data-estado="fechada">Fechar</button>` : ""}
              <button class="btn btn-pequeno" data-editar>Editar</button>
              <a class="btn btn-pequeno" href="#/palco/votacao?para=video&votacao=${encodeURIComponent(v.id)}">Mostrar no Palco</a>
              <button class="btn btn-pequeno btn-texto" data-apagar>Apagar</button>
            </div></div>`;
        })
        .join("")
    : "";
  $$("[data-id]", alvo).forEach((caixa) => {
    const v = r.votacoes.find((x) => x.id === caixa.dataset.id);
    $$("[data-estado]", caixa).forEach((b) => b.addEventListener("click", async (e) => {
      await chamar("votacao", { votacao: { ...v, estado: b.dataset.estado } }, { botao: e.currentTarget, recarregar: false, sucesso: "Votação atualizada." }).catch(() => {});
      render(alvo);
    }));
    $("[data-editar]", caixa).addEventListener("click", () => {
      formulario($("#vt-form", alvo), v, () => render(alvo));
      $("#vt-form", alvo).scrollIntoView({ behavior: "smooth" });
    });
    $("[data-apagar]", caixa).addEventListener("click", async (e) => {
      if (!(await confirmar(`Apagar "${v.titulo}" e todos os votos?`, { sim: "Apagar", perigo: true }))) return;
      await chamar("votacao/apagar", { id: v.id }, { botao: e.currentTarget, recarregar: false, sucesso: "Votação apagada." }).catch(() => {});
      render(alvo);
    });
  });
}

/** Formulário para criar ou editar uma votação. */
function formulario(alvo, v, aoGuardar) {
  let opcoes = v ? v.opcoes.map((o) => ({ ...o })) : [];
  const fechaLocal = v?.fecha ? new Date(Date.parse(v.fecha) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  alvo.innerHTML = `<h3>${v ? "Editar votação" : "Nova votação"}</h3>
    <div class="ed-grelha">
      <label class="campo" style="grid-column:1/-1"><span>Pergunta</span><input class="input" id="vf-titulo" placeholder="Quem foi o Youtuber do mês?" value="${esc(v?.titulo || "")}"></label>
      <label class="campo" style="grid-column:1/-1"><span>Descrição (opcional)</span><input class="input" id="vf-desc" value="${esc(v?.descricao || "")}"></label>
      <label class="campo"><span>Fecha em (opcional)</span><input class="input" type="datetime-local" id="vf-fecha" value="${fechaLocal}"></label>
      <label class="campo"><span>Estado</span><select class="input" id="vf-estado"><option value="aberta">Aberta</option><option value="rascunho">Rascunho (só tu vês)</option><option value="fechada">Fechada</option></select></label>
    </div>
    <label class="ed-check" style="margin-top:10px"><input type="checkbox" id="vf-mostrar" ${v?.mostrar_resultados === false ? "" : "checked"}> Mostrar os resultados enquanto está aberta</label>
    <h4 class="soft" style="margin:16px 0 8px;font-size:var(--t-sm)">Opções</h4>
    <div class="vt-form-opcoes" id="vf-opcoes"></div>
    <div class="ed-grelha" style="margin-top:10px;align-items:end">
      <label class="campo"><span>Juntar um Youtuber</span><span style="position:relative"><input class="input" id="vf-pessoa" placeholder="Procurar"></span></label>
      <label class="campo"><span>Ou uma opção em texto</span><input class="input" id="vf-texto" placeholder="Por exemplo: Gaming"></label>
      <div><button class="btn" id="vf-juntar">Juntar texto</button></div>
    </div>
    <div class="ed-acoes">${v ? `<button class="btn" id="vf-cancelar">Cancelar</button>` : ""}<button class="btn btn-primario" id="vf-guardar" data-a-esperar="A guardar">${v ? "Guardar" : "Criar votação"}</button></div>`;
  $("#vf-estado", alvo).value = v?.estado || "aberta";
  const desenharOpcoes = () => {
    $("#vf-opcoes", alvo).innerHTML = opcoes.length
      ? opcoes.map((o, i) => `<span class="vt-chip">${o.pessoa && pessoa(o.pessoa) ? avatar(pessoa(o.pessoa), 26) : ""}${esc(o.nome)}<button data-tirar="${i}" title="Tirar">×</button></span>`).join("")
      : `<span class="muted">Junta pelo menos 2 opções.</span>`;
    $$("[data-tirar]", alvo).forEach((b) =>
      b.addEventListener("click", () => {
        opcoes.splice(Number(b.dataset.tirar), 1);
        desenharOpcoes();
      }),
    );
  };
  desenharOpcoes();
  const input = $("#vf-pessoa", alvo);
  escolherPessoa(input, (p) => {
    if (!opcoes.some((o) => o.pessoa === p.id)) opcoes.push({ id: p.id, nome: p.name, pessoa: p.id });
    input.value = "";
    desenharOpcoes();
  });
  $("#vf-juntar", alvo).addEventListener("click", () => {
    const t = $("#vf-texto", alvo).value.trim();
    if (!t) return;
    opcoes.push({ nome: t });
    $("#vf-texto", alvo).value = "";
    desenharOpcoes();
  });
  $("#vf-cancelar", alvo)?.addEventListener("click", () => formulario(alvo, null, aoGuardar));
  $("#vf-guardar", alvo).addEventListener("click", async (e) => {
    const f = $("#vf-fecha", alvo).value;
    const votacao = {
      ...(v ? { id: v.id } : {}),
      titulo: $("#vf-titulo", alvo).value,
      descricao: $("#vf-desc", alvo).value,
      estado: $("#vf-estado", alvo).value,
      fecha: f ? new Date(f).toISOString() : null,
      mostrar_resultados: $("#vf-mostrar", alvo).checked,
      opcoes,
    };
    const r = await chamar("votacao", { votacao }, { botao: e.currentTarget, recarregar: false, sucesso: v ? "Votação guardada." : "Votação criada. Já aparece na página pública." }).catch(() => null);
    if (r) aoGuardar();
  });
}
