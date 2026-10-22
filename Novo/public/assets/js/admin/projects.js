// Edição de projetos (séries, formatos, conteúdos grandes).

import { estado } from "../data.js";
import { esc, curto, norm, plural, ha } from "../format.js";
import { $, $$, avatar, confirmar, toast } from "../ui.js";
import { adm, chamar, escolherPessoa } from "./common.js";

const TIPOS = ["série", "formato", "podcast", "evento", "documentário", "desafio", "reality", "outro"];

export async function render(alvo, query) {
  let selecionado = query.get("id") && adm.db.projects[query.get("id")] ? query.get("id") : null;
  alvo.innerHTML = `<div class="ed-duas">
    <aside class="ed-lista">
      <div style="display:flex;gap:8px"><input class="input" id="pj-q" type="search" placeholder="Procurar"><button class="btn btn-primario" id="pj-novo">Novo</button></div>
      <div id="pj-itens" class="ed-itens" style="margin-top:10px"></div>
    </aside>
    <section class="ed-editor" id="pj-editor"></section></div>`;

  const lista = () => {
    const t = norm($("#pj-q", alvo).value);
    const itens = Object.values(adm.db.projects)
      .filter((p) => !t || norm(p.name).includes(t) || norm(adm.db.people[p.personId]?.name).includes(t))
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    $("#pj-itens", alvo).innerHTML =
      itens
        .map((p) => {
          const s = estado.projetos.get(p.id);
          return `<button class="ed-item${p.id === selecionado ? " ativo" : ""}" data-id="${esc(p.id)}"><span><b>${esc(p.name)}</b><small>${esc(adm.db.people[p.personId]?.name || "sem criador")}${s?.episodes ? `, ${s.episodes} ep., ${curto(s.totalViews)} views` : ""}</small></span></button>`;
        })
        .join("") || `<p class="muted" style="padding:12px">Ainda não há projetos.</p>`;
  };
  const abrir = (id) => {
    selecionado = id;
    history.replaceState(null, "", "#/editar/projetos" + (id ? "?id=" + encodeURIComponent(id) : ""));
    lista();
    formulario($("#pj-editor", alvo), id ? structuredClone(adm.db.projects[id]) : null, abrir);
  };
  $("#pj-q", alvo).addEventListener("input", lista);
  $("#pj-itens", alvo).addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (b) abrir(b.dataset.id);
  });
  $("#pj-novo", alvo).addEventListener("click", () => abrir(null));
  lista();
  abrir(selecionado);
}

