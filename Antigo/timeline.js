document.addEventListener('DOMContentLoaded', () => {
    console.log("Script da Timeline v20.3 - Corrigido para mobile");

    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM
    // ===================================================================
    const universeTitle = document.getElementById('universe-title');
    const universeSubtitle = document.getElementById('universe-subtitle');
    const timelineContainer = document.getElementById('timeline');
    const emptyTimelineMessage = document.getElementById('empty-timeline-message');
    const pageBackground = document.getElementById('page-background');
    const searchInput = document.getElementById('search-input');
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterUniversesContainer = document.getElementById('filter-universes');
    const filterCharactersContainer = document.getElementById('filter-characters');
    const filterTagsContainer = document.getElementById('filter-tags');
    const filterNav = document.getElementById('filter-nav');
    const activeFiltersContainer = document.getElementById('active-filters-container');
    const prevMatchBtn = document.getElementById('prev-match-btn');
    const nextMatchBtn = document.getElementById('next-match-btn');
    const matchCounter = document.getElementById('match-counter');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const detailsPanel = document.getElementById('details-panel');
    const detailsPanelOverlay = document.getElementById('details-panel-overlay');


    // ===================================================================
    // ESTADO DA APLICAÇÃO
    // ===================================================================
    let currentUniverse = null;
    let currentUniverseId = null;
    let scrollObserver;
    let allFictionalUniversesCache = [];
    let allCharactersCache = [];
    let allTagsCache = [];
    let activeFilters = [];
    let matchedCards = [];
    let currentMatchIndex = -1;
    let parentSeriesCache = new Map();
    let expandedSeries = {};
    let selectedItemId = null;
    const PRIMARY_CONTENT_TYPES = ['movie', 'series', 'short', 'especial'];

    // ===================================================================
    // FUNÇÕES DE GESTÃO DE DADOS
    // ===================================================================
    
    const saveExpandedState = () => {
        if (!currentUniverseId) return;
        localStorage.setItem(`expandedState_${currentUniverseId}`, JSON.stringify(expandedSeries));
    };

    const buildParentSeriesCache = () => {
        const allContent = dataManager.getAllContent();
        parentSeriesCache.clear();
        const allSeries = allContent.filter(c => c.type === 'series' && c.episodes);
        for (const series of allSeries) {
            for (const episode of series.episodes) {
                parentSeriesCache.set(episode.id, series);
            }
        }
    };
    
    // ===================================================================
    // FUNÇÕES AUXILIARES
    // ===================================================================
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };
    const getValidImageUrl = (url, fallback) => (url && (url.startsWith('http') || url.startsWith('data:'))) ? url : fallback;
    const formatRuntime = (minutes) => {
        if (!minutes || isNaN(minutes) || minutes <= 0) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
    };
    const getRatingColorClass = (rating) => {
        const r = parseFloat(rating);
        if (r >= 8) return 'text-green-400';
        if (r >= 6) return 'text-yellow-400';
        if (r >= 4) return 'text-orange-400';
        if (r > 0) return 'text-red-400';
        return 'text-gray-500';
    };
    const getIconForType = (type) => ({ movie: 'film', series: 'tv', short: 'clapperboard', episode: 'clapperboard', trailer: 'video', extra: 'plus-circle', intro: 'log-in', plus: 'plus', especial: 'award' }[type] || 'film');
    const calculateSeriesAverageRating = (episodes = []) => {
        const ratedEpisodes = episodes.filter(ep => ep.rating !== null && typeof ep.rating === 'number' && ep.rating >= 0);
        if (ratedEpisodes.length === 0) return 'N/A';
        const total = ratedEpisodes.reduce((sum, ep) => sum + ep.rating, 0);
        return (total / ratedEpisodes.length).toFixed(1);
    };
    const calculateSeriesTotalRuntime = (episodes = []) => episodes.reduce((sum, ep) => sum + (ep.runtime || 0), 0);

    const updateSeriesStatus = (series) => {
        if (!series || series.type !== 'series' || !series.episodes) return;
        const episodes = series.episodes;
        const totalEpisodes = episodes.length;
        if (totalEpisodes === 0) return;
        const watchedCount = episodes.filter(ep => ep.status === 'watched').length;
        const watchingCount = episodes.filter(ep => ep.status === 'watching').length;
        if (watchedCount === totalEpisodes) series.status = 'watched';
        else if (watchedCount > 0 || watchingCount > 0) series.status = 'watching';
    };
    
    const getItemAndContext = (id) => {
        const itemId = Number(id);
        const item = dataManager.getContentById(itemId) || parentSeriesCache.get(itemId)?.episodes.find(ep => ep.id === itemId);
        if (!item) return { item: null, parent: null };
        const parent = parentSeriesCache.get(itemId) || null;
        return { item, parent };
    };

    const getVisibleTimeline = () => {
        const allContent = dataManager.getAllContent();
        const visibleIds = [];
        if (!currentUniverse || !currentUniverse.timeline) return visibleIds;
    
        const timelinePrimaryIds = currentUniverse.timeline.map(Number);
    
        for (const primaryId of timelinePrimaryIds) {
            const { item: primaryItem } = getItemAndContext(primaryId);
            if (!primaryItem) continue;
    
            visibleIds.push(primaryId);
    
            const attachments = allContent
                .filter(c => c.attachedTo === primaryId)
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(c => c.id);
            
            visibleIds.push(...attachments);
    
            if (primaryItem.type === 'series' && expandedSeries[primaryItem.id] && primaryItem.episodes) {
                const episodeIds = primaryItem.episodes.map(ep => ep.id);
                visibleIds.push(...episodeIds);
            }
        }
        return visibleIds;
    };


    // ===================================================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ===================================================================
    const renderStatusBadge = (status) => {
        const statusConfig = {
            'watched': { text: 'Visto', icon: 'check', class: 'watched' },
            'watching': { text: 'A Ver', icon: 'eye', class: 'watching' },
            'want_to_watch': { text: 'Quero Ver', icon: 'bookmark', class: 'want_to_watch' }
        };
        const config = statusConfig[status];
        if (config) {
            return `<div class="card-status-badge ${config.class}"><i data-lucide="${config.icon}"></i>${config.text}</div>`;
        }
        return '';
    };

    const renderSingleItem = (item, totalVisible, visibleIndex) => {
        const isPrimary = PRIMARY_CONTENT_TYPES.includes(item.type);
        const ratingColor = getRatingColorClass(item.rating);
        const typeIcon = getIconForType(item.type);
        const typeName = item.type.charAt(0).toUpperCase() + item.type.slice(1);
        const ratingDisplay = item.rating !== null && item.rating !== undefined ? `${item.rating.toFixed(1)} / 10` : 'N/A';
        const backgroundUrl = getValidImageUrl(item.banner || item.cover, 'https://placehold.co/800x450/1f2937/111827?text=Banner');
        const coverUrl = getValidImageUrl(item.cover, 'https://placehold.co/400x600/1f2937/4f46e5?text=Capa');
        const orderBadge = !isPrimary && item.order ? `<div class="card-order-badge">#${item.order}</div>` : '';
        const itemClass = isPrimary ? '' : 'is-attachment';

        const charactersHTML = item.characters?.length > 0 ? `
            <div class="detail-item characters-list">
                <i data-lucide="users"></i>
                <div class="character-pills">
                    ${item.characters.slice(0, 3).map(c => `<span class="character-pill">${c}</span>`).join('')}
                    ${item.characters.length > 3 ? `<span class="character-pill more-characters">+${item.characters.length - 3}</span>` : ''}
                </div>
            </div>` : '';

        const metaInfo = `
            <div class="meta-item ${ratingColor}"><i data-lucide="star"></i><span>${ratingDisplay}</span></div>
            <div class="meta-item"><i data-lucide="${typeIcon}"></i><span>${typeName}</span></div>
            <div class="meta-item"><i data-lucide="clock"></i><span>${formatRuntime(item.runtime) || 'N/A'}</span></div>`;
        
        return `
            <div class="timeline-item ${itemClass}">
                <div class="timeline-dot"></div>
                ${orderBadge}
                <div class="timeline-card" data-id="${item.id}" data-title="${item.title}" data-banner-url="${backgroundUrl}">
                    <div class="card-info-container">
                        <div class="card-background" style="background-image: url('${backgroundUrl}')"></div>
                        <div class="card-gradient"></div>
                        <div class="card-counter desktop-only">${visibleIndex + 1} de ${totalVisible}</div>
                        <div class="desktop-only">${renderStatusBadge(item.status)}</div>
                        <div class="card-info">
                            <div class="card-info-right desktop-only">
                                ${item.universe ? `<div class="detail-item universe-tag"><i data-lucide="globe-2"></i><span>${item.universe}</span></div>` : ''}
                                ${charactersHTML}
                            </div>
                            <div class="card-main-details">
                                <div class="card-title-block"><p class="card-year">${item.year || 'N/A'}</p><h3 class="card-title">${item.title}</h3></div>
                                ${item.comment ? `<div class="card-comment"><i data-lucide="message-square"></i><p>${item.comment}</p></div>` : ''}
                                <div class="card-meta">${metaInfo}</div>
                            </div>
                        </div>
                    </div>
                    <div class="card-cover-container">
                        <img src="${coverUrl}" class="card-cover-image" alt="Capa de ${item.title}">
                        <div class="mobile-overlays">
                            <div class="card-counter">${visibleIndex + 1} de ${totalVisible}</div>
                            ${renderStatusBadge(item.status)}
                            <div class="card-info-right">
                                ${charactersHTML}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    };
    
    const renderEpisodeItem = (episode, series, totalVisible, visibleIndex) => {
        const ratingColor = getRatingColorClass(episode.rating);
        const ratingDisplay = episode.rating !== null && episode.rating !== undefined ? `${episode.rating.toFixed(1)} / 10` : 'N/A';
        const backgroundUrl = getValidImageUrl(series.banner, 'https://placehold.co/800x450/1f2937/111827?text=Banner');
        const episodeInSeries = (series.episodes || []).findIndex(e => e.id === episode.id) + 1;

        const metaInfo = `
            <div class="meta-item ${ratingColor}"><i data-lucide="star"></i><span>${ratingDisplay}</span></div>
            <div class="meta-item"><i data-lucide="tv"></i><span>${series.title}</span></div>
            <div class="meta-item"><i data-lucide="clock"></i><span>${formatRuntime(episode.runtime) || 'N/A'}</span></div>`;

        return `
            <div class="timeline-item is-episode">
                <div class="timeline-dot episode-dot"></div>
                <div class="timeline-card episode-card-redesigned" data-id="${episode.id}" data-title="${episode.title}" data-banner-url="${backgroundUrl}">
                     <div class="card-info-container">
                        <div class="card-background" style="background-image: url('${backgroundUrl}')"></div>
                        <div class="card-gradient"></div>
                        <div class="card-counter">${visibleIndex + 1} de ${totalVisible}</div>
                        ${renderStatusBadge(episode.status)}
                        <div class="card-info">
                           <div class="card-info-right">
                                ${series.universe ? `<div class="detail-item universe-tag"><i data-lucide="globe-2"></i><span>${series.universe}</span></div>` : ''}
                            </div>
                           <div class="card-main-details">
                                <div class="card-title-block">
                                    <p class="card-year">${series.year || 'N/A'}</p>
                                    <h3 class="card-title">${episode.title}</h3>
                                    <span class="episode-identifier">Episódio ${episodeInSeries}</span>
                                </div>
                                ${episode.comment ? `<div class="card-comment"><i data-lucide="message-square"></i><p>${episode.comment}</p></div>` : ''}
                                <div class="card-meta">${metaInfo}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    };
    
    const renderSeriesHeader = (series, totalVisible, visibleIndex) => {
        const averageRating = calculateSeriesAverageRating(series.episodes || []);
        const ratingColor = getRatingColorClass(averageRating);
        const totalRuntime = calculateSeriesTotalRuntime(series.episodes || []);
        const backgroundUrl = getValidImageUrl(series.banner || series.cover, 'https://placehold.co/800x450/1f2937/111827?text=Banner');
        const coverUrl = getValidImageUrl(series.cover, 'https://placehold.co/400x600/1f2937/4f46e5?text=Capa');
        
        const charactersHTML = series.characters?.length > 0 ? `
            <div class="detail-item characters-list">
                <i data-lucide="users"></i>
                <div class="character-pills">
                    ${series.characters.slice(0, 3).map(c => `<span class="character-pill">${c}</span>`).join('')}
                    ${series.characters.length > 3 ? `<span class="character-pill more-characters">+${series.characters.length - 3}</span>` : ''}
                </div>
            </div>` : '';

        const metaInfo = `
            <div class="meta-item ${ratingColor}"><i data-lucide="star"></i><span>${averageRating !== 'N/A' ? `${averageRating} / 10` : 'N/A'}</span></div>
            <div class="meta-item"><i data-lucide="list-video"></i><span>${(series.episodes || []).length} Eps.</span></div>
            <div class="meta-item"><i data-lucide="clock"></i><span>${formatRuntime(totalRuntime) || 'N/A'}</span></div>`;

        return `
            <div class="timeline-item is-series">
                <div class="timeline-dot"></div>
                <div class="timeline-card" data-id="${series.id}" data-series-id="${series.id}" data-title="${series.title}" data-banner-url="${backgroundUrl}">
                    <div class="card-info-container">
                        <div class="card-background" style="background-image: url('${backgroundUrl}')"></div>
                        <div class="card-gradient"></div>
                        <div class="card-counter desktop-only">${visibleIndex + 1} de ${totalVisible}</div>
                        <div class="desktop-only">${renderStatusBadge(series.status)}</div>
                        <div class="card-info">
                             <div class="card-info-right desktop-only">
                                ${series.universe ? `<div class="detail-item universe-tag"><i data-lucide="globe-2"></i><span>${series.universe}</span></div>` : ''}
                                ${charactersHTML}
                            </div>
                            <div class="card-main-details">
                                <div class="card-title-block"><p class="card-year">${series.year || 'N/A'}</p><h3 class="card-title">${series.title}</h3></div>
                                <div class="card-meta">${metaInfo}</div>
                            </div>
                        </div>
                    </div>
                    <div class="card-cover-container">
                        <img src="${coverUrl}" class="card-cover-image" alt="Capa de ${series.title}">
                         <div class="mobile-overlays">
                            <div class="card-counter">${visibleIndex + 1} de ${totalVisible}</div>
                            ${renderStatusBadge(series.status)}
                            <div class="card-info-right">
                                ${charactersHTML}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    };

    const renderTimeline = () => {
        if (!currentUniverse || !currentUniverse.timeline || currentUniverse.timeline.length === 0) {
            emptyTimelineMessage.classList.remove('hidden');
            timelineContainer.innerHTML = '';
            timelineContainer.classList.add('hidden');
            return;
        }

        emptyTimelineMessage.classList.add('hidden');
        timelineContainer.classList.remove('hidden');
        
        const visibleTimelineIds = getVisibleTimeline();
        const totalVisible = visibleTimelineIds.length;
        
        let timelineHtml = visibleTimelineIds.map((id, index) => {
            const { item, parent } = getItemAndContext(id);
            if (!item) return '';

            if (parent) {
                return renderEpisodeItem(item, parent, totalVisible, index);
            }
            if (item.type === 'series') {
                return renderSeriesHeader(item, totalVisible, index);
            }
            return renderSingleItem(item, totalVisible, index);
        }).join('');
        
        timelineContainer.innerHTML = timelineHtml;

        const items = document.querySelectorAll('.timeline-item');
        if (scrollObserver) scrollObserver.disconnect();
        scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('is-visible');
            });
        }, { threshold: 0.1 });
        items.forEach(item => scrollObserver.observe(item));
        lucide.createIcons();
    };
    
    const closeDetailsPanel = () => {
        detailsPanel.classList.remove('is-active');
        detailsPanelOverlay.classList.remove('is-active');
        document.body.style.overflow = ''; 
        selectedItemId = null;
        document.querySelectorAll('.timeline-card.selected').forEach(c => c.classList.remove('selected'));
        detailsPanel.style.removeProperty('--panel-bg-image');
        setTimeout(() => {
            if (!detailsPanel.classList.contains('is-active')) {
                detailsPanel.innerHTML = '';
            }
        }, 500);
    };


    const renderDetailsPanel = (itemId) => {
        const { item, parent } = getItemAndContext(itemId);
        if (!item) {
            closeDetailsPanel();
            return;
        }

        const isSeriesHeader = item.type === 'series';
        const isEpisode = !!parent;
        const allContent = dataManager.getAllContent();
        const isAttachment = !isSeriesHeader && !isEpisode && item.attachedTo;
        
        const displayItemForBanner = parent || (isAttachment ? allContent.find(c => c.id === item.attachedTo) : item) || item;
        const coverUrl = getValidImageUrl(displayItemForBanner.banner || displayItemForBanner.cover, 'https://placehold.co/800x450/1f2937/111827?text=Banner');
        detailsPanel.style.setProperty('--panel-bg-image', `url('${coverUrl}')`);
        const title = isEpisode ? `${parent.title} - ${item.title}` : item.title;
        
        let ratingSection = '';
        if (item.status === 'watched' && !isSeriesHeader) {
             ratingSection = `
                <div class="panel-rating">
                    <p class="text-sm font-semibold text-gray-400 mb-2">A tua avaliação (0-10):</p>
                    <div class="rating-input-group">
                        <input type="number" class="panel-rating-input" min="0" max="10" step="0.1" placeholder="N/A" value="${item.rating !== null && item.rating !== undefined ? item.rating.toFixed(1) : ''}">
                        <button class="panel-rating-save-btn" title="Guardar Avaliação">
                            <i data-lucide="check"></i>
                        </button>
                    </div>
                </div>`;
        }
        
        const visibleTimeline = getVisibleTimeline();
        const currentVisibleIndex = visibleTimeline.indexOf(itemId);
        const isFirst = currentVisibleIndex === 0;
        const isLast = currentVisibleIndex === visibleTimeline.length - 1;

        detailsPanel.innerHTML = `
            <button class="panel-close-btn"><i data-lucide="x"></i></button>
            <div class="panel-content">
                <img src="${coverUrl}" alt="Capa de ${title}" class="panel-cover">
                <h2 class="panel-title">${title}</h2>
                <div class="panel-actions">
                    ${!isSeriesHeader ? (
                        item.status !== 'watched' ?
                            `<button class="panel-status-btn mark-watched"><i data-lucide="check"></i>Marcar como Visto</button>` :
                            ratingSection
                    ) : ''}
                    
                    <div class="panel-action-grid">
                        <button class="panel-action-btn move-item-btn" data-direction="up" ${isFirst ? 'disabled' : ''}><i data-lucide="arrow-up"></i> Mover Cima</button>
                        <button class="panel-action-btn move-item-btn" data-direction="down" ${isLast ? 'disabled' : ''}><i data-lucide="arrow-down"></i> Mover Baixo</button>
                    </div>

                    ${isSeriesHeader ? `<button class="panel-action-btn expand-series-btn"><i data-lucide="${expandedSeries[item.id] ? 'chevron-up' : 'chevron-down'}"></i> ${expandedSeries[item.id] ? 'Esconder Episódios' : 'Mostrar Episódios'}</button>` : ''}
                    
                    ${!isEpisode ? `<button class="panel-action-btn delete delete-item-btn"><i data-lucide="trash-2"></i> Remover da Timeline</button>` : ''}
                </div>
            </div>
        `;
        lucide.createIcons();
    };
    
    const openDetailsPanel = (cardElement) => {
        const itemId = Number(cardElement.dataset.id);
        
        if (detailsPanel.classList.contains('is-active') && selectedItemId === itemId) {
            closeDetailsPanel();
            return;
        }

        selectedItemId = itemId;
        
        document.querySelectorAll('.timeline-card.selected').forEach(c => c.classList.remove('selected'));
        cardElement.classList.add('selected');
        
        renderDetailsPanel(itemId);
        detailsPanel.classList.add('is-active');
        detailsPanelOverlay.classList.add('is-active');
        
        if (window.innerWidth <= 767) {
            document.body.style.overflow = 'hidden';
        }
    };


    // ===================================================================
    // FUNÇÕES DE FILTRO E PESQUISA
    // ===================================================================
     const buildTagCaches = () => {
        if (!currentUniverse || !currentUniverse.timeline) return;
        const allContent = dataManager.getAllContent();
        const timelineContent = currentUniverse.timeline.map(id => allContent.find(c => c.id === id)).filter(Boolean);
        
        allFictionalUniversesCache = [...new Set(timelineContent.map(item => item.universe).filter(Boolean))].sort();
        allCharactersCache = [...new Set(timelineContent.flatMap(item => item.characters || []))].sort();
        allTagsCache = [...new Set(timelineContent.flatMap(item => item.tags || []))].sort();
    };

    const renderFilters = () => {
        const allContent = dataManager.getAllContent();
        const renderPills = (container, items, type) => {
            if (!container) return;
            const timelineContent = currentUniverse.timeline.map(id => allContent.find(c => c.id === id)).filter(Boolean);
            container.innerHTML = items.length > 0 ? items.map(itemValue => {
                const count = timelineContent.filter(i => {
                    if (type === 'universe') return i.universe === itemValue;
                    return i[type]?.includes(itemValue);
                }).length;
                return `<button class="filter-pill" data-filter-type="${type}" data-filter-value="${itemValue}"><span>${itemValue}</span><span class="filter-count">${count}</span></button>`
            }).join('') : '<p class="text-xs text-gray-500 px-2">Nenhuma opção.</p>';
        };
        renderPills(filterUniversesContainer, allFictionalUniversesCache, 'universe');
        renderPills(filterCharactersContainer, allCharactersCache, 'character');
        renderPills(filterTagsContainer, allTagsCache, 'tag');
    };

    const jumpToMatch = () => {
        document.querySelectorAll('.timeline-card.current-focus').forEach(card => card.classList.remove('current-focus'));
        if (currentMatchIndex === -1 || matchedCards.length === 0) {
            matchCounter.textContent = `0 / ${matchedCards.length}`;
            prevMatchBtn.disabled = true;
            nextMatchBtn.disabled = true;
            return;
        }

        const card = matchedCards[currentMatchIndex];
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('current-focus');
        
        matchCounter.textContent = `${currentMatchIndex + 1} / ${matchedCards.length}`;
        prevMatchBtn.disabled = currentMatchIndex === 0;
        nextMatchBtn.disabled = currentMatchIndex === matchedCards.length - 1;
    };
    
    const applyFiltersAndSearch = () => {
        const allContent = dataManager.getAllContent();
        const searchQuery = searchInput.value.toLowerCase().trim();
        document.querySelectorAll('.timeline-card.filter-match, .timeline-card.current-focus').forEach(card => card.classList.remove('filter-match', 'current-focus'));
        matchedCards = [];
        currentMatchIndex = -1;

        if (activeFilters.length === 0 && !searchQuery) {
            filterNav.classList.add('hidden');
            return;
        }

        const rehydratedTimeline = currentUniverse.timeline.map(id => allContent.find(c => c.id === id)).filter(Boolean);

        const matchedItems = rehydratedTimeline.filter(item => {
            const titleMatch = !searchQuery || item.title.toLowerCase().includes(searchQuery);
            if (!titleMatch) return false;
            
            return activeFilters.every(filter => {
                if (filter.type === 'universe') return item.universe === filter.value;
                if (filter.type === 'character') return item.characters?.includes(filter.value);
                if (filter.type === 'tag') return item.tags?.includes(filter.value);
                return false;
            });
        });

        const matchedElements = new Set(matchedItems.map(item => document.querySelector(`.timeline-card[data-id="${item.id}"]`)).filter(Boolean));
        matchedCards = Array.from(matchedElements);

        filterNav.classList.remove('hidden');
        activeFiltersContainer.innerHTML = activeFilters.map(f => `<span class="active-filter-pill">${f.value}</span>`).join('');

        if (matchedCards.length > 0) {
            matchedCards.forEach(card => card.classList.add('filter-match'));
            currentMatchIndex = 0;
        }
        
        jumpToMatch();
    };

    const scrollToLastWatched = () => {
        const allContent = dataManager.getAllContent();
        const rehydratedTimeline = currentUniverse.timeline.map(id => allContent.find(c => c.id === id)).filter(Boolean);
        
        let lastWatchedItemIndex = -1;
        for (let i = rehydratedTimeline.length - 1; i >= 0; i--) {
            const item = rehydratedTimeline[i];
            if (item.status === 'watched') {
                lastWatchedItemIndex = i;
                break;
            }
        }

        if (lastWatchedItemIndex !== -1) {
            setTimeout(() => {
                const cardElement = document.querySelectorAll('.timeline-card')[lastWatchedItemIndex];
                if (cardElement) {
                    cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    cardElement.classList.add('current-focus');
                    setTimeout(() => cardElement.classList.remove('current-focus'), 2500);
                }
            }, 500);
        }
    };

    // ===================================================================
    // EVENT LISTENERS
    // ===================================================================
    timelineContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.timeline-card');
        if (card && card.dataset.id) {
            openDetailsPanel(card);
        }
    });

    detailsPanel.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;

        const { item, parent } = getItemAndContext(selectedItemId);
        if (!item) return;
        
        if (button.classList.contains('panel-close-btn')) {
            closeDetailsPanel();
        } 
        else if (button.classList.contains('mark-watched')) {
            item.status = 'watched';
            item.rating = null; 
            if (!item.watchedDates) item.watchedDates = [];
            item.watchedDates.push(Date.now());
            
            if (parent) {
                updateSeriesStatus(parent);
            }

            dataManager.saveAllData();
            renderDetailsPanel(selectedItemId); 
            renderTimeline();
        }
        else if (button.classList.contains('panel-rating-save-btn')) {
            const input = detailsPanel.querySelector('.panel-rating-input');
            if (!input) return;

            const rawValue = input.value.trim();
            let newRating = null;

            if (rawValue !== '') {
                const parsedValue = parseFloat(rawValue.replace(',', '.'));

                if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 10) {
                    newRating = parsedValue;
                } else {
                    input.classList.add('input-error');
                    setTimeout(() => input.classList.remove('input-error'), 500);
                    return;
                }
            }

            item.rating = newRating;
            dataManager.saveAllData();
            renderTimeline();
            
            button.innerHTML = '<i data-lucide="check-check"></i>';
            lucide.createIcons({ nodes: [button] });
            button.disabled = true;

            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = '<i data-lucide="check"></i>';
                lucide.createIcons({ nodes: [button] });
            }, 1500);

            input.value = newRating !== null ? newRating.toFixed(1) : '';
        }
        else if (button.classList.contains('expand-series-btn')) {
            expandedSeries[item.id] = !expandedSeries[item.id];
            saveExpandedState();
            renderTimeline();
            renderDetailsPanel(selectedItemId);
        }
        else if (button.classList.contains('delete-item-btn')) {
            if (confirm("Tem a certeza que quer remover este item da timeline?")) {
                const indexToRemove = currentUniverse.timeline.indexOf(selectedItemId);
                if (indexToRemove > -1) {
                    currentUniverse.timeline.splice(indexToRemove, 1);
                }
                dataManager.saveAllData();
                closeDetailsPanel();
                renderTimeline();
            }
        }
        else if (button.classList.contains('move-item-btn')) {
            const allContent = dataManager.getAllContent();
            const actualTimeline = currentUniverse.timeline;
            const visibleTimeline = getVisibleTimeline();
            const itemToMoveId = selectedItemId;
            const currentVisibleIndex = visibleTimeline.indexOf(itemToMoveId);
            const direction = button.dataset.direction === 'up' ? -1 : 1;
            const targetVisibleIndex = currentVisibleIndex + direction;

            if (targetVisibleIndex < 0 || targetVisibleIndex >= visibleTimeline.length) return;

            const {item: itemToMove} = getItemAndContext(itemToMoveId);
            const {item: targetItem} = getItemAndContext(visibleTimeline[targetVisibleIndex]);

            if (itemToMove.attachedTo) {
                const parentId = itemToMove.attachedTo;
                const attachments = allContent.filter(c => c.attachedTo === parentId).sort((a,b) => (a.order || 0) - (b.order || 0));
                const oldIndex = attachments.findIndex(a => a.id === itemToMoveId);
                const [moved] = attachments.splice(oldIndex, 1);
                
                let newIndex = oldIndex + direction;
                newIndex = Math.max(0, Math.min(attachments.length, newIndex));
                
                attachments.splice(newIndex, 0, moved);
                attachments.forEach((att, i) => att.order = i + 1);
            }
            else {
                 const fromIndex = actualTimeline.indexOf(itemToMoveId);
                 actualTimeline.splice(fromIndex, 1);
                 
                 const targetPrimaryId = targetItem.attachedTo || targetItem.id;
                 const toIndex = actualTimeline.indexOf(targetPrimaryId);

                 actualTimeline.splice(toIndex + (direction > 0 ? 1 : 0), 0, itemToMoveId);
            }
           
            dataManager.saveAllData();
            renderTimeline();
            setTimeout(() => {
                 const newCard = document.querySelector(`.timeline-card[data-id="${selectedItemId}"]`);
                 if (newCard) {
                    newCard.classList.add('selected');
                    renderDetailsPanel(selectedItemId); 
                 }
            }, 100);
        }
    });
    
    timelineContainer.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.timeline-card');
        if (card) {
            const bannerUrl = card.dataset.bannerUrl;
            if (bannerUrl && pageBackground.style.backgroundImage !== `url("${bannerUrl}")`) {
                pageBackground.style.opacity = '0';
                setTimeout(() => {
                    pageBackground.style.backgroundImage = `url("${bannerUrl}")`;
                    pageBackground.style.opacity = '1';
                }, 300);
            }
        }
    });

    timelineContainer.addEventListener('mouseleave', () => {
        const defaultBannerUrl = getValidImageUrl(currentUniverse.cover, '');
        if (defaultBannerUrl && pageBackground.style.backgroundImage !== `url("${defaultBannerUrl}")`) {
            pageBackground.style.opacity = '0';
            setTimeout(() => {
                pageBackground.style.backgroundImage = `url("${defaultBannerUrl}")`;
                pageBackground.style.opacity = '1';
            }, 300);
        }
    });

    searchInput.addEventListener('input', debounce(applyFiltersAndSearch, 300));

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('hidden');
    });

    filterDropdown.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (pill) {
            pill.classList.toggle('active');
            const type = pill.dataset.filterType;
            const value = pill.dataset.filterValue;
            const filterIndex = activeFilters.findIndex(f => f.type === type && f.value === value);

            if (filterIndex > -1) activeFilters.splice(filterIndex, 1);
            else activeFilters.push({ type, value });
            
            applyFiltersAndSearch();
        }
    });

    clearFiltersBtn.addEventListener('click', () => {
        activeFilters = [];
        searchInput.value = '';
        document.querySelectorAll('.filter-pill.active').forEach(p => p.classList.remove('active'));
        applyFiltersAndSearch();
        filterNav.classList.add('hidden');
    });

    nextMatchBtn.addEventListener('click', () => {
        if (currentMatchIndex < matchedCards.length - 1) {
            currentMatchIndex++;
            jumpToMatch();
        }
    });

    prevMatchBtn.addEventListener('click', () => {
        if (currentMatchIndex > 0) {
            currentMatchIndex--;
            jumpToMatch();
        }
    });

    document.addEventListener('click', (e) => {
        if (filterDropdown && !filterDropdown.classList.contains('hidden') && !filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
            filterDropdown.classList.add('hidden');
        }
        if (window.innerWidth > 767 && detailsPanel.classList.contains('is-active') && !detailsPanel.contains(e.target) && !e.target.closest('.timeline-card')) {
            closeDetailsPanel();
        }
    });
    
    if (detailsPanelOverlay) {
        detailsPanelOverlay.addEventListener('click', closeDetailsPanel);
    }


    // ===================================================================
    // INICIALIZAÇÃO
    // ===================================================================
    const init = () => {
        if (typeof dataManager === 'undefined') {
            console.error("ERRO CRÍTICO: data-manager.js não foi carregado antes de timeline.js");
            alert("Ocorreu um erro crítico. A aplicação pode não funcionar corretamente.");
            return;
        }
        dataManager.loadAllData();
        
        currentUniverseId = localStorage.getItem('selectedUniverseId');
        if (currentUniverseId) {
            currentUniverse = dataManager.getUniverseById(currentUniverseId);
            if (currentUniverse) {
                const storedExpanded = localStorage.getItem(`expandedState_${currentUniverseId}`);
                expandedSeries = storedExpanded ? JSON.parse(storedExpanded) : {};
            }
        }
        
        buildParentSeriesCache();
        if(currentUniverse) {
            universeTitle.textContent = currentUniverse.name;
            universeSubtitle.textContent = currentUniverse.description;
            if (currentUniverse.cover) {
                pageBackground.style.backgroundImage = `url("${getValidImageUrl(currentUniverse.cover, '')}")`;
                pageBackground.style.opacity = '1';
            }
            buildTagCaches();
            renderFilters();
            renderTimeline();
            scrollToLastWatched();
        } else {
            emptyTimelineMessage.textContent = "Universo não encontrado. Por favor, volte atrás e selecione um universo válido.";
            emptyTimelineMessage.classList.remove('hidden');
        }
    };

    init();
});

