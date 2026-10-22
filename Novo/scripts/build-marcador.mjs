// Gera o marcador do Social Blade (public/assets/js/admin/sb-marcador.txt) a partir de scripts/marcador/sb.src.js.
// Uso: node scripts/build-marcador.mjs
import { readFile, writeFile } from "node:fs/promises";
import { minify } from "terser";

const src = await readFile(new URL("./marcador/sb.src.js", import.meta.url), "utf8");
const out = await minify(src, {
  ecma: 2019,
  compress: { passes: 2 },
  mangle: { reserved: ["__ORIGEM__"] },
  format: { comments: false, ascii_only: true },
});
if (!out.code.includes("__ORIGEM__")) throw new Error("O marcador perdeu o marcador __ORIGEM__.");
await writeFile(new URL("../public/assets/js/admin/sb-marcador.txt", import.meta.url), out.code + "\n");
console.log(`sb-marcador.txt: ${out.code.length} caracteres`);
