// Gera os marcadores (bookmarklets) a partir das fontes em scripts/marcador/:
//   sb.src.js → public/assets/js/admin/sb-marcador.txt  (Social Blade)
//   yt.src.js → public/assets/js/admin/yt-marcador.txt  (YouTube, "Acerca de" dos canais)
// Uso: node scripts/build-marcador.mjs
import { readFile, writeFile } from "node:fs/promises";
import { minify } from "terser";

for (const nome of ["sb", "yt"]) {
  const src = await readFile(new URL(`./marcador/${nome}.src.js`, import.meta.url), "utf8");
  const out = await minify(src, {
    ecma: 2019,
    compress: { passes: 2 },
    mangle: { reserved: ["__ORIGEM__"] },
    format: { comments: false, ascii_only: true },
  });
  if (!out.code.includes("__ORIGEM__")) throw new Error(`O marcador ${nome} perdeu o marcador __ORIGEM__.`);
  await writeFile(new URL(`../public/assets/js/admin/${nome}-marcador.txt`, import.meta.url), out.code + "\n");
  console.log(`${nome}-marcador.txt: ${out.code.length} caracteres`);
}
