// Service worker do Placar: o site abre depressa e funciona sem internet com os últimos dados vistos.
// Ficheiros do site: primeiro da rede; letras, bibliotecas e ícones primeiro da cache.
// Dados (/api/dataset): primeiro da rede, com a última cópia como reserva.
// A área de edição (/api/admin) nunca passa pela cache.

const VERSAO = "placar-v9";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(["/", "/index.html", "/assets/css/app.css", "/assets/js/app.js", "/assets/icon.svg"]).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/admin") || url.pathname.startsWith("/.netlify")) return;

  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && url.pathname === "/api/dataset") {
            const copia = res.clone();
            caches.open(VERSAO).then((c) => c.put("/api/dataset", copia));
          }
          return res;
        })
        .catch(() => caches.match(url.pathname === "/api/dataset" ? "/api/dataset" : e.request)),
    );
    return;
  }

  const fixo = /^\/assets\/(fonts|vendor|icons)\//.test(url.pathname);
  if (fixo) {
    // Letras, bibliotecas e ícones quase nunca mudam: primeiro da cache
    e.respondWith(
      caches.match(e.request).then(
        (guardado) =>
          guardado ||
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(VERSAO).then((c) => c.put(e.request, copia));
            }
            return res;
          }),
      ),
    );
    return;
  }
  // Páginas, estilos e código: primeiro da rede (para ver logo as atualizações), cache se não houver internet
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put(e.request, copia));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html"))),
  );
});
