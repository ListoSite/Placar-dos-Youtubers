document.addEventListener('DOMContentLoaded', () => {
    console.log("Script do Início v2.0 - Sincronizado com Data Manager.");
    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (PRINCIPAL E ABAS)
    // ===================================================================
    const tabsNavigation = document.querySelector('.tabs-navigation');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabLinks = document.querySelectorAll('.tab-link');

    const subTabsNavigation = document.querySelector('.sub-tabs-navigation');
    const subTabLinks = document.querySelectorAll('.sub-tab-link');
    const subTabContents = document.querySelectorAll('.sub-tab-content');

    const dashboardContainer = document.getElementById('dashboard-container');
    const emptyDashboardMessage = document.getElementById('empty-dashboard-message');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importMergeBtn = document.getElementById('import-merge-btn');
    const deleteAllDataBtn = document.getElementById('delete-all-data-btn');

    // Elementos para a navegação móvel
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    
    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (ANÁLISE PESSOAL)
    // ===================================================================
    const upNextCard = document.getElementById('up-next-card');
    const upNextContent = document.getElementById('up-next-content');
    const totalWatchedStat = document.getElementById('total-watched-stat');
    const totalRuntimeStat = document.getElementById('total-runtime-stat');
    const averageRatingStat = document.getElementById('average-rating-stat');
    const favoriteUniverseStat = document.getElementById('favorite-universe-stat');
    const activityChartCanvas = document.getElementById('activity-chart');
    const topRatedList = document.getElementById('top-rated-list');
    const typeDistributionChartCanvas = document.getElementById('type-distribution-chart');
    const decadeChartCanvas = document.getElementById('decade-chart');
    const achievementsContainer = document.getElementById('achievements-container');
    const recentActivityList = document.getElementById('recent-activity-list');
    const onThisDayList = document.getElementById('on-this-day-list');
    const weeklyPaceChartCanvas = document.getElementById('weekly-pace-chart');
    const ratingDistributionChartCanvas = document.getElementById('rating-distribution-chart');
    const runtimeDistributionChartCanvas = document.getElementById('runtime-distribution-chart');
    
    const highlightsContainer = document.getElementById('highlights-container');
    
    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (ANÁLISE GERAL)
    // ===================================================================
    const topCharactersMoviesList = document.getElementById('top-characters-movies-list');
    const topCharactersSeriesList = document.getElementById('top-characters-series-list');
    const topUniversesList = document.getElementById('top-universes-list');
    const generalContentStats = document.getElementById('general-content-stats');
    const topTagsList = document.getElementById('top-tags-list');
    const movieVsSeriesStats = document.getElementById('movie-vs-series-stats');
    const topRatedUniverseCard = document.getElementById('top-rated-universe-card');
    const longestUniverseCard = document.getElementById('longest-universe-card');

    // Elementos para notificação de conquistas
    const achievementToast = document.getElementById('achievement-toast');
    const newAchievementsCount = document.getElementById('new-achievements-count');
    const achievementToastIcon = document.getElementById('achievement-toast-icon');
    const achievementToastTitle = document.getElementById('achievement-toast-title');
    const achievementToastDesc = document.getElementById('achievement-toast-desc');
    const achievementToastClose = document.getElementById('achievement-toast-close');
    const achievementsTabIndicator = document.querySelector('.nav-link[href="Cineverso.html"] .notification-dot');

    let activityChart, typeDistributionChart, decadeChart, weeklyPaceChart, ratingDistributionChart, runtimeDistributionChart;
    let highlightsInterval = null;

    // ===================================================================
    // DEFINIÇÃO DAS CONQUISTAS
    // ===================================================================
    const achievements = {
        // --- TIER BRONZE ---
        WATCH_1: { title: "Primeira Sessão", desc: "Ver o teu primeiro conteúdo.", icon: "clapperboard", tier: "bronze", condition: (s) => ({ current: s.totalWatched, target: 1 }) },
        WATCH_10: { title: "Hábito Formado", desc: "Ver 10 conteúdos.", icon: "film", tier: "bronze", condition: (s) => ({ current: s.totalWatched, target: 10 }) },
        RATE_1: { title: "A Minha Opinião", desc: "Avaliar o teu primeiro conteúdo.", icon: "star-half", tier: "bronze", condition: (s) => ({ current: s.totalRated, target: 1 }) },
        RATE_10: { title: "Crítico Bronze", desc: "Avaliar 10 conteúdos.", icon: "pen-line", tier: "bronze", condition: (s) => ({ current: s.totalRated, target: 10 }) },
        RUNTIME_12H: { title: "Meio Dia de Cinema", desc: "Acumular 12 horas de tempo de ecrã.", icon: "clock-3", tier: "bronze", condition: (s) => ({ current: s.totalRuntime, target: 720 }) },
        PLAYLIST_1: { title: "O Curador", desc: "Criar a tua primeira playlist.", icon: "list-plus", tier: "bronze", condition: (s) => ({ current: s.totalPlaylists, target: 1 }) },
        UNIVERSE_1: { title: "Explorador de Mundos", desc: "Ver um item de um universo.", icon: "swords", tier: "bronze", condition: (s) => ({ current: s.universesWatched.size, target: 1 }) },
        REWATCH_1: { title: "Vale a Pena Rever", desc: "Ver novamente um conteúdo.", icon: "repeat", tier: "bronze", condition: (s) => ({ current: s.totalRewatchedItems, target: 1 }) },
        TIME_TRAVELER_2000S: { title: "Memórias Recentes", desc: "Ver um conteúdo lançado nos anos 2000.", icon: "glasses", tier: "bronze", condition: (s) => s.decades.has("2000s") },
        TIME_TRAVELER_90S: { title: "Anos 90", desc: "Ver um conteúdo lançado nos anos 90.", icon: "rewind", tier: "bronze", condition: (s) => s.decades.has("1990s") },
        SHORT_FILM_FAN_1: { title: "Curta e Grossa", desc: "Ver a tua primeira curta-metragem.", icon: "scissors", tier: "bronze", condition: (s) => s.typeCounts['Short'] >= 1 },
        ADD_CHARACTER: { title: "Quem é Quem?", desc: "Adicionar a primeira personagem a um conteúdo.", icon: "user-plus", tier: "bronze", condition: (s) => s.totalCharacters > 0 },
        ADD_TAG: { title: "Etiquetado", desc: "Adicionar a primeira tag a um conteúdo.", icon: "tag", tier: "bronze", condition: (s) => s.totalTags > 0 },
        COMMENT_1: { title: "Páginas Amarelas", desc: "Escrever o teu primeiro comentário.", icon: "message-square", tier: "bronze", condition: (s) => ({ current: s.totalComments, target: 1 }) },
        WANT_TO_WATCH_1: { title: "Na Lista de Espera", desc: "Adicionar o primeiro item à lista 'Quero Ver'.", icon: "bookmark", tier: "bronze", condition: (s) => s.wantToWatchCount >= 1},
        DOUBLE_FEATURE: { title: "Sessão Dupla", desc: "Ver 2 filmes no mesmo dia.", icon: "ticket", tier: "bronze", condition: (s) => s.maxMoviesInDay >= 2},
        VARIETY_3: { title: "Multifacetado", desc: "Ver 3 tipos de conteúdo diferentes.", icon: "layers-3", tier: "bronze", condition: (s) => ({ current: s.typesWatched.size, target: 3 }) },

        // --- TIER PRATA ---
        WATCH_25: { title: "Colecionador", desc: "Ver 25 conteúdos diferentes.", icon: "archive", tier: "prata", condition: (s) => ({ current: s.totalWatched, target: 25 }) },
        WATCH_50: { title: "Cine-Dependente", desc: "Ver 50 conteúdos diferentes.", icon: "archive-restore", tier: "prata", condition: (s) => ({ current: s.totalWatched, target: 50 }) },
        RATE_25: { title: "Crítico de Cinema", desc: "Avaliar 25 conteúdos.", icon: "pen-tool", tier: "prata", condition: (s) => ({ current: s.totalRated, target: 25 }) },
        RATE_50: { title: "Crítico Prata", desc: "Avaliar 50 conteúdos.", icon: "file-pen-line", tier: "prata", condition: (s) => ({ current: s.totalRated, target: 50 }) },
        RUNTIME_24H: { title: "Resistência Cinéfila", desc: "Acumular 24 horas de tempo de ecrã.", icon: "hourglass", tier: "prata", condition: (s) => ({ current: s.totalRuntime, target: 1440 }) },
        RUNTIME_3D: { title: "Fim de Semana Longo", desc: "Acumular 3 dias de tempo de ecrã.", icon: "calendar-days", tier: "prata", condition: (s) => ({ current: s.totalRuntime, target: 4320 }) },
        BINGE_3: { title: "Maratonista Amador", desc: "Ver 3 conteúdos num só dia.", icon: "zap", tier: "prata", condition: (s) => s.bingeRecord >= 3 },
        DECADE_HOPPER_5: { title: "Saltador de Décadas", desc: "Ver conteúdos de 5 décadas diferentes.", icon: "album", tier: "prata", condition: (s) => ({ current: s.decades.size, target: 5 }) },
        PERFECT_10: { title: "Obra-Prima", desc: "Dar uma classificação de 10 a um conteúdo.", icon: "award", tier: "prata", condition: (s) => s.hasPerfect10 },
        SERIES_FINISHER_1: { title: "Até ao Fim", desc: "Completar uma série.", icon: "tv", tier: "prata", condition: (s) => ({ current: s.completedSeriesCount, target: 1 }) },
        TIME_TRAVELER_80S: { title: "Febre dos Anos 80", desc: "Ver um conteúdo lançado nos anos 80.", icon: "disc-3", tier: "prata", condition: (s) => s.decades.has("1980s") },
        MOVIE_NIGHT: { title: "Noite de Cinema", desc: "Ver 3 filmes no mesmo dia.", icon: "popcorn", tier: "prata", condition: (s) => s.maxMoviesInDay >= 3},
        UNIVERSE_FAN_5: { title: "Fã do Universo", desc: "Ver 5 conteúdos do mesmo universo.", icon: "shield", tier: "prata", condition: (s) => s.maxItemsInUniverse >= 5 },
        RATING_DIVERSITY: { title: "Crítico Versátil", desc: "Dar uma nota de 1 a 5 e outra de 6 a 10.", icon: "bar-chart-2", tier: "prata", condition: (s) => s.hasLowRating && s.hasHighRating },
        PLAYLIST_5: { title: "DJ de Filmes", desc: "Criar 5 playlists.", icon: "list-music", tier: "prata", condition: (s) => ({ current: s.totalPlaylists, target: 5 }) },
        COMMENT_10: { title: "Comentador", desc: "Escrever 10 comentários.", icon: "message-circle", tier: "prata", condition: (s) => ({ current: s.totalComments, target: 10 }) },

        // --- TIER OURO ---
        WATCH_100: { title: "Lenda do Sofá", desc: "Ver 100 conteúdos. Incrível!", icon: "gem", tier: "ouro", condition: (s) => ({ current: s.totalWatched, target: 100 }) },
        WATCH_250: { title: "Imparável", desc: "Ver 250 conteúdos.", icon: "trophy", tier: "ouro", condition: (s) => ({ current: s.totalWatched, target: 250 }) },
        RATE_100: { title: "Crítico Consagrado", desc: "Avaliar 100 conteúdos.", icon: "book-open", tier: "ouro", condition: (s) => ({ current: s.totalRated, target: 100 }) },
        RUNTIME_7D: { title: "Uma Semana de Cinema", desc: "Acumular 7 dias de tempo de ecrã.", icon: "calendar-clock", tier: "ouro", condition: (s) => ({ current: s.totalRuntime, target: 10080 }) },
        RUNTIME_15D: { title: "Meio Mês de Ecrã", desc: "Acumular 15 dias de tempo de ecrã.", icon: "timer", tier: "ouro", condition: (s) => ({ current: s.totalRuntime, target: 21600 }) },
        UNIVERSE_SAGE_15: { title: "Sábio do Universo", desc: "Ver 15 conteúdos do mesmo universo.", icon: "shield-check", tier: "ouro", condition: (s) => s.maxItemsInUniverse >= 15 },
        VARIETY_MASTER_5: { title: "Mestre da Variedade", desc: "Ver 5 tipos de conteúdo diferentes.", icon: "library", tier: "ouro", condition: (s) => ({ current: s.typesWatched.size, target: 5 }) },
        LOYAL_FAN_5: { title: "Fã Leal", desc: "Ver um conteúdo 5 ou mais vezes.", icon: "heart", tier: "ouro", condition: (s) => s.maxRewatches >= 5 },
        CENTURY_VIEWER: { title: "Historiador", desc: "Ver um conteúdo com mais de 50 anos.", icon: "landmark", tier: "ouro", condition: (s) => s.oldestItemYear <= new Date().getFullYear() - 50 },
        BINGE_5: { title: "Maratonista Profissional", desc: "Ver 5 conteúdos num só dia.", icon: "activity", tier: "ouro", condition: (s) => s.bingeRecord >= 5 },
        DECADE_MASTER_8: { title: "Viajante Temporal", desc: "Ver conteúdos de 8 décadas diferentes.", icon: "gauge-circle", tier: "ouro", condition: (s) => ({ current: s.decades.size, target: 8 }) },
        SERIES_FINISHER_10: { title: "Viciado em Séries", desc: "Completar 10 séries.", icon: "list-video", tier: "ouro", condition: (s) => ({ current: s.completedSeriesCount, target: 10 }) },
        EPIC_SAGA: { title: "Saga Épica", desc: "Completar uma série com mais de 50 episódios.", icon: "scroll-text", tier: "ouro", condition: (s) => s.completedLongSeries },
        UNIVERSE_COMPLETIONIST: { title: "Completionist", desc: "Ver todos os itens de um universo.", icon: "sparkles", tier: "ouro", condition: (s) => ({ current: s.completedUniverses, target: 1 }) },
        
        // --- TIER PLATINA ---
        WATCH_500: { title: "Mestre do Cineverso", desc: "Ver 500 conteúdos.", icon: "crown", tier: "platina", condition: (s) => ({ current: s.totalWatched, target: 500 }) },
        WATCH_1000: { title: "Arquivista Divino", desc: "Ver 1000 conteúdos.", icon: "database-zap", tier: "platina", condition: (s) => ({ current: s.totalWatched, target: 1000 }) },
        RATE_250: { title: "O Oráculo", desc: "Avaliar 250 conteúdos.", icon: "file-check-2", tier: "platina", condition: (s) => ({ current: s.totalRated, target: 250 }) },
        RUNTIME_30D: { title: "Um Mês de Pura Magia", desc: "Acumular 30 dias de tempo de ecrã.", icon: "rocket", tier: "platina", condition: (s) => ({ current: s.totalRuntime, target: 43200 }) },
        RUNTIME_100D: { title: "A Viver no Ecrã", desc: "Acumular 100 dias de tempo de ecrã.", icon: "orbit", tier: "platina", condition: (s) => ({ current: s.totalRuntime, target: 144000 }) },
        UNIVERSE_GOD_50: { title: "Entidade Cósmica", desc: "Ver 50 conteúdos do mesmo universo.", icon: "atom", tier: "platina", condition: (s) => s.maxItemsInUniverse >= 50 },
        BINGE_GOD_10: { title: "Deus da Maratona", desc: "Ver 10 itens num só dia.", icon: "wind", tier: "platina", condition: (s) => s.bingeRecord >= 10 },
        SERIES_ADDICT_25: { title: "Devorador de Séries", desc: "Completar 25 séries.", icon: "book-copy", tier: "platina", condition: (s) => ({ current: s.completedSeriesCount, target: 25 }) },
        TIME_LORD: { title: "Senhor do Tempo", desc: "Ver um conteúdo de antes de 1960.", icon: "binary", tier: "platina", condition: (s) => s.oldestItemYear < 1960 },
        THE_CINEPHILE: { title: "O Cinéfilo Supremo", desc: "Desbloquear todas as outras conquistas.", icon: "infinity", tier: "platina", condition: (s) => s.allOtherAchievementsUnlocked }
    };

    // ===================================================================
    // LÓGICA DE NAVEGAÇÃO
    // ===================================================================
    const setupTabs = () => { if(!tabsNavigation) return; tabsNavigation.addEventListener('click', (e) => { const clickedTab = e.target.closest('.tab-link'); if (!clickedTab) return; const tabId = clickedTab.dataset.tab; tabLinks.forEach(link => link.classList.remove('active')); clickedTab.classList.add('active'); tabContents.forEach(content => { content.classList.toggle('active', content.id === `${tabId}-section`); }); }); };
    const setupSubTabs = () => { if(!subTabsNavigation) return; subTabsNavigation.addEventListener('click', (e) => { const clickedSubTab = e.target.closest('.sub-tab-link'); if (!clickedSubTab) return; const subTabId = clickedSubTab.dataset.subTab; subTabLinks.forEach(link => link.classList.remove('active')); clickedSubTab.classList.add('active'); subTabContents.forEach(content => { content.classList.toggle('active', content.id === `${subTabId}-analytics-content`); }); }); };

    // Lógica para o menu móvel
    const toggleSidebar = () => {
        sidebar.classList.toggle('is-open');
        sidebarOverlay.classList.toggle('is-visible');
    };

    if (mobileMenuButton && sidebar && sidebarOverlay) {
        mobileMenuButton.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // ===================================================================
    // FUNÇÕES AUXILIARES
    // ===================================================================
    const formatRuntime = (minutes) => { if (!minutes || isNaN(minutes) || minutes <= 0) return '0m'; const days = Math.floor(minutes / (60 * 24)); const hours = Math.floor((minutes % (60*24)) / 60); const mins = minutes % 60; let result = ''; if (days > 0) result += `${days}d `; if (hours > 0) result += `${hours}h `; if (mins > 0 || (days === 0 && hours === 0)) result += `${mins}m`; return result.trim(); };
    const formatTimestamp = (timestamp) => { if (!timestamp) return ''; const date = new Date(timestamp); return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }); };
    const calculateSeriesTotalRuntime = (series) => { if (!series || series.type !== 'series' || !series.episodes) return 0; return series.episodes.reduce((sum, ep) => sum + (ep.runtime || 0), 0); };
    const calculateSeriesAverageRating = (series) => { if (!series || series.type !== 'series' || !series.episodes) return null; const ratedEpisodes = series.episodes.filter(ep => typeof ep.rating === 'number'); if (ratedEpisodes.length === 0) return null; const totalRating = ratedEpisodes.reduce((sum, ep) => sum + ep.rating, 0); return totalRating / ratedEpisodes.length; };

    // ===================================================================
    // CÁLCULO GERAL DAS ESTATÍSTICAS
    // ===================================================================
    const calculateGlobalAnalytics = (allContent, allUniverses, allPlaylists) => {
        const allWatchedItems = allContent.filter(item => item.status === 'watched' && item.watchedDates && item.watchedDates.length > 0);
        const allWatchedItemsIDs = new Set(allWatchedItems.map(i => i.id));

        const baseStats = {
            totalContent: allContent.length,
            wantToWatchCount: allContent.filter(i => i.status === 'want_to_watch').length,
            totalPlaylists: allPlaylists.length,
            totalRated: 0, totalWatched: 0, personalUniverseCounts: {}, totalRewatchedItems: 0, 
            decades: new Set(), typeCounts: {}, typesWatched: new Set(),
            totalCharacters: [...new Set(allContent.flatMap(i => i.characters || []))].length,
            totalTags: [...new Set(allContent.flatMap(i => i.tags || []))].length,
            totalComments: allContent.filter(i => i.comment && i.comment.trim() !== '').length,
            universesWatched: new Set()
        };
        
        if (allWatchedItems.length === 0) {
            return {
                ...baseStats,
                hasPerfect10: false, oldestItemYear: 9999, completedSeriesCount: 0, maxRewatches: 0, maxItemsInUniverse: 0, bingeRecord: 0, 
                hasLowRating: false, hasHighRating: false, allOtherAchievementsUnlocked: false, completedLongSeries: false, completedUniverses: 0,
                isDataAvailable: false
            };
        }

        const allRatedItems = allContent.filter(item => typeof item.rating === 'number' && item.rating > 0);
        const allRatedSeries = allContent.filter(item => item.type === 'series' && calculateSeriesAverageRating(item) !== null);
        const allRatedContent = [...allRatedItems, ...allRatedSeries];
        const allWatchedEvents = allWatchedItems.flatMap(item => item.watchedDates.map(date => ({ item, date }))).sort((a,b) => a.date - b.date);
        const today = new Date();

        const totalWatched = allWatchedItems.length;
        const totalRuntime = allWatchedItems.reduce((sum, item) => sum + (item.type === 'series' ? calculateSeriesTotalRuntime(item) : (item.runtime || 0)), 0);
        const totalRatingSum = allRatedContent.reduce((sum, item) => { const rating = item.type === 'series' ? calculateSeriesAverageRating(item) : item.rating; return sum + (rating || 0); }, 0);
        const averageRating = allRatedContent.length > 0 ? (totalRatingSum / allRatedContent.length).toFixed(1) : 'N/A';
        const personalUniverseCounts = allWatchedItems.reduce((acc, item) => { if (item.universe) acc[item.universe] = (acc[item.universe] || 0) + 1; return acc; }, {});
        const favoriteUniverse = Object.keys(personalUniverseCounts).length > 0 ? Object.entries(personalUniverseCounts).sort((a,b) => b[1] - a[1])[0] : ['N/A', 0];
        const firstWatched = allWatchedEvents[0];
        const longestSeries = allContent.filter(i => i.type === 'series').sort((a,b) => calculateSeriesTotalRuntime(b) - calculateSeriesTotalRuntime(a))[0] || null;
        const rewatchedItems = allWatchedItems.filter(item => item.watchedDates.length > 1).sort((a, b) => b.watchedDates.length - a.watchedDates.length);
        const mostRewatched = rewatchedItems.length > 0 ? { item: rewatchedItems[0], count: rewatchedItems[0].watchedDates.length } : null;
        
        const watchedEventsByDay = allWatchedEvents.reduce((acc, event) => { const dateStr = new Date(event.date).toDateString(); if (!acc[dateStr]) acc[dateStr] = []; acc[dateStr].push(event); return acc; }, {});
        const bingeRecord = Math.max(0, ...Object.values(watchedEventsByDay).map(events => events.length));
        const maxMoviesInDay = Math.max(0, ...Object.values(watchedEventsByDay).map(events => events.filter(e => e.item.type === 'movie').length));

        const topRated = allRatedContent.sort((a, b) => { const ratingA = a.type === 'series' ? calculateSeriesAverageRating(a) : a.rating; const ratingB = b.type === 'series' ? calculateSeriesAverageRating(b) : b.rating; return ratingB - ratingA; }).slice(0, 5);
        const monthlyActivity = {}; const monthLabels = []; for (let i = 11; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; monthLabels.push(d.toLocaleString('pt-PT', { month: 'short', year: '2-digit' })); monthlyActivity[monthKey] = 0; }
        allWatchedEvents.forEach(event => { const d = new Date(event.date); const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; if (monthlyActivity.hasOwnProperty(monthKey)) monthlyActivity[monthKey]++; });
        const typeCounts = allWatchedItems.reduce((acc, item) => { const type = item.type ? (item.type.charAt(0).toUpperCase() + item.type.slice(1)) : 'Outro'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});
        const typeDistribution = { labels: Object.keys(typeCounts), data: Object.values(typeCounts) };
        const decadeCounts = allWatchedItems.reduce((acc, item) => { if (item.year) { const decade = `${Math.floor(item.year / 10) * 10}s`; acc[decade] = (acc[decade] || 0) + 1; } return acc; }, {});
        const decadeDistribution = { labels: Object.keys(decadeCounts).sort(), data: Object.keys(decadeCounts).sort().map(key => decadeCounts[key]) };
        const recentActivity = allWatchedEvents.slice().sort((a,b) => b.date - a.date).slice(0, 5);
        const onThisDay = allWatchedEvents.filter(event => { const eventDate = new Date(event.date); return eventDate.getMonth() === today.getMonth() && eventDate.getDate() === today.getDate() && eventDate.getFullYear() !== today.getFullYear(); });
        let upNext = null; const watchingItems = allContent.filter(i => i.status === 'watching').sort((a,b) => (b.watchedDates?.slice(-1)[0] || 0) - (a.watchedDates?.slice(-1)[0] || 0)); if (watchingItems.length > 0) { const currentShow = watchingItems[0]; if (currentShow.type === 'series' && currentShow.episodes) { const nextEpisodeIndex = currentShow.episodes.findIndex(ep => ep.status !== 'watched'); upNext = (nextEpisodeIndex !== -1) ? { item: currentShow, isSeries: true, nextEpisode: { ...currentShow.episodes[nextEpisodeIndex], index: nextEpisodeIndex + 1 }, totalEpisodes: currentShow.episodes.length } : { item: currentShow, isSeries: false }; } else { upNext = { item: currentShow, isSeries: false }; } } else { const wantToWatchItems = allContent.filter(i => i.status === 'want_to_watch'); if(wantToWatchItems.length > 0) upNext = { item: wantToWatchItems[Math.floor(Math.random() * wantToWatchItems.length)], isSeries: false }; }
        const ratingDistribution = Array(10).fill(0); allRatedContent.forEach(item => { const rating = Math.floor((item.type === 'series' ? calculateSeriesAverageRating(item) : item.rating) || 0); if (rating > 0) ratingDistribution[rating - 1]++; });
        const weeklyPace = Array(7).fill(0); allWatchedEvents.forEach(e => { const day = new Date(e.date).getDay(); const runtime = e.item.type === 'series' ? 0 : (e.item.runtime || 0); weeklyPace[day] += runtime; });
        const runtimeDistribution = { short: 0, medium: 0, long: 0, epic: 0 }; allWatchedItems.filter(i => i.type === 'movie' && i.runtime).forEach(m => { if (m.runtime < 90) runtimeDistribution.short++; else if (m.runtime <= 150) runtimeDistribution.medium++; else if (m.runtime <= 210) runtimeDistribution.long++; else runtimeDistribution.epic++; });
        const getTopList = (items, key, type = null) => { const counts = items.reduce((acc, item) => { if (type && item.type !== type) return acc; if (item[key] && Array.isArray(item[key])) { item[key].forEach(val => { acc[val] = (acc[val] || 0) + 1; }); } else if (item[key]) { acc[item[key]] = (acc[item[key]] || 0) + 1; } return acc; }, {}); return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10); };
        const topCharactersMovies = getTopList(allContent, 'characters', 'movie');
        const topCharactersSeries = getTopList(allContent, 'characters', 'series');
        const topUniverses = getTopList(allContent, 'universe');
        const topTags = getTopList(allContent, 'tags');
        const generalContentStats = { totalMovies: allContent.filter(i => i.type === 'movie').length, totalSeries: allContent.filter(i => i.type === 'series').length, totalCharacters: [...new Set(allContent.flatMap(i => i.characters || []))].length, totalUniverses: [...new Set(allContent.map(i => i.universe).filter(Boolean))].length, };
        const movieContent = allContent.filter(i => i.type === 'movie');
        const seriesContent = allContent.filter(i => i.type === 'series');
        const movieStats = { count: movieContent.length, runtime: movieContent.reduce((sum, i) => sum + (i.runtime || 0), 0), avgRating: movieContent.filter(i => typeof i.rating === 'number').length > 0 ? movieContent.filter(i => typeof i.rating === 'number').reduce((sum, i) => sum + i.rating, 0) / movieContent.filter(i => typeof i.rating === 'number').length : 0 };
        const seriesStats = { count: seriesContent.length, runtime: seriesContent.reduce((sum, i) => sum + calculateSeriesTotalRuntime(i), 0), avgRating: seriesContent.map(s => calculateSeriesAverageRating(s)).filter(r => r !== null).length > 0 ? seriesContent.map(s => calculateSeriesAverageRating(s)).filter(r => r !== null).reduce((sum, r) => sum + r, 0) / seriesContent.map(s => calculateSeriesAverageRating(s)).filter(r => r !== null).length : 0 };
        const universeAnalysis = allUniverses.map(u => { const universeContent = allContent.filter(c => u.timeline.includes(c.id)); if (universeContent.length === 0) return null; const runtime = universeContent.reduce((sum, item) => sum + (item.type === 'series' ? calculateSeriesTotalRuntime(item) : (item.runtime || 0)), 0); const ratedItemsInUniverse = universeContent.map(item => item.type === 'series' ? calculateSeriesAverageRating(item) : item.rating).filter(r => r !== null && typeof r === 'number'); const avgRating = ratedItemsInUniverse.length > 0 ? ratedItemsInUniverse.reduce((a, b) => a + b, 0) / ratedItemsInUniverse.length : 0; return { name: u.name, runtime, avgRating }; }).filter(Boolean);
        const topRatedUniverse = [...universeAnalysis].sort((a, b) => b.avgRating - a.avgRating)[0] || null;
        const longestUniverse = [...universeAnalysis].sort((a, b) => b.runtime - a.runtime)[0] || null;
        
        const allWatchedMovies = allWatchedItems.filter(i => i.type === 'movie' && i.runtime);
        const shortestMovie = allWatchedMovies.length > 0 ? allWatchedMovies.sort((a, b) => a.runtime - b.runtime)[0] : null;
        const longestMovie = allWatchedMovies.length > 0 ? allWatchedMovies.sort((a, b) => b.runtime - a.runtime)[0] : null;

        const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const mostActiveDayIndex = weeklyPace.indexOf(Math.max(...weeklyPace));
        const mostActiveDay = weeklyPace.some(p => p > 0) ? weekDays[mostActiveDayIndex] : null;

        const totalMonthlyViews = Object.values(monthlyActivity).reduce((a, b) => a + b, 0);
        const averageItemsPerMonth = (totalMonthlyViews / 12).toFixed(1);

        const allCharacters = getTopList(allContent, 'characters');
        const topCharacter = allCharacters.length > 0 ? allCharacters[0].name : null;

        const statsForAchievements = {
            ...baseStats,
            totalWatched, totalRuntime, totalRated: allRatedContent.length,
            personalUniverseCounts,
            totalRewatchedItems: rewatchedItems.length,
            decades: new Set(Object.keys(decadeCounts)),
            typeCounts,
            typesWatched: new Set(Object.keys(typeCounts)),
            universesWatched: new Set(Object.keys(personalUniverseCounts)),
            hasPerfect10: allRatedContent.some(i => (i.type === 'series' ? calculateSeriesAverageRating(i) : i.rating) === 10),
            oldestItemYear: Math.min(...allWatchedItems.map(i => i.year || 9999)),
            completedSeriesCount: allContent.filter(i => i.type === 'series' && i.episodes && i.episodes.every(ep => ep.status === 'watched')).length,
            maxRewatches: Math.max(0, ...allWatchedItems.map(i => i.watchedDates.length)),
            maxItemsInUniverse: Math.max(0, ...Object.values(personalUniverseCounts)),
            bingeRecord,
            maxMoviesInDay,
            hasLowRating: allRatedContent.some(i => (i.type === 'series' ? calculateSeriesAverageRating(i) : i.rating) <= 5),
            hasHighRating: allRatedContent.some(i => (i.type === 'series' ? calculateSeriesAverageRating(i) : i.rating) >= 6),
            completedLongSeries: allContent.some(i => i.type === 'series' && i.episodes && i.episodes.length >= 50 && i.episodes.every(ep => ep.status === 'watched')),
            completedUniverses: allUniverses.filter(u => u.timeline.length > 0 && u.timeline.every(id => allWatchedItemsIDs.has(id))).length
        };
        
        const allOtherKeys = Object.keys(achievements).filter(k => k !== 'THE_CINEPHILE');
        statsForAchievements.allOtherAchievementsUnlocked = allOtherKeys.every(key => {
            const result = achievements[key].condition(statsForAchievements);
            return typeof result === 'boolean' ? result : (result.current >= result.target);
        });
        
        return { 
            ...statsForAchievements, 
            isDataAvailable: true,
            averageRating, favoriteUniverse, firstWatched, longestSeries, mostRewatched, topRated, 
            monthlyActivity: Object.values(monthlyActivity), monthLabels, typeDistribution, decadeDistribution, 
            decadeCounts, 
            recentActivity, onThisDay, upNext, ratingDistribution, weeklyPace, runtimeDistribution, 
            topCharactersMovies, topCharactersSeries, topUniverses, topTags, generalContentStats, 
            movieStats, seriesStats, topRatedUniverse, longestUniverse,
            shortestMovie, longestMovie, mostActiveDay, averageItemsPerMonth, topCharacter
        };
    };

    // ===================================================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ===================================================================
    const renderUpNextCard = (upNextData) => { upNextContent.innerHTML = ''; if (!upNextData || !upNextData.item) { upNextCard.style.backgroundImage = 'none'; upNextContent.innerHTML = `<div class="placeholder"><i data-lucide="coffee"></i><p>Tudo em dia! Hora de uma pausa.</p></div>`; return; } const { item, isSeries, nextEpisode, totalEpisodes } = upNextData; upNextCard.style.backgroundImage = `url('${item.banner || item.cover || ''}')`; let progressHTML = ''; if(isSeries && nextEpisode){ const progress = (nextEpisode.index - 1) / totalEpisodes * 100; progressHTML = `<div class="mt-2 text-xs text-gray-300">A ver EP ${nextEpisode.index} de ${totalEpisodes}</div><div class="progress-bar mt-1"><div style="width: ${progress}%"></div></div>`; } upNextContent.innerHTML = `<h4>${isSeries && nextEpisode ? `${item.title}: ${nextEpisode.title}`: item.title}</h4><div class="meta-info"><span>${item.year || 'N/A'}</span><span>${item.type}</span></div>${progressHTML}`; };
    const renderQuickStats = (stats) => { totalWatchedStat.innerHTML = `<div class="stat-value">${stats.totalWatched}</div><div class="stat-label"><i data-lucide="clapperboard"></i>Itens Vistos</div>`; totalRuntimeStat.innerHTML = `<div class="stat-value">${formatRuntime(stats.totalRuntime)}</div><div class="stat-label"><i data-lucide="clock"></i>Tempo de Ecrã</div>`; averageRatingStat.innerHTML = `<div class="stat-value">${stats.averageRating}</div><div class="stat-label"><i data-lucide="star"></i>Média</div>`; favoriteUniverseStat.innerHTML = `<div class="stat-value">${stats.favoriteUniverse[0]}</div><div class="stat-label"><i data-lucide="swords"></i>Universo Favorito</div>`; };
    const renderTopRatedList = (items) => { topRatedList.innerHTML = ''; if (!items || items.length === 0) { topRatedList.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Avalia alguns itens para veres o teu top aqui!</p>`; return; } items.forEach((item, index) => { const rating = item.type === 'series' ? calculateSeriesAverageRating(item) : item.rating; topRatedList.innerHTML += `<div class="top-rated-item"><span class="rank-number">${index + 1}</span><img src="${item.cover || 'https://placehold.co/80x120/1f2937/4f46e5?text=Capa'}" alt="Capa de ${item.title}"><div class="top-rated-info"><div class="top-rated-title">${item.title}</div><div class="top-rated-year">${item.year}</div></div><div class="top-rated-rating"><i data-lucide="star"></i>${rating.toFixed(1)}</div></div>`; }); };
    const renderActivityList = (listElement, items, message) => { listElement.innerHTML = ''; if (!items || items.length === 0) { listElement.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">${message}</p>`; return; } items.forEach(({ item, date }) => { listElement.innerHTML += `<div class="recent-item"><img src="${item.cover || 'https://placehold.co/80x120/1f2937/4f46e5?text=Capa'}" alt="Capa de ${item.title}"><div><div class="title">${item.title}</div><div class="date">${formatTimestamp(date)}</div></div></div>`; }); };
    
    // Renderização de Conquistas
    const renderAchievements = (stats, newlyUnlocked = []) => {
        if (!achievementsContainer) return;

        const parentCard = achievementsContainer.closest('.dashboard-card');
        const header = parentCard.querySelector('.achievements-header') || document.createElement('div');
        header.className = 'achievements-header';

        let unlockedCount = 0;
        const tierOrder = { "bronze": 1, "prata": 2, "ouro": 3, "platina": 4 };

        const achievementsHTML = Object.entries(achievements).sort(([, a], [, b]) => {
            return tierOrder[a.tier] - tierOrder[b.tier];
        }).map(([key, ach]) => {
            const result = ach.condition(stats);
            const isUnlocked = typeof result === 'boolean' ? result : (result.current >= result.target);
            if (isUnlocked) unlockedCount++;

            let progressHTML = '';
            if (typeof result === 'object' && result.target > 1) {
                const percent = Math.min(100, (result.current / result.target) * 100);
                progressHTML = `
                    <div class="achievement-progress">
                        <p class="achievement-progress-text">${Math.min(result.current, result.target)} / ${result.target}</p>
                        <div class="achievement-progress-bar">
                            <div style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
            }

            const isNew = newlyUnlocked.includes(key);
            
            return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'} tier-${ach.tier} ${isNew ? 'newly-unlocked' : ''}" data-achievement-key="${key}">
                    <div class="achievement-icon-container">
                        <i data-lucide="${ach.icon}"></i>
                    </div>
                    <div class="achievement-info">
                        <h4 class="achievement-title">${ach.title}</h4>
                        <p class="achievement-desc">${ach.desc}</p>
                        ${progressHTML}
                    </div>
                </div>
            `;
        }).join('');

        const totalAchievements = Object.keys(achievements).length;
        const overallProgress = (unlockedCount / totalAchievements) * 100;
        header.innerHTML = `
            <span class="achievements-count">${unlockedCount} / ${totalAchievements}</span>
            <div class="achievements-progress-bar">
                <div style="width: ${overallProgress}%"></div>
            </div>
            <i data-lucide="trophy"></i>
        `;

        if (!parentCard.contains(header)) {
            parentCard.insertBefore(header, achievementsContainer);
        }
        
        achievementsContainer.innerHTML = achievementsHTML;
    };

    // ===================================================================
    // LÓGICA PARA OS DESTAQUES ANIMADOS
    // ===================================================================
    const initAnimatedHighlights = (stats) => {
        if (!highlightsContainer) return;
        
        if (highlightsInterval) clearInterval(highlightsInterval);

        const getMostFrequent = (counts) => {
            if (!counts || Object.keys(counts).length === 0) return null;
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        };

        const allPossibleHighlights = [
            { label: 'Primeiro Item Visto', value: stats.firstWatched?.item.title, icon: 'play-circle', color: '#a5b4fc' },
            { label: 'Série Mais Longa', value: stats.longestSeries?.title, icon: 'tv', color: '#7dd3fc' },
            { label: 'Mais Revisto', value: stats.mostRewatched ? `${stats.mostRewatched.item.title} (${stats.mostRewatched.count}x)` : null, icon: 'repeat', color: '#5eead4' },
            { label: 'Recorde de Maratona (24h)', value: stats.bingeRecord > 0 ? `${stats.bingeRecord} Itens` : null, icon: 'zap', color: '#fda4af' },
            { label: 'Década Favorita', value: getMostFrequent(stats.decadeCounts), icon: 'album', color: '#fde047' },
            { label: 'Tipo de Conteúdo Favorito', value: getMostFrequent(stats.typeCounts), icon: 'layout-grid', color: '#f0abfc' },
            { label: 'Item Mais Antigo Visto', value: stats.oldestItemYear < 9999 ? `Um item de ${stats.oldestItemYear}` : null, icon: 'landmark', color: '#fca5a5' },
            { label: 'Obra-Prima Favorita', value: stats.topRated?.[0] ? `${stats.topRated[0].title} (${parseFloat(stats.topRated[0].type === 'series' ? calculateSeriesAverageRating(stats.topRated[0]) : stats.topRated[0].rating).toFixed(1)})` : null, icon: 'award', color: '#facc15' },
            { label: 'Universo com Mais Tempo', value: stats.longestUniverse ? `${stats.longestUniverse.name} (${formatRuntime(stats.longestUniverse.runtime)})` : null, icon: 'orbit', color: '#67e8f9' },
            { label: 'Dia Mais Ativo da Semana', value: stats.mostActiveDay, icon: 'calendar-days', color: '#86efac' },
            { label: 'Filme Mais Curto Visto', value: stats.shortestMovie ? `${stats.shortestMovie.title} (${formatRuntime(stats.shortestMovie.runtime)})` : null, icon: 'film', color: '#93c5fd' },
            { label: 'Filme Mais Longo Visto', value: stats.longestMovie ? `${stats.longestMovie.title} (${formatRuntime(stats.longestMovie.runtime)})` : null, icon: 'film', color: '#c4b5fd' },
            { label: 'Tag Mais Popular', value: stats.topTags?.[0]?.name, icon: 'tag', color: '#fdba74' },
            { label: 'Personagem Mais Recorrente', value: stats.topCharacter, icon: 'user-check', color: '#f9a8d4' },
            { label: 'Média Mensal', value: parseFloat(stats.averageItemsPerMonth) > 0 ? `${stats.averageItemsPerMonth} itens/mês` : null, icon: 'bar-chart-2', color: '#a78bfa' },
        ];
        
        const availableHighlights = allPossibleHighlights.filter(h => h.value);

        if (availableHighlights.length < 3) {
             highlightsContainer.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Vê mais itens para desbloquear mais destaques!</p>`;
            return;
        }

        const showNextHighlights = () => {
            const shuffled = [...availableHighlights].sort(() => 0.5 - Math.random());
            const highlightsToShow = shuffled.slice(0, 3);
            
            highlightsContainer.innerHTML = ''; 

            highlightsToShow.forEach((highlight, index) => {
                const item = document.createElement('div');
                item.className = 'highlight-item';
                item.style.top = `${index * (80 + 16)}px`;
                item.style.transitionDelay = `${index * 100}ms`;

                item.innerHTML = `
                    <div class="icon-wrapper" style="color: ${highlight.color}; background-color: ${highlight.color}20;">
                        <i data-lucide="${highlight.icon}"></i>
                    </div>
                    <div>
                        <div class="label">${highlight.label}</div>
                        <div class="value">${highlight.value}</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill"></div>
                    </div>
                `;
                highlightsContainer.appendChild(item);
            });
            
            setTimeout(() => {
                highlightsContainer.querySelectorAll('.highlight-item').forEach(item => item.classList.add('visible'));
                lucide.createIcons();
            }, 50);
        };
        
        showNextHighlights();
        highlightsInterval = setInterval(showNextHighlights, 7000);
    };

    const chartOptions = (extraOptions = {}) => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { titleFont: { family: 'Poppins' }, bodyFont: { family: 'Poppins' }, backgroundColor: '#111827', titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 4, } }, scales: { y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af', font: { family: 'Poppins' } } }, x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { family: 'Poppins' } } } }, ...extraOptions });
    const renderActivityChart = (labels, data) => { if (!activityChartCanvas) return; if (activityChart) activityChart.destroy(); activityChart = new Chart(activityChartCanvas, { type: 'line', data: { labels, datasets: [{ label: 'Itens Vistos', data, backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: '#4f46e5', fill: true, tension: 0.4 }] }, options: chartOptions() }); };
    const renderTypeDistributionChart = (distData) => { if (!typeDistributionChartCanvas) return; if (typeDistributionChart) typeDistributionChart.destroy(); typeDistributionChart = new Chart(typeDistributionChartCanvas, { type: 'doughnut', data: { labels: distData.labels, datasets: [{ label: 'Distribuição', data: distData.data, backgroundColor: ['#4f46e5', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0 }] }, options: { ...chartOptions({ scales: { y: { display: false }, x: { display: false } } }), plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: 'Poppins' } } } } } }); };
    const renderDecadeChart = (decadeData) => { if (!decadeChartCanvas) return; if (decadeChart) decadeChart.destroy(); decadeChart = new Chart(decadeChartCanvas, { type: 'bar', data: { labels: decadeData.labels, datasets: [{ label: 'Itens Vistos', data: decadeData.data, backgroundColor: '#4f46e5', borderRadius: 4, }] }, options: chartOptions({ indexAxis: 'y' }) }); };
    const renderWeeklyPaceChart = (data) => { if(!weeklyPaceChartCanvas) return; if(weeklyPaceChart) weeklyPaceChart.destroy(); weeklyPaceChart = new Chart(weeklyPaceChartCanvas, { type: 'bar', data: { labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], datasets: [{ label: 'Minutos Vistos', data, backgroundColor: '#3b82f6', borderRadius: 4 }] }, options: chartOptions() }); };
    const renderRatingDistributionChart = (data) => { if(!ratingDistributionChartCanvas) return; if(ratingDistributionChart) ratingDistributionChart.destroy(); ratingDistributionChart = new Chart(ratingDistributionChartCanvas, { type: 'bar', data: { labels: ['1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10', '10'], datasets: [{ label: 'Nº de Avaliações', data, backgroundColor: '#f59e0b', borderRadius: 4 }] }, options: chartOptions({ scales: { x: { grid: { display: true } } } }) }); };
    const renderRuntimeDistributionChart = (data) => { if(!runtimeDistributionChartCanvas) return; if(runtimeDistributionChart) runtimeDistributionChart.destroy(); runtimeDistributionChart = new Chart(runtimeDistributionChartCanvas, { type: 'pie', data: { labels: ['< 90m', '90-150m', '> 150m', '> 210m (Épico)'], datasets: [{ label: 'Nº de Filmes', data: Object.values(data), backgroundColor: ['#14b8a6', '#3b82f6', '#8b5cf6', '#ef4444'], borderWidth: 0 }] }, options: { ...chartOptions({ scales: { y: { display: false }, x: { display: false } } }), plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: 'Poppins' } } } } } }); };
    const renderTopList = (element, items, countLabel = 'aparições') => { if(!element) return; element.innerHTML = ''; if (!items || items.length === 0) { element.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Sem dados suficientes.</p>`; return; } items.forEach((item, index) => { element.innerHTML += `<div class="top-list-item"><span class="rank-number">${index + 1}</span><span class="item-name">${item.name}</span><span class="item-count">${item.count}</span></div>`; }); };
    const renderTagCloud = (element, tags) => { if(!element) return; element.innerHTML = ''; if (!tags || tags.length === 0) { element.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Nenhuma tag utilizada.</p>`; return; } tags.forEach(tag => { const fontSize = 1 + (tag.count / tags[0].count) * 0.8; element.innerHTML += `<span class="tag-cloud-item" style="font-size: ${fontSize}rem;">${tag.name}</span>`; }); };
    const renderGeneralContentStats = (stats) => { if(!generalContentStats) return; generalContentStats.innerHTML = `<div class="dashboard-card stat-card"><div class="stat-value">${stats.totalMovies}</div><div class="stat-label"><i data-lucide="film"></i>Filmes</div></div><div class="dashboard-card stat-card"><div class="stat-value">${stats.totalSeries}</div><div class="stat-label"><i data-lucide="tv"></i>Séries</div></div><div class="dashboard-card stat-card"><div class="stat-value">${stats.totalCharacters}</div><div class="stat-label"><i data-lucide="users"></i>Personagens</div></div><div class="dashboard-card stat-card"><div class="stat-value">${stats.totalUniverses}</div><div class="stat-label"><i data-lucide="globe"></i>Universos</div></div>`; };
    const renderMovieVsSeriesStats = (movieStats, seriesStats) => { if(!movieVsSeriesStats) return; movieVsSeriesStats.innerHTML = `<div class="comparison-item"><i data-lucide="film" class="icon text-blue-400"></i><div class="label">Filmes</div><div class="stat">${movieStats.count} itens</div><div class="stat">${formatRuntime(movieStats.runtime)}</div><div class="stat">${movieStats.avgRating.toFixed(1)}/10 Média</div></div><div class="comparison-vs">VS</div><div class="comparison-item"><i data-lucide="tv" class="icon text-teal-400"></i><div class="label">Séries</div><div class="stat">${seriesStats.count} itens</div><div class="stat">${formatRuntime(seriesStats.runtime)}</div><div class="stat">${seriesStats.avgRating.toFixed(1)}/10 Média</div></div>`; };
    const renderTopRatedUniverse = (universe) => { if(!topRatedUniverseCard) return; topRatedUniverseCard.innerHTML = universe ? `<div class="value">${universe.name}</div><div class="label">Universo Mais Bem Avaliado (${universe.avgRating.toFixed(1)}/10)</div>` : `<div class="value">N/A</div><div class="label">Universo Mais Bem Avaliado</div>`; };
    const renderLongestUniverse = (universe) => { if(!longestUniverseCard) return; longestUniverseCard.innerHTML = universe ? `<div class="value">${universe.name}</div><div class="label">Universo Mais Longo (${formatRuntime(universe.runtime)})</div>` : `<div class="value">N/A</div><div class="label">Universo Mais Longo</div>`; };
    
    // ===================================================================
    // LÓGICA DE NOTIFICAÇÃO DE CONQUISTAS
    // ===================================================================
    const checkAndNotifyAchievements = (stats) => {
        // dataManager lida com a lista principal de conquistas desbloqueadas
        let unlockedAchievements = dataManager.getUnlockedAchievements();
        let newAchievements = JSON.parse(localStorage.getItem('cineverso_new_achievements') || '[]');
        let newlyUnlocked = [];
        let achievementsWereUpdated = false;

        for (const key in achievements) {
            if (!unlockedAchievements[key]) {
                const result = achievements[key].condition(stats);
                const isUnlocked = typeof result === 'boolean' ? result : (result.current >= result.target);
                if (isUnlocked) {
                    unlockedAchievements[key] = true;
                    if (!newAchievements.includes(key)) {
                        newAchievements.push(key);
                    }
                    newlyUnlocked.push(key);
                    achievementsWereUpdated = true;
                }
            }
        }
        
        if (achievementsWereUpdated) {
            dataManager.saveAllData();
        }
        
        if (newlyUnlocked.length > 0) {
            localStorage.setItem('cineverso_new_achievements', JSON.stringify(newAchievements));
            showAchievementNotification(newlyUnlocked);
        }
        
        updateNewAchievementIndicator();
        return newlyUnlocked;
    };

    const showAchievementNotification = (keys) => {
        if (!achievementToast || keys.length === 0) return;
        
        const firstNew = achievements[keys[0]];
        achievementToastIcon.innerHTML = `<i data-lucide="${firstNew.icon}"></i>`;
        lucide.createIcons({nodes: [achievementToastIcon]});
        achievementToastTitle.textContent = firstNew.title;
        achievementToastDesc.textContent = keys.length > 1 ? `E mais ${keys.length - 1} outra(s)!` : "Nova conquista desbloqueada!";
        
        achievementToast.classList.remove('hidden');
        setTimeout(() => achievementToast.classList.add('visible'), 10);
    };

    const updateNewAchievementIndicator = () => {
        const newAchievements = JSON.parse(localStorage.getItem('cineverso_new_achievements') || '[]');
        if (newAchievementsCount) {
            if (newAchievements.length > 0) {
                newAchievementsCount.textContent = newAchievements.length;
                newAchievementsCount.classList.remove('hidden');
            } else {
                newAchievementsCount.classList.add('hidden');
            }
        }
        if (achievementsTabIndicator) {
             achievementsTabIndicator.classList.toggle('visible', newAchievements.length > 0);
        }
    };

    // ===================================================================
    // GESTÃO DE DADOS (IMPORTAR/EXPORTAR/APAGAR)
    // ===================================================================
    const exportData = () => {
        const jsonString = dataManager.exportDataAsJSON();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cineverso_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = readerEvent => {
                const jsonString = readerEvent.target.result;
                if (dataManager.importDataFromJSON(jsonString)) {
                    alert('Dados importados com sucesso! A página será recarregada.');
                    location.reload();
                } else {
                    alert('Erro ao importar ficheiro. O formato pode ser inválido.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const importAndMergeData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = readerEvent => {
                const jsonString = readerEvent.target.result;
                const result = dataManager.importAndMergeDataFromJSON(jsonString);
                
                alert(result.message);

                if (result.success) {
                    location.reload();
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };
    
    const deleteAllData = () => {
        const confirmation = prompt("Esta ação é IRREVERSÍVEL e vai apagar TODOS os teus dados.\n\nPara confirmar, escreve 'APAGAR TUDO' na caixa abaixo.");
        if (confirmation === 'APAGAR TUDO') {
            dataManager.deleteAllData();
            alert('Todos os dados foram apagados. A página será recarregada.');
            location.reload();
        } else {
            alert("Ação cancelada. Os teus dados estão seguros.");
        }
    };

    // ===================================================================
    // INICIALIZAÇÃO
    // ===================================================================
    const init = () => {
        if (typeof dataManager === 'undefined') {
            console.error("ERRO CRÍTICO: data-manager.js não foi carregado antes de Cineverso.js");
            alert("Ocorreu um erro crítico. A aplicação pode não funcionar corretamente.");
            return;
        }
        dataManager.loadAllData();

        setupTabs();
        setupSubTabs();

        const allContent = dataManager.getAllContent();
        const allUniverses = dataManager.getUniverses();
        const allPlaylists = dataManager.getPlaylists();
        const stats = calculateGlobalAnalytics(allContent, allUniverses, allPlaylists);
        
        const newlyUnlocked = checkAndNotifyAchievements(stats);

        if (stats.isDataAvailable) {
            dashboardContainer.classList.remove('hidden');
            emptyDashboardMessage.classList.add('hidden');

            renderUpNextCard(stats.upNext);
            renderQuickStats(stats);
            initAnimatedHighlights(stats);
            renderTopRatedList(stats.topRated);
            renderAchievements(stats, newlyUnlocked);
            renderActivityChart(stats.monthLabels, stats.monthlyActivity);
            renderTypeDistributionChart(stats.typeDistribution);
            renderDecadeChart(stats.decadeDistribution);
            renderActivityList(recentActivityList, stats.recentActivity, "Nenhuma atividade recente.");
            renderActivityList(onThisDayList, stats.onThisDay, "Nada foi visto neste dia em anos anteriores.");
            renderWeeklyPaceChart(stats.weeklyPace);
            renderRatingDistributionChart(stats.ratingDistribution);
            renderRuntimeDistributionChart(stats.runtimeDistribution);
            renderTopList(topCharactersMoviesList, stats.topCharactersMovies, '');
            renderTopList(topCharactersSeriesList, stats.topCharactersSeries, '');
            renderTopList(topUniversesList, stats.topUniverses, 'itens');
            renderTagCloud(topTagsList, stats.topTags);
            renderGeneralContentStats(stats.generalContentStats);
            renderMovieVsSeriesStats(stats.movieStats, stats.seriesStats);
            renderTopRatedUniverse(stats.topRatedUniverse);
            renderLongestUniverse(stats.longestUniverse);

        } else {
            dashboardContainer.classList.add('hidden');
            emptyDashboardMessage.classList.remove('hidden');
            renderAchievements(stats, newlyUnlocked);
        }
        
        if(exportBtn) exportBtn.addEventListener('click', exportData);
        if(importBtn) importBtn.addEventListener('click', importData);
        if(importMergeBtn) importMergeBtn.addEventListener('click', importAndMergeData);
        if(deleteAllDataBtn) deleteAllDataBtn.addEventListener('click', deleteAllData);
        if(achievementToastClose) achievementToastClose.addEventListener('click', () => achievementToast.classList.remove('visible'));
        
        if (achievementsContainer) {
            achievementsContainer.addEventListener('click', (e) => {
                const card = e.target.closest('.achievement-card.newly-unlocked');
                if (card) {
                    const key = card.dataset.achievementKey;
                    let newAchievements = JSON.parse(localStorage.getItem('cineverso_new_achievements') || '[]');
                    newAchievements = newAchievements.filter(item => item !== key);
                    localStorage.setItem('cineverso_new_achievements', JSON.stringify(newAchievements));
                    card.classList.remove('newly-unlocked');
                    updateNewAchievementIndicator();
                }
            });
        }
        
        lucide.createIcons();
    };

    init();
});

