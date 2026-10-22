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

const ds0 = await call("GET", "dataset");
check("dataset público", ds0.status === 200 && ds0.data.people.length > 0, `(${ds0.data.people?.length} pessoas, meses ${ds0.data.months?.[0]}→${ds0.data.currentMonth})`);

const bad = await call("POST", "login", { password: "errada" });
check("login errado recusado", bad.status === 401);
const ok = await call("POST", "login", { password: process.env.ADMIN_PASSWORD || "teste" });
check("login certo", ok.status === 200 && ok.data.token);
token = ok.data.token;

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

const exp = await call("GET", "admin/export");
check("exportar cópia", exp.status === 200 && exp.data.kind === "placar-backup");

console.log(failures ? `\n${failures} falha(s)` : "\nTudo certo.");
process.exit(failures ? 1 : 0);
