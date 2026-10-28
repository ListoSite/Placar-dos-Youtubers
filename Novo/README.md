# Placar dos Youtubers (versão nova)

Site com o ranking dos Youtubers portugueses: views por mês, subscritores, Índice de Influência, perfis com vários canais, projetos, comparações e um Palco para gravar vídeos (16:9 e 9:16).

A versão antiga continua na pasta `Antigo/`. Esta pasta (`Novo/`) é independente.

## Como funciona

- **Site** (`public/`): HTML, CSS e JavaScript sem compilação. Os gráficos usam D3 e as letras estão incluídas no site.
- **Servidor** (`netlify/functions/`): funções do Netlify que guardam os dados no **Netlify Blobs** (grátis, já incluído no Netlify).
- **Recolha automática**:
  - todos os dias às 03:17 (UTC) lê os números de todos os canais (subscritores, views totais, vídeos);
  - de hora a hora atualiza os últimos vídeos de 20 canais e 3 projetos.
- **Views por mês**: o YouTube não dá as views de cada mês de canais de outras pessoas. O site guarda o total de views de cada canal todos os dias e a diferença entre o primeiro dia de um mês e o primeiro dia do mês seguinte são as views desse mês.
- **Dados antigos**: na primeira vez que o site arranca, carrega `netlify/data/seed.json` (vai dentro da função, não é servido no site), criado a partir da tua folha de cálculo (330 Youtubers, dezembro 2024 a março 2026).

## Pôr o site online no Netlify (uma vez)

1. No Netlify: **Add new site > Import an existing project > GitHub** e escolhe o repositório `Placar-dos-Youtubers`.
2. Em **Base directory** escreve `Novo`. O resto (pasta `public`, funções) é lido do `netlify.toml`.
3. Em **Site configuration > Environment variables** cria:
   - `YOUTUBE_API_KEY`: a chave da API do YouTube (ver abaixo);
   - `ADMIN_PASSWORD`: a palavra-passe da área de edição (escolhe uma forte).
4. Faz **Deploy**. Depois de mudar variáveis, faz **Deploys > Trigger deploy** para as funções as lerem.

### Criar a chave da API do YouTube (grátis)

1. Vai a <https://console.cloud.google.com/> e cria um projeto (por exemplo "Placar").
2. Em **APIs e serviços > Biblioteca**, procura **YouTube Data API v3** e ativa.
3. Em **APIs e serviços > Credenciais > Criar credenciais > Chave de API**.
4. Recomendado: em **Restrições da API**, limita a chave à YouTube Data API v3.
5. Copia a chave para a variável `YOUTUBE_API_KEY` no Netlify.

A quota grátis é de 10 000 unidades por dia. A recolha automática gasta cerca de 2 000 por dia com 400 canais. Cada pesquisa de canais na área de edição gasta 100.

### Entrar no painel com a conta Google

O painel (`/painel/`) aceita o login com Google, só para os emails da lista. A palavra-passe continua a funcionar como alternativa.

1. No mesmo projeto do Google Cloud, vai a **APIs e serviços > Ecrã de consentimento OAuth** (ou **Google Auth Platform**): tipo **Externo**, nome "Placar dos Youtubers", o teu email de apoio. Os âmbitos básicos (email, perfil) chegam.
2. Em **Público-alvo** (Audience), adiciona o teu email aos **utilizadores de teste**, ou carrega em **Publicar aplicação**.
3. Em **Credenciais > Criar credenciais > ID do cliente OAuth**: tipo **Aplicação Web**. Em **Origens JavaScript autorizadas** põe o endereço do site (por exemplo `https://o-teu-site.netlify.app`, e o domínio próprio se tiveres) e, para testar em casa, `http://localhost` e `http://localhost:8888`.
4. Copia o **ID do cliente** (acaba em `.apps.googleusercontent.com`). O segredo do cliente não é preciso para o painel.
5. No Netlify, cria as variáveis `GOOGLE_CLIENT_ID` (o ID do cliente) e `ADMIN_EMAILS` (o teu email; vários separados por vírgulas) e faz **Trigger deploy**.

O servidor confirma a assinatura do Google, o ID do cliente e o email antes de abrir o painel. Mantém a `ADMIN_PASSWORD`: serve de alternativa e para assinar as sessões.

**Segurança do painel.** Usa uma `ADMIN_PASSWORD` comprida (16 letras ou mais, ao acaso). Depois de 8 tentativas erradas, o mesmo endereço fica 15 minutos sem poder tentar. Recomendado: cria também `ADMIN_SECRET` com um texto comprido ao acaso (por exemplo, gerado num gestor de palavras-passe); passa a ser a chave das sessões e, se um dia a mudares, todas as sessões abertas fecham.

## Duas partes: o site público e o painel

- **Site público** (`/`): é o que os visitantes veem, feito primeiro para o telemóvel, com abas em baixo. Mostra **só** o que o painel deixa: as abas, os blocos do Início, os gráficos, os períodos (último mês, um mês, um ano, os últimos meses), as animações, os perfis e cada secção dos perfis, os Youtubers escondidos e os meses que podem aparecer. Não tem nenhuma ligação para o painel.
- **Painel** (`/painel/`): serve só para controlar. Tem quatro partes:
  - **Página pública**: liga e desliga tudo o que o site mostra, com uma pré-visualização em formato de telemóvel. As mudanças só chegam aos visitantes depois de carregares em **Publicar** (o site pode demorar até um minuto a mostrar a versão nova).
  - **Quem aparece** (dentro de Página pública): todos, só os melhores de um ranking (por exemplo o top 10 do último mês, que se atualiza sozinho) ou só os que escolheres, com filtros por categoria, pesquisa, seleção de vários de uma vez e quem tem perfil aberto.
  - **Cenas do vídeo** (no Palco, passo 4): a intro, o espetáculo e o fim ligam-se e desligam-se, e juntam-se cenas (votação a decorrer, exclusivo no site, Youtuber em foco, faixa Subscreve, texto teu, data dos números, contagem 3-2-1, visita o site, no próximo vídeo) antes, a meio ou depois, pela ordem que quiseres.
  - **Simulações** (no Palco): Bolas comilonas (a maior come a mais pequena), Corrida de cavalos (num labirinto até à cenoura), Corrida de berlindes (pinos, rampas e pás), Escapa do círculo (anéis que rodam, uma nota em cada ressalto) e Batalha no ringue (vida e golpes críticos). São jogos de sorte, com o tamanho ou a vida pelos números (views, subscritores, Índice) ou ao acaso; como exclusivos repetem-se iguais.
  - **No fim de cada espetáculo** escolhes: **Teste** (não conta para nada), **Vídeo para os canais** (conta nas estatísticas e aparece em Vídeos) ou **Exclusivo no site** (conta e fica no site).
  - **Exclusivos**: guardam os números, a sorte (semente) e as cenas de quando correram no painel; no site repetem-se exatamente iguais, com a data da publicação no início. Em Página pública, Exclusivos, vês como ficam, escondes, mostras, ordenas e mudas o texto e as datas.
  - **Votações**: votação livre, Youtuber do mês, Youtuber favorito, confronto, próximo desafiante, previsão e torneios (4, 8 ou 16, ronda a ronda). Em cada uma escolhes se **o público decide** ou se é uma **previsão** (depois marcas a resposta certa e o site mostra quem acertou).
  - **Palco**: grava os vídeos. Enquanto houver uma votação aberta, o vídeo mostra antes do fim que se pode votar ("Link na bio", o endereço e um código QR). O texto e o endereço mudam-se em Página pública, Dados e ligações.
  - **Youtubers e dados**: Youtubers, canais, importações, projetos e definições.

