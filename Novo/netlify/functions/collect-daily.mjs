// Recolha diária (automática, todos os dias às 03:17 UTC):
// lê os números de todos os canais e guarda o registo do dia.

import { loadDB } from "../lib/db.mjs";
import { runDaily } from "../lib/collect.mjs";
import { rebuild } from "../lib/dataset.mjs";

export const config = { schedule: "17 3 * * *" };

export default async () => {
  const db = await loadDB(process.env.URL);
  try {
    const r = await runDaily(db);
    console.log("Recolha diária:", JSON.stringify(r));
  } catch (e) {
    console.error("Recolha diária falhou:", e.message);
  }
  await rebuild(db);
  return new Response("ok");
};
