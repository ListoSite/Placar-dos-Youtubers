// Teste rápido da API contra o servidor local (com YT_MOCK=1).
// Uso: (num terminal) ADMIN_PASSWORD=teste YT_MOCK=1 npm run dev
//      (noutro)       ADMIN_PASSWORD=teste npm test

const BASE = process.env.BASE || "http://localhost:8888";
let token = "";
let failures = 0;

async function call(method, route, body) {
  const res = await fetch(BASE + "/api/" + route, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

function check(name, cond, extra = "") {
  console.log(`${cond ? "✓" : "✗"} ${name} ${extra}`);
  if (!cond) failures++;
}

const fechado = await call("GET", "dataset");
check("dados do painel fechados sem sessão", fechado.status === 401);
const pub0 = await call("GET", "publico");
check("página pública responde", pub0.status === 200 && Array.isArray(pub0.data.publicacoes) && pub0.data.canal, JSON.stringify(Object.keys(pub0.data)));

const bad = await call("POST", "login", { password: "errada" });
check("login errado recusado", bad.status === 401);
const ok = await call("POST", "login", { password: process.env.ADMIN_PASSWORD || "teste" });
check("login certo", ok.status === 200 && ok.data.token);
token = ok.data.token;
const ds0 = await call("GET", "dataset");
check("dataset com sessão", ds0.status === 200 && ds0.data.people.length > 0, `(${ds0.data.people?.length} pessoas, meses ${ds0.data.months?.[0]}→${ds0.data.currentMonth})`);

const noAuth = await fetch(BASE + "/api/admin/db");
check("admin sem token recusado", noAuth.status === 401);

const db = await call("GET", "admin/db");
check("admin/db", db.status === 200 && Object.keys(db.data.db.people).length > 0);

const wuant = Object.values(db.data.db.people).find((p) => p.name === "Wuant");
const link = await call("POST", "admin/channel/link", { personId: wuant.id, input: "https://www.youtube.com/@wuant", role: "principal" });
check("ligar canal por link", link.status === 200 && link.data.channel?.id, link.data.error || "");

const guess = await call("POST", "admin/match/guess", { limit: 10 });
check("adivinhar handles da folha", guess.status === 200, JSON.stringify(guess.data));

const created = await call("POST", "admin/person/from-channel", { input: "@novocanalteste", category: "Gamer" });
check("criar pessoa a partir de canal", created.status === 200 && created.data.person?.id, created.data.error || "");

const second = await call("POST", "admin/channel/link", { personId: wuant.id, input: "@wuantclips", role: "clips" });
check("segundo canal (clips)", second.status === 200, second.data.error || "");

const daily = await call("POST", "admin/collect", { what: "daily" });
check("recolha diária", daily.status === 200 && daily.data.result.channels >= 2, JSON.stringify(daily.data.result));

const sb = await call("POST", "admin/import/socialblade", {
  channelId: link.data.channel.id,
  payload: {
    handle: "wuant",
    monthly: [{ month: "2025-08", views: 1234567 }, { month: "2025-09", views: 2345678 }],
    daily: [{ date: new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10), views: 1000, subs: 1, videos: 1 }],
  },
});
check("importar Social Blade", sb.status === 200 && sb.data.months === 2, JSON.stringify(sb.data));

// TikTok (Social Blade): só TikTok, ligado à pessoa pelo personId
const tt = {
  at: "2026-10-22T10:00:00.000Z",
  info: { id: "6900001", user: "wuant_tt", nome: "Wuant", seg: 125400, gostos: 3400000, videos: 210, criado: "2019-03-01" },
  m: { ini: "2026-08", f: [2700, 3400, 4100], l: [90000, 95000, 99000], n: [8, 9, 9] },
};
const ttRes = await call("POST", "admin/import/socialblade", { payload: { soTikTok: true, tt }, personId: wuant.id });
check("importar TikTok", ttRes.status === 200 && ttRes.data.tiktok === "wuant_tt", JSON.stringify(ttRes.data));
const ttSem = await call("POST", "admin/import/socialblade", { payload: { soTikTok: true, tt: { ...tt, info: { ...tt.info, user: "alguem_sem_dono" } } } });
check("TikTok sem dono pede pessoa", ttSem.status === 200 && ttSem.data.needsTarget === true);

const proj = await call("POST", "admin/project", {
  project: { name: "Série de teste", personId: wuant.id, guests: [created.data.person.id], source: { playlistId: "PLtesteabc123456", videoIds: [] } },
});
check("criar projeto por playlist", proj.status === 200 && proj.data.project?.id, proj.data.error || "");

const merge = await call("POST", "admin/person", { person: { name: "Pessoa Temporária", category: "Vlog" } });
const merged = await call("POST", "admin/person/merge", { from: merge.data.person.id, into: wuant.id });
check("juntar pessoas", merged.status === 200);

const monthly = await call("POST", "admin/person/monthly", { personId: wuant.id, entries: [{ month: "2025-10", v: 999999 }] });
check("editar mês à mão", monthly.status === 200);

const ds = await call("GET", "dataset");
const w = ds.data.people.find((p) => p.id === wuant.id);
check("dataset tem canais da pessoa", w.channelIds.length === 2, `canais=${w.channelIds.length}`);
check("mês do Social Blade aparece", w.monthly["2025-08"]?.v === 1234567 && w.monthly["2025-08"].src === "socialblade", JSON.stringify(w.monthly["2025-08"]));
check("mês da folha mantém-se", w.monthly["2024-12"]?.src === "folha", JSON.stringify(w.monthly["2024-12"]));
check("totais do YouTube", w.totals?.src === "youtube", JSON.stringify(w.totals));
const p = ds.data.projects.find((x) => x.name === "Série de teste");
check("projeto com episódios", p && p.episodes > 0, p ? `${p.episodes} eps, impacto ${p.impact}` : "");

check("TikTok no dataset", w.tt?.user === "wuant_tt" && w.tt.f["2026-10"] === 4100, JSON.stringify(w.tt));
const ttEnt = w.socials?.tiktok?.entries || [];
check("TikTok: total de hoje e do fim de setembro", ttEnt.some((e) => e.date === "2026-10-22" && e.followers === 125400) && ttEnt.some((e) => e.date === "2026-09-30" && e.followers === 121300), JSON.stringify(ttEnt.slice(-2)));

// Histórico do Palco
const hist = await call("POST", "admin/palco/resultados", { espetaculo: "batalha", publicacao: { titulo: "Wuant vs Novo", resumo: { tipo: "duelo", linhas: [{ id: wuant.id, nome: "Wuant", valor: "3" }, { id: created.data.person.id, nome: "Novo", valor: "1" }], vencedor: { id: wuant.id, nome: "Wuant" }, placar: "3–1" } }, resultados: [{ tipo: "duelo", a: wuant.id, b: created.data.person.id, vence: wuant.id, placar: "3-1" }, { tipo: "titulo", vence: wuant.id }, { tipo: "duelo", a: "x", b: "x", vence: "x" }] });
check("guardar resultados do Palco (ignora os inválidos)", hist.status === 200 && hist.data.guardados === 2, JSON.stringify(hist.data));
const resumo = await call("GET", "palco/historico");
check("histórico: confronto e estrela", resumo.data.pessoas?.[wuant.id]?.estrelas === 1 && resumo.data.pessoas?.[wuant.id]?.v === 1, JSON.stringify(resumo.data.pessoas?.[wuant.id]));
const pubs = await call("GET", "admin/publicacoes");
const pub = pubs.data.publicacoes?.[0];
check("vídeo gravado vai para a página pública", pub?.titulo === "Wuant vs Novo" && pub.dados?.resumo?.placar === "3–1", JSON.stringify(pub));
const mal = await call("POST", "admin/publicacao", { id: pub.id, link: "javascript:alert(1)" });
check("link do vídeo só https", mal.status === 400);
await call("POST", "admin/publicacao", { id: pub.id, link: "https://youtube.com/shorts/abc" });
const pub1 = await call("GET", "publico");
check("página pública mostra o vídeo, o link e o Youtuber", pub1.data.publicacoes?.[0]?.link === "https://youtube.com/shorts/abc" && pub1.data.pessoas?.[wuant.id]?.name === "Wuant", JSON.stringify(pub1.data.publicacoes?.[0]));
await call("POST", "admin/publicacao", { id: pub.id, visivel: false });
const pub2 = await call("GET", "publico");
check("vídeo escondido sai da página pública", !pub2.data.publicacoes.length);
const semSessao = await fetch(BASE + "/api/admin/palco/resultados", { method: "POST", body: "{}" });
check("histórico só com sessão", semSessao.status === 401);

// Votações (só com Supabase)
const vt = await call("GET", "votacoes");
check("votações respondem", vt.status === 200 && Array.isArray(vt.data.votacoes), `ligado=${vt.data.ligado}`);

const exp = await call("GET", "admin/export");
check("exportar cópia (com o histórico do Palco)", exp.status === 200 && exp.data.kind === "placar-backup" && exp.data.colecoes?.palco_resultados?.length === 2);

console.log(failures ? `\n${failures} falha(s)` : "\nTudo certo.");
process.exit(failures ? 1 : 0);
