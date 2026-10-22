// Recolha de hora a hora: últimos vídeos de 20 canais, vídeos de 3 projetos
// e a estimativa dos meses em falta de 4 Youtubers.
// Com 400 canais, cada canal é atualizado cerca de uma vez por dia.

import { loadDB, saveDB } from "../lib/db.mjs";
import { runVideos, refreshProjects } from "../lib/collect.mjs";
import { rebuild } from "../lib/dataset.mjs";
import { estimarAutomatico, unidadesUsadas } from "../lib/estimate.mjs";
import { addQuota } from "../lib/collect.mjs";

export const config = { schedule: "@hourly" };

export default async () => {
  let db = await loadDB(process.env.URL);
  try {
    const v = await runVideos(db, { limit: 20 });
    const p = await refreshProjects(db, { limit: 3 });
    console.log("Recolha horária:", JSON.stringify({ v, p }));
  } catch (e) {
    console.error("Recolha horária falhou:", e.message);
  }
  try {
    // Preenche aos poucos os meses sem dados (estimativa), 4 pessoas por hora
    const r = await estimarAutomatico(() => loadDB(process.env.URL), saveDB, 4);
    await addQuota(unidadesUsadas());
    if (r.fresco) db = r.fresco;
    console.log("Estimativas:", r.pessoas);
  } catch (e) {
    console.error("Estimativas falharam:", e.message);
  }
  await rebuild(db);
  return new Response("ok");
};