## Primeiros passos depois de publicar

1. Abre o painel (`/painel/`) e entra com a conta Google ou a palavra-passe.
2. **Ligar canais**: carrega em *Procurar automaticamente*. O site experimenta o nome de cada Youtuber da folha como @handle e mostra o canal encontrado para confirmares. Para os que falharem, cola o link do canal ou usa *Procurar pelo nome*.
3. **Youtubers**: junta pessoas com dois canais (por exemplo "Arganaça" e "Arganaça 2"), define o canal principal e marca os canais de clips como "não conta". A ficha de cada Youtuber também liga canais: mostra os canais sugeridos (com *É este*, *Juntar como 2.º canal* e *Não é*), adivinha o @handle pelo nome, pesquisa no YouTube, ignora na procura, e tem *Seguinte →* para passar ao Youtuber seguinte da lista. O filtro *Para confirmar* mostra só quem tem sugestões por decidir.
4. **Importar dados**: usa o marcador do Social Blade para preencher os meses de agosto 2025 até agora, canal a canal. Também podes colar uma tabela do Excel ou Google Sheets.
5. **Descobrir canais**: procura canais novos e decide quem entra. Os que rejeitas não voltam a aparecer.
6. **Projetos**: cola o link da playlist de uma série. O site vai buscar as views de cada episódio e calcula o impacto face ao normal do canal.

## Meses sem dados (o buraco de agosto 2025 em diante)

Há três formas de os preencher, por esta ordem de facilidade:

1. **Estimativa automática.** Para cada Youtuber com canal ligado, o site lê os vídeos do canal (data e views de hoje) e reparte essas views pelos meses, com uma curva afinada pelos meses que já conhecemos. Corre sozinha (4 Youtubers por hora) ou mais depressa em Editar, Importar dados. Os valores aparecem com ≈ e o erro típico de cada pessoa.
2. **Marcador do Social Blade (todos de uma vez).** Em Editar, Importar dados: arrastas o botão "Placar ⇄ Social Blade" para a barra de marcadores, copias a lista de canais, abres um canal qualquer no socialblade.com e carregas no marcador. Ele percorre todos os canais da lista, vários ao mesmo tempo (velocidade Rápida, 4 de cada vez; Normal, 3; Cuidadosa, 1 com pausas, como era antes), e pode ser pausado e continuado. Todos os pedidos passam por um ritmo comum: se o Social Blade responder "calma" (429), o marcador espera, abranda para metade e tira canais de cada vez, e volta a acelerar depois de muitos pedidos bem-sucedidos; se pedir uma verificação, para e fica numa velocidade mais lenta para a próxima. As esperas usam um Worker, por isso não abrandam quando o separador fica escondido. O TikTok, o Instagram e a Twitch de cada canal são lidos ao mesmo tempo. No fim envia os meses para o Placar, onde confirmas antes de gravar. Além das views de cada mês, traz do Social Blade os subscritores ganhos e os vídeos publicados em cada mês, os totais dos últimos 30 dias, as views das últimas 52 semanas e os links das redes sociais (que só entram onde ainda não há link). Rankings, nota e ganhos estimados não são guardados. Cada canal tem um link direto para o Social Blade no perfil e na área de edição. Quando o Youtuber tem TikTok (link no perfil ou nas redes que o Social Blade mostra no canal), o marcador traz também os seguidores, gostos e vídeos do TikTok e os ganhos de cada mês; para um TikTok que não esteja ligado, abre o perfil em socialblade.com/tiktok/user/nome e carrega no marcador. No Placar ficam o link, os números de hoje e do fim de cada um dos últimos 12 meses (nas Outras redes do perfil), um gráfico de seguidores e gostos ganhos por mês, e as medidas "Seguidores no TikTok" no Palco. O TikTok não tem uma API pública gratuita para isto, por isso o Social Blade é a fonte. Do mesmo modo, para quem tem link do **Instagram** ou da **Twitch** (no perfil ou nas redes que o Social Blade mostra no canal), o marcador traz os seguidores, as publicações, quem segue, o envolvimento (gostos e comentários por publicação), a nota do Social Blade e os seguidores ganhos em cada mês e nos últimos 30 dias. No Instagram, o Social Blade só dá o histórico a quem tem sessão iniciada lá (a conta gratuita chega); sem sessão vêm só os números de hoje. Também funciona abrindo um perfil em socialblade.com/instagram/user/nome ou /twitch/user/nome. No Palco, o cartão de um Youtuber acaba com "E nas outras redes?": os seguidores em cada rede, o total somado e até 3 curiosidades (quem está muito acima no YouTube mas perde numa rede, quem tem os mesmos subscritores mas o dobro ou metade dos seguidores, o lugar no top de cada rede, mais seguidores do que subscritores, ou o que ganhou num mês comparado com o total de alguém). No Placar ficam o link, os números de hoje e do fim de cada um dos últimos 12 meses (Outras redes), secções Instagram e Twitch no perfil (que se ligam e desligam em Página pública, Perfis), as medidas "Seguidores no Instagram", "Seguidores na Twitch", "Seguidores em todas as redes" e "Seguidores ganhos nas redes" no ranking do site e, no Palco, essas medidas e os ganhos do mês (quando há números de pelo menos 5 Youtubers). O código do marcador está em `scripts/marcador/sb.src.js`; depois de o alterar, corre `npm run build:marcador`.
3. **Colar da folha de cálculo.** Para muitos meses de uma vez.

### Quem tem vários canais

