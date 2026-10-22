// Ranking completo com várias métricas, filtros por mês e por categoria.

import { estado, rankingMes, indice, views, mediaMeses, mesAnterior, mesesComDados, cobertura } from "../data.js";
import { esc, curto, inteiro, mesNome, pct, norm, plural } from "../format.js";
import { avatar, linkPessoa, movimento, sparkline, $, variacao } from "../ui.js";

const METRICAS = [
  { id: "views", nome: "Views do mês", mensal: true },
  { id: "media3", nome: "Média de 3 meses", mensal: true },
  { id: "crescimento", nome: "Crescimento no mês", mensal: true },
  { id: "indice", nome: "Índice de Influência" },
  { id: "classica", nome: "Pontuação clássica" },
  { id: "subs", nome: "Subscritores" },
  { id: "total", nome: "Views totais" },
  { id: "up30", nome: "Vídeos nos últimos 30 dias" },
];

export async function render(main, { query }) {
  const ds = estado.ds;
  main.dataset.titulo = "Ranking";
  const meses = mesesComDados(5);
  const f = {
    metrica: METRICAS.some((m) => m.id === query.get("metric")) ? query.get("metric") : "views",
    mes: meses.includes(query.get("m")) ? query.get("m") : estado.ref,
    cat: query.get("cat") || "",
    q: query.get("q") || "",
    limite: 100,
  };

  main.innerHTML = `
    <div class="wrap">
      <div class="pagina-topo"><h1>Ranking</h1><p id="rk-sub"></p></div>
      <div class="filtros">
        <label class="campo"><span>Ordenar por</span><select class="input" id="f-metrica">${METRICAS.map((m) => `<option value="${m.id}">${m.nome}</option>`).join("")}</select></label>
        <label class="campo" id="campo-mes"><span>Mês</span><select class="input" id="f-mes">${[...meses].reverse().map((m) => `<option value="${m}">${mesNome(m)}${m === ds.currentMonth ? " (a decorrer)" : ""}</option>`).join("")}</select></label>
        <label class="campo"><span>Categoria</span><select class="input" id="f-cat"><option value="">Todas</option>${ds.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
        <label class="campo cresce"><span>Procurar</span><input class="input" id="f-q" type="search" placeholder="Nome do Youtuber"></label>
      </div>
      <div id="rk-tabela"></div>
    </div>`;

  $("#f-metrica", main).value = f.metrica;
  $("#f-mes", main).value = f.mes;
  $("#f-cat", main).value = f.cat;
  $("#f-q", main).value = f.q;

  const atualizarUrl = () => {
    const p = new URLSearchParams();
    if (f.metrica !== "views") p.set("metric", f.metrica);
    if (f.mes !== estado.ref) p.set("m", f.mes);
    if (f.cat) p.set("cat", f.cat);
    if (f.q) p.set("q", f.q);
    history.replaceState(null, "", "#/ranking" + (p.toString() ? "?" + p : ""));
  };

  const desenhar = () => {
    const met = METRICAS.find((m) => m.id === f.metrica);
    $("#campo-mes", main).style.display = met.mensal ? "" : "none";
    const linhas = calcular(f);
    const sub = met.mensal
      ? `${met.nome} em ${mesNome(f.mes)}${f.mes === ds.currentMonth ? " (projeção para o mês inteiro)" : ""}. ${plural(cobertura(f.mes), "Youtuber tem", "Youtubers têm")} dados neste mês.`
      : f.metrica === "indice"
        ? `Índice de 0 a 1000 que junta alcance, constância, atividade, momento, peso histórico e envolvimento. Calculado com dados até ${mesNome(estado.ref)}.`
        : f.metrica === "classica"
          ? "A fórmula da folha antiga: média de views por mês (escala logarítmica) multiplicada pela constância."
          : `${met.nome}, com os números mais recentes do YouTube.`;
    $("#rk-sub", main).textContent = sub + (f.cat ? ` Categoria: ${f.cat}.` : "");
    const alvo = $("#rk-tabela", main);
    if (!linhas.length) {
      alvo.innerHTML = `<div class="vazio"><h3>Ninguém aparece com estes filtros</h3><p>Experimenta outro mês ou outra categoria.</p></div>`;
      return;
    }
    const visiveis = linhas.slice(0, f.limite);
    const janela = estado.janela;
    alvo.innerHTML = `<div class="tabela-caixa"><table class="tabela">
      <thead><tr>
        <th>#</th>${met.mensal ? `<th class="esconde-movel"><span class="sr-only">Movimento</span></th>` : ""}
        <th>Youtuber</th><th class="dir">${esc(met.nome)}</th>
        ${f.metrica !== "indice" ? `<th class="esconde-movel">Índice</th>` : ""}
        <th class="esconde-movel">Últimos 12 meses</th>
        ${f.metrica !== "subs" ? `<th class="dir esconde-movel">Subscritores</th>` : ""}
      </tr></thead>
      <tbody>${visiveis
        .map((x) => {
          const ind = indice(x.p.id).total;
          const spark = sparkline(janela.map((m) => views(x.p, m)));
          return `<tr class="${x.pos <= 3 ? "top" + x.pos : ""}" data-id="${esc(x.p.id)}">
            <td class="pos">${x.pos}</td>
            ${met.mensal ? `<td class="esconde-movel">${f.metrica === "views" ? movimento(x.pos, x.ant) : ""}</td>` : ""}
            <td><a class="quem" href="${linkPessoa(x.p)}" style="color:inherit;text-decoration:none">${avatar(x.p, 36)}<span><b>${esc(x.p.name)}</b><small>${esc(x.p.category || "")}</small></span></a></td>
            <td class="dir"><span class="valor-grande">${x.txt}</span>${x.extra ? `<br><small>${x.extra}</small>` : ""}</td>
            ${f.metrica !== "indice" ? `<td class="esconde-movel">${ind === null ? '<span class="muted">–</span>' : `<div class="mini-barra"><div class="trilho"><i style="width:${ind / 10}%"></i></div><span>${ind}</span></div>`}</td>` : ""}
            <td class="esconde-movel">${spark}</td>
            ${f.metrica !== "subs" ? `<td class="dir esconde-movel">${x.p.totals?.subs ? curto(x.p.totals.subs) : '<span class="muted">–</span>'}</td>` : ""}
          </tr>`;
        })
        .join("")}</tbody></table></div>
      ${linhas.length > f.limite ? `<p style="text-align:center;margin-top:18px"><button class="btn" id="mais">Mostrar mais (${linhas.length - f.limite})</button></p>` : `<p class="muted" style="text-align:center;margin-top:14px;font-size:var(--t-sm)">${plural(linhas.length, "Youtuber", "Youtubers")} neste ranking.</p>`}`;
    $("#mais", alvo)?.addEventListener("click", () => {
      f.limite += 200;
      desenhar();
    });
    alvo.querySelector("tbody").addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const tr = e.target.closest("tr[data-id]");
      if (tr) location.hash = linkPessoa(estado.pessoas.get(tr.dataset.id));
    });
  };

  const ligar = (id, chave, evento = "change") =>
    $(id, main).addEventListener(evento, (e) => {
      f[chave] = e.target.value;
      f.limite = 100;
      atualizarUrl();
      desenhar();
    });
  ligar("#f-metrica", "metrica");
  ligar("#f-mes", "mes");
  ligar("#f-cat", "cat");
  ligar("#f-q", "q", "input");
  desenhar();
}

