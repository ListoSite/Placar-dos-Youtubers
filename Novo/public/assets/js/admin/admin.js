// Área de edição: login e separadores.

import { api, guardarToken, temSessao, estado } from "../data.js";
import { esc } from "../format.js";
import { $, toast } from "../ui.js";
import { adm, lerDb, quotaTexto } from "./common.js";

const SEPARADORES = [
  { id: "youtubers", nome: "Youtubers", mod: "./people.js" },
  { id: "ligar", nome: "Ligar canais", mod: "./match.js" },
  { id: "descobrir", nome: "Descobrir canais", mod: "./discover.js" },
  { id: "importar", nome: "Importar dados", mod: "./import.js" },
  { id: "projetos", nome: "Projetos", mod: "./projects.js" },
  { id: "definicoes", nome: "Definições", mod: "./settings.js" },
];

export async function render(main, { params, query }) {
  if (!temSessao()) return login(main);
  const sep = SEPARADORES.find((s) => s.id === params[0]) || SEPARADORES[0];
  main.dataset.titulo = sep.nome;
  main.innerHTML = `<div class="wrap editar">
    <div class="pagina-topo"><p class="pn-migalha">Dados</p><h1>${esc(sep.nome)}</h1><p class="muted" id="ed-estado"></p></div>
    <nav class="ed-separadores" aria-label="Secções de edição">${SEPARADORES.map((s) => `<a href="#/editar/${s.id}" ${s.id === sep.id ? 'aria-current="page"' : ""}>${s.nome}</a>`).join("")}</nav>
    <div id="ed-conteudo"><div class="a-carregar" style="min-height:30vh"><div class="roda"></div></div></div></div>`;
  try {
    await lerDb();
  } catch (e) {
    if (e.status === 401) return login(main, "A sessão expirou. Entra outra vez.");
    $("#ed-conteudo", main).innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  const semCanal = Object.values(adm.db.people).filter((p) => !p.channels.length).length;
  $("#ed-estado", main).innerHTML = `${Object.keys(adm.db.people).length} Youtubers, ${Object.keys(adm.db.channels).length} canais ligados${semCanal ? `, ${semCanal} ainda sem canal` : ""}. ${esc(quotaTexto())}${adm.hasApiKey ? "" : ' <b style="color:var(--ouro)">Falta a chave da API do YouTube.</b>'}`;
  const mod = await import(sep.mod);
  return mod.render($("#ed-conteudo", main), query);
}

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
