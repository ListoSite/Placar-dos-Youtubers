// Os temas (episódios) do espetáculo "Curiosidades". Cada um dá um título de vídeo.
// Fica à parte de curiosidades.js para a página do Palco e a legenda não terem de carregar tudo.

export const TEMAS_CURIOSIDADES = [
  { id: "lembras", icone: "👻", nome: "Lembras-te deles?", sub: "Youtubers gigantes que desapareceram do YouTube", legenda: "Milhões de subscritores… e nenhum vídeo novo há muito tempo. De qual tinhas saudades?" },
  { id: "adormecidos", icone: "😴", nome: "Gigantes adormecidos", sub: "Muitos subscritores, poucas views", legenda: "Têm subscritores que nunca mais acabam, mas as views não acompanham. Porque será?" },
  { id: "veteranos", icone: "🦖", nome: "Os dinossauros do YouTube", sub: "Estão cá desde antes de quase tudo", legenda: "Antes do iPhone, do Minecraft e do TikTok, eles já estavam no YouTube." },
  { id: "foguetoes", icone: "🚀", nome: "Foguetões", sub: "Chegaram há pouco e já passaram os veteranos", legenda: "Canais com poucos anos que já passaram quem está cá há mais de uma década." },
  { id: "maquinas", icone: "🏭", nome: "Máquinas de fazer vídeos", sub: "Quem publica mais do que parece possível", legenda: "Milhares de vídeos. Conseguias ver todos?" },
  { id: "poucosbons", icone: "💎", nome: "Poucos vídeos, muitas views", sub: "Quem não precisa de publicar muito", legenda: "Poucos vídeos, milhões de views. Qualidade ou quantidade?" },
  { id: "gemeos", icone: "👯", nome: "Separados à nascença", sub: "Os mesmos subscritores, vidas completamente diferentes", legenda: "Quase os mesmos subscritores… e tudo o resto ao contrário." },
  { id: "david", icone: "🪨", nome: "David contra Golias", sub: "Canais pequenos que bateram gigantes", legenda: "Muito menos subscritores, mais views. Os pequenos que bateram os grandes." },
  { id: "redes", icone: "📱", nome: "Mais famosos fora do YouTube", sub: "Quem manda no Instagram, no TikTok e na Twitch", legenda: "No YouTube estão atrás… mas nas outras redes a conversa é outra." },
  { id: "quasela", icone: "🎯", nome: "Quase lá!", sub: "Quem está mesmo a chegar a um número redondo", legenda: "Faltam tão poucos! Quem chega primeiro ao próximo marco?" },
  { id: "montanha", icone: "🎢", nome: "Montanha-russa", sub: "Os altos e baixos mais loucos", legenda: "Do melhor mês ao pior: as maiores montanhas-russas do YouTube português." },
  { id: "ritmo", icone: "⏱️", nome: "Todos os dias vs. de vez em quando", sub: "Quem publica sem parar e quem se faz esperar", legenda: "Uns publicam todos os dias, outros fazem-se esperar. Quem preferes?" },
  { id: "shorts", icone: "📲", nome: "Shorts vs. vídeos longos", sub: "Onde é que cada um é mais visto", legenda: "Shorts ou vídeos longos: onde é que cada Youtuber ganha mais views?" },
  { id: "videao", icone: "💥", nome: "O vídeo que rebentou a escala", sub: "Um só vídeo muito acima do normal", legenda: "Um vídeo que fez muito mais do que todos os outros. Já viste?" },
  { id: "matematica", icone: "🧮", nome: "Matemática dos Youtubers", sub: "Os números em coisas do dia a dia", legenda: "Estádios cheios, anos de vídeos e views por minuto: os números dos Youtubers em coisas reais." },
  { id: "antesagora", icone: "⏪", nome: "Há um ano vs. agora", sub: "Quem mudou mais num ano", legenda: "Há um ano eram outros números. Quem disparou e quem caiu?" },
  { id: "fieis", icone: "❤️", nome: "O público mais fiel", sub: "Gostos e comentários por cada 100 views", legenda: "Não é só ter views: é ter um público que gosta e comenta." },
  { id: "escala", icone: "📏", nome: "A escala real dos Youtubers", sub: "Os subscritores em estádios e cidades de verdade", legenda: "Quantos estádios enchem os subscritores dos Youtubers portugueses? Do mais pequeno ao maior, em escala real." },
  { id: "iceberg", icone: "🧊", nome: "O iceberg do YouTube português", sub: "Do que toda a gente sabe ao que quase ninguém sabe", legenda: "Do topo do iceberg ao fundo do mar: quantas destas sabias?" },
  { id: "reis", icone: "👑", nome: "Todos os n.º 1 do Placar", sub: "Quem mandou em cada mês", legenda: "Todos os n.º 1 das views, mês a mês. Quem reinou mais tempo?" },
  { id: "nostalgia", icone: "📼", nome: "2016 vs. 2026", sub: "Quem já cá estava e quem nem existia", legenda: "2026 é o novo 2016? Os Youtubers que já cá estavam e os que nem existiam." },
  { id: "ganhos", icone: "💵", nome: "Quanto pode ganhar um Youtuber?", sub: "Uma estimativa larga com as views do mês", legenda: "Quanto podem dar os anúncios com as views de um mês? Uma estimativa larga, à maneira do Social Blade.", soEscolha: true },
  { id: "mistura", icone: "🎲", nome: "Coisas que não sabias", sub: "Curiosidades sobre os Youtubers portugueses", legenda: "Curiosidades sobre os Youtubers portugueses que (quase) ninguém sabe." },
];

export const temaCuriosidades = (id) => TEMAS_CURIOSIDADES.find((t) => t.id === id) || null;
