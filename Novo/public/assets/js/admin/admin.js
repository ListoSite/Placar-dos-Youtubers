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
  main.dataset.titulo = "Editar";
  if (!temSessao()) return login(main);
  const sep = SEPARADORES.find((s) => s.id === params[0]) || SEPARADORES[0];
  main.innerHTML = `<div class="wrap editar">
    <div class="pagina-topo" style="padding-bottom:12px"><h1>Editar</h1><p class="muted" id="ed-estado"></p></div>
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

function login(main, msg = "") {
  const ativo = estado.ds?.meta?.adminEnabled;
  main.innerHTML = `<div class="wrap" style="max-width:460px;padding-top:64px">
    <h1 class="placar" style="font-size:var(--t-3xl)">Entrar</h1>
    <p class="soft" style="margin-top:8px">A área de edição serve para adicionar Youtubers, ligar canais, importar dados e criar projetos.</p>
    ${ativo === false ? `<div class="aviso" style="margin:16px 0"><p>A edição ainda não está ligada. No Netlify, cria a variável <b>ADMIN_PASSWORD</b> com a tua palavra-passe e volta a publicar o site.</p></div>` : ""}
    ${msg ? `<div class="aviso" style="margin:16px 0"><p>${esc(msg)}</p></div>` : ""}
    <form id="login" class="painel" style="margin-top:20px;display:flex;flex-direction:column;gap:14px">
      <label class="campo"><span>Palavra-passe</span><input class="input" type="password" name="password" autocomplete="current-password" required autofocus></label>
      <button class="btn btn-primario" type="submit">Entrar</button>
    </form></div>`;
  $("#login", main).addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      const r = await api("login", { corpo: { password: e.target.password.value } });
      guardarToken(r.token);
      $("#link-editar")?.classList.add("ativo");
      toast("Entraste na área de edição.");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } catch (err) {
      toast(err.message, { erro: true });
      b.disabled = false;
    }
  });
}

export function sair() {
  guardarToken("");
  $("#link-editar")?.classList.remove("ativo");
  location.hash = "#/";
}
