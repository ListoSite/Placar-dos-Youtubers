// Edição de Youtubers: dados, canais, redes sociais, views por mês, juntar e apagar.

import { estado } from "../data.js";
import { esc, curto, inteiro, norm, mesNome, data } from "../format.js";
import { $, $$, avatar, janela, confirmar, toast, REDES, ICONES } from "../ui.js";
import { adm, chamar, pessoasOrdenadas, categorias, cartaoCanal, escolherPessoa, fonteEtiqueta, linkSocialBlade } from "./common.js";
import { blocoAbout, escolhas, resumoAbout } from "./youtube.js";

const sugestoes = (p) => (adm.db.suggestions?.[p.id]?.list || []).filter((c) => !c.linkedTo && !adm.db.channels[c.id]);
const lerNoYouTube = (id, texto = "Ler no YouTube") => `<a href="https://www.youtube.com/channel/${esc(id)}/about" target="_blank" rel="noopener" title="Abre o Acerca de. Carrega lá no marcador Placar ⇄ YouTube">${esc(texto)} ↗</a>`;
// Ir para o Youtuber seguinte da lista (definido pela lista aberta)
let irSeguinte = null;
// Separador aberto nas views por mês (o Youtuber ou um canal), para não saltar ao guardar
let abaMeses = { id: "", aba: "" };

const PAPEIS = ["principal", "secundário", "clips", "gaming", "podcast", "shorts", "música", "outro"];
const ESTADOS = [
  ["ativo", "Ativo"],
  ["pausa", "Em pausa"],
  ["arquivado", "Arquivado (já não publica)"],
];

export async function render(alvo, query) {
  let filtro = "todos";
  let termo = "";
  let selecionado = query.get("id") && adm.db.people[query.get("id")] ? query.get("id") : null;

  alvo.innerHTML = `<div class="ed-duas">
    <aside class="ed-lista">
      <div style="display:flex;gap:8px"><input class="input" id="pp-q" type="search" placeholder="Procurar"><button class="btn btn-primario" id="pp-novo" title="Novo Youtuber">Novo</button></div>
      <div class="segmentos" id="pp-filtro" style="margin:10px 0">
        <button data-f="todos" aria-pressed="true">Todos</button><button data-f="semcanal">Sem canal</button><button data-f="confirmar" title="Com canais sugeridos por confirmar">Para confirmar</button><button data-f="escondidos">Escondidos</button>
      </div>
      <div id="pp-lista" class="ed-itens"></div>
    </aside>
    <section id="pp-editor" class="ed-editor"></section></div>`;

  const listaAtual = () => {
    const t = norm(termo);
    return pessoasOrdenadas().filter((p) => {
      if (filtro === "semcanal" && p.channels.length) return false;
      if (filtro === "confirmar" && !sugestoes(p).length) return false;
      if (filtro === "escondidos" && !p.hidden) return false;
      return !t || norm(p.name).includes(t) || norm(p.realName).includes(t);
    });
  };
  irSeguinte = (id) => {
    const l = listaAtual();
    const i = l.findIndex((p) => p.id === id);
    const prox = l[i + 1] || l.find((p) => p.id !== id);
    return prox
      ? () => {
          abrir(prox.id);
          const ed = $("#pp-editor", alvo);
          if (ed.getBoundingClientRect().top < 0) scrollTo({ top: ed.getBoundingClientRect().top + scrollY - 90, behavior: "smooth" });
        }
      : null;
  };
  const desenharLista = () => {
    const lista = listaAtual();
    const nConf = Object.values(adm.db.people).filter((p) => sugestoes(p).length).length;
    $('#pp-filtro [data-f="confirmar"]', alvo).textContent = `Para confirmar${nConf ? ` (${nConf})` : ""}`;
    $("#pp-lista", alvo).innerHTML =
      lista
        .slice(0, 400)
        .map(
          (p) => `<button class="ed-item${p.id === selecionado ? " ativo" : ""}" data-id="${esc(p.id)}">${avatar(estado.pessoas.get(p.id) || { name: p.name }, 30)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "sem categoria")}${p.channels.length ? `, ${p.channels.length} canal${p.channels.length > 1 ? "is" : ""}` : ", sem canal"}${p.hidden ? ", escondido" : ""}</small></span>${sugestoes(p).length ? `<span class="ed-item-sug" title="${sugestoes(p).length} canais sugeridos por confirmar">${sugestoes(p).length}</span>` : ""}</button>`,
        )
        .join("") || `<p class="muted" style="padding:12px">Ninguém encontrado.</p>`;
  };

  const abrir = (id) => {
    selecionado = id;
    history.replaceState(null, "", "#/editar/youtubers" + (id ? "?id=" + encodeURIComponent(id) : ""));
    desenharLista();
    editor($("#pp-editor", alvo), id, () => {
      desenharLista();
    }, abrir);
  };

  $("#pp-q", alvo).addEventListener("input", (e) => {
    termo = e.target.value;
    desenharLista();
  });
  $$("#pp-filtro button", alvo).forEach((b) =>
    b.addEventListener("click", () => {
      filtro = b.dataset.f;
      $$("#pp-filtro button", alvo).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      desenharLista();
    }),
  );
  $("#pp-lista", alvo).addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (!b) return;
    abrir(b.dataset.id);
    // No telemóvel a ficha fica por baixo da lista: levar a pessoa até lá.
    if (matchMedia("(max-width: 900px)").matches) {
      const ed = $("#pp-editor", alvo);
      scrollTo({ top: ed.getBoundingClientRect().top + scrollY - 90, behavior: "smooth" });
    }
  });
  $("#pp-novo", alvo).addEventListener("click", () => novo(abrir));
  desenharLista();
  if (selecionado) abrir(selecionado);
  else $("#pp-editor", alvo).innerHTML = `<div class="vazio"><h3>Escolhe um Youtuber</h3><p>Ou cria um novo a partir do link do canal.</p></div>`;
}

