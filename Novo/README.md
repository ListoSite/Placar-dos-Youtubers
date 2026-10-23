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
3. **Youtubers**: junta pessoas com dois canais (por exemplo "Arganaça" e "Arganaça 2"), define o canal principal e marca os canais de clips como "não conta".
4. **Importar dados**: usa o marcador do Social Blade para preencher os meses de agosto 2025 até agora, canal a canal. Também podes colar uma tabela do Excel ou Google Sheets.
5. **Descobrir canais**: procura canais novos e decide quem entra. Os que rejeitas não voltam a aparecer.
6. **Projetos**: cola o link da playlist de uma série. O site vai buscar as views de cada episódio e calcula o impacto face ao normal do canal.

## Meses sem dados (o buraco de agosto 2025 em diante)

Há três formas de os preencher, por esta ordem de facilidade:

1. **Estimativa automática.** Para cada Youtuber com canal ligado, o site lê os vídeos do canal (data e views de hoje) e reparte essas views pelos meses, com uma curva afinada pelos meses que já conhecemos. Corre sozinha (4 Youtubers por hora) ou mais depressa em Editar, Importar dados. Os valores aparecem com ≈ e o erro típico de cada pessoa.
2. **Marcador do Social Blade (todos de uma vez).** Em Editar, Importar dados: arrastas o botão "Placar ⇄ Social Blade" para a barra de marcadores, copias a lista de canais, abres um canal qualquer no socialblade.com e carregas no marcador. Ele percorre todos os canais da lista (com pausas, e pode ser pausado e continuado) e no fim envia os meses para o Placar, onde confirmas antes de gravar. Além das views de cada mês, traz do Social Blade os subscritores ganhos e os vídeos publicados em cada mês, os totais dos últimos 30 dias, as views das últimas 52 semanas e os links das redes sociais (que só entram onde ainda não há link). Rankings, nota e ganhos estimados não são guardados. Cada canal tem um link direto para o Social Blade no perfil e na área de edição. Quando o Youtuber tem TikTok (link no perfil ou nas redes que o Social Blade mostra no canal), o marcador traz também os seguidores, gostos e vídeos do TikTok e os ganhos de cada mês; para um TikTok que não esteja ligado, abre o perfil em socialblade.com/tiktok/user/nome e carrega no marcador. No Placar ficam o link, os números de hoje e do fim de cada um dos últimos 12 meses (nas Outras redes do perfil), um gráfico de seguidores e gostos ganhos por mês, e as medidas "Seguidores no TikTok" no Palco. O TikTok não tem uma API pública gratuita para isto, por isso o Social Blade é a fonte. O código do marcador está em `scripts/marcador/sb.src.js`; depois de o alterar, corre `npm run build:marcador`.
3. **Colar da folha de cálculo.** Para muitos meses de uma vez.

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

19 espetáculos em ecrã inteiro, em 16:9 ou 9:16, com 40 temas.

- Temas de ambiente: Clássico, Verão, Inferno, Gelo, Neon, Galáxia, Gala.
- Temas por categoria: todas as 36 categorias do site têm tema. Os feitos à mão (Futebol, Cozinha, Carros, Gaming, Tech, Comédia, Música) e 25 gerados a partir de cores, um padrão de fundo, ícones e música próprios (YouTube, Clips, Shorts, Vlog, Podcast e Rádio, Negócios, Girly, Escola, Tutorial, Política, Notícias, História, Livros, Cinema, Fitness, Reacts, Casa, Pesca, Animais, Kids, Ciência, Dança, Religião, Motas, Programação). Ao escolher uma categoria (ou um Youtuber), o tema certo é sugerido. Os temas gerados estão em `stage/temas-gerados.js`: para criar outro basta uma linha com cores, padrão e ícones.
- Para direto: Chroma (OBS), com fundo verde para recortar.

Espetáculos:
- Rankings: Revelação do top, Corrida das views, Tier list, Altos e baixos.
- Gráficos: Gráfico de barras (as colunas crescem fora de ordem e ordenam-se sozinhas, com a linha da média), O bolo das categorias (donut fatia a fatia), Bolhas (bolhas com física que mudam de tamanho entre views, subscritores e Índice), Linha a linha (até 7 Youtubers mês a mês, com quem vai na frente) O mês em números (números gigantes, um de cada vez) e O público escolheu (resultados de uma votação do site).
- Jogos: Desafio do Placar (para quem vê o vídeo: escolha múltipla, o intruso, ordenar, verdadeiro ou falso, com pontos), Quem fez mais?, Mais ou menos, Adivinha quem é, Roda da sorte.
- Duelos: Batalha (barras de vida até ao K.O.; no tema Futebol completo é um jogo com marcador, minutos, golos e penáltis) e Torneio (8 ou 16 Youtubers).
- Histórias: Cartão de Youtuber e A história de….