- **Cada canal com os seus dados e a sua página.** O canal principal é o próprio Youtuber (usa a categoria, a descrição e as etiquetas dele, e no site abre o perfil). Nos outros canais, "✎ Categoria e descrição" abre o nome no placar, a categoria, as etiquetas e a descrição desse canal (o que ficar vazio usa o do YouTube ou do Youtuber). No site público, os canais do perfil de um Youtuber abrem a página de cada canal (`#/canal/ID`), com os números só desse canal (views por mês, subscritores, vídeos, Índice e onde ficaria no ranking) e a ligação para o Youtuber dono. A pesquisa também encontra os outros canais pelo nome. Só existe quando o Youtuber tem perfil aberto. No Palco, com "Cada canal entra sozinho", cada canal usa estes dados.
- **Views por mês de cada canal.** Na ficha do Youtuber, as views por mês têm um separador para o Youtuber (a soma dos canais que contam) e um para cada canal. Um número escrito num canal passa à frente do YouTube e do Social Blade nesse canal e muda a soma. Os meses da folha antiga ficam no Youtuber e contam como do canal principal quando ele não tem números. Quando escreves por cima de um número, o que lá estava fica guardado: apagar o teu número volta a ele.
- **Outras redes no Índice.** Há uma parte nova, "Outras redes", com peso 25 (20% do total, muda-se nos Pesos em Definições). Conta os seguidores no Instagram e na Twitch (valem inteiros) e no TikTok (vale 60%, porque é mais fácil crescer lá), numa escala de 1 mil até 5 M (Instagram), 2 M (Twitch) e 20 M (TikTok). A melhor rede conta inteira, a segunda 35% e a terceira 15%, e quem está a crescer depressa numa rede ganha um extra. Só entra quando sobe o Índice: quem é forte no YouTube e fraco nas redes não perde nada. A página do Youtuber mostra quanto as redes subiram.
- **Índice.** Os canais juntam-se como se fosse um canal só (subscritores repetidos e vídeos dos outros canais contam só em parte) e depois há um bónus por cada canal a mais que conta: +5% por canal, até 3 canais a mais. Muda-se em Definições, O que se mede (0 a 15%). A página do Youtuber mostra o bónus.
- **Palco.** Nos espetáculos com vários Youtubers aparece "Quem tem vários canais": *Entra uma vez (canais juntos)* ou *Cada canal entra sozinho*. No segundo, cada canal que conta entra com os seus próprios números (os de clips continuam de fora). Os resultados guardados no histórico (estrelas, coroas, confrontos) vão para o Youtuber dono do canal, e um exclusivo repete exatamente o que foi gravado.

### Radar do Caso

Em O Caso, Radar, aparecem os vídeos recentes (últimos 45 dias) que podem dar notícia.

**Leitura.** O radar lê sozinho **todos os Youtubers do Placar e os canais extra duas vezes por dia** (a partir das 7h e das 19h, hora de Lisboa; função `radar-daily`, que corre de hora a hora e continua de onde ficou). Os vídeos vêm do **feed RSS de cada canal** (os últimos 15, com views, gostos, descrição e se é Short), que **não gasta quota**. Da API só se usa:

- os detalhes dos vídeos dos últimos 14 dias (comentários e etiquetas): 1 unidade por cada 50 vídeos;
- os comentários dos que já parecem notícia: 1 unidade cada, até ao máximo por dia que escolhes nas regras (60 por defeito);
- as tendências de Portugal: 1 unidade, no máximo de 6 em 6 horas;
- a lista de uploads quando o feed de um canal falha (cerca de 3 unidades), só para os escolhidos;
- "fora da bolha": cerca de 100 unidades por procura (1 por dia sozinho, se estiver ligado).

No total costuma gastar 100 a 250 unidades por dia, das 10 000. O botão "Procurar" lê já o grupo da aba aberta, aos bocados de 25 canais.

**Abas.** "⭐ Escolhidos" mostra só os Youtubers escolhidos à mão (com os canais de clips de cada um) e os **canais extra a vigiar** (canais de clips ou de notícias que não estão no Placar, também de fora de Portugal). Os escolhidos são lidos primeiro em cada ronda e têm os comentários lidos primeiro. "Todos os Youtubers" mostra tudo.

A análise foi afinada com vídeos reais de notícias do YouTube português: quase tudo está no **título** (nomes de outros Youtubers, como "X reage à resposta do Y", "O X tem razão" ou listas de nomes no fim; verbos de conflito como reage, ataca, critica, indireta, exposto, queixas; conquistas como ganhei, prémio, estreia; curiosidades como ex-namorada ou visita). Os títulos em maiúsculas e com "!?" contam como sinal. Das descrições só conta o texto escrito (os links, redes, patrocínios e códigos de desconto são ignorados), e das etiquetas só os nomes de outros Youtubers. Também contam os sinais nos números (muito mais views do que o normal, muitos comentários para as views) e, nos que já parecem notícia, os comentários mais relevantes (outros Youtubers e palavras quentes). Cada vídeo mostra porquê entrou e "Fazer notícia" abre o editor já preenchido, como rascunho. Nas regras escolhes os pontos mínimos (5 por defeito), juntas palavras tuas (com o tema depois de `=`) e ligas ou desligas a leitura dos comentários.

Para não teres de decorar o que já viste:

- **✓ Visto:** o vídeo fica marcado e esbatido (a cinzento). Abrir o vídeo pelo radar marca-o sozinho, e "Marcar N como vistos" marca de uma vez os que estão à vista. "↺ Por ver" desfaz.
- **🗑 Remover:** o vídeo sai do radar e não volta, mesmo quando o radar volta a procurar.
- Quem vira notícia fica marcado com "📰 Notícia".

Em cima há contadores que servem de filtro (Por ver, Vistos, Viraram notícia, Todos) e "⭐ Mais falados esta semana", com os Youtubers de quem mais se fala nos vídeos dos últimos 7 dias (carregar num filtra por ele). Também dá para filtrar por sinal, por tema e ordenar por "🧠 Para ti" (o que o radar acha que mais te interessa, com os recentes primeiro), mais quentes ou mais recentes. Cada miniatura mostra quão quente está o vídeo (morno, quente, a ferver) e se é um Short.

**Sinais além das palavras:**

- **⚡ A disparar:** as views que o vídeo tem para a idade, comparadas com o normal do canal (um vídeo costuma fazer metade das views no primeiro dia). Um vídeo de 3 horas com muitas views conta muito mais do que um de 10 dias com as mesmas. Os vídeos que o público já esperava aparecem aqui depressa.
- **💥 Explodiu:** passou dos 10 mil views num canal onde o normal é bem menos.
- **🔙 Regresso:** o primeiro vídeo depois de 45 dias ou mais sem publicar.
- **📈 Tendências:** está nas tendências do YouTube em Portugal. Os vídeos em tendência de canais que não estão no Placar também entram quando falam de Youtubers do Placar.
- **🇵🇹 Youtubers portugueses:** o título fala dos "Youtubers portugueses", "youtuber tuga", "portuguese youtuber"…
- Cada vídeo mostra também as views ganhas desde a leitura anterior.