function novo(abrir) {
  const { el, fechar } = janela(`<h2>Novo Youtuber</h2>
    <p class="soft">Cola o link do canal principal. O nome, a foto e os números vêm do YouTube.</p>
    <div style="display:flex;gap:8px;margin-top:12px"><input class="input" id="nv-link" placeholder="https://www.youtube.com/@canal" autofocus><button class="btn" id="nv-ver" data-a-esperar="A procurar">Procurar</button></div>
    <div id="nv-prev" style="margin-top:14px"></div>
    <div class="grelha-2" style="margin-top:12px;gap:12px">
      <label class="campo"><span>Nome no placar</span><input class="input" id="nv-nome" placeholder="Fica o nome do canal"></label>
      <label class="campo"><span>Categoria</span><input class="input" id="nv-cat" list="lista-cats"></label>
    </div>
    <datalist id="lista-cats">${categorias().map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn" id="nv-so-nome">Criar só com o nome</button><button class="btn btn-primario" id="nv-criar" data-a-esperar="A criar" disabled>Criar com este canal</button></div>`);
  let canal = null;
  $("#nv-ver", el).addEventListener("click", async (e) => {
    const r = await chamar("channel/resolve", { input: $("#nv-link", el).value }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
    if (!r) return;
    canal = r.channel;
    $("#nv-prev", el).innerHTML = cartaoCanal(canal);
    $("#nv-criar", el).disabled = Boolean(canal.linkedTo);
    if (!$("#nv-nome", el).value) $("#nv-nome", el).placeholder = canal.title;
  });
  $("#nv-criar", el).addEventListener("click", async (e) => {
    const r = await chamar("person/from-channel", { channel: { id: canal.id }, name: $("#nv-nome", el).value.trim() || canal.title, category: $("#nv-cat", el).value.trim() }, { botao: e.currentTarget, sucesso: "Youtuber criado." }).catch(() => null);
    if (r) {
      fechar();
      abrir(r.person.id);
    }
  });
  $("#nv-so-nome", el).addEventListener("click", async (e) => {
    const nome = $("#nv-nome", el).value.trim();
    if (!nome) return toast("Escreve o nome primeiro.", { erro: true });
    const r = await chamar("person", { person: { name: nome, category: $("#nv-cat", el).value.trim() } }, { botao: e.currentTarget, sucesso: "Youtuber criado." }).catch(() => null);
    if (r) {
      fechar();
      abrir(r.person.id);
    }
  });
}

function editor(alvo, id, aoMudar, abrir) {
  const p = adm.db.people[id];
  if (!p) {
    alvo.innerHTML = "";
    return;
  }
  const pub = estado.pessoas.get(id);
  const canais = p.channels.map((c) => ({ link: adm.db.channels[c], pub: estado.canais.get(c) })).filter((x) => x.link);
  alvo.innerHTML = `
    <div class="ed-cabeca">${avatar(pub || { name: p.name }, 64)}<div style="flex:1;min-width:0"><h2>${esc(p.name)}</h2><a href="/#/youtuber/${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Ver no site público</a></div>${irSeguinte?.(id) ? `<button class="btn btn-pequeno" id="ed-seguinte" title="Youtuber seguinte desta lista">Seguinte →</button>` : ""}</div>

    <form class="painel ed-bloco" id="ed-dados">
      <h3>Dados</h3>
      <div class="ed-grelha">
        <label class="campo"><span>Nome no placar</span><input class="input" name="name" value="${esc(p.name)}" required></label>
        <label class="campo"><span>Nome verdadeiro</span><input class="input" name="realName" value="${esc(p.realName)}"></label>
        <label class="campo"><span>Categoria</span><input class="input" name="category" value="${esc(p.category)}" list="ed-cats"></label>
        <label class="campo"><span>Estado</span><select class="input" name="status">${ESTADOS.map(([v, n]) => `<option value="${v}" ${p.status === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="campo"><span>Etiquetas</span><input class="input" name="tags" value="${esc((p.tags || []).join(", "))}" placeholder="humor, Porto, família"><small>Separadas por vírgulas.</small></label>
        <label class="campo"><span>Localidade</span><input class="input" name="location" value="${esc(p.location)}" placeholder="Lisboa"></label>
        <label class="campo"><span>Começou no YouTube (ano)</span><input class="input" name="startedYear" type="number" min="2005" max="2100" value="${esc(p.startedYear || "")}"><small>Só se for diferente da data do canal.</small></label>
        <label class="campo"><span>Foto (link)</span><input class="input" name="photo" value="${esc(p.photo)}" placeholder="Vazio = foto do canal"></label>
      </div>
      <label class="campo" style="margin-top:12px"><span>Descrição pública</span><textarea class="input" name="bio" rows="3" placeholder="Quem é, que conteúdo faz, porque é relevante.">${esc(p.bio)}</textarea></label>
      <label class="campo" style="margin-top:12px"><span>Notas privadas</span><textarea class="input" name="notes" rows="2" placeholder="Só aparecem aqui.">${esc(p.notes)}</textarea></label>
      <label class="ed-check"><input type="checkbox" name="hidden" ${p.hidden ? "checked" : ""}> Esconder do site público</label>
      <datalist id="ed-cats">${categorias().map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <div class="ed-acoes"><button class="btn btn-primario" type="submit" data-a-esperar="A guardar">Guardar dados</button></div>
    </form>

    <div class="painel ed-bloco">
      <h3>Canais do YouTube</h3>
      <p class="muted">O canal principal dá a foto e o nome. Todos os canais que "contam" somam nas views e nos subscritores. Canais de clips feitos por outras pessoas não devem contar.</p>
      <div class="ed-canais">${
        canais.length
          ? canais
              .map(
                ({ link, pub: c }) => `<div class="ed-canal" data-ch="${esc(link.id)}">
            ${avatar({ name: c?.title || link.title, photo: c?.thumb || link.thumb }, 40)}
            <div class="ed-canal-info"><b>${esc(c?.title || link.title)}</b><small class="muted">${esc(c?.handle || link.handle || link.id)}, ${curto(c?.subs)} subs, ${curto(c?.views)} views${c?.country ? ", " + esc(c.country) : ""}</small><small><a href="https://www.youtube.com/channel/${esc(link.id)}" target="_blank" rel="noopener">YouTube ↗</a> · ${lerNoYouTube(link.id)} · ${linkSocialBlade(link.id)}</small>${link.about ? `<small class="ed-about-linha">Acerca de, lido a ${esc(data(link.about.lido))}: ${esc(resumoAbout(link.about))} · <button class="btn-link" data-ver-about>Ver e usar</button></small>` : ""}</div>
            <select class="input" data-papel style="width:140px">${PAPEIS.map((r) => `<option ${link.role === r ? "selected" : ""}>${r}</option>`).join("")}</select>
            <label class="ed-check" style="margin:0"><input type="checkbox" data-conta ${link.count !== false ? "checked" : ""}> Conta</label>
            ${p.mainChannelId === link.id ? `<span class="etiqueta ouro">Principal</span>` : `<button class="btn btn-pequeno" data-principal>Tornar principal</button>`}
            <button class="btn btn-pequeno btn-perigo" data-tirar aria-label="Tirar canal">Tirar</button>
            ${link.about ? `<div class="ed-about" hidden>${blocoAbout({ ...link.about, id: link.id }, p, { id: "ab-" + link.id, resumo: false })}<div class="ed-acoes" style="justify-content:flex-start"><button class="btn btn-primario btn-pequeno" data-aplicar-about data-a-esperar="A guardar">Passar para o perfil</button></div></div>` : ""}
          </div>`,
              )
              .join("")
          : `<p class="muted">Ainda sem canais. Cola o link do canal em baixo.</p>`
      }</div>
      ${canais.length > 1 ? `<label class="campo ed-medir"><span>O que se mede neste Youtuber</span><select class="input" id="ed-medir">
        <option value="" ${!p.medir ? "selected" : ""}>Igual às Definições: ${adm.db.settings.medir === "principal" ? "só o principal" : "todos juntos"}</option>
        <option value="todos" ${p.medir === "todos" ? "selected" : ""}>O Youtuber: todos os canais que contam, juntos</option>
        ${canais.map(({ link, pub: c }) => `<option value="${esc(link.id)}" ${p.medir === link.id ? "selected" : ""}>Só o canal ${esc(c?.title || link.title)}</option>`).join("")}
      </select><small>Com todos juntos, as views somam-se como se fosse um canal só. Os subscritores repetidos e os vídeos dos outros canais contam só em parte, para ter mais canais não ser uma vantagem por si.</small></label>` : ""}
      ${blocoSugestoes(p)}
      <h4 class="ed-sub">${p.channels.length ? "Juntar outro canal" : "Encontrar o canal"}</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input class="input" id="ed-novo-canal" placeholder="Link do canal, @handle ou ID" style="flex:1;min-width:220px"><button class="btn" id="ed-procurar-canal" data-a-esperar="A procurar">Procurar canal</button></div>
      <div id="ed-canal-prev"></div>
      <div class="mt-acoes">
        <button class="btn btn-pequeno" id="ed-adivinhar" data-a-esperar="A procurar" title="Experimenta o nome como @handle. Gasta 1 a 4 unidades da quota">Adivinhar o @handle pelo nome</button>
        <button class="btn btn-pequeno" id="ed-pesquisar" data-a-esperar="A procurar" title="Gasta 100 unidades da quota. Usa o texto da caixa, ou o nome se estiver vazia">Pesquisar no YouTube</button>
        ${sugestoes(p).length ? `<button class="btn btn-pequeno" id="ed-nenhum">Nenhum destes</button>` : ""}
        ${p.channels.length ? "" : p.noMatch ? `<button class="btn btn-pequeno" id="ed-voltar">Voltar a procurar</button>` : `<button class="btn btn-pequeno" id="ed-ignorar" title="Não volta a aparecer na procura automática de Ligar canais">Ignorar na procura</button>`}
      </div>
      ${p.noMatch && !p.channels.length ? `<p class="muted" style="font-size:var(--t-sm);margin-top:8px">Este Youtuber está a ser ignorado na procura automática.</p>` : ""}
    </div>

    <div class="painel ed-bloco">
      <h3>Outras redes</h3>
      <p class="muted">Links e números atualizados à mão. Cada vez que adicionas números ficam guardados com a data, para ver a evolução.</p>
      <div class="ed-redes">${REDES.map((r) => {
        const s = p.socials?.[r.id] || {};
        const ult = (s.entries || [])[(s.entries || []).length - 1];
        return `<div class="ed-rede" data-rede="${r.id}">
          <span class="ed-rede-nome">${ICONES[r.id] || ""} ${r.nome}</span>
          <input class="input" data-url value="${esc(s.url || "")}" placeholder="Link do perfil">
          ${r.campos.length ? `<span class="muted" style="font-size:var(--t-xs)">${ult ? `${inteiro(ult.followers)} seguidores em ${esc(data(ult.date))}` : "Sem números"}</span><button class="btn btn-pequeno" data-numeros>Adicionar números</button>` : ""}
        </div>`;
      }).join("")}</div>
      <div class="ed-acoes"><button class="btn btn-primario" id="ed-guardar-redes" data-a-esperar="A guardar">Guardar links</button></div>
    </div>

    <div class="painel ed-bloco">
      <h3>Views por mês</h3>
      ${canais.length > 1 ? `<div class="segmentos ed-meses-abas" id="ed-meses-abas" role="group" aria-label="De quem são os meses"><button type="button" data-aba="" aria-pressed="true">${esc(p.name)} <small>todos</small></button>${canais.map(({ link, pub: c }) => `<button type="button" data-aba="${esc(link.id)}" aria-pressed="false">${esc(c?.title || link.title || link.id)}${link.count === false ? " <small>não conta</small>" : ""}</button>`).join("")}</div>` : ""}
      <p class="muted" id="ed-meses-explica"></p>
      <div id="ed-meses"></div>
      ${p.estimativa && !p.estimativa.falhou ? `<p class="muted" style="font-size:var(--t-sm);margin-top:12px">Estimativa feita com ${p.estimativa.videos} vídeos${p.estimativa.erro !== null && p.estimativa.erro !== undefined ? `, erro típico de ±${p.estimativa.erro}% nos ${p.estimativa.calibracao} meses conhecidos` : ", sem meses conhecidos para afinar"}.</p>` : ""}
      <div class="ed-acoes">${p.channels.length ? `<button class="btn" id="ed-estimar" data-a-esperar="A estimar">${p.estimativa ? "Refazer estimativa" : "Estimar meses em falta"}</button>` : ""}<button class="btn btn-primario" id="ed-guardar-meses" data-a-esperar="A guardar">Guardar meses</button></div>
    </div>

    <div class="painel ed-bloco ed-perigo">
      <h3>Juntar ou apagar</h3>
      <p class="muted">Juntar serve para quando a mesma pessoa aparece duas vezes (por exemplo "Arganaça" e "Arganaça 2"). Os canais, meses e projetos passam para a pessoa escolhida.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span style="position:relative;flex:1;min-width:220px"><input class="input" id="ed-juntar" placeholder="Juntar ${esc(p.name)} em…"></span><button class="btn btn-perigo" id="ed-apagar">Apagar ${esc(p.name)}</button></div>
    </div>`;

  const refazer = () => {
    aoMudar();
    editor(alvo, id, aoMudar, abrir);
  };
  $("#ed-seguinte", alvo)?.addEventListener("click", () => irSeguinte?.(id)?.());

  // Dados do "Acerca de" de cada canal
  $$("[data-ver-about]", alvo).forEach((b) =>
    b.addEventListener("click", () => {
      const caixa = $(".ed-about", b.closest(".ed-canal"));
      caixa.hidden = !caixa.hidden;
      b.textContent = caixa.hidden ? "Ver e usar" : "Fechar";
    }),
  );
  $$("[data-aplicar-about]", alvo).forEach((b) =>
    b.addEventListener("click", async () => {
      const ch = b.closest(".ed-canal").dataset.ch;
      const about = { ...adm.db.channels[ch].about, id: ch };
      const r = await chamar("import/youtube", { itens: [{ channelId: ch, personId: id, about, ...escolhas(b.closest(".ed-about"), about) }] }, { botao: b }).catch(() => null);
      if (!r) return;
      toast([r.redes ? `${r.redes} ${r.redes === 1 ? "link" : "links"} de redes` : "", r.bios ? "descrição" : "", r.notas ? `${r.notas} ${r.notas === 1 ? "linha" : "linhas"} nas notas` : ""].filter(Boolean).join(", ") || "Guardado (não havia nada de novo).");
      refazer();
    }),
  );

  // Sugestões de canais (o mesmo que em Ligar canais)
  $$("[data-sug]", alvo).forEach((card) => {
    const ch = card.dataset.sug;
    $$("[data-ligar-como]", card).forEach((b) =>
      b.addEventListener("click", async () => {
        const r = await chamar("channel/link", { personId: id, channelId: ch, role: b.dataset.ligarComo }, { botao: b, sucesso: "Canal ligado. Os números e vídeos já foram buscados." }).catch(() => null);
        if (r) refazer();
      }),
    );
    $("[data-nao-e]", card)?.addEventListener("click", async (e) => {
      await chamar("match/clear", { personId: id, channelId: ch }, { botao: e.currentTarget }).catch(() => {});
      refazer();
    });
  });
  $("#ed-adivinhar", alvo).addEventListener("click", async (e) => {
    const r = await chamar("match/guess-one", { personId: id }, { botao: e.currentTarget }).catch(() => null);
    if (!r) return;
    toast(r.found ? `${r.found === 1 ? "Encontrei 1 canal" : `Encontrei ${r.found} canais`} (${r.tried.map((t) => "@" + t).join(", ")}).` : `Nada em ${r.tried.map((t) => "@" + t).join(", ")}.`, { erro: !r.found });
    refazer();
  });
  $("#ed-pesquisar", alvo).addEventListener("click", async (e) => {
    const q = $("#ed-novo-canal", alvo).value.trim();
    if (/youtube\.com|youtu\.be|^@|^UC[\w-]{22}$/.test(q)) return toast("Para um link ou @handle usa Procurar canal.", { erro: true });
    const r = await chamar("match/search", { personId: id, q: q || undefined }, { botao: e.currentTarget }).catch(() => null);
    if (r) {
      toast(r.suggestion.list.length ? `${r.suggestion.list.length} canais encontrados.` : "A pesquisa não encontrou nada.", { erro: !r.suggestion.list.length });
      refazer();
    }
  });
  $("#ed-nenhum", alvo)?.addEventListener("click", async (e) => {
    await chamar("match/clear", { personId: id }, { botao: e.currentTarget }).catch(() => {});
    refazer();
  });
  $("#ed-ignorar", alvo)?.addEventListener("click", async (e) => {
    await chamar("match/clear", { personId: id, noMatch: true }, { botao: e.currentTarget, sucesso: "Fica de fora da procura automática." }).catch(() => {});
    refazer();
  });
  $("#ed-voltar", alvo)?.addEventListener("click", async (e) => {
    await chamar("person", { person: { id, noMatch: false } }, { botao: e.currentTarget }).catch(() => {});
    refazer();
  });

  $("#ed-medir", alvo)?.addEventListener("change", (e) => chamar("person", { person: { id, medir: e.target.value } }, { sucesso: "Guardado. O Índice e os rankings foram recalculados." }).catch(() => {}));

  // Dados
  $("#ed-dados", alvo).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const v = (n) => f.namedItem(n);
    const person = {
      id,
      name: v("name").value,
      realName: v("realName").value.trim(),
      category: v("category").value.trim(),
      status: v("status").value,
      tags: v("tags").value,
      location: v("location").value.trim(),
      startedYear: v("startedYear").value ? Number(v("startedYear").value) : null,
      photo: v("photo").value.trim(),
      bio: v("bio").value.trim(),
      notes: v("notes").value.trim(),
      hidden: v("hidden").checked,
    };
    await chamar("person", { person }, { botao: e.submitter, sucesso: "Dados guardados." }).catch(() => {});
    aoMudar();
    editor(alvo, id, aoMudar, abrir);
  });

  // Canais
  $$(".ed-canal", alvo).forEach((row) => {
    const ch = row.dataset.ch;
    $("[data-papel]", row).addEventListener("change", (e) => chamar("channel/update", { channelId: ch, role: e.target.value }, { sucesso: "Papel do canal atualizado." }).catch(() => {}));
    $("[data-conta]", row).addEventListener("change", (e) => chamar("channel/update", { channelId: ch, count: e.target.checked }, { sucesso: e.target.checked ? "O canal conta nas somas." : "O canal deixou de contar." }).catch(() => {}));
    $("[data-principal]", row)?.addEventListener("click", async (e) => {
      await chamar("channel/update", { channelId: ch, main: true }, { botao: e.currentTarget, sucesso: "Canal principal mudado." }).catch(() => {});
      editor(alvo, id, aoMudar, abrir);
    });
    $("[data-tirar]", row).addEventListener("click", async () => {
      if (!(await confirmar("Tirar este canal desta pessoa?", { sim: "Tirar canal", perigo: true }))) return;
      await chamar("channel/unlink", { channelId: ch }, { sucesso: "Canal tirado." }).catch(() => {});
      aoMudar();
      editor(alvo, id, aoMudar, abrir);
    });
  });
  $("#ed-procurar-canal", alvo).addEventListener("click", async (e) => {
    const r = await chamar("channel/resolve", { input: $("#ed-novo-canal", alvo).value }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
    if (!r) return;
    const c = r.channel;
    const papel = p.channels.length ? "secundário" : "principal";
    $("#ed-canal-prev", alvo).innerHTML =
      `<div style="margin-top:12px">` +
      cartaoCanal(
        c,
        c.linkedTo
          ? ""
          : `<select class="input" id="ed-papel-novo" style="width:140px">${PAPEIS.map((x) => `<option ${x === papel ? "selected" : ""}>${x}</option>`).join("")}</select><button class="btn btn-primario" id="ed-ligar" data-a-esperar="A ligar">Ligar este canal</button>`,
      ) +
      `</div>`;
    $("#ed-ligar", alvo)?.addEventListener("click", async (ev) => {
      await chamar("channel/link", { personId: id, channelId: c.id, role: $("#ed-papel-novo", alvo).value }, { botao: ev.currentTarget, sucesso: "Canal ligado. Os números e vídeos já foram buscados." }).catch(() => {});
      aoMudar();
      editor(alvo, id, aoMudar, abrir);
    });
  });

  // Redes
  $("#ed-guardar-redes", alvo).addEventListener("click", async (e) => {
    const socials = structuredClone(p.socials || {});
    $$(".ed-rede", alvo).forEach((row) => {
      const k = row.dataset.rede;
      const url = $("[data-url]", row).value.trim();
      socials[k] = { ...(socials[k] || {}), url };
      if (!url && !(socials[k].entries || []).length) delete socials[k];
    });
    await chamar("person", { person: { id, socials } }, { botao: e.currentTarget, sucesso: "Links guardados." }).catch(() => {});
  });
  $$("[data-numeros]", alvo).forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.closest("[data-rede]").dataset.rede;
      const rede = REDES.find((r) => r.id === k);
      const nomes = { followers: "Seguidores", posts: "Publicações", likes: "Gostos totais", videos: "Vídeos" };
      const hist = (p.socials?.[k]?.entries || []).slice().reverse();
      const { el, fechar } = janela(`<h2>${rede.nome}: números de hoje</h2>
        <div class="ed-grelha">${rede.campos.map((c) => `<label class="campo"><span>${nomes[c]}</span><input class="input" type="number" min="0" data-campo="${c}"></label>`).join("")}
        <label class="campo"><span>Data</span><input class="input" type="date" data-data value="${new Date().toISOString().slice(0, 10)}"></label></div>
        ${hist.length ? `<h3 style="margin-top:18px;font-size:var(--t-base)">Histórico</h3><div class="ed-hist">${hist.map((h, i) => `<div><span>${esc(data(h.date))}</span><span>${rede.campos.map((c) => (h[c] ? `${nomes[c]}: ${inteiro(h[c])}` : "")).filter(Boolean).join(", ")}</span><button class="btn btn-texto btn-pequeno" data-apagar="${hist.length - 1 - i}">Apagar</button></div>`).join("")}</div>` : ""}
        <div class="janela-acoes"><button class="btn" data-fechar>Fechar</button><button class="btn btn-primario" data-ok data-a-esperar="A guardar">Guardar números</button></div>`);
      const guardar = async (entries, botao) => {
        const socials = structuredClone(p.socials || {});
        socials[k] = { ...(socials[k] || {}), entries };
        await chamar("person", { person: { id, socials } }, { botao, sucesso: "Números guardados." }).catch(() => {});
        fechar();
        editor(alvo, id, aoMudar, abrir);
      };
      $("[data-ok]", el).addEventListener("click", (ev) => {
        const e = { date: $("[data-data]", el).value };
        for (const inp of $$("[data-campo]", el)) if (inp.value !== "") e[inp.dataset.campo] = Number(inp.value);
        if (Object.keys(e).length < 2) return toast("Escreve pelo menos um número.", { erro: true });
        const entries = [...(p.socials?.[k]?.entries || []).filter((x) => x.date !== e.date), e].sort((a, b) => a.date.localeCompare(b.date));
        guardar(entries, ev.currentTarget);
      });
      $$("[data-apagar]", el).forEach((x) =>
        x.addEventListener("click", () => {
          const entries = (p.socials?.[k]?.entries || []).filter((_, i) => i !== Number(x.dataset.apagar));
          guardar(entries, x);
        }),
      );
    }),
  );

  // Meses
  // Meses: do Youtuber (a soma dos canais que contam) ou de um canal só
  let aba = abaMeses.id === id && adm.db.channels[abaMeses.aba]?.personId === id ? abaMeses.aba : "";
  const EXPLICA = {
    pessoa: canais.length > 1
      ? "A soma dos canais que contam. Os números a cinzento são os que o site usa agora. Um valor escrito aqui passa à frente da soma (útil para a folha antiga); para corrigir um canal, abre o separador dele."
      : "Os números a cinzento são os que o site usa agora (do YouTube, Social Blade ou folha). Se escreveres um valor, passa à frente de todos os outros. Apaga o número para voltar ao automático.",
    canal: (link) => `Só o canal ${link.title || link.id}. Um valor escrito aqui passa à frente do YouTube e do Social Blade neste canal${link.count === false ? ". Este canal não conta nas somas do Youtuber (é de clips ou está desligado)" : " e muda a soma do Youtuber"}.${p.mainChannelId === link.id ? " É o canal principal: os meses da folha antiga, guardados no Youtuber, contam como dele quando ele não tem números." : ""}`,
  };
  const mostrarMeses = () => {
    if (aba) {
      const link = adm.db.channels[aba];
      $("#ed-meses-explica", alvo).textContent = EXPLICA.canal(link);
      grelhaMeses($("#ed-meses", alvo), link.monthly || {}, estado.canais.get(aba)?.monthly || {});
    } else {
      $("#ed-meses-explica", alvo).textContent = EXPLICA.pessoa;
      grelhaMeses($("#ed-meses", alvo), p.monthly || {}, pub?.monthly || {});
    }
    $("#ed-estimar", alvo)?.toggleAttribute("hidden", Boolean(aba));
  };
  $$("#ed-meses-abas [data-aba]", alvo).forEach((b) =>
    b.addEventListener("click", () => {
      aba = b.dataset.aba;
      abaMeses = { id, aba };
      $$("#ed-meses-abas [data-aba]", alvo).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      mostrarMeses();
    }),
  );
  $$("#ed-meses-abas [data-aba]", alvo).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.aba === aba)));
  mostrarMeses();
  $("#ed-estimar", alvo)?.addEventListener("click", async (e) => {
    const r = await chamar("estimate", { personId: id, refresh: true }, { botao: e.currentTarget }).catch(() => null);
    if (r) toast(`${r.result.meses} meses estimados${r.result.erro !== null ? `, erro típico ±${r.result.erro}%` : ""}.`);
    editor(alvo, id, aoMudar, abrir);
  });
  $("#ed-guardar-meses", alvo).addEventListener("click", async (e) => {
    const entries = [];
    const proprios = aba ? adm.db.channels[aba].monthly || {} : p.monthly || {};
    $$("#ed-meses input[data-m]", alvo).forEach((inp) => {
      const m = inp.dataset.m;
      const antes = proprios[m]?.lock ? String(proprios[m].v) : "";
      const agora = inp.value.replace(/[\s.]/g, "");
      if (agora === antes) return;
      entries.push(agora === "" ? { month: m, v: null } : { month: m, v: Number(agora), src: "manual", lock: 1 });
    });
    if (!entries.length) return toast("Nada para guardar.");
    const sucesso = `${entries.length} ${entries.length === 1 ? "mês guardado" : "meses guardados"}${aba ? ` no canal ${adm.db.channels[aba].title || ""}` : ""}.`;
    await (aba ? chamar("channel/monthly", { channelId: aba, entries }, { botao: e.currentTarget, sucesso }) : chamar("person/monthly", { personId: id, entries }, { botao: e.currentTarget, sucesso })).catch(() => {});
    abaMeses = { id, aba };
    editor(alvo, id, aoMudar, abrir);
  });

  // Juntar e apagar
  escolherPessoa(
    $("#ed-juntar", alvo),
    async (outra) => {
      if (!(await confirmar(`Juntar "${p.name}" em "${outra.name}"? "${p.name}" deixa de existir.`, { sim: "Juntar", perigo: true }))) return;
      await chamar("person/merge", { from: id, into: outra.id }, { sucesso: "Pessoas juntas." }).catch(() => {});
      abrir(outra.id);
    },
    { excluir: [id] },
  );
  $("#ed-apagar", alvo).addEventListener("click", async () => {
    if (!(await confirmar(`Apagar "${p.name}" e tirar todos os canais? Isto não se pode desfazer.`, { sim: "Apagar", perigo: true }))) return;
    await chamar("person/delete", { id }, { sucesso: "Youtuber apagado." }).catch(() => {});
    abrir(null);
    alvo.innerHTML = `<div class="vazio"><h3>Apagado</h3><p>Escolhe outro Youtuber na lista.</p></div>`;
  });
}

/** Canais sugeridos (procura por @handle ou pelo nome) para confirmar aqui mesmo. */
function blocoSugestoes(p) {
  const lista = sugestoes(p);
  const sug = adm.db.suggestions?.[p.id];
  if (!lista.length) return sug && !p.channels.length ? `<p class="muted" style="font-size:var(--t-sm);margin-top:12px">A última procura (${sug.method === "search" ? "pelo nome" : "por @handle"}) não encontrou nada.</p>` : "";
  const acoes = (c) =>
    (p.channels.length
      ? `<button class="btn btn-primario btn-pequeno" data-ligar-como="secundário" data-a-esperar="A ligar">Juntar como 2.º canal</button><button class="btn btn-pequeno" data-ligar-como="principal" data-a-esperar="A ligar">É o principal</button>`
      : `<button class="btn btn-primario btn-pequeno" data-ligar-como="principal" data-a-esperar="A ligar">É este</button>`) +
    `<button class="btn btn-pequeno" data-nao-e data-a-esperar="A tirar">Não é</button><small>${lerNoYouTube(c.id, "Ver Acerca de")}</small>`;
  return `<div class="ed-sugestoes"><h4 class="ed-sub">${lista.length === 1 ? "Canal sugerido" : `${lista.length} canais sugeridos`} <small class="muted">${sug.method === "search" ? "pela pesquisa do nome" : "pelo @handle"}${sug.at ? `, ${esc(data(sug.at))}` : ""}</small></h4>
    ${lista.map((c) => cartaoCanal(c, acoes(c)).replace('class="candidato"', `class="candidato" data-sug="${esc(c.id)}"`)).join("")}</div>`;
}

function grelhaMeses(alvo, proprios, efetivos) {
  const ds = estado.ds;
  const anos = new Set();
  for (const m of ds.months) anos.add(m.slice(0, 4));
  for (const m of Object.keys(proprios)) anos.add(m.slice(0, 4));
  const lista = [...anos].sort().reverse();
  const nomesMes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  alvo.innerHTML = `<div class="tabela-caixa"><table class="tabela ed-meses"><thead><tr><th>Ano</th>${nomesMes.map((n) => `<th>${n}</th>`).join("")}</tr></thead><tbody>
    ${lista
      .map(
        (a) => `<tr style="cursor:default"><td><b>${a}</b></td>${nomesMes
          .map((_, i) => {
            const m = `${a}-${String(i + 1).padStart(2, "0")}`;
            if (m > ds.currentMonth) return `<td></td>`;
            const proprio = proprios[m];
            const efetivo = efetivos[m];
            const valor = proprio?.lock ? proprio.v : "";
            const dica = efetivo ? `${inteiro(efetivo.v)} (${efetivo.src})${efetivo.p ? ", incompleto" : ""}` : "sem dados";
            return `<td title="${esc(mesNome(m))}: ${esc(dica)}"><input class="input ed-mes${proprio?.lock ? " fixo" : ""}" data-m="${m}" value="${esc(valor)}" placeholder="${efetivo ? esc(curto(efetivo.est ?? efetivo.v)) : ""}" inputmode="numeric">${efetivo && !proprio?.lock ? fonteEtiqueta(efetivo.src) : ""}</td>`;
          })
          .join("")}</tr>`,
      )
      .join("")}</tbody></table></div>`;
}
