// Área de edição: login e separadores.

import { api, guardarToken, temSessao, estado, carregar } from "../data.js";
import { esc } from "../format.js";
import { $, toast } from "../ui.js";
import { adm, lerDb, quotaTexto, aoMudarNoutraJanela } from "./common.js";

const SEPARADORES = [
  { id: "youtubers", nome: "Youtubers", mod: "./people.js" },
  { id: "ligar", nome: "Ligar canais", mod: "./match.js" },
  { id: "descobrir", nome: "Descobrir canais", mod: "./discover.js" },
  { id: "importar", nome: "Importar dados", mod: "./import.js" },
  { id: "projetos", nome: "Projetos", mod: "./projects.js" },
  { id: "definicoes", nome: "Definições", mod: "./settings.js" },
];

// A secção aberta, para o botão "Atualizar dados" e para a atualização automática
let vista = null;

export async function render(main, { params, query }) {
  if (!temSessao()) return login(main);
  const sep = SEPARADORES.find((s) => s.id === params[0]) || SEPARADORES[0];
  main.dataset.titulo = sep.nome;
  main.innerHTML = `<div class="wrap editar">
    <div class="pagina-topo pn-topo-acoes"><div><p class="pn-migalha">Dados</p><h1>${esc(sep.nome)}</h1><p class="muted" id="ed-estado"></p></div>
      <div class="ed-atualizar"><button class="btn btn-pequeno" id="ed-atualizar" title="Volta a ler os dados do servidor, sem carregar em F5">${ICONE_ATUALIZAR}<span>Atualizar dados</span></button><small class="muted" id="ed-atualizado"></small></div></div>
    <div class="aviso info ed-novidade" id="ed-novidade" hidden><p>Chegaram dados novos de outra janela. Não atualizei esta para não perderes o que estás a escrever.</p><button class="btn btn-pequeno btn-primario" id="ed-novidade-sim">Atualizar agora</button></div>
    <nav class="ed-separadores" aria-label="Secções de edição">${SEPARADORES.map((s) => `<a href="#/editar/${s.id}" ${s.id === sep.id ? 'aria-current="page"' : ""}>${s.nome}</a>`).join("")}</nav>
    <div id="ed-conteudo"><div class="a-carregar" style="min-height:30vh"><div class="roda"></div></div></div></div>`;
  vista = null;
  try {
    await lerDb();
  } catch (e) {
    if (e.status === 401) return login(main, "A sessão expirou. Entra outra vez.");
    $("#ed-conteudo", main).innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  escreverEstado(main);
  const mod = await import(sep.mod);
  const conteudo = $("#ed-conteudo", main);
  const v = { main, sep, mod, conteudo, sujo: false, pendente: false };
  vista = v;
  // Escrever num campo (que não seja de procurar) conta como alterações por gravar
  conteudo.addEventListener("input", (e) => {
    if (e.target.matches?.("input:not([type=search]), textarea, select")) v.sujo = true;
  });
  conteudo.addEventListener("change", (e) => {
    if (e.target.matches?.("input:not([type=search]), textarea, select")) v.sujo = true;
  });
  $("#ed-atualizar", main).addEventListener("click", (e) => {
    if (v.sujo && !confirm("Tens alterações por gravar nesta página. Atualizar na mesma? (O que não gravaste perde-se.)")) return;
    atualizarDados({ botao: e.currentTarget, aviso: true });
  });
  $("#ed-novidade-sim", main).addEventListener("click", (e) => atualizarDados({ botao: e.currentTarget }));
  marcarHora(main);
  return mod.render(conteudo, query);
}

const ICONE_ATUALIZAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 21v-5h-5"/></svg>`;

function escreverEstado(main) {
  const el = $("#ed-estado", main);
  if (!el) return;
  const semCanal = Object.values(adm.db.people).filter((p) => !p.channels.length).length;
  el.innerHTML = `${Object.keys(adm.db.people).length} Youtubers, ${Object.keys(adm.db.channels).length} canais ligados${semCanal ? `, ${semCanal} ainda sem canal` : ""}. ${esc(quotaTexto())}${adm.hasApiKey ? "" : ' <b style="color:var(--ouro)">Falta a chave da API do YouTube.</b>'}`;
}

function marcarHora(main) {
  const el = $("#ed-atualizado", main);
  if (el) el.textContent = "Dados de " + new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

const aberta = () => (vista && vista.conteudo.isConnected ? vista : (vista = null));

/**
 * Volta a ler a base de dados e o dataset e desenha outra vez a secção aberta, sem F5.
 * Fica no mesmo Youtuber (o link guarda-o), com a mesma procura e no mesmo sítio da página.
 */
async function atualizarDados({ botao, aviso = false, redesenhar = true } = {}) {
  const v = aberta();
  if (!v || v.ocupado) return;
  v.ocupado = true;
  const texto = botao?.innerHTML;
  if (botao) {
    botao.disabled = true;
    botao.innerHTML = `<span class="mini-roda"></span> A atualizar`;
  }
  try {
    await lerDb();
    await carregar({ forcar: true });
    if (aberta() !== v) return;
    escreverEstado(v.main);
    marcarHora(v.main);
    if (!redesenhar) return;
    const y = scrollY;
    const query = new URLSearchParams(location.hash.split("?")[1] || "");
    await v.mod.render(v.conteudo, query, { refrescar: true });
    scrollTo({ top: y });
    v.sujo = false;
    $("#ed-novidade", v.main).hidden = true;
    if (aviso) toast("Dados atualizados.");
  } catch (e) {
    if (e.status === 401) return login(v.main, "A sessão expirou. Entra outra vez.");
    toast(e.message, { erro: true });
  } finally {
    v.ocupado = false;
    if (botao?.isConnected) {
      botao.disabled = false;
      botao.innerHTML = texto;
    }
  }
}

// Outra janela do painel gravou dados (por exemplo a que o marcador abriu para importar):
// esta atualiza-se quando voltas a ela. Se estiveres a meio de escrever, só avisa.
function tratarNovidade() {
  const v = aberta();
  if (!v) return;
  v.pendente = false;
  const ocupada = v.sujo || v.sep.id === "importar" || document.querySelector(".janela-fundo");
  if (ocupada) {
    $("#ed-novidade", v.main).hidden = false;
    atualizarDados({ redesenhar: false });
  } else {
    atualizarDados().then(() => aberta() === v && toast("Chegaram dados novos de outra janela: já estão aqui."));
  }
}
aoMudarNoutraJanela(() => {
  const v = aberta();
  if (!v) return;
  v.pendente = true;
  if (document.visibilityState === "visible" && document.hasFocus()) tratarNovidade();
});
const aoVoltar = () => document.visibilityState === "visible" && aberta()?.pendente && tratarNovidade();
document.addEventListener("visibilitychange", aoVoltar);
window.addEventListener("focus", aoVoltar);
// Gravar nesta janela limpa as "alterações por gravar"
window.addEventListener("placar:painel-gravou", () => {
  const v = aberta();
  if (v) v.sujo = false;
});

export async function login(main, msg = "") {
  main.innerHTML = `<div class="a-carregar"><div class="roda" aria-label="A carregar"></div></div>`;
  const st = await api("status").catch(() => ({}));
  const ativo = st.adminEnabled;
  const google = st.loginGoogle || "";
  const entrou = (token) => {
    guardarToken(token);
    $("#link-editar")?.classList.add("ativo");
    toast("Entraste no painel.");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  main.innerHTML = `<div class="wrap" style="max-width:460px;padding-top:64px">
    <h1 class="placar" style="font-size:var(--t-3xl)">Entrar</h1>
    <p class="soft" style="margin-top:8px">O painel do Placar é só para quem gere o site.</p>
    ${ativo === false ? `<div class="aviso" style="margin:16px 0"><p>O painel ainda não está ligado. No Netlify, cria a variável <b>ADMIN_PASSWORD</b> com a tua palavra-passe e volta a publicar o site.</p></div>` : ""}
    ${msg ? `<div class="aviso" style="margin:16px 0"><p>${esc(msg)}</p></div>` : ""}
    ${google ? `<div class="painel login-google" style="margin-top:20px;display:flex;flex-direction:column;align-items:center;gap:12px"><div id="g-botao" style="min-height:44px"></div><p class="muted" id="g-nota" style="font-size:var(--t-xs);text-align:center">Só as contas autorizadas entram.</p></div>` : ""}
    ${google ? `<details style="margin-top:16px"><summary class="muted" style="cursor:pointer">Entrar com a palavra-passe</summary>` : ""}
    <form id="login" class="painel" style="margin-top:${google ? 12 : 20}px;display:flex;flex-direction:column;gap:14px">
      <label class="campo"><span>Palavra-passe</span><input class="input" type="password" name="password" autocomplete="current-password" required ${google ? "" : "autofocus"}></label>
      <button class="btn btn-primario" type="submit">Entrar</button>
    </form>${google ? "</details>" : ""}</div>`;
  $("#login", main).addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      const r = await api("login", { corpo: { password: e.target.password.value } });
      entrou(r.token);
    } catch (err) {
      toast(err.message, { erro: true });
      b.disabled = false;
    }
  });
  if (google) botaoGoogle(google, entrou);
}

