// Votações (painel): criar todos os tipos, abrir, fechar, marcar o resultado e gerir torneios.
// Os votos são dos visitantes (conta Google) e vão diretamente para o Supabase.

import { api, estado, pessoa, procurar } from "../data.js";
import { esc, inteiro, mesNome } from "../format.js";
import { $, $$, avatar, toast, janela, confirmar } from "../ui.js";
import { rankingPeriodo } from "../periodo.js";
import { chamar } from "./common.js";

const TIPOS = {
  escolha: { nome: "Votação livre", icone: "🗳️", texto: "Uma pergunta com as opções que quiseres (Youtubers ou texto)." },
  melhor: { nome: "Youtuber do mês", icone: "🏆", texto: "Os primeiros do ranking de um mês, e o público escolhe o melhor." },
  favorito: { nome: "Youtuber favorito", icone: "❤️", texto: "Todos os Youtubers (ou uma categoria): qual é o favorito do público?" },
  confronto: { nome: "Confronto", icone: "⚔️", texto: "Dois Youtubers frente a frente. Quem ganha?" },
  desafiante: { nome: "Próximo desafiante", icone: "🥊", texto: "O público escolhe quem enfrenta alguém na próxima batalha do Palco." },
  previsao: { nome: "Previsão", icone: "🎯", texto: "Quem vai ganhar? Depois marcas a resposta certa e vê-se quem acertou." },
  torneio: { nome: "Torneio", icone: "🏟️", texto: "4, 8 ou 16 Youtubers em chave. Cada confronto é votado, ronda a ronda." },
};
const MODOS = {
  "": "Só votar (sem resultado oficial)",
  decide: "O público decide (quem tiver mais votos ganha)",
  previsao: "Previsão (tu marcas depois a resposta certa)",
};
const NOME_RONDA = (n, total) => (total - n === 0 ? "Final" : total - n === 1 ? "Meias-finais" : total - n === 2 ? "Quartos de final" : total - n === 3 ? "Oitavos de final" : `Ronda ${n}`);

let filtro = "ativas";

export async function render(main) {
  main.dataset.titulo = "Votações";
  main.innerHTML = `<div class="wrap vv"><div class="vc-topo"><div><h1>Votações</h1><p class="muted">Cria votações e torneios para os vídeos. Os visitantes votam na aba Votar, com a conta Google (um voto por pessoa).</p></div>
    <div class="vc-acoes"><a class="btn" href="/#/votar" target="_blank" rel="noopener">Ver no site</a><button class="btn btn-primario" id="vv-nova">+ Nova votação</button></div></div>
    <div id="vv-corpo"><div class="a-carregar"><div class="roda"></div></div></div></div>`;
  $("#vv-nova", main).addEventListener("click", () => escolherTipo(() => desenhar(main)));
  await desenhar(main);
}