**🔥 Casos a crescer.** O radar guarda os títulos de todos os vídeos lidos nos últimos 14 dias e procura assuntos (Youtubers mencionados ou palavras do título, como o nome de um jogo) de que pelo menos 3 canais diferentes começaram a falar nos últimos 4 dias, muito mais do que nos 10 dias antes. Os assuntos que andam sempre na boca de todos não contam: só as subidas. Os assuntos que aparecem nos mesmos vídeos juntam-se (por exemplo "Wuant · LoL"), e os vídeos do próprio Youtuber sobre o mesmo assunto também entram. Os vídeos de um caso sobem até 5 pontos (mais quantos mais canais), e o radar fica mais atento a esses assuntos nas leituras seguintes. Para ser rigoroso, só sobem os casos com Youtubers do Placar (ou que falam de Portugal); os outros aparecem em "🌍 Assuntos gerais" e não contam, porque podem ser mundiais (por exemplo o trailer de um jogo). Em cada caso dá para ver todos os vídeos (também os que não chegaram aos pontos), fazer uma notícia do caso inteiro ou ignorá-lo (os assuntos ignorados ficam nas regras para voltar atrás).

**🌍 Fora da bolha.** Num caso com Youtubers do Placar, "Ver se saiu da bolha" procura vídeos recentes sobre o assunto em canais que não estão no Placar e conta os de fora de Portugal (país do canal ou língua do vídeo, incluindo português do Brasil). Só conta um vídeo que fala mesmo do Youtuber do caso. Quando há 2 ou mais lá fora, o caso sobe mais 2 pontos. Uma vez por dia o radar faz isto sozinho para o caso português mais forte (dá para desligar nas regras).

**🧠 Aprender contigo.** Cada vídeo tem "👍 Útil" e, depois, as etiquetas Interessante, Assunto bom e Polémico. O radar aprende com o que marcas como útil (vale 1), o que vira notícia (vale 2) e o que removes (vale 1 contra): quem publicou, de quem fala, as palavras, o tema e os sinais. Os vídeos parecidos sobem ou descem até 5 pontos, e o cartão diz porquê (por exemplo "🧠 +2: gostas dos vídeos do Wuant"). Os vídeos abaixo do mínimo ficam guardados e aparecem quando sobem com um caso ou com o que o radar aprendeu. Nas regras vês o que aprendeu (com as etiquetas por Youtuber), podes esquecer uma coisa ou tudo.

### Bocas no Palco

Comentários com piada que aparecem nos vídeos num balão (no máximo 4 por vídeo, com pelo menos 8 segundos entre eles): quando alguém ganha, sobe ou cai muitos lugares, passa para a frente, aparece no pódio, e no cartão de cada Youtuber. Há bocas automáticas, tiradas dos números (muitos vídeos em 30 dias, último vídeo há muito tempo, no YouTube desde há muitos anos, mais seguidores no Instagram ou no TikTok do que no YouTube, subidas e quedas grandes, a categoria, coroas no Palco) e de momentos (por exemplo "ainda vais parar às notícias do…", que usa o Youtuber de notícias com mais Índice: categoria com "Notícias", "Atualidade", "Comentário"…). Na ficha de cada Youtuber escreves bocas só dele, e em Definições bocas gerais; `{nome}` e `{noticias}` são trocados pelos nomes. Os exclusivos gravados antes das bocas continuam iguais.

### Marcador do YouTube ("Acerca de")

Em Editar, Importar dados há um segundo marcador, "Placar ⇄ YouTube". Numa página de canal (ou de vídeo) do YouTube lê a janela "Acerca de": descrição, links (Instagram, TikTok, sites…), emails escritos na descrição, país, data de entrada, subscritores, views, vídeos, foto e banner. Com a lista copiada no Placar ("Copiar lista para o YouTube") lê todos os canais seguidos, sem os abrir, com pausas, e pode ser pausado. Não gasta quota da API. No Placar escolhes, link a link, se vai para uma rede do perfil, para as notas privadas ou para nenhum lado, e se a descrição, a localidade, o ano e a foto passam para o perfil. Também dá para ligar o canal a um Youtuber (ou criar um novo) ali mesmo. Os dados lidos ficam guardados no canal (só no painel; emails e links nunca vão para o site público) e na ficha do Youtuber aparecem em "Ver e usar". O link "Ler no YouTube" de cada canal abre o "Acerca de" certo. O email para empresas que o YouTube esconde atrás de uma verificação não é lido. O código está em `scripts/marcador/yt.src.js`; `npm run build:marcador` gera os dois marcadores.

**Atualizar sem F5.** No topo de todas as secções de Dados há o botão "Atualizar dados", que volta a ler os dados do servidor e desenha outra vez a secção, no mesmo Youtuber, com a mesma procura e no mesmo sítio da página (por baixo diz a hora dos dados que estão à vista). Quando o marcador abre uma janela nova do painel para importar e lá gravas, a janela do painel que já estava aberta atualiza-se sozinha assim que voltas a ela (funciona entre janelas do mesmo browser). Se estiveres a meio de escrever nessa janela, não mexe no que escreveste: aparece um aviso com "Atualizar agora". A janela aberta pelo marcador mostra no fim um botão para a fechar.

Dados reais (YouTube, Social Blade, folha, manual) passam sempre à frente de uma estimativa.

## No telemóvel

O site foi feito para telemóvel: barra de navegação em baixo, gráficos com toque, Palco em 9:16 e área de edição completa. Pode ser instalado como app: no Android, menu do Chrome e "Adicionar ao ecrã principal"; no iPhone, Safari, Partilhar e "Adicionar ao ecrã principal".

## O Índice de Influência

Número de 0 a 1000 que junta seis partes (pesos ajustáveis em *Editar > Definições*):

| Parte | Peso inicial | O que mede |
|---|---|---|
| Alcance atual | 35 | Média de views por mês nos últimos 3 meses com dados (escala logarítmica; 10 milhões por mês = nota máxima) |
| Constância | 20 | Meses com views nos últimos 12 e se as views são regulares |
| Atividade | 15 | Vídeos nos últimos 90 dias e há quanto tempo saiu o último |
| Momento | 10 | Últimos 3 meses contra os 3 anteriores |
| Peso histórico | 15 | Subscritores e views totais |
| Envolvimento | 5 | Gostos e comentários por cada view nos vídeos recentes |

As partes sem dados não entram nas contas. A fórmula da folha antiga continua disponível como **Pontuação clássica**.

## Testar no computador

Precisas do Node.js 18 ou mais recente.

```bash
cd Novo
npm install
ADMIN_PASSWORD=teste YT_MOCK=1 npm run dev     # dados do YouTube falsos, para experimentar
# ou: ADMIN_PASSWORD=teste YOUTUBE_API_KEY=a-tua-chave npm run dev
```

Abre <http://localhost:8888>. Os dados locais ficam em `Novo/.localdata` (apaga a pasta para recomeçar). Com o servidor ligado, `ADMIN_PASSWORD=teste npm test` corre os testes da API. Para simular a recolha: <http://localhost:8888/__cron/daily> e <http://localhost:8888/__cron/hourly>.

