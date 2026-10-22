document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM
    // ===================================================================
    const universeTitle = document.getElementById('universe-title');
    const universeSubtitle = document.getElementById('universe-subtitle');
    const pageBackground = document.getElementById('page-background');
    const analyticsContainer = document.getElementById('analytics-container');
    const emptyUniverseMessage = document.getElementById('empty-universe-message');

    // Elementos das estatísticas
    const totalItemsEl = document.getElementById('total-items');
    const watchedItemsEl = document.getElementById('watched-items');
    const totalRuntimeEl = document.getElementById('total-runtime');
    const averageRatingEl = document.getElementById('average-rating');
    const activePeriodEl = document.getElementById('active-period');
    const highestRatedCard = document.getElementById('highest-rated-card');
    const lowestRatedCard = document.getElementById('lowest-rated-card');
    const longestItemCard = document.getElementById('longest-item-card');
    const shortestItemCard = document.getElementById('shortest-item-card');
    const charactersRankingEl = document.getElementById('characters-ranking');
    const tagsRankingEl = document.getElementById('tags-ranking');

    // Contextos dos Gráficos
    const ratingsCtx = document.getElementById('ratings-distribution-chart')?.getContext('2d');
    const typesCtx = document.getElementById('types-breakdown-chart')?.getContext('2d');

    // ===================================================================
    // ESTADO DA APLICAÇÃO
    // ===================================================================
    let universes = [];
    let allContent = [];
    let currentUniverse = null;
    let ratingsChart, typesChart;

    // ===================================================================
    // FUNÇÕES AUXILIARES
    // ===================================================================
    const formatRuntime = (minutes) => {
        if (!minutes || isNaN(minutes) || minutes <= 0) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getRatingColor = (rating) => {
        const r = parseFloat(rating);
        if (r >= 8) return '#4ade80'; // green-400
        if (r >= 6) return '#facc15'; // yellow-400
        if (r >= 4) return '#fb923c'; // orange-400
        if (r > 0) return '#f87171'; // red-400
        return '#6b7280'; // gray-500
    };

    // ===================================================================
    // FUNÇÕES DE CÁLCULO DE ESTATÍSTICAS
    // ===================================================================
    const calculateAnalytics = (timelineContent) => {
        if (!timelineContent || timelineContent.length === 0) return null;

        const allItems = timelineContent.flatMap(item => item.type === 'series' ? (item.episodes || [item]) : item);

        const watchedItems = allItems.filter(item => item.status === 'watched');
        const ratedItems = allItems.filter(item => typeof item.rating === 'number' && item.rating > 0);
        const itemsWithRuntime = allItems.filter(item => typeof item.runtime === 'number' && item.runtime > 0);
        const itemsWithYear = timelineContent.filter(item => item.year && !isNaN(parseInt(item.year)));

        // Estatísticas Gerais
        const totalRuntime = watchedItems.reduce((sum, item) => sum + (item.runtime || 0), 0);
        const averageRating = ratedItems.length > 0
            ? (ratedItems.reduce((sum, item) => sum + item.rating, 0) / ratedItems.length).toFixed(1)
            : '0.0';

        // Período Ativo
        let activePeriod = 'N/A';
        if (itemsWithYear.length > 0) {
            const years = itemsWithYear.map(item => parseInt(item.year));
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            activePeriod = minYear === maxYear ? minYear.toString() : `${minYear} - ${maxYear}`;
        }

        // Melhores e Piores
        const highestRated = ratedItems.length > 0 ? [...ratedItems].sort((a, b) => b.rating - a.rating)[0] : null;
        const lowestRated = ratedItems.length > 0 ? [...ratedItems].sort((a, b) => a.rating - b.rating)[0] : null;
        
        // Mais Longo e Mais Curto
        const longestItem = itemsWithRuntime.length > 0 ? [...itemsWithRuntime].sort((a, b) => b.runtime - a.runtime)[0] : null;
        const shortestItem = itemsWithRuntime.length > 0 ? [...itemsWithRuntime].sort((a, b) => a.runtime - b.runtime)[0] : null;


        // Contagem por Tipo
        const typesCount = timelineContent.reduce((acc, item) => {
            const type = item.type.charAt(0).toUpperCase() + item.type.slice(1);
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // Distribuição de Classificações
        const ratingsDistribution = ratedItems.reduce((acc, item) => {
            const rating = Math.round(item.rating);
            acc[rating] = (acc[rating] || 0) + 1;
            return acc;
        }, {});

        // Rankings
        const charactersCount = allItems.flatMap(i => i.characters || []).reduce((acc, char) => {
            acc[char] = (acc[char] || 0) + 1;
            return acc;
        }, {});
        const charactersRanking = Object.entries(charactersCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

        const tagsCount = allItems.flatMap(i => i.tags || []).reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});
        const tagsRanking = Object.entries(tagsCount).sort((a, b) => b[1] - a[1]).slice(0, 10);


        return {
            totalItems: timelineContent.length,
            watchedCount: watchedItems.length,
            totalRuntime,
            averageRating,
            activePeriod,
            highestRated,
            lowestRated,
            longestItem,
            shortestItem,
            typesCount,
            ratingsDistribution,
            charactersRanking,
            tagsRanking
        };
    };


    // ===================================================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ===================================================================

    const renderRatingCard = (element, data, type) => {
        const icons = {
            best: { icon: 'award', title: 'Melhor Classificação' },
            worst: { icon: 'thumbs-down', title: 'Pior Classificação' },
            longest: { icon: 'hourglass', title: 'Conteúdo Mais Longo' },
            shortest: { icon: 'timer', title: 'Conteúdo Mais Curto' }
        };
        const config = icons[type];

        if (!data) {
            element.innerHTML = `
                <div class="rating-card-content">
                    <div class="rating-card-header"><i data-lucide="${config.icon}"></i><span>${config.title}</span></div>
                    <h4>N/A</h4><p>Sem dados suficientes.</p>
                </div>
                <div class="rating-card-footer"></div>`;
            return;
        }

        element.style.backgroundImage = `url(${data.banner || data.cover || ''})`;
        const value = type === 'best' || type === 'worst' 
            ? `<span>${data.rating.toFixed(1)} <i data-lucide="star" class="inline-block w-6 h-6 -mt-1"></i></span>`
            : `<span>${formatRuntime(data.runtime)}</span>`;

        element.innerHTML = `
            <div class="rating-card-content">
                <div class="rating-card-header"><i data-lucide="${config.icon}"></i><span>${config.title}</span></div>
                <h4>${data.title}</h4>
                <p>${data.year || 'Sem data'}</p>
            </div>
            <div class="rating-card-footer">${value}</div>`;
    };

    const renderRanking = (element, data, unit) => {
        if (data.length === 0) {
            element.innerHTML = '<p class="text-sm text-gray-500">Sem dados para mostrar.</p>';
            return;
        }
        element.innerHTML = data.map(([name, value], index) => `
            <div class="ranking-item">
                <span class="ranking-position">${index + 1}.</span>
                <span class="ranking-name">${name}</span>
                <span class="ranking-value">${value} ${unit}</span>
            </div>
        `).join('');
    };
    
    const renderAnalytics = (stats) => {
        // Cards de Destaque
        totalItemsEl.textContent = stats.totalItems;
        watchedItemsEl.textContent = `${stats.watchedCount} vistos`;
        totalRuntimeEl.textContent = formatRuntime(stats.totalRuntime);
        averageRatingEl.textContent = stats.averageRating;
        activePeriodEl.textContent = stats.activePeriod;

        // Cards de Rating e Duração
        renderRatingCard(highestRatedCard, stats.highestRated, 'best');
        renderRatingCard(lowestRatedCard, stats.lowestRated, 'worst');
        renderRatingCard(longestItemCard, stats.longestItem, 'longest');
        renderRatingCard(shortestItemCard, stats.shortestItem, 'shortest');

        // Rankings
        renderRanking(charactersRankingEl, stats.charactersRanking, 'ap.');
        renderRanking(tagsRankingEl, stats.tagsRanking, 'usos');

        // Gráfico de Distribuição de Classificações
        if (ratingsChart) ratingsChart.destroy();
        const ratingsData = Array.from({ length: 10 }, (_, i) => stats.ratingsDistribution[i + 1] || 0);
        ratingsChart = new Chart(ratingsCtx, {
            type: 'bar',
            data: {
                labels: Array.from({ length: 10 }, (_, i) => i + 1),
                datasets: [{
                    label: 'Nº de Itens',
                    data: ratingsData,
                    backgroundColor: ratingsData.map((_, i) => getRatingColor(i + 1)),
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af', stepSize: 1 } },
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } }
                }
            }
        });

        // Gráfico de Tipos
        if (typesChart) typesChart.destroy();
        typesChart = new Chart(typesCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.typesCount),
                datasets: [{
                    data: Object.values(stats.typesCount),
                    backgroundColor: ['#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#f87171'],
                    borderColor: '#1f2937',
                    borderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#d1d5db', padding: 15, font: { size: 12 } } }
                }
            }
        });

        lucide.createIcons();
    };


    // ===================================================================
    // INICIALIZAÇÃO
    // ===================================================================
    const init = () => {
        const storedUniverses = localStorage.getItem('movieUniverses');
        universes = storedUniverses ? JSON.parse(storedUniverses) : [];
        const storedContent = localStorage.getItem('cineverso_allContent');
        allContent = storedContent ? JSON.parse(storedContent) : [];

        const currentUniverseId = localStorage.getItem('selectedUniverseId');
        
        if (currentUniverseId) {
            currentUniverse = universes.find(u => u.id == currentUniverseId);
        }

        if (currentUniverse) {
            universeTitle.textContent = `Análise: ${currentUniverse.name}`;
            universeSubtitle.textContent = currentUniverse.description;
            
            if (currentUniverse.cover) {
                const backgroundEl = document.getElementById('page-background');
                backgroundEl.style.backgroundImage = `url('${currentUniverse.cover}')`;
                setTimeout(() => backgroundEl.style.opacity = '1', 100);
            }
            
            const timelineContent = currentUniverse.timeline.map(id => allContent.find(c => c.id === id)).filter(Boolean);
            const stats = calculateAnalytics(timelineContent);

            if (stats) {
                renderAnalytics(stats);
                analyticsContainer.classList.remove('opacity-0');
            } else {
                emptyUniverseMessage.classList.remove('hidden');
            }

        } else {
            universeTitle.textContent = 'Universo não encontrado';
            emptyUniverseMessage.classList.remove('hidden');
        }
    };

    init();
});