function formulario(alvo, p, abrir) {
  const novo = !p;
  p ||= { name: "", type: "série", personId: "", guests: [], description: "", cover: "", year: "", source: null, manual: null, ratings: { main: null, individual: [] }, status: "" };
  p.ratings ||= { main: null, individual: [] };
  p.ratings.individual ||= [];
  const resumo = !novo ? estado.projetos.get(p.id) : null;
  const linksTexto = [p.source?.playlistId ? `https://www.youtube.com/playlist?list=${p.source.playlistId}` : "", ...(p.source?.videoIds || []).map((v) => `https://youtu.be/${v}`)].filter(Boolean).join("\n");

  alvo.innerHTML = `<form class="painel ed-bloco" id="pj-form">
    <h3>${novo ? "Novo projeto" : esc(p.name)}</h3>
    ${resumo?.at ? `<p class="muted">${resumo.episodes} episódios, ${curto(resumo.totalViews)} views. Números atualizados ${esc(ha(resumo.at))}. <a href="/#/projeto/${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Ver no site público</a></p>` : ""}
    <div class="ed-grelha">
      <label class="campo"><span>Nome</span><input class="input" name="nome" value="${esc(p.name)}" required></label>
      <label class="campo"><span>Tipo</span><select class="input" name="tipo">${TIPOS.map((t) => `<option ${p.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="campo"><span>Criador</span><span style="position:relative"><input class="input" id="pj-criador" placeholder="Procurar Youtuber" value="${esc(adm.db.people[p.personId]?.name || "")}"></span></label>
      <label class="campo"><span>Estado</span><select class="input" name="estado"><option value="">Não indicado</option><option value="a decorrer" ${p.status === "a decorrer" ? "selected" : ""}>A decorrer</option><option value="terminado" ${p.status === "terminado" ? "selected" : ""}>Terminado</option></select></label>
    </div>
    <div class="campo" style="margin-top:12px"><span>Convidados</span><div id="pj-convidados" class="ed-chips"></div><span style="position:relative"><input class="input" id="pj-conv-q" placeholder="Adicionar convidado"></span></div>
    <label class="campo" style="margin-top:12px"><span>Episódios no YouTube</span><textarea class="input" name="links" rows="4" placeholder="Link da playlist e/ou links dos vídeos, um por linha">${esc(linksTexto)}</textarea><small>Com uma playlist, os episódios novos entram sozinhos. Também podes colar vídeos soltos.</small></label>
    <div class="ed-acoes" style="justify-content:flex-start"><button type="button" class="btn btn-pequeno" id="pj-ver" data-a-esperar="A ver">Verificar links</button><span id="pj-prev" class="muted" style="font-size:var(--t-sm)"></span></div>
    <details style="margin-top:8px"><summary class="soft">Projeto fora do YouTube ou sem links: números à mão</summary>
      <div class="ed-grelha" style="margin-top:10px">
        <label class="campo"><span>Episódios</span><input class="input" name="mEp" type="number" min="0" value="${esc(p.manual?.episodes ?? "")}"></label>
        <label class="campo"><span>Views totais</span><input class="input" name="mViews" type="number" min="0" value="${esc(p.manual?.views ?? "")}"></label>
        <label class="campo"><span>Ano</span><input class="input" name="ano" type="number" min="2005" max="2100" value="${esc(p.year ?? "")}"></label>
      </div></details>
    <label class="campo" style="margin-top:12px"><span>Descrição</span><textarea class="input" name="descricao" rows="3" placeholder="De que se trata, porque foi importante.">${esc(p.description)}</textarea></label>
    <label class="campo" style="margin-top:12px"><span>Capa (link de imagem)</span><input class="input" name="capa" value="${esc(p.cover)}" placeholder="Vazio = miniatura do primeiro episódio"></label>
    <div class="ed-grelha" style="margin-top:12px">
      <label class="campo"><span>A tua avaliação (0 a 10)</span><input class="input" name="nota" type="number" min="0" max="10" step="0.5" value="${esc(p.ratings.main ?? "")}"></label>
    </div>
    <div class="campo" style="margin-top:12px"><span>Outras avaliações</span>
      <div id="pj-notas" class="ed-hist"></div>
      <div style="display:flex;gap:8px;margin-top:6px"><input class="input" id="pj-nota-nome" placeholder="Nome de quem avalia"><input class="input" id="pj-nota-valor" type="number" min="0" max="10" step="0.5" placeholder="0 a 10" style="width:110px"><button type="button" class="btn btn-pequeno" id="pj-nota-add">Adicionar</button></div>
    </div>
    <div class="ed-acoes">
      ${novo ? "" : `<button type="button" class="btn btn-perigo" id="pj-apagar">Apagar</button><button type="button" class="btn" id="pj-atualizar" data-a-esperar="A atualizar">Atualizar números agora</button>`}
      <button class="btn btn-primario" type="submit" data-a-esperar="A guardar">${novo ? "Criar projeto" : "Guardar"}</button>
    </div></form>`;

  const desenharConvidados = () => {
    $("#pj-convidados", alvo).innerHTML = p.guests
      .map((g) => {
        const pe = adm.db.people[g];
        return pe ? `<span class="etiqueta">${avatar(estado.pessoas.get(g) || { name: pe.name }, 18)} ${esc(pe.name)} <button type="button" class="btn-texto" data-tirar="${esc(g)}" aria-label="Tirar ${esc(pe.name)}">✕</button></span>` : "";
      })
      .join("");
    $$("[data-tirar]", alvo).forEach((b) =>
      b.addEventListener("click", () => {
        p.guests = p.guests.filter((x) => x !== b.dataset.tirar);
        desenharConvidados();
      }),
    );
  };
  const desenharNotas = () => {
    $("#pj-notas", alvo).innerHTML = p.ratings.individual.map((r, i) => `<div><span>${esc(r.name)}</span><span>${r.rating}/10</span><button type="button" class="btn btn-texto btn-pequeno" data-nota="${i}">Tirar</button></div>`).join("");
    $$("[data-nota]", alvo).forEach((b) =>
      b.addEventListener("click", () => {
        p.ratings.individual.splice(Number(b.dataset.nota), 1);
        desenharNotas();
      }),
    );
  };
  escolherPessoa($("#pj-criador", alvo), (pe) => {
    p.personId = pe.id;
    $("#pj-criador", alvo).value = pe.name;
    p.guests = p.guests.filter((g) => g !== pe.id);
    desenharConvidados();
  });
  escolherPessoa($("#pj-conv-q", alvo), (pe) => {
    if (pe.id !== p.personId && !p.guests.includes(pe.id)) p.guests.push(pe.id);
    $("#pj-conv-q", alvo).value = "";
    desenharConvidados();
  });
  $("#pj-nota-add", alvo).addEventListener("click", () => {
    const name = $("#pj-nota-nome", alvo).value.trim();
    const rating = Number($("#pj-nota-valor", alvo).value);
    if (!name || !Number.isFinite(rating) || rating < 0 || rating > 10) return toast("Escreve o nome e uma nota de 0 a 10.", { erro: true });
    p.ratings.individual.push({ name, rating });
    $("#pj-nota-nome", alvo).value = "";
    $("#pj-nota-valor", alvo).value = "";
    desenharNotas();
  });
  const fonte = async () => {
    const texto = $("[name=links]", alvo).value;
    if (!texto.trim()) return null;
    const r = await chamar("project/preview", { text: texto }, { botao: $("#pj-ver", alvo), recarregar: false });
    $("#pj-prev", alvo).textContent = [r.playlist ? `Playlist "${r.playlist.title}" com ${r.playlist.count} vídeos.` : r.source.playlistId ? "Não encontrei essa playlist." : "", r.source.videoIds.length ? `${plural(r.source.videoIds.length, "vídeo solto", "vídeos soltos")}.` : ""].filter(Boolean).join(" ") || "Não encontrei links do YouTube.";
    return r.source.playlistId || r.source.videoIds.length ? { playlistId: r.source.playlistId, videoIds: r.source.videoIds, exclude: p.source?.exclude || [] } : null;
  };
  $("#pj-ver", alvo).addEventListener("click", () => fonte().catch(() => {}));
  $("#pj-form", alvo).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    let source = null;
    try {
      source = await fonte();
    } catch {
      return;
    }
    const nota = f.namedItem("nota").value;
    const project = {
      id: p.id,
      name: f.namedItem("nome").value.trim(),
      type: f.namedItem("tipo").value,
      personId: p.personId,
      guests: p.guests,
      description: f.namedItem("descricao").value.trim(),
      cover: f.namedItem("capa").value.trim(),
      year: f.namedItem("ano").value || null,
      status: f.namedItem("estado").value,
      manual: f.namedItem("mEp").value || f.namedItem("mViews").value ? { episodes: Number(f.namedItem("mEp").value) || 0, views: Number(f.namedItem("mViews").value) || 0 } : null,
      ratings: { main: nota === "" ? null : Number(nota), individual: p.ratings.individual },
      source,
    };
    if (!project.personId) return toast("Escolhe o criador do projeto.", { erro: true });
    const r = await chamar("project", { project }, { botao: e.submitter, sucesso: novo ? "Projeto criado." : "Projeto guardado." }).catch(() => null);
    if (r) abrir(r.project.id);
  });
  $("#pj-apagar", alvo)?.addEventListener("click", async () => {
    if (!(await confirmar(`Apagar o projeto "${p.name}"?`, { sim: "Apagar", perigo: true }))) return;
    await chamar("project/delete", { id: p.id }, { sucesso: "Projeto apagado." }).catch(() => {});
    abrir(null);
  });
  $("#pj-atualizar", alvo)?.addEventListener("click", async (e) => {
    await chamar("project", { project: adm.db.projects[p.id], refresh: true }, { botao: e.currentTarget, sucesso: "Números atualizados." }).catch(() => {});
    abrir(p.id);
  });
  desenharConvidados();
  desenharNotas();
}