## Ficheiros principais

```
Novo/
  netlify.toml                 configuração do Netlify
  netlify/functions/api.mjs    API (dados públicos e edição)
  netlify/functions/collect-*.mjs  recolhas agendadas
  netlify/lib/                 base de dados, YouTube, recolha, dataset, Social Blade
  public/index.html            o site público (abas em baixo, feito para o telemóvel)
  public/painel/index.html     o painel
  public/assets/js/publico/    o site público: abas, blocos do Início, ranking, votações
  public/assets/js/pages/      perfis, comparar, categorias e projetos (usadas no site público)
  public/assets/js/admin/vitrine.js   o controlo da página pública
  public/assets/js/admin/votacoes.js  votações e torneios
  netlify/lib/vitrine.mjs      o que a página pública pode mostrar (e a limpeza dos dados)
  public/assets/js/admin/      área de edição
  public/assets/js/stage/      Palco (espetáculos para vídeo)
  public/assets/js/stage/kits.js  efeitos do "Tema completo" de cada tema
  public/assets/js/stage/cenas.js cenas próprias dos 10 temas principais (abertura, cartões e arena)
  supabase/schema.sql          tabelas e regras da base de dados no Supabase
  public/assets/js/audio.js    sons e músicas gerados no browser
  netlify/data/seed.json       dados iniciais da folha de cálculo (seed-dados.mjs é a cópia que a função usa)
  scripts/                     servidor local, testes, conversão da folha
```

## Palco

26 espetáculos em ecrã inteiro, em 16:9 ou 9:16, com 40 temas.

- Temas de ambiente: Clássico, Verão, Inferno, Gelo, Neon, Galáxia, Gala.
- Temas por categoria: todas as 36 categorias do site têm tema. Os feitos à mão (Futebol, Cozinha, Carros, Gaming, Tech, Comédia, Música) e 25 gerados a partir de cores, um padrão de fundo, ícones e música próprios (YouTube, Clips, Shorts, Vlog, Podcast e Rádio, Negócios, Girly, Escola, Tutorial, Política, Notícias, História, Livros, Cinema, Fitness, Reacts, Casa, Pesca, Animais, Kids, Ciência, Dança, Religião, Motas, Programação). Ao escolher uma categoria (ou um Youtuber), o tema certo é sugerido. Os temas gerados estão em `stage/temas-gerados.js`: para criar outro basta uma linha com cores, padrão e ícones.
- Para direto: Chroma (OBS), com fundo verde para recortar.

Espetáculos:
- Rankings: Revelação do top, Corrida das views, Tier list, Altos e baixos.
- Gráficos: Gráfico de barras (as colunas crescem fora de ordem e ordenam-se sozinhas, com a linha da média), O bolo das categorias (donut fatia a fatia), Bolhas (bolhas com física que mudam de tamanho entre views, subscritores e Índice), Linha a linha (até 7 Youtubers mês a mês, com quem vai na frente) O mês em números (números gigantes, um de cada vez) e O público escolheu (resultados de uma votação do site).
- Jogos: Desafio do Placar (para quem vê o vídeo: escolha múltipla, o intruso, ordenar, verdadeiro ou falso, com pontos), Quem fez mais?, Mais ou menos, Adivinha quem é, Roda da sorte.
- Duelos: Batalha (barras de vida até ao K.O.; no tema Futebol completo é um jogo com marcador, minutos, golos e penáltis) e Torneio (8 ou 16 Youtubers).
- Histórias: Cartão de Youtuber e A história de….
- Curiosidades: episódios com um tema, sempre diferentes (ver abaixo).

Na página do Palco há um filtro **Para vídeos / Para direto (Twitch)**. Em cada espetáculo:
- **Para**: Vídeo (ritmo automático, lembrete a meio para subscrever) ou Direto (ritmo "Eu avanço", opção Repetir no fim).
- **Youtuber em foco**: o espetáculo corre normalmente e, no início, a meio ou no fim, mostra onde ficou esse Youtuber e os números dele. Sempre que aparece, tem um brilho especial; nos jogos e duelos entra de certeza.
- **Gravar vídeo**: grava o espetáculo em Full HD com som, no próprio browser (Chrome no computador), e no fim mostra o vídeo para descarregar (MP4, ou WebM em browsers mais antigos).
- **Legenda para publicar**: título, legenda e hashtags prontos a copiar.

**Efeitos do tema: Tema completo ou Só cores.** Em "Tema completo", cada tema tem um kit que desenha os momentos dos espetáculos à sua maneira: Futebol (golos com a bola a voar, cartões amarelo e vermelho, apito, bancada a cantar, taça), Coliseu nos temas Inferno e Fitness (espadas, rugido do público, louros, o polegar do imperador), Arcada em Gaming e Neon (HIT, combos, K.O., GAME OVER, recordes), Reações em Reacts, Comédia, Shorts e Clips (emojis e comentários de direto), Fofo em Girly e Kids (corações, laços, tiara), Viagem em Vlog e Verão (polaroids, pins, carimbos de passaporte, aviões), Natureza em Pesca e Animais, Notícias em Notícias, Política e Negócios (rótulos de televisão, última hora, verificação Verdadeiro/Falso, primeira página do jornal), Pista em Carros e Motas (semáforos, ultrapassagens, nitro, bandeira de xadrez), Espetáculo em Música, Dança, Gala e Cinema (holofotes, aplausos, rosas, estatueta), Laboratório em Tech, Programação, Ciência, Galáxia e Gelo (scanner, lasers, hologramas), Livro em Livros, História, Escola, Tutorial e Religião (caneta vermelha, selos, diploma), Cozinha em Cozinha e Casa (estrelas de chef, picante, chapéu) e Estúdio nos outros (gostos, sininho, placa de ouro). Os espetáculos só dizem o que aconteceu (`palco.evento("golpe", …)`) e o kit decide como aparece e soa: está tudo em `stage/kits.js`.

**Cenas próprias dos 10 temas principais.** Em "Tema completo", os temas Futebol, Carros, Cozinha, Girly, Inferno, YouTube, Gaming, Comédia, Vlog e Tech também têm a abertura, os cartões da Revelação e a arena da Batalha desenhados de raiz: placar luminoso, cartas de jogador e um jogo com golos (Futebol); semáforos de partida, conta-rotações e uma corrida em duas pistas (Carros); quadro de giz, a campânula que levanta e um duelo de jurados (Cozinha); capa de revista e um duelo de corações (Girly); título em chamas, seleção de lutador e combate com cronómetro e K.O. (Inferno); leitor de vídeo, miniaturas e uma batalha de tendências (YouTube); PRESS START, cartas de raridade e um combate de píxeis P1 contra P2 (Gaming); banda desenhada com balões e POW (Comédia); câmara a gravar, stories e dois telemóveis (Vlog); terminal, ficha técnica e um benchmark (Tech). Nas arenas "de progresso" ganha quem chega primeiro aos 100 (metros, corações, gostos…). Está tudo em `stage/cenas.js` e `css/cenas.css`.

