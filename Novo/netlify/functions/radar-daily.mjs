// Radar do Caso (automático): duas rondas por dia (a partir das 7h e das 19h, hora de Lisboa) por
// TODOS os Youtubers do Placar e os canais extra. Os vídeos vêm do feed RSS de cada canal, que não
// gasta quota; da API só os detalhes dos vídeos recentes (1 unidade por 50), alguns comentários, as
// tendências de Portugal e, uma vez por dia, a procura "fora da bolha" do caso mais forte.
// A função corre de hora a hora e continua de onde ficou (cada vez tem cerca de 20 segundos).

import { loadDB } from "../lib/db.mjs";
import { rondaDoRadar } from "../lib/collect.mjs";
import { hasApiKey } from "../lib/youtube.mjs";

export const config = { schedule: "23 * * * *" };

export default async () => {
  if (!hasApiKey()) return new Response("sem chave");
  try {
    const db = await loadDB(process.env.URL);
    const r = await rondaDoRadar(db);
    if (!r.feito && !r.cedo) console.log("Radar:", JSON.stringify(r));
  } catch (e) {
    console.error("Radar falhou:", e.message);
  }
  return new Response("ok");
};
