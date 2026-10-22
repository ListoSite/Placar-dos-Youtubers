// batalha.js - Lógica para a Batalha de Youtubers (Versão 1.4 - Controlo Manual)

document.addEventListener('DOMContentLoaded', () => {
    // --- Seleção dos Elementos do DOM ---
    const battleSection = document.getElementById('section-batalha');
    
    // --- Variáveis Globais ---
    let allProfiles = [];
    let battleHistory = {};
    // Objeto para guardar o estado da batalha atual
    let battleState = {};

    // --- Funções Auxiliares ---
    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    // --- Funções Principais ---

    function initializeBattlePage() {
        battleSection.innerHTML = `
            <div class="battle-container">
                <div class="battle-intro-container">
                    <h2>Batalha de Youtubers</h2>
                    <p>Clique no botão para sortear dois Youtubers e iniciar uma batalha épica de estatísticas!</p>
                    <button id="start-battle-btn" class="action-button"><i class="fas fa-random"></i> Iniciar Batalha</button>
                </div>
                <div class="battle-arena-container"></div>
                <div class="battle-results-container"></div>
            </div>
        `;
        const newStartBtn = document.getElementById('start-battle-btn');
        newStartBtn.addEventListener('click', startBattle);
        
        allProfiles = window.getData();
        battleHistory = window.getBattleHistory ? window.getBattleHistory() : {};
    }

    function startBattle() {
        if (allProfiles.length < 2) {
            alert("São necessários pelo menos 2 perfis para iniciar uma batalha.");
            return;
        }

        let youtuber1, youtuber2;
        do {
            youtuber1 = allProfiles[Math.floor(Math.random() * allProfiles.length)];
            youtuber2 = allProfiles[Math.floor(Math.random() * allProfiles.length)];
        } while (youtuber1.id === youtuber2.id);

        document.querySelector('.battle-intro-container').style.display = 'none';
        document.querySelector('.battle-results-container').style.display = 'none';
        
        const arena = document.querySelector('.battle-arena-container');
        arena.style.display = 'block';
        arena.innerHTML = '';

        runBattleSetup(youtuber1, youtuber2);
    }

    /**
     * Prepara a arena e o estado da batalha, e inicia a primeira comparação.
     */
    async function runBattleSetup(p1, p2) {
        const arena = document.querySelector('.battle-arena-container');
        const battleKey = [p1.id, p2.id].sort().join('_vs_');
        const historyData = battleHistory[battleKey];
        const historyScore = historyData ? `(Histórico: ${historyData.p1} - ${historyData.p2})` : '(Primeiro Encontro)';

        arena.innerHTML = `
            <div class="battle-header">
                <h2>
                    <span class="youtuber-name-1">${p1.name}</span>
                    <span class="versus-text">VS</span>
                    <span class="youtuber-name-2">${p2.name}</span>
                </h2>
                <p class="battle-history-score">${historyScore}</p>
            </div>
            <div class="battle-cards-grid">
                <div class="battle-card" id="card-p1"></div>
                <div class="battle-score-display">
                    <span id="score-p1">0</span> - <span id="score-p2">0</span>
                </div>
                <div class="battle-card" id="card-p2"></div>
            </div>
            <div class="battle-comparison-rows"></div>
            <div class="battle-controls-container"></div>
        `;

        const cardP1 = document.getElementById('card-p1');
        const cardP2 = document.getElementById('card-p2');
        cardP1.innerHTML = getCardHTML(p1);
        cardP2.innerHTML = getCardHTML(p2);
        
        await animateElement(cardP1.querySelector('.battle-card-header'), 'slideInUp');
        await animateElement(cardP2.querySelector('.battle-card-header'), 'slideInUp');
        
        // Inicializa o estado da batalha
        battleState = {
            categories: getComparisonCategories(p1, p2),
            currentIndex: 0,
            p1: p1,
            p2: p2,
            scoreP1: 0,
            scoreP2: 0,
            battleKey: battleKey
        };

        // Inicia a primeira comparação
        await delay(500);
        processNextComparison();
    }

    /**
     * Processa uma ronda da batalha (uma categoria) e prepara o botão para a próxima.
     */
    async function processNextComparison() {
        const controlsContainer = document.querySelector('.battle-controls-container');
        if (controlsContainer) controlsContainer.innerHTML = ''; // Limpa o botão anterior

        // Verifica se a batalha terminou
        if (battleState.currentIndex >= battleState.categories.length) {
            await delay(1000);
            showFinalResult();
            return;
        }

        const cat = battleState.categories[battleState.currentIndex];
        const result = compareStats(cat.value1, cat.value2, cat.higherIsBetter);

        if (result.winner !== 'tie') {
            if (result.winner === 'p1') battleState.scoreP1 += result.points;
            if (result.winner === 'p2') battleState.scoreP2 += result.points;
            updateScores(battleState.scoreP1, battleState.scoreP2, result.winner);
        }

        const row = createComparisonRow(cat, result);
        document.querySelector('.battle-comparison-rows').appendChild(row);
        await animateElement(row, 'popIn');
        
        battleState.currentIndex++;

        // Verifica se ainda há categorias para mostrar
        if (battleState.currentIndex < battleState.categories.length) {
            if (controlsContainer) {
                controlsContainer.innerHTML = `<button id="battle-next-btn" class="action-button secondary"><i class="fas fa-arrow-right"></i> Próxima Categoria</button>`;
                document.getElementById('battle-next-btn').addEventListener('click', processNextComparison);
            }
        } else {
            // Se foi a última categoria, mostra o resultado final automaticamente
            await delay(1500);
            showFinalResult();
        }
    }
    
    function showFinalResult() {
        const { p1, p2, scoreP1, scoreP2, battleKey } = battleState;
        const arena = document.querySelector('.battle-arena-container');
        const results = document.querySelector('.battle-results-container');
        arena.style.display = 'none';
        results.style.display = 'block';

        let winnerName = (scoreP1 > scoreP2) ? p1.name : (scoreP2 > scoreP1) ? p2.name : "Empate";

        results.innerHTML = `
            <div class="winner-announcement">
                <h2>${winnerName !== "Empate" ? `O Vencedor é... <span class="winner-name">${winnerName}</span>` : 'A Batalha Terminou em Empate!'}</h2>
                <h3>Placar Final: ${scoreP1} - ${scoreP2}</h3>
            </div>
            <button id="play-again-btn" class="action-button"><i class="fas fa-redo"></i> Jogar Novamente</button>
        `;
        document.getElementById('play-again-btn').addEventListener('click', startBattle);

        battleHistory[battleKey] = { p1: scoreP1, p2: scoreP2 };
        if (window.saveBattleHistory) {
            window.saveBattleHistory(battleHistory);
        }
    }

    function compareStats(val1, val2, higherIsBetter = true) {
        const num1 = Number(val1) || 0;
        const num2 = Number(val2) || 0;
        if (num1 === num2) return { winner: 'tie', points: 0 };
        let p1Wins = higherIsBetter ? num1 > num2 : (num1 > 0 && (num1 < num2 || num2 === 0));
        const difference = Math.abs(num1 - num2);
        const average = (num1 + num2) / 2;
        const points = (average > 0 && (difference / average) > 0.5) ? 2 : 1;
        return { winner: p1Wins ? 'p1' : 'p2', points };
    }
    
    function getComparisonCategories(p1, p2) {
        const categories = [
            { label: 'Rank Geral', value1: p1.rank, value2: p2.rank, higherIsBetter: false },
            { label: 'Views do Mês', value1: parseViews(p1.stats.views), value2: parseViews(p2.stats.views) },
            { label: 'Pontos', value1: p1.stats.points, value2: p2.stats.points },
            { label: 'Subscritores (YT)', value1: p1.socials?.youtube?.subs, value2: p2.socials?.youtube?.subs },
            { label: 'Total de Vídeos (YT)', value1: p1.socials?.youtube?.totalVideos, value2: p2.socials?.youtube?.totalVideos },
            { label: 'Seguidores (Insta)', value1: p1.socials?.instagram?.followers, value2: p2.socials?.instagram?.followers },
            { label: 'Seguidores (TikTok)', value1: p1.socials?.tiktok?.followers, value2: p2.socials?.tiktok?.followers },
            { label: 'Nº de Projetos', value1: p1.projects?.length, value2: p2.projects?.length },
        ];
        return categories.filter(c => (c.value1 !== undefined && c.value1 !== null && c.value1 !== 0) || (c.value2 !== undefined && c.value2 !== null && c.value2 !== 0));
    }

    function getCardHTML(p) {
        return `
            <div class="battle-card-header">
                <img src="${p.photo}" alt="${p.name}" class="battle-card-photo" onerror="this.src='https://placehold.co/150x150/400414/a0a0a0?text=Foto'">
                <h3 class="battle-card-name">${p.name}</h3>
                <p class="battle-card-content-type">${p.contentType}</p>
            </div>
        `;
    }
    
    function createComparisonRow(category, result) {
        const row = document.createElement('div');
        const winner = result.winner;
        row.className = `comparison-row winner-${winner}`;
        const crownIcon = `<i class="fas fa-crown winner-icon"></i>`;
        const p1Content = `${formatStat(category.value1)} ${winner === 'p1' ? crownIcon : ''}`;
        const p2Content = `${winner === 'p2' ? crownIcon : ''} ${formatStat(category.value2)}`;
        row.innerHTML = `
            <span class="stat-value stat-value-left">${p1Content}</span>
            <span class="stat-label">${category.label}</span>
            <span class="stat-value stat-value-right">${p2Content}</span>
        `;
        return row;
    }
    
    function formatStat(value) {
        if (value === undefined || value === null) return '-';
        return Number(value).toLocaleString('pt-PT');
    }

    function updateScores(scoreP1, scoreP2, winner) {
        const scoreP1El = document.getElementById('score-p1');
        const scoreP2El = document.getElementById('score-p2');
        if (scoreP1El.textContent !== String(scoreP1) && winner === 'p1') {
            scoreP1El.textContent = scoreP1;
            scoreP1El.classList.add('score-update');
        }
        if (scoreP2El.textContent !== String(scoreP2) && winner === 'p2') {
            scoreP2El.textContent = scoreP2;
            scoreP2El.classList.add('score-update');
        }
        setTimeout(() => {
            scoreP1El.classList.remove('score-update');
            scoreP2El.classList.remove('score-update');
        }, 600);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function animateElement(el, animationName, duration = 500) {
        return new Promise(resolve => {
            el.style.animation = `${animationName} ${duration}ms ease-out forwards`;
            setTimeout(resolve, duration);
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = battleSection.style.display !== 'none';
                if (isVisible) {
                    initializeBattlePage();
                    observer.disconnect();
                }
            }
        }
    });

    if (battleSection) observer.observe(battleSection, { attributes: true });
});