Na página do Palco há um filtro **Para vídeos / Para direto (Twitch)**. Em cada espetáculo:
- **Para**: Vídeo (ritmo automático, lembrete a meio para subscrever) ou Direto (ritmo "Eu avanço", opção Repetir no fim).
- **Youtuber em foco**: o espetáculo corre normalmente e, no início, a meio ou no fim, mostra onde ficou esse Youtuber e os números dele. Sempre que aparece, tem um brilho especial; nos jogos e duelos entra de certeza.
- **Gravar vídeo**: grava o espetáculo em Full HD com som, no próprio browser (Chrome no computador), e no fim mostra o vídeo para descarregar (MP4, ou WebM em browsers mais antigos).
- **Legenda para publicar**: título, legenda e hashtags prontos a copiar.

**Efeitos do tema: Tema completo ou Só cores.** Em "Tema completo", cada tema tem um kit que desenha os momentos dos espetáculos à sua maneira: Futebol (golos com a bola a voar, cartões amarelo e vermelho, apito, bancada a cantar, taça), Coliseu nos temas Inferno e Fitness (espadas, rugido do público, louros, o polegar do imperador), Arcada em Gaming e Neon (HIT, combos, K.O., GAME OVER, recordes), Reações em Reacts, Comédia, Shorts e Clips (emojis e comentários de direto), Fofo em Girly e Kids (corações, laços, tiara), Viagem em Vlog e Verão (polaroids, pins, carimbos de passaporte, aviões), Natureza em Pesca e Animais, Notícias em Notícias, Política e Negócios (rótulos de televisão, última hora, verificação Verdadeiro/Falso, primeira página do jornal), Pista em Carros e Motas (semáforos, ultrapassagens, nitro, bandeira de xadrez), Espetáculo em Música, Dança, Gala e Cinema (holofotes, aplausos, rosas, estatueta), Laboratório em Tech, Programação, Ciência, Galáxia e Gelo (scanner, lasers, hologramas), Livro em Livros, História, Escola, Tutorial e Religião (caneta vermelha, selos, diploma), Cozinha em Cozinha e Casa (estrelas de chef, picante, chapéu) e Estúdio nos outros (gostos, sininho, placa de ouro). Os espetáculos só dizem o que aconteceu (`palco.evento("golpe", …)`) e o kit decide como aparece e soa: está tudo em `stage/kits.js`.

**Cenas próprias dos 10 temas principais.** Em "Tema completo", os temas Futebol, Carros, Cozinha, Girly, Inferno, YouTube, Gaming, Comédia, Vlog e Tech também têm a abertura, os cartões da Revelação e a arena da Batalha desenhados de raiz: placar luminoso, cartas de jogador e um jogo com golos (Futebol); semáforos de partida, conta-rotações e uma corrida em duas pistas (Carros); quadro de giz, a campânula que levanta e um duelo de jurados (Cozinha); capa de revista e um duelo de corações (Girly); título em chamas, seleção de lutador e combate com cronómetro e K.O. (Inferno); leitor de vídeo, miniaturas e uma batalha de tendências (YouTube); PRESS START, cartas de raridade e um combate de píxeis P1 contra P2 (Gaming); banda desenhada com balões e POW (Comédia); câmara a gravar, stories e dois telemóveis (Vlog); terminal, ficha técnica e um benchmark (Tech). Nas arenas "de progresso" ganha quem chega primeiro aos 100 (metros, corações, gostos…). Está tudo em `stage/cenas.js` e `css/cenas.css`.

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

Para ligar: corre outra vez o `supabase/schema.sql` (cria as tabelas `caso_votos` e `noticia_votos`) e liga a aba **O Caso** (no painel, em O Caso, ou em Página pública → Abas).

## Sons e música

Todos os efeitos e músicas são criados no próprio browser (Web Audio), sem ficheiros de terceiros, por isso podes usá-los nos teus vídeos sem problemas de direitos de autor. O botão do altifalante no topo liga e desliga o som.