function calcular(f) {
  const ds = estado.ds;
  const projecao = f.mes === ds.currentMonth;
  let linhas = [];
  const pessoas = ds.people.filter((p) => !f.cat || p.category === f.cat);
  if (f.metrica === "views") {
    linhas = rankingMes(f.mes, { categoria: f.cat, projecao }).map((x) => ({ ...x, txt: curto(x.v), extra: x.vAnt ? variacao(x.v, x.vAnt) : "" }));
  } else {
    const valores = [];
    for (const p of pessoas) {
      let v = null;
      let txt = "";
      let extra = "";
      if (f.metrica === "media3") {
        v = mediaMeses(p, f.mes, 3);
        txt = curto(v);
        extra = "views por mês";
      } else if (f.metrica === "crescimento") {
        const a = views(p, f.mes, { projecao });
        const b = views(p, mesAnterior(f.mes) || "");
        if (a !== null && b !== null && b >= 10000) {
          v = a / b - 1;
          txt = pct(v, { sinal: true });
          extra = `${curto(b)} → ${curto(a)}`;
        }
      } else if (f.metrica === "indice") {
        v = indice(p.id).total;
        txt = v === null ? "" : inteiro(v);
      } else if (f.metrica === "classica") {
        v = estado.classica.get(p.id);
        txt = v === null || v === undefined ? "" : inteiro(v);
      } else if (f.metrica === "subs") {
        v = p.totals?.subs || null;
        txt = curto(v);
      } else if (f.metrica === "total") {
        v = p.totals?.views || null;
        txt = curto(v);
      } else if (f.metrica === "up30") {
        v = p.vid ? p.vid.up30 : null;
        txt = v === null ? "" : inteiro(v);
        extra = p.vid?.sh90 ? `${p.vid.sh90} Shorts em 90 dias` : "";
      }
      if (v !== null && v !== undefined && Number.isFinite(v)) valores.push({ p, v, txt, extra });
    }
    valores.sort((a, b) => b.v - a.v);
    linhas = valores.map((x, i) => ({ ...x, pos: i + 1 }));
  }
  if (f.q) {
    const t = norm(f.q);
    linhas = linhas.filter((x) => norm(x.p.name).includes(t));
  }
  return linhas;
}