async function desenhar(main) {
  const corpo = $("#vv-corpo", main);
  let r;
  try {
    r = await api("admin/votacoes");
  } catch (e) {
    corpo.innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  if (!r.ligado) {
    corpo.innerHTML = `<div class="painel ed-bloco"><h3>Falta ligar o Supabase</h3><p class="muted">As votações usam o Supabase (login com Google e um voto por pessoa). Liga-o em <a href="#/editar/definicoes">Editar, Definições</a>.</p></div>`;
    $("#vv-nova", main).disabled = true;
    return;
  }
  const lista = r.votacoes;
  const soltas = lista.filter((v) => !v.grupo);
  const torneios = new Map();
  for (const v of lista.filter((x) => x.grupo)) {
    if (!torneios.has(v.grupo)) torneios.set(v.grupo, []);
    torneios.get(v.grupo).push(v);
  }
  const ativa = (v) => v.estado === "aberta" && !v.fechou;
  const passa = (vs) => {
    if (filtro === "todas") return true;
    if (filtro === "rascunho") return vs.some((v) => v.estado === "rascunho");
    if (filtro === "fechadas") return vs.every((v) => !ativa(v) && v.estado !== "rascunho");
    return vs.some(ativa);
  };
  const nAtivas = soltas.filter(ativa).length + [...torneios.values()].filter((vs) => vs.some(ativa)).length;
  const blocos = [
    ...[...torneios].filter(([, vs]) => passa(vs)).map(([g, vs]) => ({ quando: Math.max(...vs.map((v) => Date.parse(v.criado) || 0)), html: cartaoTorneio(g, vs) })),
    ...soltas.filter((v) => passa([v])).map((v) => ({ quando: Date.parse(v.criado) || 0, html: cartaoVotacao(v) })),
  ].sort((a, b) => b.quando - a.quando);
  corpo.innerHTML = `<div class="filtros"><div class="segmentos" role="group" aria-label="Mostrar">
      ${[["ativas", `A decorrer (${nAtivas})`], ["rascunho", "Rascunhos"], ["fechadas", "Fechadas"], ["todas", "Todas"]].map(([k, n]) => `<button data-filtro="${k}" aria-pressed="${filtro === k}">${n}</button>`).join("")}
    </div></div>
    ${nAtivas ? "" : `<div class="aviso info"><p>Não há nenhuma votação a decorrer. Enquanto houver uma aberta, os vídeos do Palco avisam no fim que se pode votar (se isso estiver ligado em Página pública, Dados e ligações).</p></div>`}
    <div class="vv-lista">${blocos.map((b) => b.html).join("") || `<p class="muted">Nada aqui.</p>`}</div>`;
  $$("[data-filtro]", corpo).forEach((b) => b.addEventListener("click", () => ((filtro = b.dataset.filtro), desenhar(main))));
  const recarregar = () => desenhar(main);

  $$("[data-v]", corpo).forEach((el) => {
    const v = lista.find((x) => x.id === el.dataset.v);
    el.querySelector("[data-abrir]")?.addEventListener("click", (e) => estadoDe(v, "aberta", e, recarregar));
    el.querySelector("[data-fechar-v]")?.addEventListener("click", (e) => estadoDe(v, "fechada", e, recarregar));
    el.querySelector("[data-editar]")?.addEventListener("click", () => formulario(v.tipo, v, recarregar));
    el.querySelector("[data-resolver]")?.addEventListener("click", () => resolver(v, recarregar));
    el.querySelector("[data-apagar]")?.addEventListener("click", async (e) => {
      if (!(await confirmar(`Apagar "${v.titulo}" e todos os votos?`, { sim: "Apagar", perigo: true }))) return;
      await chamar("votacao/apagar", { id: v.id }, { botao: e.currentTarget, recarregar: false, sucesso: "Votação apagada." }).catch(() => {});
      recarregar();
    });
  });
  $$("[data-t]", corpo).forEach((el) => {
    const g = el.dataset.t;
    const vs = torneios.get(g);
    el.querySelector("[data-avancar]")?.addEventListener("click", () => avancar(g, vs, recarregar));
    el.querySelector("[data-abrir-ronda]")?.addEventListener("click", async (e) => {
      const ronda = Math.max(...vs.map((v) => v.ronda || 1));
      for (const v of vs.filter((x) => (x.ronda || 1) === ronda && x.estado !== "aberta")) await chamar("votacao/estado", { id: v.id, estado: "aberta" }, { botao: e.currentTarget, recarregar: false }).catch(() => {});
      toast("Ronda aberta: já se pode votar.");
      recarregar();
    });
    el.querySelector("[data-apagar-t]")?.addEventListener("click", async (e) => {
      if (!(await confirmar("Apagar o torneio inteiro e todos os votos?", { sim: "Apagar", perigo: true }))) return;
      await chamar("torneio/apagar", { grupo: g }, { botao: e.currentTarget, recarregar: false, sucesso: "Torneio apagado." }).catch(() => {});
      recarregar();
    });
  });
}

async function estadoDe(v, novo, e, depois) {
  await chamar("votacao/estado", { id: v.id, estado: novo }, { botao: e.currentTarget, recarregar: false, sucesso: novo === "aberta" ? "Aberta: já aparece no site." : "Fechada." }).catch(() => {});
  depois();
}

function rotuloEstado(v) {
  if (v.estado === "rascunho") return `<span class="vt-selo">Rascunho</span>`;
  if (v.estado === "aberta" && !v.fechou) return `<span class="vt-selo aberta">A decorrer</span>`;
  return `<span class="vt-selo">Fechada</span>`;
}

function barras(v) {
  const total = v.total || 0;
  const max = Math.max(1, ...Object.values(v.votos || {}));
  const ordem = [...v.opcoes].sort((a, b) => (v.votos?.[b.id] || 0) - (v.votos?.[a.id] || 0)).slice(0, v.tipo === "favorito" ? 10 : 60);
  return `<div class="vt-admin-opcoes">${ordem
    .map((o) => {
      const n = v.votos?.[o.id] || 0;
      const pct = total ? Math.round((n / total) * 100) : 0;
      const certo = v.resultado === o.id;
      return `<div class="${certo ? "certo" : ""}"><span>${o.pessoa && pessoa(o.pessoa) ? avatar(pessoa(o.pessoa), 22) : ""}${esc(o.nome)}${certo ? " ✓" : ""}</span><i style="width:${(n / max) * 100}%"></i><b>${inteiro(n)} · ${pct}%</b></div>`;
    })
    .join("")}${v.tipo === "favorito" && v.opcoes.length > 10 ? `<small class="muted">E mais ${v.opcoes.length - 10} opções.</small>` : ""}</div>`;
}

function cartaoVotacao(v) {
  const t = TIPOS[v.tipo] || TIPOS.escolha;
  const contra = v.extra?.contra && pessoa(v.extra.contra);
  const precisaResultado = v.modo && !v.resultado;
  return `<article class="painel ed-bloco vv-cartao" data-v="${esc(v.id)}">
    <div class="vv-cabeca"><span class="vt-tipo">${t.icone} ${esc(t.nome)}</span>${rotuloEstado(v)}${v.modo ? `<span class="vt-selo ${v.modo}">${v.modo === "previsao" ? "Previsão" : "O público decide"}</span>` : ""}<small class="muted">${inteiro(v.total || 0)} ${v.total === 1 ? "voto" : "votos"}${v.fecha ? ` · fecha ${new Date(v.fecha).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}` : ""}</small></div>
    <h3>${esc(v.titulo)}</h3>
    ${contra ? `<p class="muted">Para enfrentar <b>${esc(contra.name)}</b>.</p>` : ""}
    ${v.descricao ? `<p class="muted">${esc(v.descricao)}</p>` : ""}
    ${barras(v)}
    ${precisaResultado && v.estado !== "rascunho" && (v.fechou || v.estado === "fechada") ? `<div class="aviso info"><p>${v.modo === "previsao" ? "Marca a resposta certa para os visitantes verem se acertaram." : "Confirma o vencedor para aparecer no site e no Palco."}</p></div>` : ""}
    <div class="ed-acoes" style="justify-content:flex-start;flex-wrap:wrap">
      ${v.estado !== "aberta" || v.fechou ? `<button class="btn btn-pequeno" data-abrir>Abrir</button>` : `<button class="btn btn-pequeno" data-fechar-v>Fechar</button>`}
      ${v.modo ? `<button class="btn btn-pequeno ${precisaResultado ? "btn-primario" : ""}" data-resolver>${v.resultado ? "Mudar resultado" : v.modo === "previsao" ? "Marcar resposta certa" : "Confirmar vencedor"}</button>` : ""}
      <button class="btn btn-pequeno" data-editar>Editar</button>
      <a class="btn btn-pequeno" href="#/palco/votacao?para=video&votacao=${encodeURIComponent(v.id)}">Gravar no Palco</a>
      <button class="btn btn-pequeno btn-texto" data-apagar>Apagar</button>
    </div></article>`;
}

function cartaoTorneio(g, vs) {
  const base = vs[0];
  const nome = base.extra?.nomeGrupo || "Torneio";
  const rondas = base.extra?.rondas || Math.max(...vs.map((v) => v.ronda || 1));
  const atual = Math.max(...vs.map((v) => v.ronda || 1));
  const campeaoId = vs.find((v) => v.extra?.campeao)?.extra.campeao;
  const campeao = campeaoId && (pessoa(campeaoId) || { name: campeaoId });
  const daRonda = vs.filter((v) => (v.ronda || 1) === atual).sort((a, b) => (a.extra?.pos || 0) - (b.extra?.pos || 0));
  const algumaAberta = daRonda.some((v) => v.estado === "aberta" && !v.fechou);
  const rascunho = daRonda.some((v) => v.estado === "rascunho");
  const colunas = Array.from({ length: atual }, (_, i) => i + 1).map((r) => {
    const jogos = vs.filter((v) => (v.ronda || 1) === r).sort((a, b) => (a.extra?.pos || 0) - (b.extra?.pos || 0));
    return `<div class="vv-ronda"><h4>${NOME_RONDA(r, rondas)}</h4>${jogos
      .map((v) => {
        const [a, b] = v.opcoes;
        const na = v.votos?.[a.id] || 0;
        const nb = v.votos?.[b.id] || 0;
        const linha = (o, n) => `<div class="${v.resultado === o.id ? "ganhou" : v.resultado ? "perdeu" : ""}">${o.pessoa && pessoa(o.pessoa) ? avatar(pessoa(o.pessoa), 22) : ""}<span class="vv-nome">${esc(o.nome)}</span><b>${inteiro(n)}</b></div>`;
        return `<div class="vv-jogo">${linha(a, na)}${linha(b, nb)}</div>`;
      })
      .join("")}</div>`;
  });
  return `<article class="painel ed-bloco vv-cartao vv-torneio" data-t="${esc(g)}">
    <div class="vv-cabeca"><span class="vt-tipo">🏟️ Torneio</span>${campeao ? `<span class="vt-selo aberta">Terminado</span>` : rascunho ? `<span class="vt-selo">Rascunho</span>` : algumaAberta ? `<span class="vt-selo aberta">A decorrer</span>` : `<span class="vt-selo">À espera de avançar</span>`}<span class="vt-selo ${base.modo || "decide"}">${base.modo === "previsao" ? "Previsão" : "O público decide"}</span><small class="muted">${base.extra?.participantes || ""} participantes · ${NOME_RONDA(atual, rondas)}</small></div>
    <h3>${esc(nome)}</h3>
    ${campeao ? `<p class="vv-campeao">🏆 Campeão: <b>${esc(campeao.name)}</b></p>` : ""}
    <div class="vv-chave">${colunas.join("")}</div>
    <div class="ed-acoes" style="justify-content:flex-start;flex-wrap:wrap">
      ${campeao ? "" : rascunho ? `<button class="btn btn-pequeno btn-primario" data-abrir-ronda>Abrir a ronda</button>` : `<button class="btn btn-pequeno btn-primario" data-avancar>${atual === rondas ? "Fechar a final e coroar o campeão" : `Fechar ${NOME_RONDA(atual, rondas).toLowerCase()} e avançar`}</button>`}
      <a class="btn btn-pequeno" href="#/palco/votacao?para=video&votacao=${encodeURIComponent("g:" + g)}">Gravar no Palco</a>
      <button class="btn btn-pequeno btn-texto" data-apagar-t>Apagar torneio</button>
    </div></article>`;
}

// ---------- Criar ----------
function escolherTipo(depois) {
  const { el, fechar } = janela(
    `<h2>Que votação queres criar?</h2><div class="vc-tipos">${Object.entries(TIPOS)
      .map(([id, t]) => `<button class="vc-tipo" data-tipo="${id}"><b>${t.icone} ${esc(t.nome)}</b><small>${esc(t.texto)}</small></button>`)
      .join("")}</div><div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button></div>`,
    { larga: true },
  );
  $$("[data-tipo]", el).forEach((b) =>
    b.addEventListener("click", () => {
      fechar();
      if (b.dataset.tipo === "torneio") formularioTorneio(depois);
      else formulario(b.dataset.tipo, null, depois);
    }),
  );
}

const mesesCompletos = () => estado.ds.months.filter((m) => m < estado.ds.currentMonth);

/** Caixa para escolher Youtubers (procura no dataset do painel). */
function seletor(caixa, inicial, { max = 400, numerar = false, aoMudar } = {}) {
  let ids = [...inicial];
  caixa.innerHTML = `<div class="vc-pessoas"></div><div style="position:relative"><input class="input" placeholder="Procurar Youtuber" autocomplete="off"><div class="pesquisa-lista" style="left:0;right:auto;width:100%"></div></div>`;
  const chips = caixa.firstElementChild;
  const q = $("input", caixa);
  const lista = $(".pesquisa-lista", caixa);
  const pintar = () => {
    chips.innerHTML = ids.map((id) => pessoa(id) || { id, name: id }).map((p, i) => `<span class="vt-chip">${numerar ? `<i class="vv-semente">${i + 1}</i>` : ""}${avatar(p, 24)}${esc(p.name)}<button type="button" data-tirar="${esc(p.id)}">×</button></span>`).join("") || `<span class="muted">Ninguém escolhido.</span>`;
    $$("[data-tirar]", chips).forEach((x) =>
      x.addEventListener("click", () => {
        ids = ids.filter((id) => id !== x.dataset.tirar);
        pintar();
      }),
    );
    q.disabled = ids.length >= max;
    aoMudar?.(ids);
  };
  q.addEventListener("input", () => {
    const r = procurar(q.value, 8).filter((p) => !ids.includes(p.id));
    lista.innerHTML = r.map((p) => `<button type="button" class="pesquisa-item" style="width:100%;border:0;background:none;text-align:left" data-id="${esc(p.id)}">${avatar(p, 28)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "")}</small></span></button>`).join("");
    lista.classList.toggle("aberta", r.length > 0);
  });
  lista.addEventListener("click", (e) => {
    const x = e.target.closest("[data-id]");
    if (!x || ids.length >= max) return;
    ids.push(x.dataset.id);
    q.value = "";
    lista.classList.remove("aberta");
    pintar();
  });
  pintar();
  return {
    get ids() {
      return ids;
    },
    definir(novos) {
      ids = [...new Set(novos)].slice(0, max);
      pintar();
    },
  };
}

const paraLocal = (iso) => (iso ? new Date(Date.parse(iso) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function camposComuns(v, { modo = true, tipo }) {
  return `<div class="ed-grelha">
      <label class="campo"><span>Fecha em (opcional)</span><input class="input" type="datetime-local" name="fecha" value="${paraLocal(v?.fecha)}"></label>
      <label class="campo"><span>Estado</span><select class="input" name="estado"><option value="aberta">Aberta (já aparece no site)</option><option value="rascunho">Rascunho (só tu vês)</option><option value="fechada">Fechada</option></select></label>
      ${modo ? `<label class="campo" style="grid-column:1/-1"><span>Resultado</span><select class="input" name="modo">${Object.entries(MODOS).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("")}</select></label>` : ""}
    </div>
    <label class="ed-check" style="margin-top:10px"><input type="checkbox" name="mostrar" ${v?.mostrar_resultados === false || (!v && tipo === "previsao") ? "" : "checked"}> Mostrar os votos enquanto está aberta</label>`;
}

/** Formulário de uma votação (qualquer tipo menos torneio). */
function formulario(tipo, v, depois) {
  const t = TIPOS[tipo] || TIPOS.escolha;
  const meses = [...mesesCompletos()].reverse();
  const opcoesTexto = (v?.opcoes || []).filter((o) => !o.pessoa);
  const { el, fechar } = janela(
    `<h2>${t.icone} ${esc(t.nome)}${v ? " (editar)" : ""}</h2>
    <form class="vc-form" id="vv-form">
      ${tipo === "melhor" ? `<div class="ed-grelha"><label class="campo"><span>Mês</span><select class="input" name="mes">${meses.map((m) => `<option value="${m}">${mesNome(m)}</option>`).join("")}</select></label><label class="campo"><span>Quantos candidatos (os primeiros do ranking)</span><input class="input" type="number" name="n" min="2" max="20" value="${v?.opcoes.length || 5}"></label></div>` : ""}
      ${tipo === "favorito" ? `<label class="campo"><span>Quem entra</span><select class="input" name="cat"><option value="">Todos os Youtubers</option>${estado.ds.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>` : ""}
      ${tipo === "desafiante" ? `<div class="campo"><span>Quem vai ser desafiado</span><div id="vv-contra"></div></div>` : ""}
      ${tipo === "previsao" ? `<div class="ed-grelha"><label class="campo"><span>Sobre o mês</span><select class="input" name="mesp"><option value="${estado.ds.currentMonth}">${mesNome(estado.ds.currentMonth)} (o atual)</option>${meses.map((m) => `<option value="${m}">${mesNome(m)}</option>`).join("")}</select></label><label class="campo"><span>Candidatos</span><button type="button" class="btn" id="vv-top">Pôr os 5 primeiros do último mês</button></label></div>` : ""}
      <label class="campo"><span>Pergunta</span><input class="input" name="titulo" maxlength="140" value="${esc(v?.titulo || "")}" placeholder="${esc(sugestao(tipo))}"></label>
      <label class="campo"><span>Descrição (opcional)</span><textarea class="input" name="descricao" rows="2" maxlength="600">${esc(v?.descricao || "")}</textarea></label>
      ${tipo === "favorito" ? "" : `<div class="campo"><span>${tipo === "confronto" ? "Os dois Youtubers" : tipo === "melhor" ? "Candidatos (podes mudar)" : "Opções: Youtubers"}</span><div id="vv-pessoas"></div></div>`}
      ${tipo === "escolha" ? `<div class="campo"><span>Opções em texto (uma por linha)</span><textarea class="input" name="textos" rows="3" placeholder="Por exemplo:\nGaming\nVlogs">${esc(opcoesTexto.map((o) => o.nome).join("\n"))}</textarea></div>` : ""}
      ${camposComuns(v, { modo: !["previsao", "favorito"].includes(tipo), tipo })}
    </form>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok data-a-esperar="A guardar">${v ? "Guardar" : "Criar"}</button></div>`,
    { larga: true },
  );
  const f = $("#vv-form", el);
  f.estado.value = v?.estado || "aberta";
  if (f.modo) f.modo.value = v?.modo || (tipo === "confronto" || tipo === "desafiante" || tipo === "melhor" ? "decide" : "");
  const max = tipo === "confronto" ? 2 : 60;
  const sel = $("#vv-pessoas", el) ? seletor($("#vv-pessoas", el), (v?.opcoes || []).filter((o) => o.pessoa).map((o) => o.pessoa), { max }) : null;
  const contra = $("#vv-contra", el) ? seletor($("#vv-contra", el), v?.extra?.contra ? [v.extra.contra] : [], { max: 1 }) : null;
  if (tipo === "melhor") {
    f.mes.value = v?.extra?.mes || (meses.includes(estado.ref) ? estado.ref : meses[0]);
    const encher = () => sel.definir(rankingPeriodo("views", { tipo: "mes", mes: f.mes.value }, { n: Number(f.n.value) || 5 }).map((x) => x.p.id));
    f.mes.addEventListener("change", encher);
    f.n.addEventListener("change", encher);
    if (!v) encher();
  }
  if (tipo === "previsao") {
    if (v?.extra?.mes) f.mesp.value = v.extra.mes;
    $("#vv-top", el).addEventListener("click", () => sel.definir(rankingPeriodo("views", { tipo: "ultimo" }, { n: 5 }).map((x) => x.p.id)));
  }
  if (tipo === "favorito" && v?.extra?.metrica) f.cat.value = v.extra.metrica;

  $("[data-ok]", el).addEventListener("click", async (e) => {
    let opcoes = sel ? sel.ids.map((id) => ({ pessoa: id, nome: pessoa(id)?.name || id })) : [];
    const extra = {};
    if (tipo === "escolha") opcoes = opcoes.concat(f.textos.value.split("\n").map((x) => x.trim()).filter(Boolean).map((nome) => ({ nome })));
    if (tipo === "favorito") {
      opcoes = estado.ds.people.filter((p) => !f.cat.value || p.category === f.cat.value).sort((a, b) => a.name.localeCompare(b.name, "pt")).map((p) => ({ pessoa: p.id, nome: p.name }));
      if (f.cat.value) extra.metrica = f.cat.value;
      if (opcoes.length > 400) return toast("Há mais de 400 Youtubers: escolhe uma categoria.", { erro: true });
    }
    if (tipo === "melhor") extra.mes = f.mes.value;
    if (tipo === "previsao") extra.mes = f.mesp.value;
    if (tipo === "desafiante") {
      if (!contra.ids.length) return toast("Escolhe quem vai ser desafiado.", { erro: true });
      extra.contra = contra.ids[0];
      opcoes = opcoes.filter((o) => o.pessoa !== extra.contra);
    }
    if (tipo === "confronto" && opcoes.length !== 2) return toast("Escolhe os dois Youtubers.", { erro: true });
    if (opcoes.length < 2) return toast("Junta pelo menos 2 opções.", { erro: true });
    const titulo = f.titulo.value.trim() || sugestao(tipo, { opcoes, extra });
    const fecha = f.fecha.value;
    const votacao = {
      ...(v ? { id: v.id } : {}),
      tipo,
      titulo,
      descricao: f.descricao.value,
      opcoes,
      extra: { ...(v?.extra || {}), ...extra },
      modo: tipo === "previsao" ? "previsao" : f.modo?.value || null,
      estado: f.estado.value,
      fecha: fecha ? new Date(fecha).toISOString() : null,
      mostrar_resultados: f.mostrar.checked,
    };
    const r = await chamar("votacao", { votacao }, { botao: e.currentTarget, recarregar: false, sucesso: v ? "Votação guardada." : votacao.estado === "aberta" ? "Criada: já está no site." : "Criada." }).catch(() => null);
    if (!r) return;
    fechar();
    depois();
  });
}

function sugestao(tipo, { opcoes = [], extra = {} } = {}) {
  if (tipo === "melhor") return `Quem foi o melhor Youtuber de ${extra.mes ? mesNome(extra.mes, { ano: false }) : "este mês"}?`;
  if (tipo === "favorito") return "Qual é o teu Youtuber favorito?";
  if (tipo === "confronto") return opcoes.length === 2 ? `${opcoes[0].nome} vs ${opcoes[1].nome}: quem ganha?` : "Quem ganha este confronto?";
  if (tipo === "desafiante") return `Quem deve enfrentar ${extra.contra ? pessoa(extra.contra)?.name || "o campeão" : "o campeão"} na próxima batalha?`;
  if (tipo === "previsao") return `Quem vai ser o n.º 1 de ${extra.mes ? mesNome(extra.mes, { ano: false }) : "este mês"}?`;
  return "Qual é a tua escolha?";
}

/** Marcar a resposta certa (previsão) ou confirmar o vencedor (o público decide). */
function resolver(v, depois) {
  const total = v.total || 0;
  const mais = [...v.opcoes].sort((a, b) => (v.votos?.[b.id] || 0) - (v.votos?.[a.id] || 0))[0];
  const { el, fechar } = janela(
    `<h2>${v.modo === "previsao" ? "Qual foi a resposta certa?" : "Quem ganhou?"}</h2>
    <p class="muted">${v.modo === "previsao" ? "Os visitantes que votaram nesta opção acertaram." : `Com mais votos: <b>${esc(mais?.nome || "")}</b>.`} A votação fecha.</p>
    <div class="vv-resolver">${v.opcoes
      .map((o) => `<label class="ed-check"><input type="radio" name="res" value="${esc(o.id)}" ${(v.resultado || (v.modo === "decide" ? mais?.id : "")) === o.id ? "checked" : ""}> ${o.pessoa && pessoa(o.pessoa) ? avatar(pessoa(o.pessoa), 24) : ""}${esc(o.nome)} <small class="muted">${inteiro(v.votos?.[o.id] || 0)}${total ? ` · ${Math.round(((v.votos?.[o.id] || 0) / total) * 100)}%` : ""}</small></label>`)
      .join("")}</div>
    <div class="janela-acoes">${v.resultado ? `<button class="btn btn-texto" data-limpar>Tirar o resultado</button>` : ""}<button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>Confirmar</button></div>`,
  );
  $("[data-limpar]", el)?.addEventListener("click", async (e) => {
    await chamar("votacao/resolver", { id: v.id, resultado: null, fechar: false }, { botao: e.currentTarget, recarregar: false }).catch(() => {});
    fechar();
    depois();
  });
  $("[data-ok]", el).addEventListener("click", async (e) => {
    const r = $("input[name=res]:checked", el)?.value;
    if (!r) return toast("Escolhe uma opção.", { erro: true });
    const ok = await chamar("votacao/resolver", { id: v.id, resultado: r }, { botao: e.currentTarget, recarregar: false, sucesso: "Resultado guardado." }).catch(() => null);
    if (!ok) return;
    fechar();
    depois();
  });
}

// ---------- Torneios ----------
function formularioTorneio(depois) {
  const { el, fechar } = janela(
    `<h2>🏟️ Novo torneio</h2>
    <form class="vc-form" id="vt-form">
      <label class="campo"><span>Nome</span><input class="input" name="titulo" maxlength="100" placeholder="Torneio do Placar"></label>
      <label class="campo"><span>Descrição (opcional)</span><textarea class="input" name="descricao" rows="2" maxlength="600"></textarea></label>
      <div class="ed-grelha"><label class="campo"><span>Participantes</span><select class="input" name="n"><option>4</option><option selected>8</option><option>16</option></select></label>
      <label class="campo"><span>Encher com o ranking</span><select class="input" name="med"><option value="">Escolho eu</option><option value="views">Views do último mês</option><option value="indice">Índice de Influência</option><option value="subsTotal">Subscritores</option></select></label></div>
      <div class="campo"><span>Participantes (a ordem é a semente: o 1.º só encontra o 2.º na final)</span><div id="vt-pessoas"></div></div>
      <div class="ed-grelha">
        <label class="campo"><span>Resultado</span><select class="input" name="modo"><option value="decide">O público decide quem passa</option><option value="previsao">Previsão (decides tu, no Palco; o público tenta adivinhar)</option></select></label>
        <label class="campo"><span>A 1.ª ronda fecha em (opcional)</span><input class="input" type="datetime-local" name="fecha"></label>
        <label class="campo"><span>Estado</span><select class="input" name="estado"><option value="aberta">Abrir já</option><option value="rascunho">Rascunho</option></select></label>
      </div>
      <label class="ed-check" style="margin-top:10px"><input type="checkbox" name="mostrar" checked> Mostrar os votos enquanto está aberta</label>
    </form>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok data-a-esperar="A criar">Criar torneio</button></div>`,
    { larga: true },
  );
  const f = $("#vt-form", el);
  let sel = seletor($("#vt-pessoas", el), [], { max: 8, numerar: true });
  const reencher = () => {
    const n = Number(f.n.value);
    if (f.med.value) sel.definir(rankingPeriodo(f.med.value, { tipo: "ultimo" }, { n }).map((x) => x.p.id));
  };
  f.n.addEventListener("change", () => {
    sel = seletor($("#vt-pessoas", el), sel.ids.slice(0, Number(f.n.value)), { max: Number(f.n.value), numerar: true });
    reencher();
  });
  f.med.addEventListener("change", reencher);
  $("[data-ok]", el).addEventListener("click", async (e) => {
    const n = Number(f.n.value);
    if (sel.ids.length !== n) return toast(`Escolhe ${n} participantes (tens ${sel.ids.length}).`, { erro: true });
    const fecha = f.fecha.value;
    const r = await chamar(
      "torneio",
      { torneio: { titulo: f.titulo.value, descricao: f.descricao.value, participantes: sel.ids, modo: f.modo.value, estado: f.estado.value, fecha: fecha ? new Date(fecha).toISOString() : null, mostrar_resultados: f.mostrar.checked } },
      { botao: e.currentTarget, recarregar: false, sucesso: "Torneio criado." },
    ).catch(() => null);
    if (!r) return;
    fechar();
    depois();
  });
}

/** Fecha a ronda atual (com os vencedores) e cria a seguinte. */
function avancar(g, vs, depois) {
  const atual = Math.max(...vs.map((v) => v.ronda || 1));
  const rondas = vs[0].extra?.rondas || atual;
  const jogos = vs.filter((v) => (v.ronda || 1) === atual).sort((a, b) => (a.extra?.pos || 0) - (b.extra?.pos || 0));
  const previsao = vs[0].modo === "previsao";
  const { el, fechar } = janela(
    `<h2>${atual === rondas ? "A final" : NOME_RONDA(atual, rondas)}: quem passa?</h2>
    <p class="muted">${previsao ? "É uma previsão: escolhe quem ganhou (por exemplo, a batalha que gravaste no Palco)." : "Já vem escolhido quem teve mais votos. Em caso de empate, decides tu."}</p>
    <div class="vv-avancar">${jogos
      .map((v) => {
        const mais = [...v.opcoes].sort((a, b) => (v.votos?.[b.id] || 0) - (v.votos?.[a.id] || 0));
        const empate = (v.votos?.[mais[0].id] || 0) === (v.votos?.[mais[1].id] || 0);
        const pre = v.resultado || (previsao || empate ? "" : mais[0].id);
        return `<fieldset data-jogo="${esc(v.id)}"><legend>${esc(v.titulo)}${empate && !previsao ? " (empate)" : ""}</legend>${v.opcoes
          .map((o) => `<label class="ed-check"><input type="radio" name="j-${esc(v.id)}" value="${esc(o.id)}" ${pre === o.id ? "checked" : ""}> ${o.pessoa && pessoa(o.pessoa) ? avatar(pessoa(o.pessoa), 24) : ""}${esc(o.nome)} <small class="muted">${inteiro(v.votos?.[o.id] || 0)} votos</small></label>`)
          .join("")}</fieldset>`;
      })
      .join("")}</div>
    ${atual < rondas ? `<label class="campo" style="margin-top:12px;max-width:320px"><span>A próxima ronda fecha em (opcional)</span><input class="input" type="datetime-local" id="vv-fecha"></label>` : ""}
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok data-a-esperar="A avançar">${atual === rondas ? "Coroar o campeão" : "Avançar"}</button></div>`,
    { larga: true },
  );
  $("[data-ok]", el).addEventListener("click", async (e) => {
    const vencedores = {};
    for (const fs of $$("[data-jogo]", el)) {
      const x = $("input:checked", fs);
      if (!x) return toast("Falta escolher quem passa em todos os confrontos.", { erro: true });
      vencedores[fs.dataset.jogo] = x.value;
    }
    const fecha = $("#vv-fecha", el)?.value;
    const r = await chamar("torneio/avancar", { grupo: g, vencedores, fecha: fecha ? new Date(fecha).toISOString() : null }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
    if (!r) return;
    toast(r.campeao ? `🏆 ${r.campeao.nome} é o campeão!` : "Próxima ronda aberta.");
    fechar();
    depois();
  });
}
