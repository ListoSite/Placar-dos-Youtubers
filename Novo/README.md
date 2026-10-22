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
- **Dados antigos**: na primeira vez que o site arranca, carrega `public/data/seed.json`, criado a partir da tua folha de cálculo (330 Youtubers, dezembro 2024 a março 2026).

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

## Primeiros passos depois de publicar

1. Abre o site, carrega no lápis (canto superior direito) e entra com a palavra-passe.
2. **Ligar canais**: carrega em *Procurar automaticamente*. O site experimenta o nome de cada Youtuber da folha como @handle e mostra o canal encontrado para confirmares. Para os que falharem, cola o link do canal ou usa *Procurar pelo nome*.
3. **Youtubers**: junta pessoas com dois canais (por exemplo "Arganaça" e "Arganaça 2"), define o canal principal e marca os canais de clips como "não conta".
4. **Importar dados**: usa o marcador do Social Blade para preencher os meses de agosto 2025 até agora, canal a canal. Também podes colar uma tabela do Excel ou Google Sheets.
5. **Descobrir canais**: procura canais novos e decide quem entra. Os que rejeitas não voltam a aparecer.
6. **Projetos**: cola o link da playlist de uma série. O site vai buscar as views de cada episódio e calcula o impacto face ao normal do canal.

## Meses sem dados (o buraco de agosto 2025 em diante)

Há três formas de os preencher, por esta ordem de facilidade:

1. **Estimativa automática.** Para cada Youtuber com canal ligado, o site lê os vídeos do canal (data e views de hoje) e reparte essas views pelos meses, com uma curva afinada pelos meses que já conhecemos. Corre sozinha (4 Youtubers por hora) ou mais depressa em Editar, Importar dados. Os valores aparecem com ≈ e o erro típico de cada pessoa.
2. **Marcador do Social Blade (todos de uma vez).** Em Editar, Importar dados: arrastas o botão "Placar ⇄ Social Blade" para a barra de marcadores, copias a lista de canais, abres um canal qualquer no socialblade.com e carregas no marcador. Ele percorre todos os canais da lista (com pausas, e pode ser pausado e continuado) e no fim envia os meses para o Placar, onde confirmas antes de gravar. Além das views de cada mês, traz do Social Blade os subscritores ganhos e os vídeos publicados em cada mês, os totais dos últimos 30 dias, as views das últimas 52 semanas e os links das redes sociais (que só entram onde ainda não há link). Rankings, nota e ganhos estimados não são guardados. Cada canal tem um link direto para o Social Blade no perfil e na área de edição. O código do marcador está em `scripts/marcador/sb.src.js`; depois de o alterar, corre `npm run build:marcador`.
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
  public/index.html            página única do site
  public/assets/js/pages/      páginas públicas
  public/assets/js/admin/      área de edição
  public/assets/js/stage/      Palco (espetáculos para vídeo)
  public/assets/js/audio.js    sons e músicas gerados no browser
  public/data/seed.json        dados iniciais da folha de cálculo
  scripts/                     servidor local, testes, conversão da folha
```

## Palco

12 espetáculos em ecrã inteiro, em 16:9 ou 9:16, com 8 temas (Clássico, Verão, Inferno, Gelo, Neon, Galáxia, Gala e Estádio). Cada tema muda as cores, o cenário, as partículas, a música e os sons.

- Rankings: Revelação do top (views, Índice, subscritores ganhos, crescimento, subscritores, views totais), Corrida das views, Tier list, Altos e baixos.
- Jogos: Quem fez mais? (perguntas variadas), Mais ou menos, Adivinha quem é, Roda da sorte. Quem apresenta pode responder com as setas, as teclas ou tocando no ecrã.
- Duelos: Batalha (barras de vida até ao K.O.) e Torneio (8 ou 16 Youtubers, até à final).
- Histórias: Cartão de Youtuber e A história de… (o percurso mês a mês).

Teclas: espaço avança, P pausa, M som, F ecrã inteiro, H esconde os controlos. A velocidade (rápida, normal, lenta) ajusta a duração para TikTok, Reels ou vídeos longos.

## Sons e música

Todos os efeitos e músicas são criados no próprio browser (Web Audio), sem ficheiros de terceiros, por isso podes usá-los nos teus vídeos sem problemas de direitos de autor. O botão do altifalante no topo liga e desliga o som.
