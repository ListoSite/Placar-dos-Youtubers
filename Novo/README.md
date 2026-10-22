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

## Sons e música

Todos os efeitos e músicas são criados no próprio browser (Web Audio), sem ficheiros de terceiros, por isso podes usá-los nos teus vídeos sem problemas de direitos de autor. O botão do altifalante no topo liga e desliga o som.