**Curiosidades.** Cada episódio tem um tema que serve de título de vídeo, e factos tirados dos números de todos os Youtubers:

| Tema | O que mostra |
| --- | --- |
| 👻 Lembras-te deles? | Canais grandes sem vídeos novos há meses ou anos (com "Quem é?" desfocado ou o canal abandonado, com teias e os dias a contar) |
| 😴 Gigantes adormecidos | Muitos subscritores e poucas views no mês |
| 🦖 Os dinossauros do YouTube | Os mais antigos, numa linha do tempo com o que veio depois (iPhone, Minecraft, Instagram, TikTok…) |
| 🚀 Foguetões | Canais com poucos anos que já passaram veteranos |
| 🏭 Máquinas de fazer vídeos | Quem tem milhares de vídeos, ou quase um por dia |
| 💎 Poucos vídeos, muitas views | Quem não precisa de publicar muito |
| 👯 Separados à nascença | Os mesmos subscritores e tudo o resto ao contrário |
| 🪨 David contra Golias | Canais pequenos que tiveram mais views do que gigantes |
| 📱 Mais famosos fora do YouTube | Instagram, TikTok e Twitch contra o YouTube |
| 🎯 Quase lá! | Quem está quase num número redondo, e quando lá chega ao ritmo atual |
| 🎢 Montanha-russa | Do melhor mês ao pior |
| ⏱️ Todos os dias vs. de vez em quando | Quem publica sem parar e quem se faz esperar |
| 📲 Shorts vs. vídeos longos | Onde cada um é mais visto |
| 💥 O vídeo que rebentou a escala | Um vídeo muito acima do normal do canal |
| 🧮 Matemática dos Youtubers | Estádios da Luz cheios, views por português, views por minuto |
| ⏪ Há um ano vs. agora | Quem mais mudou num ano |
| ❤️ O público mais fiel | Gostos e comentários por cada 100 views |
| 📏 A escala real dos Youtubers | Os subscritores em sítios reais, do mais pequeno ao maior (da freguesia mais pequena do continente, com 99 pessoas, à MEO Arena, aos estádios de Braga, Dragão, Alvalade e Luz, aos concelhos, aos distritos de Porto e Lisboa e a Portugal): as barras de antes encolhem quando chega um maior, e cada um diz quanto falta para a próxima meta |
| 🧊 O iceberg do YouTube português | Desce 5 níveis, dos gigantes (à superfície, mais de 1 milhão) até ao abismo (menos de 5 mil), e a água escurece |
| 👑 Todos os n.º 1 do Placar | O catálogo de todos os n.º 1, mês a mês, e quem foi mais vezes, o reinado mais longo, o mais improvável e o mês mais forte |
| 📼 2016 vs. 2026 | Quantos dos maiores já cá estavam em 2016, o maior que nem existia e os de 2016 que continuam no top |
| 🗺️ Que terra é o teu Youtuber? | Os subscritores num concelho com quase a mesma população (Censos 2021), aceso num mapa de Portugal (com Açores e Madeira); às vezes com a pergunta "que concelho é?" |
| 🇵🇹 1 em cada… portugueses | Se todos os subscritores fossem portugueses: 1 em cada quantos, em 100 bonecos (cada um 1% de Portugal), e o maior distrito ou ilha que cabia lá dentro |
| 👶 Portugal ao minuto | Nasce um bebé a cada 6 minutos (INE, 2024): quantas views fazem os Youtubers nesse tempo; o recorde do Cristiano (1 milhão em 90 minutos) contra o ritmo de cada um; o Placar inteiro num minuto |
| ⚽ A Liga dos Youtubers | Os 18 canais com mais subscritores numa liga: cada mês é uma jornada (25, 18, 15… pontos pelo lugar nas views). Tabela com Champions, Europa e descida, os despromovidos, a equipa sensação, o melhor ataque e, no fim, a revelação do campeão (escondido na tabela até lá) |
| 🧭 Norte vs. Sul | Com a localidade da ficha de cada Youtuber: Lisboa contra Porto, Norte contra Sul, onde há mais Youtubers por habitante e o maior do Algarve, Alentejo, Centro e Ilhas. Só aparece quando pelo menos 6 Youtubers têm a localidade preenchida |
| 🗼 Empilhados | Cada subscritor uma folha de papel, cada view do mês uma moeda de 1 cêntimo: a pilha cresce e a "câmara" afasta-se, a passar a Torre de Belém, o Elevador de Santa Justa, os Clérigos, o Cristo Rei, a Torre Eiffel, a Serra da Estrela, o Pico, o Evereste, os aviões e o espaço; diz quanto falta para a próxima |
| 🤝 De mãos dadas | Os subscritores de mãos dadas (cerca de 1,5 m cada) numa estrada que se afasta: a Ponte 25 de Abril, a Vasco da Gama, Lisboa–Porto, a Estrada Nacional 2, Paris, Nova Iorque, a volta à Terra. Também as views do mês em passos |
| 🌍 Contra os gigantes do mundo | Quantos canais portugueses cabem no MrBeast, no T-Series, no PewDiePie… (um círculo que se enche de bolinhas com a cara do Youtuber); as views de sempre contra um só vídeo (Baby Shark, Despacito); e todos os Youtubers do Placar juntos contra o MrBeast e contra os vídeos mais vistos |
| 🏟️ Mais gente do que… | Os subscritores numa tabela com os sócios do Benfica, FC Porto e Sporting, o NOS Alive, Fátima, os turistas e os aeroportos; e as views de um mês contra o que Portugal faz num ano inteiro |
| 🥧 À portuguesa | As views em pastéis de nata (quantos anos levava a fábrica de Belém a fazê-los), num boletim do Euromilhões (com uma aposta por view, quantas vezes ganhava) e a 1 cêntimo por view em salários mínimos |
| 💵 Quanto pode ganhar um Youtuber? | Só quando se escolhe: uma estimativa larga com as views do mês (0,25 a 4 dólares por mil views, a conta do Social Blade), sem patrocínios |
| 🎲 Coisas que não sabias | Um pouco de tudo |

Os números de Portugal estão em `stage/portugal.js`, todos com fonte: população a 31/12/2024 (10 749 635, INE), nascimentos de 2024 (84 642, INE), concelhos e distritos (Censos 2021), lotações (MEO Arena, estádios) e o recorde do canal do Cristiano Ronaldo.