/** Botão "Iniciar sessão com o Google" (Google Identity Services). */
function botaoGoogle(clientId, entrou) {
  const montar = () => {
    const alvo = $("#g-botao");
    if (!alvo || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        try {
          const r = await api("login", { corpo: { google: credential } });
          entrou(r.token);
        } catch (err) {
          toast(err.message, { erro: true, tempo: 6000 });
        }
      },
    });
    window.google.accounts.id.renderButton(alvo, { theme: "filled_black", size: "large", shape: "pill", text: "signin_with", locale: "pt-PT" });
  };
  if (window.google?.accounts?.id) return montar();
  let s = document.getElementById("gsi-script");
  if (!s) {
    s = document.createElement("script");
    s.id = "gsi-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onerror = () => {
      const n = $("#g-nota");
      if (n) n.textContent = "Não foi possível carregar o botão do Google. Usa a palavra-passe.";
    };
    document.head.appendChild(s);
  }
  s.addEventListener("load", montar);
}

export async function sair() {
  guardarToken("");
  // Os dados do painel guardados para usar sem internet também saem deste browser
  try {
    for (const k of (await window.caches?.keys()) || []) await (await caches.open(k)).delete("/api/dataset");
  } catch {
    /* sem cache */
  }
  $("#link-editar")?.classList.remove("ativo");
  location.hash = "#/";
  location.reload();
}
