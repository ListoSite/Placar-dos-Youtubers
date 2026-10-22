// Recolha de hora a hora: últimos vídeos de 20 canais e vídeos de 3 projetos.
// Com 400 canais, cada canal é atualizado cerca de uma vez por dia.

import { loadDB } from "../lib/db.mjs";
import { runVideos, refreshProjects } from "../lib/collect.mjs";
import { rebuild } from "../lib/dataset.mjs";

export const config = { schedule: "@hourly" };

export default async () => {
  const db = await loadDB(process.env.URL);
  try {
    const v = await runVideos(db, { limit: 20 });
    const p = await refreshProjects(db, { limit: 3 });
    console.log("Recolha horária:", JSON.stringify({ v, p }));
  } catch (e) {
    console.error("Recolha horária falhou:", e.message);
  }
  await rebuild(db);
  return new Response("ok");
};