As coisas do mundo real estão em `stage/mundo.js`, também com fonte e data (atualizar de vez em quando): os maiores canais (MrBeast 524 milhões, T-Series, Cocomelon, PewDiePie, BLACKPINK; outubro de 2026) e os vídeos mais vistos (Baby Shark 17,49 mil milhões, Despacito, See You Again, Shape of You, Axel F); os sócios do Benfica (392 202, 2025), FC Porto (131 037, 2024) e Sporting (110 mil pagantes, 2024); o NOS Alive 2026 (160 mil em 3 dias); Fátima (6,5 milhões de peregrinos em 2025); turistas (29,9 milhões), dormidas (82 milhões) e passageiros dos aeroportos (73,75 milhões; Lisboa 36,1; Faro 10,4) em 2025 (INE); a Carris Metropolitana (194 milhões de viagens em 2025); os Pastéis de Belém (20 mil por dia); o salário mínimo de 2026 (920 €); as chaves do Euromilhões (139 838 160); alturas de monumentos e montanhas; espessura de uma folha (0,1 mm) e de uma moeda de 1 cêntimo (1,67 mm); e distâncias (as pontes, a EN2 e, desde Lisboa, em linha reta).

**🤔 Consegues adivinhar?** Algumas curiosidades (até 3 por episódio) começam com uma pergunta de escolha múltipla, 5 segundos para pensar e a resposta certa a acender, para quem vê comentar o que respondeu. Cerca de um terço são **⬆️⬇️ Mais ou menos?**: só duas respostas, mais ou menos do que um número perto do certo. As respostas erradas são feitas à volta da certa e respeitam os limites (por exemplo, nunca "14 de 8 meses").

As cenas novas: a pilha que cresce com a "câmara" a afastar-se (os nomes que ficam muito juntos lá em baixo escondem-se), a estrada com a fila de gente, o círculo do gigante a encher-se de caras, as duas barras "todos juntos contra um", a tabela mista (o Youtuber no meio de coisas reais), o frasco que se enche enquanto o número conta e o boletim do Euromilhões com as bolas a sair. Os formatos vieram do que está a ter sucesso nos vídeos de dados: a "escala real" (comparar um número difícil de imaginar com coisas conhecidas, do pequeno ao enorme), os icebergs (camadas do conhecido ao obscuro), os catálogos completos com linha do tempo (todos os vencedores de uma competição), a nostalgia de 2016 e os títulos em forma de pergunta.

Com "Ao acaso", o tema é sorteado entre os que têm factos suficientes, evitando os últimos que saíram. Dentro do tema, os factos são sorteados com peso (os mais impressionantes saem mais vezes), sem repetir a mesma pessoa e evitando os que já saíram nas últimas vezes (a memória fica no browser). As frases e, em alguns temas, a maneira de mostrar também variam. O mais impressionante fica para o fim ("E a mais incrível…") e o episódio acaba com todas as caras e a pergunta para os comentários. O plano inteiro fica guardado com o espetáculo, por isso um exclusivo mostra exatamente o mesmo. Para juntar um tema novo: uma linha em `stage/curiosidades-temas.js` e um gerador em `stage/curiosidades.js`.

**Histórico: clássicos, rivais, estrelas e coroas.** Quando um espetáculo é gravado em vídeo (com sessão iniciada), os resultados ficam guardados para sempre: cada duelo (Batalha e Torneio), cada torneio ganho (uma estrela ★) e cada 1.º lugar de um ranking ou votação (uma coroa 👑). Antes de cada duelo aparece o confronto direto ("5.º confronto · 3–1"), com o selo ⚡ Clássico a partir do 3.º; no fim aparecem as vinganças e as sequências de vitórias. As estrelas aparecem ao lado do nome nos torneios e batalhas, o perfil de cada Youtuber tem a secção "No Palco" (estrelas, coroas, vitórias e maiores rivais) e a página do Palco tem o Hall da fama.

Todos os espetáculos acabam com a divulgação do canal (nome, @ do YouTube, TikTok e Instagram), que se edita em Editar, Definições, Canal nas redes.

Teclas: espaço avança, P pausa, M som, F ecrã inteiro, H esconde os controlos, Esc sai (e termina a gravação). A velocidade (rápida, normal, lenta) ajusta a duração para Shorts ou vídeos longos.

## Supabase (base de dados) e votações

Os dados podem viver no Netlify Blobs (como no início) ou no Supabase, uma base de dados Postgres grátis onde se vê e mexe em tudo por tabelas. Passo a passo:

1. Em supabase.com cria um projeto (região West EU ou Frankfurt).
2. No Supabase, **SQL Editor → New query**: cola o ficheiro `supabase/schema.sql` e carrega em **Run**. Cria as tabelas `pessoas`, `canais`, `projetos`, `documentos`, `palco_resultados`, `votacoes`, `votos`, `sugestoes`, `sugestao_votos`, `caso_votos` e `noticia_votos`, com as regras de segurança (ninguém de fora lê os dados diretamente; cada conta vota uma vez por votação).
3. No Netlify, **Site configuration → Environment variables**: `SUPABASE_URL` (o Project URL, `https://xxxx.supabase.co`), `SUPABASE_ANON_KEY` (a chave pública: **Publishable key** `sb_publishable_…`, ou a antiga `anon`) e `SUPABASE_SERVICE_ROLE_KEY` (a chave secreta: **Secret key** `sb_secret_…`, ou a antiga `service_role`; nunca no código nem no chat). Estão no Supabase em **Project Settings → API Keys** (o URL em **Data API**). Em cada variável, escolhe **Same value for all deploy contexts**. Faz um novo deploy.
4. No site, **Editar → Definições → Base de dados → Copiar dados para o Supabase**. A cópia vai por partes e não apaga nada do Netlify. Só depois da cópia é que o site passa a usar o Supabase (até lá continua no Netlify, por isso nunca abre vazio).

**Login com Google para votar** (no Supabase, Authentication):
1. Na Google Cloud Console, **APIs & Services → Credentials → Create credentials → OAuth client ID**, tipo **Web application**. Em *Authorized redirect URIs* põe `https://<o-teu-projeto>.supabase.co/auth/v1/callback`.
2. No Supabase, **Authentication → Sign In / Providers → Google**: liga, cola o Client ID e o Client Secret.
3. No Supabase, **Authentication → URL Configuration**: *Site URL* = o endereço do site no Netlify; em *Redirect URLs* junta o mesmo endereço.
4. No Supabase, em **Authentication → Sign In / Providers**, desliga **Email** e **Anonymous sign-ins** (só o Google fica ligado). As regras da base de dados já só aceitam votos de contas Google, mas assim nem se criam contas de outro tipo.
5. Na Google Cloud, no ecrã de consentimento, carrega em **Publicar aplicação** para qualquer pessoa poder entrar (em "Teste" só entram os utilizadores de teste).

Se já tinhas corrido o `schema.sql` antes, corre-o outra vez: pode correr várias vezes sem apagar dados e traz as regras novas.

