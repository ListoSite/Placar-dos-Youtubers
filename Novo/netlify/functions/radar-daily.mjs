// Radar do Caso (automático, uma vez por dia às 07:41 UTC): lê os vídeos novos dos Youtubers
// escolhidos à mão no painel (O Caso, Radar) e dos canais extra a vigiar. Os outros só quando se
// carrega no botão "Procurar agora" na aba "Todos".

import { loadDB } from "../lib/db.mjs";
import { procurarRadar } from "../lib/collect.mjs";
import { lerRadar, canaisDoGrupo } from "../lib/radar.mjs";
import { hasApiKey } from "../lib/youtube.mjs";

export const config = { schedule: "41 7 * * *" };

export default async () => {
  if (!hasApiKey()) return new Response("sem chave");
  const db = await loadDB(process.env.URL);
  const radar = await lerRadar();
  const canais = canaisDoGrupo(db, radar.regras, "escolhidos").slice(0, 40);
  if (!canais.length) return new Response("sem escolhidos");
  try {
    const r = await procurarRadar(db, canais, { radar });
    console.log("Radar diário:", JSON.stringify({ novos: r.novos, canais: r.canais, erros: r.errors.length }));
  } catch (e) {
    console.error("Radar diário falhou:", e.message);
  }
  return new Response("ok");
};
