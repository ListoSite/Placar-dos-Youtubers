document.addEventListener('DOMContentLoaded', () => {
    console.log("Script Quero Ver v6.0 - Sincronizado com Data Manager.");

    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM
    // ===================================================================
    const watchlistContainer = document.getElementById('watchlist-container');
    const emptyWatchlistMessage = document.getElementById('empty-watchlist-message');
    const filterStatus = document.getElementById('filter-status');
    const filterType = document.getElementById('filter-type');
    const sortBy = document.getElementById('sort-by');
    const playlistFilterContainer = document.getElementById('playlist-filter-container');

    // Modal de Avaliação (Filmes)
    const ratingModal = document.getElementById('rating-modal');
    const ratingModalCloseBtn = document.getElementById('rating-modal-close-btn');
    const ratingModalCover = document.getElementById('rating-modal-cover');
    const ratingModalTitle = document.getElementById('rating-modal-title');
    const ratingModalStars = document.getElementById('rating-modal-stars');
    const ratingModalFeedback = document.getElementById('rating-modal-feedback');
    const ratingModalConfirmBtn = document.getElementById('rating-modal-confirm-btn');

    // Modal de Episódios
    const episodesModal = document.getElementById('episodes-modal');
    const episodesModalCloseBtn = document.getElementById('episodes-modal-close-btn');
    const episodesModalCover = document.getElementById('episodes-modal-cover');
    const episodesModalTitle = document.getElementById('episodes-modal-title');
    const episodesModalStats = document.getElementById('episodes-modal-stats');
    const episodesModalList = document.getElementById('episodes-modal-list');

    // Elementos para a navegação móvel (ADICIONADO)
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');


    // ===================================================================
    // ESTADO DA APLICAÇÃO
    // ===================================================================
    let activePlaylistId = 'all';
    let currentItemToRate = null;
    let currentSeriesInModal = null;
    let currentRatingValue = null;
    let episodeTempRatings = {};


    // ===================================================================
    // LÓGICA DE NAVEGAÇÃO MÓVEL (ADICIONADO)
    // ===================================================================
    /**
     * Alterna a visibilidade da barra lateral (sidebar) e do overlay.
     * Adiciona/remove as classes CSS 'is-open' e 'is-visible' que controlam
     * a animação e a exibição dos elementos em ecrãs pequenos.
     */
    const toggleSidebar = () => {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.toggle('is-open');
            sidebarOverlay.classList.toggle('is-visible');
        }
    };

    // Adiciona os eventos de clique ao botão de menu e ao overlay
    // para que ambos possam abrir e fechar a navegação lateral.
    if (mobileMenuButton && sidebar && sidebarOverlay) {
        mobileMenuButton.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // ===================================================================
    // FUNÇÕES AUXILIARES
    // ===================================================================
    const formatRuntime = (minutes) => {
        if (!minutes || isNaN(minutes) || minutes <= 0) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        let result = '';
        if (hours > 0) result += `${hours}h `;
        if (mins > 0) result += `${mins}m`;
        return result.trim();
    };

    const calculateSeriesInfo = (seriesItem) => {
        if (!seriesItem || seriesItem.type !== 'series' || !seriesItem.episodes) {
            return { episodeCount: 0, totalRuntime: 0 };
        }
        const episodeCount = seriesItem.episodes.length;
        const totalRuntime = seriesItem.episodes.reduce((sum, ep) => sum + (ep.runtime || 0), 0);
        return { episodeCount, totalRuntime };
    };

    const checkAndUpdateSeriesStatus = (series) => {
        if (!series || series.type !== 'series' || !series.episodes) return;
        
        const allEpisodesWatched = series.episodes.every(ep => ep.status === 'watched');

        if (allEpisodesWatched) {
            series.status = 'watched';
        }
    };

    // ===================================================================
    // FUNÇÕES DO MODAL DE AVALIAÇÃO E EPISÓDIOS
    // ===================================================================

    const renderStarRating = (container, feedbackEl, currentRating, onRatingChangeCallback) => {
        container.innerHTML = ''; 
        const rating = currentRating === null ? -1 : parseFloat(currentRating);
    
        const updateFeedback = (value) => {
            if (!feedbackEl) return;
            if (value === null || value < 0) {
                feedbackEl.textContent = 'N/A';
                feedbackEl.classList.add('is-na');
            } else {
                feedbackEl.textContent = `${parseFloat(value).toFixed(1)} / 10`;
                feedbackEl.classList.remove('is-na');
            }
        };
    
        for (let i = 1; i <= 10; i++) {
            const starBtn = document.createElement('button');
            starBtn.type = 'button';
            starBtn.dataset.value = i;
            starBtn.innerHTML = `<i data-lucide="star"></i>`;
            if (rating >= i) {
                starBtn.className = 'active';
            } else if (rating === i - 0.5) {
                starBtn.className = 'active star-half';
            }
            container.appendChild(starBtn);
        }
    
        const naBtn = document.createElement('button');
        naBtn.type = 'button';
        naBtn.className = 'na-rating-btn';
        naBtn.dataset.value = 'null';
        naBtn.innerHTML = `<i data-lucide="slash-circle"></i> N/A`;
        if (rating === -1) {
            naBtn.classList.add('active');
        }
        container.appendChild(naBtn);
    
        updateFeedback(currentRating);
        
        container.onclick = (e) => {
            const button = e.target.closest('button');
            if (!button) return;
    
            const clickedValueStr = button.dataset.value;
            let newRating;
    
            if (clickedValueStr === 'null') {
                newRating = null;
            } else {
                const clickedValue = parseFloat(clickedValueStr);
                const currentValue = parseFloat(currentRating);
                
                if (currentValue === clickedValue) {
                    newRating = clickedValue - 0.5;
                } else {
                    newRating = clickedValue;
                }
            }
            
            if (onRatingChangeCallback) {
                onRatingChangeCallback(newRating);
            }
        };
    
        const wrapper = container.closest('.rating-wrapper');
        if (wrapper) {
            wrapper.onmouseover = () => {
                if(feedbackEl) feedbackEl.classList.add('show-feedback');
            }
            wrapper.onmouseout = () => {
                if(feedbackEl) feedbackEl.classList.remove('show-feedback');
            }
        }
    
        lucide.createIcons({ nodes: Array.from(container.children) });
    };

    const openRatingModal = (item) => {
        if (!ratingModal || !item) return;
        currentItemToRate = item;
        currentRatingValue = item.rating === undefined ? null : item.rating;
        
        ratingModalTitle.textContent = item.title;
        ratingModalCover.src = item.cover || 'https://placehold.co/300x450/1f2937/4f46e5?text=Capa';
        
        const onRatingChange = (newRating) => {
            currentRatingValue = newRating;
            renderStarRating(ratingModalStars, ratingModalFeedback, newRating, onRatingChange);
        };
        renderStarRating(ratingModalStars, ratingModalFeedback, currentRatingValue, onRatingChange);

        ratingModal.classList.remove('hidden');
    };

    const closeRatingModal = () => {
        if (!ratingModal) return;
        currentItemToRate = null;
        currentRatingValue = null;
        ratingModal.classList.add('hidden');
    };
    
    const openEpisodesModal = (series) => {
        if (!episodesModal) return;
        currentSeriesInModal = series;
        episodeTempRatings = {};

        episodesModalCover.src = series.cover || 'https://placehold.co/200x300/1f2937/4f46e5?text=Capa';
        episodesModalTitle.textContent = series.title;
        const { episodeCount, totalRuntime } = calculateSeriesInfo(series);
        episodesModalStats.textContent = `${episodeCount} Episódios • Duração total de ${formatRuntime(totalRuntime)}`;

        episodesModalList.innerHTML = '';
        series.episodes.forEach((ep, index) => {
            const isWatched = ep.status === 'watched';
            
            const episodeHTML = `
                <div class="episode-item" data-index="${index}">
                    <div class="episode-info">
                        <p class="episode-number">Episódio ${index + 1}</p>
                        <h4 class="episode-title">${ep.title}</h4>
                    </div>
                    <div class="episode-actions">
                        ${isWatched ? 
                            `<div class="rating-wrapper">
                                <div class="star-rating-input"></div>
                                <div class="rating-feedback-display">--/10</div>
                            </div>
                            <button class="episode-rating-confirm-btn" title="Confirmar Classificação">
                                <i data-lucide="check"></i>
                            </button>` 
                            : 
                            `<button class="episode-visto-btn"><i data-lucide="check"></i><span>Visto</span></button>`
                        }
                    </div>
                </div>
            `;
            episodesModalList.insertAdjacentHTML('beforeend', episodeHTML);

            if(isWatched) {
                const itemEl = episodesModalList.lastElementChild;
                const starContainer = itemEl.querySelector('.star-rating-input');
                const feedbackEl = itemEl.querySelector('.rating-feedback-display');
                const confirmBtn = itemEl.querySelector('.episode-rating-confirm-btn');
                const episode = series.episodes[index];
                
                const onRatingChange = (newRating) => {
                    episodeTempRatings[index] = newRating;
                    renderStarRating(starContainer, feedbackEl, newRating, onRatingChange);
                    confirmBtn.classList.add('visible');
                };
                renderStarRating(starContainer, feedbackEl, episode.rating, onRatingChange);
            }
        });
        
        lucide.createIcons();
        episodesModal.classList.remove('hidden');
    };

    const closeEpisodesModal = () => {
        if (!episodesModal) return;
        currentSeriesInModal = null;
        episodesModal.classList.add('hidden');
        renderWatchlist();
    };

    // ===================================================================
    // FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO
    // ===================================================================
     const renderPlaylistFilter = () => {
        const playlists = dataManager.getPlaylists();
        if (!playlistFilterContainer) return;
        playlistFilterContainer.innerHTML = '';
        
        const allBtn = document.createElement('button');
        allBtn.className = `playlist-filter-btn ${activePlaylistId === 'all' ? 'active' : ''}`;
        allBtn.dataset.id = 'all';
        allBtn.innerHTML = `<i data-lucide="layout-grid"></i><span>Todos</span>`;
        playlistFilterContainer.appendChild(allBtn);

        playlists.forEach(p => {
            const playlistBtn = document.createElement('button');
            playlistBtn.className = `playlist-filter-btn ${activePlaylistId == p.id ? 'active' : ''}`;
            playlistBtn.dataset.id = p.id;
            playlistBtn.innerHTML = `<i data-lucide="list"></i><span>${p.name}</span>`;
            playlistFilterContainer.appendChild(playlistBtn);
        });

        lucide.createIcons();
    };

    const renderWatchlist = () => {
        const allContent = dataManager.getAllContent();
        const playlists = dataManager.getPlaylists();

        const statusFilterValue = filterStatus.value;
        const typeFilterValue = filterType.value;
        const sortValue = sortBy.value;

        let watchlistItems = allContent.filter(item => item.status === 'watching' || item.status === 'want_to_watch');
        
        if (activePlaylistId !== 'all') {
            const playlist = playlists.find(p => p.id == activePlaylistId);
            if (playlist) {
                const contentIdsInPlaylist = new Set(playlist.contentIds);
                watchlistItems = watchlistItems.filter(item => contentIdsInPlaylist.has(item.id));
            }
        }

        if (statusFilterValue !== 'all') {
            watchlistItems = watchlistItems.filter(item => item.status === statusFilterValue);
        }

        if (typeFilterValue !== 'all') {
            watchlistItems = watchlistItems.filter(item => item.type === typeFilterValue);
        }

        watchlistItems.sort((a, b) => {
            if (a.status === 'watching' && b.status !== 'watching') return -1;
            if (a.status !== 'watching' && b.status === 'watching') return 1;
            if (sortValue === 'title-asc') return a.title.localeCompare(b.title);
            if (sortValue === 'year-desc') return (b.year || 0) - (a.year || 0);
            return 0;
        });

        watchlistContainer.innerHTML = '';

        if (watchlistItems.length === 0) {
            emptyWatchlistMessage.classList.remove('hidden');
            watchlistContainer.classList.add('hidden');
        } else {
            emptyWatchlistMessage.classList.add('hidden');
            watchlistContainer.classList.remove('hidden');
            
            watchlistItems.forEach(item => {
                const cardElement = document.createElement('div');
                cardElement.className = 'watchlist-card';
                cardElement.dataset.id = item.id;
                
                let actionsHTML = '';
                if (item.type === 'series') {
                    actionsHTML = `<button class="card-action-btn view-episodes-btn" title="Ver Episódios"><i data-lucide="list-video"></i><span class="btn-text">Episódios</span></button>`;
                } else {
                    actionsHTML = `
                        <button class="card-action-btn watching-btn" title="Marcar como 'A Ver'"><i data-lucide="eye"></i><span class="btn-text">A Ver</span></button>
                        <button class="card-action-btn watched-btn" title="Marcar como 'Visto'"><i data-lucide="check"></i><span class="btn-text">Visto</span></button>
                    `;
                }

                cardElement.innerHTML = `
                    <img src="${item.cover || 'https://placehold.co/300x450/1f2937/4f46e5?text=Capa'}" alt="Capa de ${item.title}" class="card-cover">
                    <div class="card-status-badge ${item.status === 'watching' ? 'watching' : 'want'}" title="${item.status === 'watching' ? 'A Ver' : 'Quero Ver'}">
                        <i data-lucide="${item.status === 'watching' ? 'eye' : 'bookmark'}"></i>
                    </div>
                    <div class="card-overlay">
                        <div>
                            <h3 class="card-title">${item.title}</h3>
                            <div class="card-meta">
                                <span>${item.year || 'N/A'}</span>
                                <i data-lucide="dot" class="w-4 h-4 -mx-1.5"></i>
                                <span>${item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Filme'}</span>
                            </div>
                            <div class="card-actions">${actionsHTML}</div>
                        </div>
                    </div>
                `;
                watchlistContainer.appendChild(cardElement);
            });
        }
        lucide.createIcons();
    };

    // ===================================================================
    // EVENT LISTENERS
    // ===================================================================
    
    watchlistContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.card-action-btn');
        if (!button) return;

        const cardElement = e.target.closest('.watchlist-card');
        const contentId = Number(cardElement.dataset.id);
        const item = dataManager.getContentById(contentId);
        if (!item) return;

        if (button.classList.contains('watched-btn')) { // Para filmes
            openRatingModal(item);
        } else if (button.classList.contains('watching-btn')) { // Para filmes
            item.status = item.status === 'watching' ? 'want_to_watch' : 'watching';
            dataManager.saveAllData();
            renderWatchlist();
        } else if (button.classList.contains('view-episodes-btn')) { // Para séries
            openEpisodesModal(item);
        }
    });
    
    if (playlistFilterContainer) {
        playlistFilterContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.playlist-filter-btn');
            if (button) {
                const playlistId = button.dataset.id;
                activePlaylistId = (playlistId === 'all') ? 'all' : Number(playlistId);
                renderPlaylistFilter();
                renderWatchlist();
            }
        });
    }

    filterStatus.addEventListener('change', renderWatchlist);
    filterType.addEventListener('change', renderWatchlist);
    sortBy.addEventListener('change', renderWatchlist);

    if (ratingModal) {
        ratingModalConfirmBtn.addEventListener('click', () => {
            if (currentItemToRate) {
                currentItemToRate.status = 'watched';
                currentItemToRate.rating = currentRatingValue;
                if (!currentItemToRate.watchedDates) currentItemToRate.watchedDates = [];
                currentItemToRate.watchedDates.push(Date.now());
                dataManager.saveAllData();
                closeRatingModal();
                renderWatchlist();
            }
        });

        ratingModalCloseBtn.addEventListener('click', closeRatingModal);
        ratingModal.addEventListener('click', (e) => {
            if (e.target === ratingModal) closeRatingModal();
        });
    }

    if (episodesModal) {
        episodesModalCloseBtn.addEventListener('click', closeEpisodesModal);
        episodesModal.addEventListener('click', (e) => {
            if (e.target === episodesModal) closeEpisodesModal();
        });

        episodesModalList.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const episodeItemEl = button.closest('.episode-item');
            const episodeIndex = parseInt(episodeItemEl.dataset.index, 10);
            const episode = currentSeriesInModal.episodes[episodeIndex];

            if (button.classList.contains('episode-visto-btn')) {
                episode.status = 'watched';
                if (!episode.watchedDates) episode.watchedDates = [];
                episode.watchedDates.push(Date.now());
                episode.rating = episode.rating === undefined ? null : episode.rating;

                checkAndUpdateSeriesStatus(currentSeriesInModal);
                dataManager.saveAllData();
                openEpisodesModal(currentSeriesInModal); 
            }
            
            if (button.classList.contains('episode-rating-confirm-btn')) {
                const newRating = episodeTempRatings[episodeIndex];
                if (newRating !== undefined) {
                    episode.rating = newRating;
                    delete episodeTempRatings[episodeIndex];
                    dataManager.saveAllData();
                    button.classList.remove('visible');
                }
            }
        });
    }

    // ===================================================================
    // INICIALIZAÇÃO
    // ===================================================================
    const init = () => {
        if (typeof dataManager === 'undefined') {
            console.error("ERRO CRÍTICO: data-manager.js não foi carregado antes de quero-ver.js");
            alert("Ocorreu um erro crítico. A aplicação pode não funcionar corretamente.");
            return;
        }
        dataManager.loadAllData();
        renderPlaylistFilter();
        renderWatchlist();
    };

    init();
});