**Importante (votações novas):** os tipos novos de votação e os torneios precisam de colunas novas na tabela `votacoes`. No Supabase, **SQL Editor**, corre outra vez o ficheiro `supabase/schema.sql` (não apaga nada). Sem isso, o painel avisa ao criar uma votação.

As votações criam-se no painel, em **Votações**. Os visitantes votam na aba **Votar** do site com a conta Google, uma vez por votação. Os resultados vão para um vídeo com o espetáculo **O público escolheu**: lista do último ao primeiro, confronto frente a frente, a resposta certa de uma previsão (com a percentagem de quem acertou) ou a chave de um torneio ronda a ronda até ao campeão.

### Sugestões do público

Na aba **Sugerir** do site, quem entra com a conta Google sugere um vídeo e escolhe os Youtubers: um **top** (por views, subscritores, Índice…, de todos, de uma categoria ou só dos escolhidos), uma **batalha** (2), um **torneio** (8), uma **simulação** (um dos jogos, com 2 a 12) ou a **história** de um Youtuber. Não há texto livre: o título faz-se sozinho a partir das escolhas.

- Tudo anónimo: no site nunca aparece quem sugeriu nem quem votou. Na base de dados guarda-se só um código da conta (não dá para saber o email nem o nome), para os limites.
- No máximo 3 sugestões no site ao mesmo tempo, uma por conta (e uma por dia), sem repetidas.
- Toda a gente com conta Google vota **Quero ver** ou **Não quero** (e pode mudar ou tirar o voto). Com 60% de "não quero" (a partir de 10 votos), a sugestão sai do ar e abre o lugar.
- Cada sugestão fica 14 dias. No fim vai para o painel, em **Sugestões → Por decidir** (com um número ao lado na barra), e tu **aceitas** ou **recusas**. As aceites aparecem no site em "O canal aceitou".
- No painel também podes **acabar já**, **tirar do ar**, **apagar** e **abrir no Palco** com os Youtubers da sugestão já escolhidos. Em **Regras** mudas os números (máximo, dias, percentagem, votos mínimos, horas entre sugestões), os tipos e os jogos, ou fechas as sugestões novas.

Para ligar: corre outra vez o `supabase/schema.sql` (cria as tabelas `sugestoes` e `sugestao_votos`, fechadas a quem é de fora) e liga a aba **Sugerir** (no painel, em Sugestões, ou em Página pública → Abas).

### Youtubers com vários canais: o que se mede

Em **Editar → Definições → O que se mede** escolhes se medes **o Youtuber** (todos os canais que contam, juntos como se fossem um canal só) ou **só o canal principal**. Em cada Youtuber (Youtubers → Canais do YouTube) podes escolher outra coisa: seguir as Definições, todos juntos, ou um canal específico.

Com todos juntos, as views de cada mês somam-se (são pessoas diferentes a ver). Para ter mais canais não ser uma vantagem por si, no Índice de Influência os subscritores do canal maior contam inteiros e os dos outros canais só 35% (muita gente segue os vários canais da mesma pessoa), e os vídeos publicados nos outros canais contam a metade na Atividade. O perfil explica isto em "Como se calcula o Índice".

### O Caso: karma e reações do público

Na aba **O Caso** do site, quem entra com a conta Google dá karma a cada Youtuber (👍 apoiar ou 👎 "estou farto") e uma reação (❤️ 👏 😂 😮 😡 🤮). Tudo anónimo, e cada pessoa pode mudar de ideias quando quiser.

- O karma vai de -100 a +100. Os votos antigos pesam menos (perdem metade da força em 60 dias) e, com poucos votos, o karma mexe pouco (força total a partir de 20 votos). As reações boas e más contam meio voto.
- **Fica à parte do Índice de Influência.** No painel, em **O Caso**, podes ligar "Juntar o karma ao Índice no site" e escolher quanto pode mexer (10% por defeito, para cima ou para baixo). Antes de guardar vês quem muda de lugar no top 50.
- Mesmo desligado, no Palco podes escolher "Índice com o karma do público" na Revelação do top e na Tier list.
- No painel vês o karma de cada Youtuber (Índice só com os números → com o karma) e podes apagar os votos de alguém se houver uma enxurrada suspeita.

**Notícias do Caso.** No painel, em **O Caso → Notícias**, escreves o que anda a acontecer e escolhes o tema: 📰 Notícia, 🔥 Polémica, 💚 Coisas boas, 🤝 Colaboração, 🏆 Marco, 👀 Rumor, 📅 Evento ou 👋 Pausa ou saída. Cada notícia pode ter texto, a fonte (link), uma imagem, os Youtubers envolvidos e uma pergunta ao público (2 a 4 respostas).

- No site (O Caso → Notícias), o público reage (🔥 🍿 😮 😡 😢 😂 👏 ❤️), responde à pergunta (os resultados só aparecem depois de responder) e dá karma aos Youtubers envolvidos ali mesmo. Cada notícia tem um termómetro de stress (Calmo, Morno, Quente, A ferver), feito com a parte das reações quentes.
- No painel: rascunho, publicar, arquivar, fixar no topo, fechar os votos, editar e apagar, com as reações e as respostas de cada notícia.
- O Início pode mostrar as últimas com o bloco **Notícias do Caso**.

**Notícias nos vídeos (sempre com suspense).** As notícias aparecem do nada, como uma emissão interrompida: interferência e "⚠ Interrompemos o vídeo", alarme e faixa de ÚLTIMA HORA (ou BOAS NOTÍCIAS, MOMENTO HISTÓRICO…, conforme o tema), reticências e o título letra a letra, os Youtubers envolvidos escondidos e revelados um a um, e o que o público diz (o termómetro de stress a subir, as reações e a resposta à pergunta). Depois volta ao vídeo com a mesma interferência.

- **Entre os vídeos:** no Palco, em Cenas do vídeo, junta a cena **🚨 Última hora (O Caso)** e escolhe a notícia. Fica a meio por defeito (podes pô-la antes ou depois). Os votos ficam como estavam quando a escolheste.
- **Vídeo sozinho:** o espetáculo **Última hora (O Caso)**, no grupo O Caso: as últimas 1, 3 ou 5 notícias (ou só de um tema, ou uma só) e, no fim, a notícia mais quente. Em O Caso → Notícias, cada notícia publicada tem o botão **🎬 Fazer vídeo**.

Para ligar: corre outra vez o `supabase/schema.sql` (cria as tabelas `caso_votos` e `noticia_votos`) e liga a aba **O Caso** (no painel, em O Caso, ou em Página pública → Abas).

## Sons e música

Todos os efeitos e músicas são criados no próprio browser (Web Audio), sem ficheiros de terceiros, por isso podes usá-los nos teus vídeos sem problemas de direitos de autor. O botão do altifalante no topo liga e desliga o som.
