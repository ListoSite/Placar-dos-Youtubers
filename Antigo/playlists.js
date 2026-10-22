document.addEventListener('DOMContentLoaded', () => {
    console.log("Script das Playlists v24.0 - Sincronizado com Data Manager.");

    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (GERAL)
    // ===================================================================
    const addPlaylistBtn = document.getElementById('add-playlist-btn');
    const playlistsListEl = document.getElementById('playlists-list');
    const currentPlaylistTitleEl = document.getElementById('current-playlist-title');
    const currentPlaylistDescEl = document.getElementById('current-playlist-description');
    const searchContentInput = document.getElementById('search-content-input');
    const contentGridEl = document.getElementById('content-grid');
    const emptyContentMessage = document.getElementById('empty-content-message');
    const addContentBtn = document.getElementById('add-content-btn');
    const storageErrorToast = document.getElementById('storage-error-toast');
    const toggleEditModeBtn = document.getElementById('toggle-edit-mode-btn');
    const playlistsSidebar = document.getElementById('playlists-sidebar');
    
    // Elementos da Barra de Progresso
    const playlistProgressContainer = document.getElementById('playlist-progress-container');
    const progressTextEl = document.getElementById('progress-text');
    const progressPercentageEl = document.getElementById('progress-percentage');
    const progressBarFillEl = document.getElementById('progress-bar-fill');
    
    // Elementos dos Filtros
    const filtersContainer = document.getElementById('filters-container');
    const originalFiltersParent = filtersContainer.parentElement; // Guarda a referência do pai original
    const sortByYear = document.getElementById('sort-by-year');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    // Elementos do Modal de Filtros (Mobile)
    const mobileFilterBtn = document.getElementById('mobile-filter-btn');
    const mobileFiltersModal = document.getElementById('mobile-filters-modal');
    const mobileFiltersContainer = document.getElementById('mobile-filters-container');
    const closeMobileFiltersBtn = document.getElementById('close-mobile-filters-btn');

    // Elementos de Navegação Mobile
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mainSidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');


    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (MODAL DE CONTEÚDO)
    // ===================================================================
    const itemModal = document.getElementById('item-modal');
    const closeItemModalBtn = document.getElementById('close-item-modal-btn');
    const itemForm = document.getElementById('item-form');
    const itemModalTitle = document.getElementById('item-modal-title');
    const itemSaveBtnText = document.getElementById('item-save-btn-text');
    const clearItemFormBtn = document.getElementById('clear-item-form-btn');
    
    const itemIdInput = document.getElementById('item-id');
    const itemTitleInput = document.getElementById('item-title');
    const itemCoverInput = document.getElementById('item-cover');
    const itemBannerInput = document.getElementById('item-banner');
    const itemYearInput = document.getElementById('item-year');
    const itemRuntimeInput = document.getElementById('item-runtime');
    const itemCommentInput = document.getElementById('item-comment');
    
    const universeContainer = document.getElementById('item-universe-container');
    const universeInput = document.getElementById('item-universe-input');
    const universeSuggestions = document.getElementById('universe-suggestions');
    
    const charactersContainer = document.getElementById('item-characters-container');
    const charactersInput = document.getElementById('item-characters-input');
    const charactersSuggestions = document.getElementById('characters-suggestions');

    const tagsContainer = document.getElementById('item-tags-container');
    const tagsInput = document.getElementById('item-tags-input');
    const tagsSuggestions = document.getElementById('tags-suggestions');

    const itemPlaylistsContainer = document.getElementById('item-playlists-container');
    
    const itemTypeInput = document.getElementById('item-type');
    const itemTypeSelector = document.getElementById('item-type-selector');
    const itemStatusInput = document.getElementById('item-status');
    const itemStatusSelector = document.getElementById('item-status-selector');
    const itemRatingInput = document.getElementById('item-rating');
    const starRatingContainer = document.getElementById('star-rating-container');
    const ratingFeedback = document.getElementById('rating-feedback');
    
    const coverPreview = document.getElementById('cover-preview');
    const bannerPreview = document.getElementById('banner-preview');

    // Secção de Anexos
    const attachmentSection = document.getElementById('attachment-section');
    const itemAttachToSelect = document.getElementById('item-attach-to');
    const itemOrderInput = document.getElementById('item-order');

    const episodesSection = document.getElementById('episodes-section');
    const episodesListContainer = document.getElementById('episodes-list');
    const newEpisodeTitleInput = document.getElementById('new-episode-title');
    const addEpisodeBtn = document.getElementById('add-episode-btn');

    const seriesInfoSection = document.getElementById('series-info-section');
    const seriesRuntimeOutput = document.getElementById('series-runtime-output');
    const seriesRatingOutput = document.getElementById('series-rating-output');

    // Cronologia de Visualização (Conteúdo Principal)
    const watchedDatesSection = document.getElementById('watched-dates-section');
    const watchedDatesList = document.getElementById('watched-dates-list');
    const watchedDatesCountEl = document.getElementById('watched-dates-count');
    const addCurrentWatchedDateBtn = document.getElementById('add-current-watched-date-btn');
    const addManualWatchedDateBtn = document.getElementById('add-manual-watched-date-btn');

    // Modal de data manual
    const manualDateModal = document.getElementById('manual-date-modal');
    const manualDateForm = document.getElementById('manual-date-form');
    const manualDateInput = document.getElementById('manual-date-input');
    const manualTimeInput = document.getElementById('manual-time-input');
    const cancelManualDateBtn = document.getElementById('cancel-manual-date-btn');


    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (MODAL DE EPISÓDIOS)
    // ===================================================================
    const episodesViewerModal = document.getElementById('episodes-viewer-modal');
    const closeEpisodesViewerBtn = document.getElementById('close-episodes-viewer-btn');
    const episodesViewerCover = document.getElementById('episodes-viewer-cover');
    const episodesViewerTitle = document.getElementById('episodes-viewer-title');
    const episodesViewerStats = document.getElementById('episodes-viewer-stats');
    const episodesViewerList = document.getElementById('episodes-viewer-list');
    const episodesViewerBody = document.querySelector('.episodes-viewer-body');
    
    const episodeEditorPanel = document.getElementById('episode-editor-panel');
    const episodeEditorForm = document.getElementById('episode-editor-form');
    const editingSeriesIdInput = document.getElementById('editing-series-id');
    const editingEpisodeIndexInput = document.getElementById('editing-episode-index');
    const epEditorTitleInput = document.getElementById('ep-editor-title');
    const epEditorRuntimeInput = document.getElementById('ep-editor-runtime');
    const epEditorRatingContainer = document.getElementById('ep-editor-rating');
    const epRatingFeedback = document.getElementById('ep-rating-feedback');
    const epEditorStatusContainer = document.getElementById('ep-editor-status');
    const epEditorCommentInput = document.getElementById('ep-editor-comment');
    const cancelEpisodeEditBtn = document.getElementById('cancel-episode-edit-btn');
    
    // Cronologia de Visualização (Episódios)
    const epWatchedDatesSection = document.getElementById('ep-watched-dates-section');
    const epWatchedDatesList = document.getElementById('ep-watched-dates-list');
    const epWatchedDatesCountEl = document.getElementById('ep-watched-dates-count');
    const epAddCurrentWatchedDateBtn = document.getElementById('ep-add-current-watched-date-btn');
    const epAddManualWatchedDateBtn = document.getElementById('ep-add-manual-watched-date-btn');

    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (MODAL DE COMENTÁRIO)
    // ===================================================================
    const commentViewerModal = document.getElementById('comment-viewer-modal');
    const closeCommentViewerBtn = document.getElementById('close-comment-viewer-btn');
    const commentViewerTitle = document.getElementById('comment-viewer-title');
    const commentViewerText = document.getElementById('comment-viewer-text');

    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (MODAL DE ANEXOS)
    // ===================================================================
    const attachmentsViewerModal = document.getElementById('attachments-viewer-modal');
    const closeAttachmentsViewerBtn = document.getElementById('close-attachments-viewer-btn');
    const attachmentsViewerHeader = document.getElementById('attachments-viewer-header');
    const attachmentsViewerList = document.getElementById('attachments-viewer-list');

    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM (ASSOCIAÇÃO DE UNIVERSOS)
    // ===================================================================
    const itemUniversesContainer = document.getElementById('item-universes-container');
    const addToUniverseBtn = document.getElementById('add-to-universe-btn');
    const addToUniverseModal = document.getElementById('add-to-universe-modal');
    const closeAddToUniverseBtn = document.getElementById('close-add-to-universe-btn');
    const universeSelectionList = document.getElementById('universe-selection-list');


    // ===================================================================
    // ESTADO DA APLICAÇÃO
    // ===================================================================
    let activePlaylistId = 'all'; 

    let currentUniverse = '';
    let currentCharacters = [];
    let currentTags = [];
    let currentUniverseAssociations = {}; 
    let currentWatchedDates = [];
    let currentEpisodeWatchedDates = [];
    let manualDateTarget = 'content';
    
    let allUniversesCache = [];
    let allCharactersCache = [];
    let allTagsCache = [];
    
    let activeFilters = {
        type: [],
        universe: [],
        character: [],
        tag: []
    };
    
    const PRIMARY_CONTENT_TYPES = ['movie', 'series', 'short', 'especial'];


    // ===================================================================
    // FUNÇÕES DE GESTÃO DE DADOS (Agora usam o dataManager)
    // ===================================================================
     const showStorageError = () => {
        if (!storageErrorToast) return;
        storageErrorToast.classList.add('toast-visible');
        setTimeout(() => {
            storageErrorToast.classList.remove('toast-visible');
        }, 5000);
    };

    // A função saveData foi removida daqui, pois agora é centralizada no dataManager.
    // Todas as modificações chamarão dataManager.saveAllData()
    
    // ===================================================================
    // FUNÇÕES DE FILTROS E LÓGICA MOBILE
    // ===================================================================
    const setupMobileFilters = () => {
        const isMobile = window.innerWidth <= 767;
        if (isMobile) {
            // Move o container de filtros para dentro do modal se ainda não estiver lá
            if (mobileFiltersContainer && !mobileFiltersContainer.contains(filtersContainer)) {
                mobileFiltersContainer.appendChild(filtersContainer);
            }
        } else {
            // Devolve o container de filtros para a sua posição original no header
            if (originalFiltersParent && !originalFiltersParent.contains(filtersContainer)) {
                originalFiltersParent.appendChild(filtersContainer);
            }
        }
    };
    
    const toggleSidebar = () => {
        if (mainSidebar && sidebarOverlay) {
            mainSidebar.classList.toggle('is-open');
            sidebarOverlay.classList.toggle('is-visible');
        }
    };

    const updateFilterButtonsUI = () => {
        const containers = document.querySelectorAll('.filter-dropdown-container');
        containers.forEach(container => {
            const category = container.dataset.filterCategory;
            const button = container.querySelector('.filter-btn');
            const label = button.querySelector('.filter-btn-label');
            const selectedCount = activeFilters[category].length;

            const defaultLabel = {
                type: 'Tipo', universe: 'Universo',
                character: 'Personagem', tag: 'Tag'
            }[category];

            if (selectedCount > 0) {
                button.classList.add('active');
                label.textContent = `${defaultLabel} (${selectedCount})`;
            } else {
                button.classList.remove('active');
                label.textContent = defaultLabel;
            }
        });
    };

    const populateFilters = () => {
        const allContent = dataManager.getAllContent();
        buildTagCaches(allContent); // Recalcula os caches com os dados atuais

        const filtersData = {
            type: [...new Set(allContent.map(item => item.type).filter(Boolean))].sort(),
            universe: allUniversesCache,
            character: allCharactersCache,
            tag: allTagsCache,
        };

        for (const category in filtersData) {
            const container = document.querySelector(`.filter-dropdown-container[data-filter-category="${category}"]`);
            if (container) {
                const optionsContainer = container.querySelector('.filter-options');
                optionsContainer.innerHTML = ''; 
                const options = filtersData[category];

                if (options.length > 0) {
                    options.forEach(option => {
                        const isChecked = activeFilters[category].includes(option);
                        const optionHTML = `
                            <label class="filter-option-label">
                                <input type="checkbox" value="${option}" data-category="${category}" ${isChecked ? 'checked' : ''}>
                                <span class="filter-checkbox"></span>
                                <span>${option.charAt(0).toUpperCase() + option.slice(1)}</span>
                            </label>
                        `;
                        optionsContainer.innerHTML += optionHTML;
                    });
                    container.style.display = '';
                } else {
                    container.style.display = 'none';
                }
            }
        }
    };

    const resetFilters = () => {
        searchContentInput.value = '';
        activeFilters = { type: [], universe: [], character: [], tag: [] };
        
        const allCheckboxes = document.querySelectorAll('.filter-options input[type="checkbox"]');
        allCheckboxes.forEach(cb => cb.checked = false);

        sortByYear.value = 'newest';
        updateFilterButtonsUI();
        renderContentGrid();
    };

    // ===================================================================
    // FUNÇÕES AUXILIARES E DE LÓGICA
    // ===================================================================
    const buildTagCaches = (allContent) => {
        allUniversesCache = [...new Set(allContent.map(item => item.universe).filter(Boolean))].sort();
        allCharactersCache = [...new Set(allContent.flatMap(item => item.characters || []))].sort();
        allTagsCache = [...new Set(allContent.flatMap(item => item.tags || []))].sort();
    };

    const parseRuntime = (runtimeStr) => {
        if (!runtimeStr) return null;
        if (runtimeStr.includes(':')) {
            const parts = runtimeStr.split(':');
            const hours = parseInt(parts[0], 10) || 0;
            const minutes = parseInt(parts[1], 10) || 0;
            return (hours * 60) + minutes;
        }
        const singleValue = parseInt(runtimeStr, 10);
        return isNaN(singleValue) ? null : singleValue;
    };
    
    const formatRuntimeForInput = (minutes) => {
        if (!minutes || isNaN(minutes) || minutes <= 0) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${String(mins).padStart(2, '0')}`;
    };

    const formatRuntime = (minutes) => {
        if (!minutes || isNaN(minutes) || minutes <= 0) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        let result = '';
        if (hours > 0) result += `${hours}h `;
        if (mins > 0) result += `${mins}m`;
        return result.trim();
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRatingColorClass = (rating) => {
        const r = parseFloat(rating);
        if (r >= 8.5) return 'text-green-400';
        if (r >= 7) return 'text-yellow-400';
        if (r >= 5) return 'text-orange-400';
        if (r > 0) return 'text-red-400';
        return 'text-gray-500';
    };
    
    const calculateSeriesTotalRuntime = (episodes = []) => {
        const validEpisodes = episodes.filter(ep => typeof ep.runtime === 'number' && ep.runtime > 0);
        if (validEpisodes.length === 0) return 0;
        return validEpisodes.reduce((sum, ep) => sum + ep.runtime, 0);
    };

    const calculateSeriesAverageRating = (episodes = []) => {
        const ratedEpisodes = episodes.filter(ep => ep.rating !== null && typeof ep.rating === 'number' && ep.rating >= 0);
        if (ratedEpisodes.length === 0) return 'N/A';
        const totalRating = ratedEpisodes.reduce((sum, ep) => sum + ep.rating, 0);
        const average = totalRating / ratedEpisodes.length;
        return parseFloat(average.toFixed(1));
    };

    const calculateSeriesInfo = (seriesItem) => {
        if (!seriesItem || seriesItem.type !== 'series' || !seriesItem.episodes) {
            return { episodeCount: 0, totalRuntime: 0, averageRating: 'N/A' };
        }
        const episodeCount = seriesItem.episodes.length;
        const totalRuntime = calculateSeriesTotalRuntime(seriesItem.episodes);
        const averageRating = calculateSeriesAverageRating(seriesItem.episodes);
        return { episodeCount, totalRuntime, averageRating };
    };

    const getIconForType = (type) => ({
        movie: 'film', series: 'tv', short: 'clapperboard',
        trailer: 'video', extra: 'plus-circle', intro: 'log-in', plus: 'plus', especial: 'award'
    }[type] || 'film');

    const updateSeriesStatusFromEpisodes = (series) => {
        if (!series || series.type !== 'series' || !series.episodes) {
            return;
        }

        const episodes = series.episodes;
        const totalEpisodes = episodes.length;
        if (totalEpisodes === 0) return;

        const watchedCount = episodes.filter(ep => ep.status === 'watched').length;
        const watchingCount = episodes.filter(ep => ep.status === 'watching').length;

        if (watchedCount === totalEpisodes) {
            series.status = 'watched';
        } 
        else if (watchedCount > 0 || watchingCount > 0) {
            series.status = 'watching';
        }
    };
    
    const moveContentToPlaylist = (contentId, targetPlaylistId) => {
        const playlists = dataManager.getPlaylists();
        const contentIdNum = Number(contentId);
        const targetPlaylist = playlists.find(p => p.id == targetPlaylistId);

        if (targetPlaylist) {
            if (!targetPlaylist.contentIds.includes(contentIdNum)) {
                targetPlaylist.contentIds.push(contentIdNum);
            }
        }
        
        dataManager.saveAllData(); // Centralized save
        renderPlaylists();
        renderContentGrid();
    };

    // ===================================================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ===================================================================
    const renderStatusBadge = (status) => {
        const badgeInfo = {
            watched: { icon: 'check', text: 'Visto', className: 'watched' },
            watching: { icon: 'eye', text: 'A Ver', className: 'watching' },
            want_to_watch: { icon: 'bookmark', text: 'Quero Ver', className: 'want_to_watch' }
        };

        if (badgeInfo[status]) {
            const { icon, text, className } = badgeInfo[status];
            return `<div class="card-status-badge ${className}"><i data-lucide="${icon}"></i><span>${text}</span></div>`;
        }
        return '';
    };
    
    const renderPlaylists = () => {
        const playlists = dataManager.getPlaylists();
        const allContent = dataManager.getAllContent();

        playlistsListEl.innerHTML = '';
        const allContentCount = allContent.filter(item => {
            const isPrimary = PRIMARY_CONTENT_TYPES.includes(item.type);
            const isAttached = item.attachedTo;
            return isPrimary || !isAttached;
        }).length;

        playlistsListEl.innerHTML += `<div class="playlist-item ${activePlaylistId === 'all' ? 'active' : ''}" data-id="all"><div class="item-info"><i data-lucide="inbox"></i><span class="playlist-name">Todos os Conteúdos</span></div><span class="item-count">${allContentCount}</span></div>`;
        
        playlists.forEach(playlist => {
            playlistsListEl.innerHTML += `
            <div class="playlist-item ${activePlaylistId === playlist.id ? 'active' : ''}" data-id="${playlist.id}" draggable="false">
                <i data-lucide="grip-vertical" class="drag-handle"></i>
                <div class="item-info">
                    <i data-lucide="list"></i>
                    <span class="playlist-name">${playlist.name}</span>
                </div>
                <div class="playlist-item-actions">
                    <button class="edit" title="Editar Nome"><i data-lucide="pencil"></i></button>
                    <button class="delete" title="Apagar Playlist"><i data-lucide="trash-2"></i></button>
                </div>
                <span class="item-count">${playlist.contentIds.length}</span>
            </div>`;
        });
        lucide.createIcons();
    };
    
    const calculatePlaylistProgress = (playlist) => {
        if (!playlist || !playlist.contentIds) {
            return { watchedItems: 0, totalItems: 0, percentage: 0, precisePercentage: 0 };
        }

        const allContent = dataManager.getAllContent();
        const contentIds = new Set(playlist.contentIds);
        const itemsInPlaylist = allContent.filter(item => contentIds.has(item.id));

        let totalItemsToCount = 0;
        let watchedItemsCount = 0;

        itemsInPlaylist.forEach(item => {
            if (PRIMARY_CONTENT_TYPES.includes(item.type)) {
                if (item.type === 'series') {
                    const episodes = item.episodes || [];
                    if (episodes.length > 0) {
                        totalItemsToCount += episodes.length;
                        watchedItemsCount += episodes.filter(ep => ep.status === 'watched').length;
                    }
                } else {
                    totalItemsToCount++;
                    if (item.status === 'watched') {
                        watchedItemsCount++;
                    }
                }
            }
        });
        
        const precisePercentage = totalItemsToCount > 0 ? (watchedItemsCount / totalItemsToCount) * 100 : 0;
        const roundedPercentage = Math.round(precisePercentage);

        return { 
            totalItems: totalItemsToCount, 
            watchedItems: watchedItemsCount, 
            percentage: roundedPercentage,
            precisePercentage: precisePercentage
        };
    };

    const renderPlaylistProgress = (playlist) => {
        if (!playlistProgressContainer) return;

        if (!playlist || activePlaylistId === 'all') {
            playlistProgressContainer.classList.add('hidden');
            return;
        }

        const progress = calculatePlaylistProgress(playlist);

        if (progress.totalItems === 0) {
            playlistProgressContainer.classList.add('hidden');
            return;
        }
        
        progressTextEl.textContent = `Vistos ${progress.watchedItems} de ${progress.totalItems}`;
        progressPercentageEl.textContent = `${progress.percentage}%`;
        progressBarFillEl.style.width = `${progress.precisePercentage}%`;

        playlistProgressContainer.classList.remove('hidden');
    };


    const renderContentGrid = () => {
        const allContent = dataManager.getAllContent();
        const playlists = dataManager.getPlaylists();

        let contentForPlaylist = [];
        let contentToDisplay = [];
        let currentPlaylist = null;

        if (activePlaylistId === 'all') {
            contentToDisplay = allContent.filter(item => {
                const isPrimary = PRIMARY_CONTENT_TYPES.includes(item.type);
                const isAttached = item.attachedTo;
                return isPrimary || !isAttached;
            });
            currentPlaylistTitleEl.textContent = 'Todos os Conteúdos';
            currentPlaylistDescEl.textContent = 'Todo o seu conteúdo, organizado ou não em playlists.';
        } else {
            const playlist = playlists.find(p => p.id === activePlaylistId);
            currentPlaylist = playlist;
            if (playlist) {
                const contentIds = new Set(playlist.contentIds);
                contentToDisplay = allContent.filter(c => contentIds.has(c.id));
                currentPlaylistTitleEl.textContent = playlist.name;
                currentPlaylistDescEl.textContent = `A tua coleção de conteúdos para "${playlist.name}".`;
            }
        }
        
        renderPlaylistProgress(currentPlaylist);

        const searchTerm = searchContentInput.value.toLowerCase();
        const sortOrder = sortByYear.value;

        let filteredContent = contentToDisplay
            .filter(c => searchTerm ? c.title.toLowerCase().includes(searchTerm) : true)
            .filter(c => {
                if (activeFilters.type.length === 0) return true;
                return activeFilters.type.includes(c.type);
            })
            .filter(c => {
                if (activeFilters.universe.length === 0) return true;
                return activeFilters.universe.includes(c.universe);
            })
            .filter(c => {
                if (activeFilters.character.length === 0) return true;
                if (!c.characters || c.characters.length === 0) return false;
                return c.characters.some(char => activeFilters.character.includes(char));
            })
            .filter(c => {
                if (activeFilters.tag.length === 0) return true;
                if (!c.tags || c.tags.length === 0) return false;
                return c.tags.some(tag => activeFilters.tag.includes(tag));
            });
        
        filteredContent.sort((a, b) => {
            const yearA = parseInt(a.year, 10) || 0;
            const yearB = parseInt(b.year, 10) || 0;
            return sortOrder === 'newest' ? yearB - yearA : yearA - yearB;
        });

        contentGridEl.innerHTML = '';
        emptyContentMessage.classList.toggle('hidden', filteredContent.length > 0);
        filteredContent.forEach(item => {
            let attachmentCountersHTML = '';
            if (PRIMARY_CONTENT_TYPES.includes(item.type)) {
                const attachments = allContent.filter(c => c.attachedTo === item.id);
                if (attachments.length > 0) {
                    const counts = attachments.reduce((acc, curr) => {
                        acc[curr.type] = (acc[curr.type] || 0) + 1;
                        return acc;
                    }, {});

                    const sortedTypes = Object.keys(counts).sort();
                    attachmentCountersHTML = `<button class="card-attachment-counters view-attachments-btn" data-id="${item.id}">`;
                    for (const type of sortedTypes) {
                        const icon = getIconForType(type);
                        const count = counts[type];
                        attachmentCountersHTML += `<div class="attachment-counter-item" title="${count} ${type}(s)">
                                                      <i data-lucide="${icon}"></i>
                                                      <span>${count}</span>
                                                  </div>`;
                    }
                    attachmentCountersHTML += '</button>';
                }
            }

            const typeIcon = getIconForType(item.type);
            let ratingDisplay = 'N/A';
            let runtimeDisplay = formatRuntime(item.runtime);
            let ratingColor = getRatingColorClass(item.rating);
            const viewCount = item.watchedDates ? item.watchedDates.length : 0;
            
            const markWatchedAction = item.status !== 'watched'
                ? `<button class="card-action-btn mark-watched-btn" data-id="${item.id}" title="Marcar como Visto"><i data-lucide="check-circle-2" class="w-5 h-5"></i></button>`
                : '';

            let specificActions = '';
            if (item.type === 'series') {
                const { episodeCount, totalRuntime, averageRating } = calculateSeriesInfo(item);
                runtimeDisplay = `${formatRuntime(totalRuntime)} (${episodeCount} Eps.)`;
                ratingDisplay = averageRating !== 'N/A' ? `${averageRating} / 10` : 'N/A';
                ratingColor = getRatingColorClass(averageRating);
                specificActions = `<button class="card-action-btn view-episodes-btn" data-id="${item.id}" title="Ver Episódios"><i data-lucide="list-video" class="w-5 h-5"></i></button>`;
            } else {
                ratingDisplay = item.rating !== null && item.rating !== undefined ? `${parseFloat(item.rating).toFixed(1)} / 10` : 'N/A';
                ratingColor = getRatingColorClass(item.rating);
                specificActions = `<button class="card-action-btn view-comment-btn" data-id="${item.id}" title="Ver Comentário"><i data-lucide="message-square" class="w-5 h-5"></i></button>`;
            }

            const commonActions = `
                <button class="card-action-btn edit-content-btn" data-id="${item.id}" title="Editar Conteúdo"><i data-lucide="pencil" class="w-5 h-5"></i></button>
                <button class="card-action-btn delete-content-btn" data-id="${item.id}" title="Apagar Conteúdo"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            `;
            
            const viewCountDisplay = viewCount > 0 ? `<div class="meta-item"><i data-lucide="eye"></i><span>${viewCount}x</span></div>` : '';
            const actionsHTML = markWatchedAction + specificActions + commonActions;
            
            let orderBadge = '';
            if (item.order) {
                orderBadge = `<div class="card-order-badge">#${item.order}</div>`;
            }

            contentGridEl.innerHTML += `
                <div class="content-card" data-id="${item.id}" draggable="true">
                    <div class="card-expander">
                        <div class="card-cover-container">
                            ${renderStatusBadge(item.status)}
                            ${orderBadge}
                            <img src="${item.cover || 'https://placehold.co/400x600/1f2937/4f46e5?text=Capa'}" alt="Capa de ${item.title}" class="card-cover-image">
                            <div class="card-cover-overlay"></div>
                            <div class="card-cover-info">
                                <p class="card-year">${item.year || 'N/A'}</p>
                                <h4 class="card-title">${item.title}</h4>
                            </div>
                        </div>
                        <div class="card-details-container">
                            <div class="card-details-background" style="background-image: url('${item.banner || item.cover || 'https://placehold.co/800x450/1f2937/111827?text=Banner'}')"></div>
                            <div class="card-details-gradient"></div>
                            <div class="card-actions">${actionsHTML}</div>
                            <div class="card-details-info" data-id="${item.id}">
                                 <h4 class="card-title">${item.title}</h4>
                                 <div class="card-meta">
                                    <div class="meta-item ${ratingColor}"><i data-lucide="star"></i><span>${ratingDisplay}</span></div>
                                    <div class="meta-item"><i data-lucide="${typeIcon}"></i><span>${item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'N/A'}</span></div>
                                    <div class="meta-item"><i data-lucide="clock"></i><span>${runtimeDisplay}</span></div>
                                    ${viewCountDisplay}
                                </div>
                                ${attachmentCountersHTML}
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    };

    // ... (O resto do código de renderização permanece igual)
    // ===================================================================
    // FUNÇÕES DO MODAL DE CONTEÚDO
    // ===================================================================
    
    const updateImagePreview = (input, preview) => {
        const url = input.value;
        if (url && (url.startsWith('http') || url.startsWith('data'))) {
            preview.style.backgroundImage = `url('${url}')`;
            preview.innerHTML = '';
        } else {
            preview.style.backgroundImage = 'none';
            preview.innerHTML = '<i data-lucide="image" class="w-10 h-10 text-gray-500"></i>';
            lucide.createIcons({ nodes: [preview] });
        }
    };
    
    // NOVO: Sistema de classificação reutilizável
    const renderStarRating = (container, feedbackEl, hiddenInput, currentRating) => {
        container.innerHTML = ''; 
        const rating = currentRating === null ? -1 : parseFloat(currentRating);
    
        const updateFeedback = (value) => {
            if (value === null || value === 'null' || value < 0) {
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
    
            if (clickedValueStr === 'null') {
                hiddenInput.value = 'null';
            } else {
                const clickedValue = parseFloat(clickedValueStr);
                const currentValue = parseFloat(hiddenInput.value);
    
                if (currentValue === clickedValue) {
                    hiddenInput.value = clickedValue - 0.5;
                } else {
                    hiddenInput.value = clickedValue;
                }
            }
            
            const newValue = hiddenInput.value === 'null' ? null : parseFloat(hiddenInput.value);
            renderStarRating(container, feedbackEl, hiddenInput, newValue);
        };
    
        const wrapper = container.closest('.rating-wrapper');
        wrapper.onmouseover = () => feedbackEl.classList.add('show-feedback');
        wrapper.onmouseout = () => feedbackEl.classList.remove('show-feedback');
    
        lucide.createIcons({ nodes: Array.from(container.children) });
    };

    const renderMultiTags = (container, input, currentTagList) => {
        container.querySelectorAll('.tag-item').forEach(tag => tag.remove());
        currentTagList.forEach(tag => {
            const tagEl = document.createElement('div');
            tagEl.className = 'tag-item';
            tagEl.innerHTML = `<span>${tag}</span><button type="button" data-tag="${tag}"><i data-lucide="x"></i></button>`;
            container.insertBefore(tagEl, input);
        });
        lucide.createIcons({ nodes: Array.from(container.querySelectorAll('.tag-item button')) });
    };

    const renderUniverseTag = () => {
        universeContainer.querySelectorAll('.tag-item').forEach(tag => tag.remove());
        if (currentUniverse) {
            const tag = document.createElement('div');
            tag.className = 'tag-item';
            tag.innerHTML = `<span>${currentUniverse}</span><button type="button" data-tag="${currentUniverse}"><i data-lucide="x"></i></button>`;
            universeContainer.insertBefore(tag, universeInput);
            lucide.createIcons({ nodes: [tag.querySelector('button')] });
            universeInput.style.display = 'none';
        } else {
            universeInput.style.display = 'block';
        }
    };

    const renderPlaylistSelector = (contentId = null) => {
        const playlists = dataManager.getPlaylists();
        itemPlaylistsContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
        itemPlaylistsContainer.innerHTML = '';
        const contentIdNum = Number(contentId);
        
        playlists.forEach(p => {
            const isChecked = contentId ? p.contentIds.includes(contentIdNum) : (p.id == activePlaylistId); // Note: double equals for type coercion
            const checkboxHTML = `
                <label class="playlist-checkbox-label">
                    <input type="checkbox" name="playlists" value="${p.id}" ${isChecked ? 'checked' : ''}>
                    <div class="playlist-selector-card">
                        <div class="icon-container"><i data-lucide="list-music"></i></div>
                        <span class="playlist-name">${p.name}</span>
                    </div>
                </label>`;
            itemPlaylistsContainer.innerHTML += checkboxHTML;
        });
        
        lucide.createIcons({ nodes: itemPlaylistsContainer.querySelectorAll('.icon-container')});
    };

    const renumberEpisodesInModal = () => {
        if (!episodesListContainer) return;
        const episodeItems = episodesListContainer.querySelectorAll('.episode-item');
        episodeItems.forEach((item, index) => {
            const numberSpan = item.querySelector('.episode-number');
            if (numberSpan) numberSpan.textContent = `${index + 1}.`;
        });
    };

    const updateSeriesInfoFields = () => {
        const episodesFromModal = Array.from(episodesListContainer.querySelectorAll('.episode-item')).map(el => ({
             runtime: parseRuntime(el.querySelector('.episode-runtime-input').value),
             rating: parseFloat(el.querySelector('.episode-rating-input').value) || null
        }));
        const totalRuntime = calculateSeriesTotalRuntime(episodesFromModal);
        const averageRating = calculateSeriesAverageRating(episodesFromModal);
        const ratingColor = getRatingColorClass(averageRating);
        if(seriesRuntimeOutput) seriesRuntimeOutput.querySelector('span').textContent = formatRuntime(totalRuntime);
        if(seriesRatingOutput) {
            const ratingSpan = seriesRatingOutput.querySelector('span');
            const ratingContainer = seriesRatingOutput.querySelector('div');
            ratingSpan.textContent = averageRating !== 'N/A' ? `${averageRating} / 10` : 'N/A';
            ratingContainer.classList.remove('text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400', 'text-gray-500');
            ratingContainer.classList.add(ratingColor);
        }
    };

    const renderContentWatchedDates = () => {
        if (!watchedDatesSection) return;
        const buttonsContainer = watchedDatesSection.querySelector('.grid');
        if(buttonsContainer) buttonsContainer.classList.remove('hidden');

        if (!watchedDatesList) return;
        watchedDatesList.innerHTML = '';
        
        if(watchedDatesCountEl) watchedDatesCountEl.textContent = currentWatchedDates.length;

        currentWatchedDates.sort((a, b) => b - a);

        if (currentWatchedDates.length === 0) {
            watchedDatesList.innerHTML = '<p class="text-sm text-gray-500 px-2">Nenhum histórico de visualização.</p>';
            return;
        }

        currentWatchedDates.forEach(timestamp => {
            const dateHTML = `
                <div class="watched-date-item" data-timestamp="${timestamp}">
                    <span class="watched-date-text">
                        <i data-lucide="calendar-check"></i>
                        <span>Visto em: ${formatTimestamp(timestamp)}</span>
                    </span>
                    <button type="button" class="remove-watched-date-btn" title="Remover data">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            watchedDatesList.innerHTML += dateHTML;
        });
        lucide.createIcons();
    };

    const renderSeriesWatchedChronology = (series) => {
        if (!watchedDatesSection) return;
    
        const buttonsContainer = watchedDatesSection.querySelector('.grid');
        if(buttonsContainer) buttonsContainer.classList.add('hidden');
        
        if (!watchedDatesList) return;
    
        const allTimestamps = (series.episodes || []).flatMap(ep => ep.watchedDates || []).filter(Boolean);
    
        if (allTimestamps.length === 0) {
            watchedDatesList.innerHTML = '<p class="text-sm text-gray-500 px-2">Nenhum episódio visto ainda para calcular a cronologia.</p>';
            if(watchedDatesCountEl) watchedDatesCountEl.textContent = '0';
            return;
        }
    
        const startDate = new Date(Math.min(...allTimestamps));
        const endDate = new Date(Math.max(...allTimestamps));
    
        const diffTime = Math.abs(endDate.setHours(0,0,0,0) - startDate.setHours(0,0,0,0));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const durationText = diffDays === 1 ? '1 dia' : `${diffDays} dias`;
    
        const watchedCount = allTimestamps.length;
        if(watchedDatesCountEl) watchedDatesCountEl.textContent = watchedCount;
    
        watchedDatesList.innerHTML = `
            <div class="series-chronology-item">
                <i data-lucide="calendar-play"></i>
                <div>
                    <span class="chronology-label">Início</span>
                    <span class="chronology-date">${new Date(Math.min(...allTimestamps)).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
            </div>
            <div class="series-chronology-item">
                <i data-lucide="calendar-check"></i>
                <div>
                    <span class="chronology-label">Fim</span>
                    <span class="chronology-date">${new Date(Math.max(...allTimestamps)).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
            </div>
            <div class="series-chronology-item">
                <i data-lucide="hourglass"></i>
                <div>
                    <span class="chronology-label">Duração Total</span>
                    <span class="chronology-date font-bold">${durationText}</span>
                </div>
            </div>
        `;
        lucide.createIcons();
    };

    const renderEpisodeWatchedDates = () => {
        if (!epWatchedDatesList) return;
        epWatchedDatesList.innerHTML = '';
        
        if(epWatchedDatesCountEl) epWatchedDatesCountEl.textContent = currentEpisodeWatchedDates.length;

        currentEpisodeWatchedDates.sort((a, b) => b - a);

        if (currentEpisodeWatchedDates.length === 0) {
            epWatchedDatesList.innerHTML = '<p class="text-sm text-gray-500 px-2">Nenhum histórico de visualização.</p>';
            return;
        }

        currentEpisodeWatchedDates.forEach(timestamp => {
            const dateHTML = `
                <div class="watched-date-item" data-timestamp="${timestamp}">
                    <span class="watched-date-text">
                        <i data-lucide="calendar-check"></i>
                        <span>Visto em: ${formatTimestamp(timestamp)}</span>
                    </span>
                    <button type="button" class="remove-watched-date-btn" title="Remover data">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            epWatchedDatesList.innerHTML += dateHTML;
        });
        lucide.createIcons();
    };

    const populateAttachmentDropdown = (selectedId = '') => {
        const allContent = dataManager.getAllContent();
        itemAttachToSelect.innerHTML = '<option value="">Nenhum</option>';
        const primaryContent = allContent
            .filter(item => PRIMARY_CONTENT_TYPES.includes(item.type))
            .sort((a, b) => a.title.localeCompare(b.title));

        primaryContent.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.title} (${item.year})`;
            if (item.id == selectedId) {
                option.selected = true;
            }
            itemAttachToSelect.appendChild(option);
        });
    };

    const toggleModalSections = (type) => {
        const isSeries = type === 'series';
        const isSecondary = !PRIMARY_CONTENT_TYPES.includes(type);

        const fieldsToShowForMovies = document.querySelectorAll('.modal-field-group');
        fieldsToShowForMovies.forEach(field => {
            if (field.contains(itemRuntimeInput) || field.contains(starRatingContainer)) {
                field.style.display = isSeries ? 'none' : 'block';
            }
        });

        if (episodesSection) episodesSection.classList.toggle('hidden', !isSeries);
        if (seriesInfoSection) seriesInfoSection.classList.toggle('hidden', !isSeries);
        if (attachmentSection) attachmentSection.classList.toggle('hidden', !isSecondary);

        if (isSeries) updateSeriesInfoFields();
        if (isSecondary) {
            const currentSelectedId = itemAttachToSelect.value;
            populateAttachmentDropdown(currentSelectedId);
        }
    };

    const resetModalState = () => {
        itemForm.reset();
        itemIdInput.value = ''; 
        itemTypeInput.value = 'movie';
        itemStatusInput.value = 'not_watched';
        itemRatingInput.value = 'null';
        currentUniverse = '';
        currentCharacters.length = 0;
        currentTags.length = 0;
        currentUniverseAssociations = {};
        currentWatchedDates = [];
        currentEpisodeWatchedDates = [];
        itemAttachToSelect.value = '';
        itemOrderInput.value = '';

        renderUniverseTag();
        renderMultiTags(charactersContainer, charactersInput, currentCharacters);
        renderMultiTags(tagsContainer, tagsInput, currentTags);
        renderUniverseAssociations();
        renderContentWatchedDates();
        renderStarRating(starRatingContainer, ratingFeedback, itemRatingInput, null);

        itemTypeSelector.querySelector('[data-value="movie"]').click();
        itemStatusSelector.querySelector('[data-value="not_watched"]').click();
        
        updateImagePreview(itemCoverInput, coverPreview);
        updateImagePreview(itemBannerInput, bannerPreview);

        if(episodesListContainer) episodesListContainer.innerHTML = '';
    };

    const openContentModal = (item = null) => {
        const allUniverses = dataManager.getUniverses();
        resetModalState();
        
        if(item){
             itemModalTitle.textContent = "Editar Conteúdo";
             itemSaveBtnText.textContent = "Guardar Alterações";
             itemIdInput.value = item.id;
             itemTitleInput.value = item.title;
             itemCoverInput.value = item.cover || '';
             itemBannerInput.value = item.banner || '';
             itemYearInput.value = item.year || '';
             itemRuntimeInput.value = item.runtime ? formatRuntimeForInput(item.runtime) : '';
             itemCommentInput.value = item.comment || '';
             
             itemTypeInput.value = item.type || 'movie';
             itemStatusInput.value = item.status || 'not_watched';
             const initialRating = item.rating === undefined ? null : item.rating;
             itemRatingInput.value = initialRating === null ? 'null' : initialRating;
             renderStarRating(starRatingContainer, ratingFeedback, itemRatingInput, initialRating);
             
             currentUniverse = item.universe || '';
             currentCharacters.length = 0;
             currentTags.length = 0;

             if (item.characters) currentCharacters.push(...item.characters);
             if (item.tags) currentTags.push(...item.tags);

             currentUniverseAssociations = {};
             allUniverses.forEach(universe => {
                const count = (universe.timeline || []).filter(id => id === item.id).length;
                if (count > 0) {
                    currentUniverseAssociations[universe.id] = count;
                }
             });
             
             if (!PRIMARY_CONTENT_TYPES.includes(item.type)) {
                populateAttachmentDropdown(item.attachedTo);
                itemOrderInput.value = item.order || '';
             }

             if (item.type === 'series' && item.episodes) {
                 item.episodes.forEach((ep, index) => {
                     const epHTML = `
                        <div class="episode-item">
                            <span class="episode-number">${index + 1}.</span>
                            <input type="text" value="${ep.title}" class="episode-title-input form-input flex-grow" placeholder="Nome do episódio">
                            <input type="text" value="${ep.runtime ? formatRuntimeForInput(ep.runtime) : ''}" class="episode-runtime-input form-input" placeholder="h:m">
                            <input type="number" value="${ep.rating || ''}" class="episode-rating-input form-input" placeholder="Nota" min="0" max="10" step="0.5">
                            <button type="button" class="remove-episode-btn"><i data-lucide="trash-2"></i></button>
                        </div>`;
                    episodesListContainer.insertAdjacentHTML('beforeend', epHTML);
                 });
                 lucide.createIcons({ nodes: episodesListContainer.querySelectorAll('.remove-episode-btn')});
             }
            renderPlaylistSelector(item.id);

            if (item.type === 'series') {
                renderSeriesWatchedChronology(item);
            } else {
                currentWatchedDates = item.watchedDates ? [...item.watchedDates] : [];
                renderContentWatchedDates();
            }

        } else {
             itemModalTitle.textContent = "Adicionar Novo Conteúdo";
             itemSaveBtnText.textContent = "Guardar Conteúdo";
             renderPlaylistSelector();
             renderContentWatchedDates();
             renderStarRating(starRatingContainer, ratingFeedback, itemRatingInput, null);
        }

        updateImagePreview(itemCoverInput, coverPreview);
        updateImagePreview(itemBannerInput, bannerPreview);
        renderUniverseTag();
        renderMultiTags(charactersContainer, charactersInput, currentCharacters);
        renderMultiTags(tagsContainer, tagsInput, currentTags);
        renderUniverseAssociations();
        
        const activeButtonType = itemTypeSelector.querySelector(`[data-value="${itemTypeInput.value}"]`);
        if (activeButtonType) activeButtonType.click();
        else itemTypeSelector.querySelector('[data-value="movie"]').click();
        
        const activeButtonStatus = itemStatusSelector.querySelector(`[data-value="${itemStatusInput.value}"]`);
        if (activeButtonStatus) activeButtonStatus.click();
        else itemStatusSelector.querySelector('[data-value="not_watched"]').click();

        toggleModalSections(itemTypeInput.value);
        itemModal.classList.remove('hidden');
    };

    const closeContentModal = () => itemModal.classList.add('hidden');
    
    const openManualDateModal = () => {
        if (!manualDateModal) return;
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');

        manualDateInput.value = `${yyyy}-${mm}-${dd}`;
        manualTimeInput.value = `${hh}:${min}`;
        manualDateModal.classList.remove('hidden');
    };

    const closeManualDateModal = () => {
        if (manualDateModal) manualDateModal.classList.add('hidden');
    };

    // ===================================================================
    // FUNÇÕES DO MODAL DE COMENTÁRIO
    // ===================================================================
    const openCommentViewer = (item) => {
        commentViewerTitle.innerHTML = `<i data-lucide="message-square"></i> Comentário sobre "${item.title}"`;
        if (item.comment && item.comment.trim() !== '') {
            commentViewerText.textContent = item.comment;
        } else {
            commentViewerText.textContent = 'Nenhum comentário adicionado para este conteúdo.';
        }
        commentViewerModal.classList.remove('hidden');
        lucide.createIcons();
    };

    const closeCommentViewer = () => {
        commentViewerModal.classList.add('hidden');
    };

    // ===================================================================
    // FUNÇÕES DO VISUALIZADOR DE ANEXOS (NOVO)
    // ===================================================================
    const openAttachmentsViewer = (primaryItemId) => {
        const allContent = dataManager.getAllContent();
        const primaryItem = allContent.find(c => c.id === primaryItemId);
        if (!primaryItem) return;
    
        attachmentsViewerHeader.innerHTML = `
            <img src="${primaryItem.cover || 'https://placehold.co/200x300/1f2937/4f46e5?text=Capa'}" alt="Capa de ${primaryItem.title}" class="w-16 h-24 object-cover rounded-lg shadow-lg">
            <div>
                <p class="text-sm text-gray-400">Conteúdo Anexado a</p>
                <h2 class="text-3xl font-bold">${primaryItem.title}</h2>
            </div>
        `;
    
        const attachments = allContent
            .filter(c => c.attachedTo === primaryItemId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    
        attachmentsViewerList.innerHTML = '';
        if (attachments.length > 0) {
            attachments.forEach(attachment => {
                const typeIcon = getIconForType(attachment.type);
                const typeName = attachment.type.charAt(0).toUpperCase() + attachment.type.slice(1);
                const orderText = attachment.order ? `#${attachment.order}` : '';
    
                attachmentsViewerList.innerHTML += `
                    <div class="attachment-item-card" data-id="${attachment.id}">
                        <div class="attachment-item-info">
                            <div class="attachment-item-type">
                                <i data-lucide="${typeIcon}"></i>
                                <span>${typeName} ${orderText}</span>
                            </div>
                            <h4 class="attachment-item-title">${attachment.title}</h4>
                        </div>
                        <div class="attachment-item-actions">
                            <button class="attachment-action-btn edit-content-btn" title="Editar"><i data-lucide="pencil"></i></button>
                            <button class="attachment-action-btn delete-content-btn" title="Apagar"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            attachmentsViewerList.innerHTML = `<p class="text-center text-gray-500 py-8">Nenhum conteúdo anexado.</p>`;
        }
    
        lucide.createIcons();
        attachmentsViewerModal.classList.remove('hidden');
    };

    const closeAttachmentsViewer = () => {
        attachmentsViewerModal.classList.add('hidden');
    };

    // ===================================================================
    // FUNÇÕES DE ASSOCIAÇÃO A UNIVERSOS
    // ===================================================================
    const renderUniverseAssociations = () => {
        const allUniverses = dataManager.getUniverses();
        if (!itemUniversesContainer) return;
        itemUniversesContainer.innerHTML = '';
    
        if (Object.keys(currentUniverseAssociations).length === 0) {
            itemUniversesContainer.innerHTML = '<p class="text-sm text-gray-500">Ainda não associado a nenhum universo.</p>';
            return;
        }
    
        for (const universeId in currentUniverseAssociations) {
            const universe = allUniverses.find(u => u.id == universeId);
            if (universe) {
                const count = currentUniverseAssociations[universeId];
                const associationHTML = `
                    <div class="universe-association-item" data-universe-id="${universe.id}">
                        <span class="universe-name">${universe.name}</span>
                        <div class="universe-count-controls">
                            <button type="button" class="universe-count-btn decrease-btn" data-universe-id="${universe.id}">-</button>
                            <span class="universe-count-display">${count}</span>
                            <button type="button" class="universe-count-btn increase-btn" data-universe-id="${universe.id}">+</button>
                        </div>
                    </div>
                `;
                itemUniversesContainer.innerHTML += associationHTML;
            }
        }
    };

    const openAddToUniverseModal = () => {
        const allUniverses = dataManager.getUniverses();
        if (!addToUniverseModal || !universeSelectionList) return;
    
        universeSelectionList.innerHTML = '';
        if (allUniverses.length === 0) {
            universeSelectionList.innerHTML = '<p class="text-center text-gray-400 py-4">Nenhum universo foi criado. Vá à página de Universos para criar um primeiro.</p>';
        } else {
            allUniverses.forEach(universe => {
                const universeCardHTML = `
                    <div class="universe-selector-card" data-universe-id="${universe.id}">
                        <div class="icon-container"><i data-lucide="swords"></i></div>
                        <p class="universe-name">${universe.name}</p>
                    </div>
                `;
                universeSelectionList.innerHTML += universeCardHTML;
            });
        }
    
        lucide.createIcons();
        addToUniverseModal.classList.remove('hidden');
    };

    const closeAddToUniverseModal = () => {
        if (addToUniverseModal) addToUniverseModal.classList.add('hidden');
    };

    // ===================================================================
    // FUNÇÕES DE SUGESTÕES E GESTÃO DE TAGS
    // ===================================================================
    const hideSuggestions = () => {
        document.querySelectorAll('.suggestions-list').forEach(list => list.classList.remove('visible'));
    };

    const addTag = (tagValue, inputElement, tagList, isSingleTag) => {
        const value = tagValue.trim();
        if (!value) return;

        if (isSingleTag) {
            currentUniverse = value;
            renderUniverseTag();
        } else {
            if (!tagList.includes(value)) {
                tagList.push(value);
                if (inputElement === charactersInput) {
                    renderMultiTags(charactersContainer, charactersInput, currentCharacters);
                } else if (inputElement === tagsInput) {
                    renderMultiTags(tagsContainer, tagsInput, currentTags);
                }
            }
        }
        inputElement.value = '';
        hideSuggestions();
        setTimeout(() => inputElement.focus(), 0);
    };

    const showSuggestions = (input, suggestionsList, cache, currentTagList) => {
        const query = input.value.trim().toLowerCase();
        const availableTags = cache.filter(item => !currentTagList.includes(item));
        const filteredSuggestions = query ? availableTags.filter(item => item.toLowerCase().includes(query)) : availableTags;

        suggestionsList.innerHTML = '';

        if (availableTags.length > 0 && (filteredSuggestions.length > 0 || !query)) {
             const header = document.createElement('div');
             header.className = 'suggestions-header';
             header.textContent = 'Selecionar existente';
             suggestionsList.appendChild(header);
             filteredSuggestions.slice(0, 10).forEach(suggestion => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.textContent = suggestion;
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    addTag(suggestion, input, currentTagList, (input === universeInput));
                });
                suggestionsList.appendChild(item);
            });
        }
        
        const typedValue = input.value.trim();
        const isAlreadyInCache = cache.some(item => item.toLowerCase() === typedValue.toLowerCase());
        if (typedValue && !isAlreadyInCache) {
             if (suggestionsList.innerHTML !== '') {
                const separator = document.createElement('div');
                separator.className = 'suggestions-header';
                separator.style.cssText = "border-top: 1px solid #4b5563; border-bottom: none; margin-top: 4px; padding-top: 4px;";
                suggestionsList.appendChild(separator);
             }
             const createItem = document.createElement('div');
             createItem.className = 'suggestion-item suggestion-item-create';
             createItem.innerHTML = `Criar: <span class="truncate font-semibold text-white">"${typedValue}"</span>`;
             createItem.addEventListener('mousedown', (e) => {
                e.preventDefault();
                addTag(typedValue, input, currentTagList, (input === universeInput));
             });
             suggestionsList.appendChild(createItem);
        }

        if (suggestionsList.innerHTML !== '') {
            suggestionsList.classList.add('visible');
        } else {
            suggestionsList.classList.remove('visible');
        }
    };
    
    const setupTagInputListeners = (input, container, suggestionsEl, tagList, isSingle) => {
        const getCache = () => {
            if (input === universeInput) return allUniversesCache;
            if (input === charactersInput) return allCharactersCache;
            if (input === tagsInput) return allTagsCache;
            return [];
        };

        const getDynamicTagList = () => isSingle ? (currentUniverse ? [currentUniverse] : []) : tagList;

        input.addEventListener('focus', () => showSuggestions(input, suggestionsEl, getCache(), getDynamicTagList()));
        input.addEventListener('input', () => showSuggestions(input, suggestionsEl, getCache(), getDynamicTagList()));
        input.addEventListener('blur', () => setTimeout(hideSuggestions, 200));
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const typedValue = input.value.trim();
                if (typedValue) {
                    addTag(typedValue, input, tagList, isSingle);
                }
            } else if (e.key === 'Backspace' && input.value === '' && !isSingle && tagList.length > 0) {
                 tagList.pop();
                 renderMultiTags(container, input, tagList);
            }
        });

        container.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-tag]');
            if (button) {
                const tagToRemove = button.dataset.tag;
                if (isSingle) {
                    currentUniverse = '';
                    renderUniverseTag();
                } else {
                    const index = tagList.indexOf(tagToRemove);
                    if (index > -1) tagList.splice(index, 1);
                    renderMultiTags(container, input, tagList);
                }
                 setTimeout(() => input.focus(), 0);
            } else if (!input.contains(e.target)) {
                input.focus();
            }
        });
    };
    
    // ===================================================================
    // FUNÇÕES DO VISUALIZADOR E EDITOR DE EPISÓDIOS
    // ===================================================================
    const closeEpisodeEditor = () => {
        episodesViewerBody.classList.remove('editor-visible');
        const currentlyEditing = episodesViewerList.querySelector('.episode-viewer-item.is-editing');
        if (currentlyEditing) {
            currentlyEditing.classList.remove('is-editing');
        }
    };

    const openEpisodeEditor = (series, episodeIndex) => {
        const episode = series.episodes[episodeIndex];
        if (!episode) return;
    
        episodesViewerList.querySelectorAll('.episode-viewer-item.is-editing').forEach(item => item.classList.remove('is-editing'));
        const listItem = episodesViewerList.children[episodeIndex];
        if (listItem) listItem.classList.add('is-editing');
        
        const episodeRatingInput = document.createElement('input');
        episodeRatingInput.type = 'hidden';
        episodeEditorForm.appendChild(episodeRatingInput);
    
        const initialRating = episode.rating === undefined ? null : episode.rating;
        episodeRatingInput.value = initialRating === null ? 'null' : initialRating;
    
        editingSeriesIdInput.value = series.id;
        editingEpisodeIndexInput.value = episodeIndex;
        
        epEditorTitleInput.value = episode.title;
        epEditorRuntimeInput.value = formatRuntimeForInput(episode.runtime);
        epEditorCommentInput.value = episode.comment || '';
        
        currentEpisodeWatchedDates = episode.watchedDates ? [...episode.watchedDates] : [];
        renderEpisodeWatchedDates();
    
        renderStarRating(epEditorRatingContainer, epRatingFeedback, episodeRatingInput, initialRating);
    
        const currentStatus = episode.status || 'not_watched';
        epEditorStatusContainer.innerHTML = `
            <button type="button" data-value="not_watched" class="${currentStatus === 'not_watched' ? 'active' : ''}"><i data-lucide="circle"></i>Não Visto</button>
            <button type="button" data-value="watching" class="${currentStatus === 'watching' ? 'active' : ''}"><i data-lucide="eye"></i>A Ver</button>
            <button type="button" data-value="watched" class="${currentStatus === 'watched' ? 'active' : ''}"><i data-lucide="check"></i>Visto</button>
        `;
    
        lucide.createIcons();
        episodesViewerBody.classList.add('editor-visible');
    };

    const openEpisodesViewer = (series) => {
        episodesViewerModal.dataset.seriesId = series.id;
        episodesViewerTitle.textContent = series.title;
        episodesViewerCover.src = series.cover || 'https://placehold.co/200x300/1f2937/4f46e5?text=Capa';
        
        const { episodeCount, totalRuntime, averageRating } = calculateSeriesInfo(series);
        episodesViewerStats.innerHTML = `
            <span class="font-semibold">${episodeCount}</span> Episódios
            <span class="mx-2 text-gray-600">&bull;</span>
            Duração total de <span class="font-semibold">${formatRuntime(totalRuntime)}</span>
            <span class="mx-2 text-gray-600">&bull;</span>
            Média de <span class="font-semibold">${averageRating}</span> / 10
        `;
        
        episodesViewerList.innerHTML = '';
        if (series.episodes && series.episodes.length > 0) {
            const bannerUrl = series.banner || series.cover || '';
            series.episodes.forEach((ep, index) => {
                const ratingColor = getRatingColorClass(ep.rating);
                const episodeHTML = `
                <div class="episode-viewer-item" data-episode-index="${index}">
                    <div class="episode-viewer-dot"></div>
                    <div class="episode-viewer-card" style="background-image: url('${bannerUrl}')">
                        <div class="episode-card-overlay"></div>
                        <div class="episode-card-content">
                            <div class="episode-card-info">
                                <span class="ep-number">Episódio ${index + 1}</span>
                                <h4 class="ep-title">${ep.title}</h4>
                            </div>
                            <div class="episode-card-meta">
                                ${renderStatusBadge(ep.status || 'not_watched')}
                                <div class="ep-meta-item ${ratingColor}">
                                    <i data-lucide="star"></i>
                                    <span>${ep.rating !== null && ep.rating !== undefined ? ep.rating.toFixed(1) : 'N/A'}</span>
                                </div>
                                <div class="ep-meta-item">
                                    <i data-lucide="clock"></i>
                                    <span>${formatRuntime(ep.runtime)}</span>
                                </div>
                            </div>
                            <div class="episode-card-actions">
                                <button class="episode-action-btn view-comment-btn" title="Ver Comentário">
                                    <i data-lucide="message-square"></i>
                                </button>
                                <button class="episode-action-btn episode-viewer-edit-btn" title="Editar Episódio">
                                    <i data-lucide="pencil"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
                episodesViewerList.innerHTML += episodeHTML;
            });
        } else {
            episodesViewerList.innerHTML = `<p class="text-center text-gray-500 py-8">Nenhum episódio adicionado para esta série.</p>`;
        }

        lucide.createIcons();
        episodesViewerModal.classList.remove('hidden');
        closeEpisodeEditor();
    };
    
    const closeEpisodesViewer = () => {
        episodesViewerModal.classList.add('hidden');
        closeEpisodeEditor();
    };


    // ===================================================================
    // EVENT LISTENERS
    // ===================================================================
    
    addPlaylistBtn.addEventListener('click', () => {
        const playlistName = prompt('Nome da nova playlist:');
        if (playlistName && playlistName.trim() !== '') {
            dataManager.addPlaylist(playlistName);
            dataManager.saveAllData();
            renderPlaylists();
        }
    });

    playlistsListEl.addEventListener('click', (e) => {
        const target = e.target.closest('.playlist-item');
        if (!target) return;
    
        const button = e.target.closest('button');
        const playlistId = Number(target.dataset.id);
        const playlist = dataManager.getPlaylistById(playlistId);
    
        // Handle edit and delete actions FIRST, as they should work in edit mode.
        if (button && button.classList.contains('edit')) {
            if (!playlist) return;
            const newName = prompt('Novo nome para a playlist:', playlist.name);
            if (newName && newName.trim() !== '') {
                playlist.name = newName.trim();
                dataManager.saveAllData();
                renderPlaylists();
            }
            return; // Stop further execution
        }
    
        if (button && button.classList.contains('delete')) {
            if (!playlist) return;
            if (confirm(`Tem a certeza que quer apagar a playlist "${playlist.name}"?`)) {
                dataManager.deletePlaylist(playlistId);
                dataManager.saveAllData();
                if (activePlaylistId === playlistId) {
                    activePlaylistId = 'all';
                }
                renderPlaylists();
                renderContentGrid();
            }
            return; // Stop further execution
        }
    
        // Only switch playlists if NOT in edit mode
        if (playlistsSidebar.classList.contains('edit-mode')) return;
    
        activePlaylistId = target.dataset.id === 'all' ? 'all' : Number(target.dataset.id);
        renderPlaylists();
        renderContentGrid();
    });

    toggleEditModeBtn.addEventListener('click', () => {
        playlistsSidebar.classList.toggle('edit-mode');
        toggleEditModeBtn.classList.toggle('active');
        const isEditMode = playlistsSidebar.classList.contains('edit-mode');
        playlistsListEl.querySelectorAll('.playlist-item[data-id="all"] ~ .playlist-item').forEach(item => {
            item.setAttribute('draggable', isEditMode);
        });
    });

    addContentBtn.addEventListener('click', () => openContentModal());
    
    closeItemModalBtn.addEventListener('click', closeContentModal);
    searchContentInput.addEventListener('input', renderContentGrid);
    if(clearItemFormBtn) clearItemFormBtn.addEventListener('click', resetModalState);
    
    document.addEventListener('click', (e) => {
        const openDropdownBtn = document.querySelector('.filter-btn.open');
        const clickedBtn = e.target.closest('.filter-btn');

        if (openDropdownBtn && !e.target.closest('.filter-dropdown-container')) {
            openDropdownBtn.classList.remove('open');
            openDropdownBtn.nextElementSibling.classList.add('hidden');
        }

        if (clickedBtn) {
            const optionsPanel = clickedBtn.nextElementSibling;
            const wasOpen = clickedBtn.classList.contains('open');
            
            if (openDropdownBtn) {
                openDropdownBtn.classList.remove('open');
                openDropdownBtn.nextElementSibling.classList.add('hidden');
            }

            if (!wasOpen) {
                clickedBtn.classList.add('open');
                optionsPanel.classList.remove('hidden');
            }
        }
    });

    filtersContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const category = e.target.dataset.category;
            const value = e.target.value;
            
            if (e.target.checked) {
                if (!activeFilters[category].includes(value)) {
                    activeFilters[category].push(value);
                }
            } else {
                activeFilters[category] = activeFilters[category].filter(item => item !== value);
            }
            updateFilterButtonsUI();
            renderContentGrid();
        }
    });
    
    sortByYear.addEventListener('change', renderContentGrid);
    clearFiltersBtn.addEventListener('click', resetFilters);

    itemCoverInput.addEventListener('input', () => updateImagePreview(itemCoverInput, coverPreview));
    itemBannerInput.addEventListener('input', () => updateImagePreview(itemBannerInput, bannerPreview));

    itemTypeSelector.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button) {
            const newType = button.dataset.value;
            itemTypeInput.value = newType;
            itemTypeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            toggleModalSections(newType);
        }
    });

    itemStatusSelector.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button) {
            const oldStatus = itemStatusInput.value;
            const newStatus = button.dataset.value;

            if (oldStatus === newStatus) return;

            itemStatusInput.value = newStatus;
            itemStatusSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (newStatus === 'watched' && oldStatus !== 'watched') {
                currentWatchedDates.push(Date.now());
                renderContentWatchedDates();
            }
        }
    });
    
    setupTagInputListeners(universeInput, universeContainer, universeSuggestions, null, true);
    setupTagInputListeners(charactersInput, charactersContainer, charactersSuggestions, currentCharacters, false);
    setupTagInputListeners(tagsInput, tagsContainer, tagsSuggestions, currentTags, false);

    if (addCurrentWatchedDateBtn) {
        addCurrentWatchedDateBtn.addEventListener('click', () => {
            currentWatchedDates.push(Date.now());
            renderContentWatchedDates();
        });
    }

    if (addManualWatchedDateBtn) {
        addManualWatchedDateBtn.addEventListener('click', () => {
            manualDateTarget = 'content';
            openManualDateModal();
        });
    }
    
    if (cancelManualDateBtn) {
        cancelManualDateBtn.addEventListener('click', closeManualDateModal);
    }
    
    if (manualDateModal) {
        manualDateModal.addEventListener('click', (e) => {
            if (e.target === manualDateModal) closeManualDateModal();
        });
    }

    if (manualDateForm) {
        manualDateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = manualDateInput.value;
            const time = manualTimeInput.value;
            if (date && time) {
                const dateTimeString = `${date}T${time}`;
                const timestamp = new Date(dateTimeString).getTime();
                if (!isNaN(timestamp)) {
                    if (manualDateTarget === 'episode') {
                        currentEpisodeWatchedDates.push(timestamp);
                        renderEpisodeWatchedDates();
                    } else {
                        currentWatchedDates.push(timestamp);
                        renderContentWatchedDates();
                    }
                    closeManualDateModal();
                } else {
                    alert("Data ou hora inválida.");
                }
            }
        });
    }


    watchedDatesList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-watched-date-btn');
        if (removeBtn) {
            const itemEl = removeBtn.closest('.watched-date-item');
            const timestampToRemove = Number(itemEl.dataset.timestamp);
            currentWatchedDates = currentWatchedDates.filter(ts => ts !== timestampToRemove);
            renderContentWatchedDates();
        }
    });

    if(itemForm) itemForm.addEventListener('input', (e) => {
        if (itemTypeInput.value === 'series' && e.target.matches('.episode-runtime-input, .episode-rating-input')) {
            updateSeriesInfoFields();
        }
    });

    if(addEpisodeBtn) addEpisodeBtn.addEventListener('click', () => {
        const title = newEpisodeTitleInput.value.trim() || `Episódio ${episodesListContainer.children.length + 1}`;
        const episodeCount = episodesListContainer.querySelectorAll('.episode-item').length;
        const newEpHTML = `<div class="episode-item"><span class="episode-number">${episodeCount + 1}.</span><input type="text" value="${title}" class="episode-title-input form-input flex-grow" placeholder="Nome do episódio"><input type="text" class="episode-runtime-input form-input" placeholder="h:m"><input type="number" class="episode-rating-input form-input" placeholder="Nota" min="0" max="10" step="0.5"><button type="button" class="remove-episode-btn"><i data-lucide="trash-2"></i></button></div>`;
        episodesListContainer.insertAdjacentHTML('beforeend', newEpHTML);
        lucide.createIcons({ nodes: [episodesListContainer.lastElementChild] });
        newEpisodeTitleInput.value = '';
        newEpisodeTitleInput.focus();
        updateSeriesInfoFields(); 
    });

    if(episodesListContainer) episodesListContainer.addEventListener('click', e => {
        if (e.target.closest('.remove-episode-btn')) {
            e.target.closest('.episode-item').remove();
            renumberEpisodesInModal();
            updateSeriesInfoFields(); 
        }
    });

    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = itemIdInput.value ? Number(itemIdInput.value) : null;
        let contentItem;

        if (id) {
            // Usa uma cópia para evitar modificar o objeto original antes de salvar
            contentItem = JSON.parse(JSON.stringify(dataManager.getContentById(id)));
        } else {
            contentItem = { id: Date.now() };
        }

        if(!contentItem) return;

        contentItem.title = itemTitleInput.value.trim();
        contentItem.cover = itemCoverInput.value.trim();
        contentItem.banner = itemBannerInput.value.trim();
        contentItem.year = itemYearInput.value;
        contentItem.type = itemTypeInput.value;
        contentItem.status = itemStatusInput.value;
        contentItem.comment = itemCommentInput.value.trim();
        contentItem.universe = currentUniverse;
        contentItem.characters = [...currentCharacters];
        contentItem.tags = [...currentTags];
        
        delete contentItem.universeAssociations;

        if (!PRIMARY_CONTENT_TYPES.includes(contentItem.type)) {
            const attachedToId = itemAttachToSelect.value ? Number(itemAttachToSelect.value) : null;
            contentItem.attachedTo = attachedToId;
            contentItem.order = itemOrderInput.value ? Number(itemOrderInput.value) : null;
        } else {
            delete contentItem.attachedTo;
            delete contentItem.order;
        }

        if (contentItem.type === 'series') {
            const existingEpisodes = [...(contentItem.episodes || [])];
            contentItem.episodes = Array.from(episodesListContainer.querySelectorAll('.episode-item')).map((el, index) => {
                const existingEp = existingEpisodes[index];
                return {
                    id: existingEp?.id || Date.now() + index,
                    title: el.querySelector('.episode-title-input').value.trim(),
                    runtime: parseRuntime(el.querySelector('.episode-runtime-input').value),
                    rating: parseFloat(el.querySelector('.episode-rating-input').value) || null,
                    status: existingEp ? existingEp.status : 'not_watched',
                    comment: existingEp ? existingEp.comment : '',
                    watchedDates: existingEp ? existingEp.watchedDates : []
                };
            });
            updateSeriesStatusFromEpisodes(contentItem);
            delete contentItem.runtime;
            delete contentItem.rating;
            delete contentItem.watchedDates;
        } else {
            contentItem.runtime = parseRuntime(itemRuntimeInput.value);
            const ratingValue = itemRatingInput.value;
            contentItem.rating = ratingValue === 'null' ? null : parseFloat(ratingValue);
            contentItem.watchedDates = [...currentWatchedDates];
            delete contentItem.episodes;
        }

        const allUniverses = dataManager.getUniverses();
        allUniverses.forEach(universe => {
            universe.timeline = (universe.timeline || []).filter(itemId => itemId !== contentItem.id);
            if (contentItem.type === 'series' && contentItem.episodes) {
                const episodeIds = new Set(contentItem.episodes.map(ep => ep.id));
                universe.timeline = universe.timeline.filter(itemId => !episodeIds.has(itemId));
            }
        });

        for (const universeId in currentUniverseAssociations) {
            const universe = allUniverses.find(u => u.id == universeId);
            const count = currentUniverseAssociations[universeId];
            if (universe && count > 0) {
                for (let i = 0; i < count; i++) {
                    if (!universe.timeline) universe.timeline = [];
                    universe.timeline.push(contentItem.id);
                }
            }
        }
        
        const playlists = dataManager.getPlaylists();
        const selectedPlaylistIds = new Set(Array.from(itemPlaylistsContainer.querySelectorAll('input:checked')).map(cb => Number(cb.value)));
        playlists.forEach(p => {
            const hasContent = p.contentIds.includes(contentItem.id);
            const shouldHaveContent = selectedPlaylistIds.has(p.id);
            if (hasContent && !shouldHaveContent) {
                p.contentIds = p.contentIds.filter(cid => cid !== contentItem.id);
            } else if (!hasContent && shouldHaveContent) {
                p.contentIds.push(contentItem.id);
            }
        });

        dataManager.saveContent(contentItem);
        dataManager.saveAllData();

        renderContentGrid();
        renderPlaylists();
        populateFilters(); // Atualiza os filtros com novos dados se houver
        closeContentModal();
    });

    contentGridEl.addEventListener('click', (e) => {
        const button = e.target.closest('.card-action-btn, .view-attachments-btn');
        if (!button) return;
        
        const card = button.closest('.content-card, .card-details-info');
        if (!card) return;
        
        const contentId = Number(card.dataset.id);
        const item = dataManager.getContentById(contentId);
        if (!item) return;

        if (button.classList.contains('edit-content-btn')) {
            openContentModal(item);
        } else if (button.classList.contains('delete-content-btn')) {
            if (confirm(`Tens a certeza que queres apagar "${item.title}"? Todos os conteúdos anexados a este item também serão apagados.`)) {
                dataManager.deleteContent(contentId);
                dataManager.saveAllData();
                renderContentGrid();
                renderPlaylists();
                populateFilters();
            }
        } else if (button.classList.contains('view-episodes-btn')) {
            openEpisodesViewer(item);
        } else if (button.classList.contains('view-comment-btn')) {
            openCommentViewer(item);
        } else if (button.classList.contains('mark-watched-btn')) {
            item.status = 'watched';
            if (!item.watchedDates) item.watchedDates = [];
            item.watchedDates.push(Date.now());
            dataManager.saveAllData();
            renderContentGrid();
        } else if (button.classList.contains('view-attachments-btn')) {
            openAttachmentsViewer(item.id);
        }
    });

    contentGridEl.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.content-card');
        
        document.querySelectorAll('.content-card.expand-left').forEach(c => c.classList.remove('expand-left'));

        if (card) {
            const rect = card.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const expandedWidth = 450; 
            const margin = 20; 

            if (rect.left + expandedWidth + margin > viewportWidth) {
                card.classList.add('expand-left');
            }
        }
    });
    
    closeEpisodesViewerBtn.addEventListener('click', closeEpisodesViewer);
    episodesViewerModal.addEventListener('click', (e) => {
        if (e.target === episodesViewerModal) closeEpisodesViewer();
    });

    episodesViewerList.addEventListener('click', (e) => {
        const button = e.target.closest('.episode-action-btn');
        if (!button) return;

        const seriesId = Number(episodesViewerModal.dataset.seriesId);
        const series = dataManager.getContentById(seriesId);
        const itemElement = button.closest('.episode-viewer-item');
        const episodeIndex = parseInt(itemElement.dataset.episodeIndex, 10);

        if (button.classList.contains('episode-viewer-edit-btn')) {
            if(series) openEpisodeEditor(series, episodeIndex);
        }
        
        if (button.classList.contains('view-comment-btn')) {
            const episode = series?.episodes?.[episodeIndex];
            if (episode) {
                openCommentViewer({ title: episode.title, comment: episode.comment });
            }
        }
    });

    episodeEditorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const seriesId = Number(editingSeriesIdInput.value);
        const episodeIndex = Number(editingEpisodeIndexInput.value);
        const series = dataManager.getContentById(seriesId);
        
        if (!series || !series.episodes[episodeIndex]) return;
    
        const episodeRatingInput = episodeEditorForm.querySelector('input[type="hidden"]');
        const episode = series.episodes[episodeIndex];
        episode.title = epEditorTitleInput.value.trim();
        episode.runtime = parseRuntime(epEditorRuntimeInput.value);
        episode.comment = epEditorCommentInput.value.trim();
        episode.watchedDates = [...currentEpisodeWatchedDates];
        
        const ratingValue = episodeRatingInput.value;
        episode.rating = ratingValue === 'null' ? null : parseFloat(ratingValue);
        
        const activeStatusBtn = epEditorStatusContainer.querySelector('button.active');
        episode.status = activeStatusBtn ? activeStatusBtn.dataset.value : 'not_watched';
    
        updateSeriesStatusFromEpisodes(series);
    
        dataManager.saveAllData();
        openEpisodesViewer(series);
        closeEpisodeEditor();
        renderContentGrid();
    
        episodeRatingInput.remove();
    });

    cancelEpisodeEditBtn.addEventListener('click', closeEpisodeEditor);

    epEditorStatusContainer.addEventListener('click', (e) => {
        const statusBtn = e.target.closest('button');
        if (statusBtn) {
            const oldStatusBtn = epEditorStatusContainer.querySelector('button.active');
            const oldStatus = oldStatusBtn ? oldStatusBtn.dataset.value : null;
            const newStatus = statusBtn.dataset.value;

            if (oldStatus === newStatus) return;

            epEditorStatusContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            statusBtn.classList.add('active');

            if (newStatus === 'watched' && oldStatus !== 'watched') {
                currentEpisodeWatchedDates.push(Date.now());
                renderEpisodeWatchedDates();
            }
        }
    });

    if (epAddCurrentWatchedDateBtn) epAddCurrentWatchedDateBtn.addEventListener('click', () => {
        currentEpisodeWatchedDates.push(Date.now());
        renderEpisodeWatchedDates();
    });

    if (epAddManualWatchedDateBtn) epAddManualWatchedDateBtn.addEventListener('click', () => {
        manualDateTarget = 'episode';
        openManualDateModal();
    });
    
    if (epWatchedDatesList) epWatchedDatesList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-watched-date-btn');
        if (removeBtn) {
            const itemEl = removeBtn.closest('.watched-date-item');
            const timestampToRemove = Number(itemEl.dataset.timestamp);
            currentEpisodeWatchedDates = currentEpisodeWatchedDates.filter(ts => ts !== timestampToRemove);
            renderEpisodeWatchedDates();
        }
    });
    
    closeCommentViewerBtn.addEventListener('click', closeCommentViewer);
    commentViewerModal.addEventListener('click', (e) => {
        if (e.target === commentViewerModal) closeCommentViewer();
    });
    
    if (addToUniverseBtn) addToUniverseBtn.addEventListener('click', openAddToUniverseModal);
    if (closeAddToUniverseBtn) closeAddToUniverseBtn.addEventListener('click', closeAddToUniverseModal);
    if (addToUniverseModal) addToUniverseModal.addEventListener('click', e => {
        if (e.target === addToUniverseModal) closeAddToUniverseModal();
    });

    if (universeSelectionList) universeSelectionList.addEventListener('click', e => {
        const card = e.target.closest('.universe-selector-card');
        if (card) {
            const universeId = card.dataset.universeId;
            if (currentUniverseAssociations[universeId]) currentUniverseAssociations[universeId]++;
            else currentUniverseAssociations[universeId] = 1;
            renderUniverseAssociations();
            closeAddToUniverseModal();
        }
    });

    if (itemUniversesContainer) itemUniversesContainer.addEventListener('click', e => {
        const button = e.target.closest('.universe-count-btn');
        if (button) {
            const universeId = button.dataset.universeId;
            if (button.classList.contains('increase-btn')) currentUniverseAssociations[universeId]++;
            else if (button.classList.contains('decrease-btn')) {
                currentUniverseAssociations[universeId]--;
                if (currentUniverseAssociations[universeId] <= 0) delete currentUniverseAssociations[universeId];
            }
            renderUniverseAssociations();
        }
    });

    closeAttachmentsViewerBtn.addEventListener('click', closeAttachmentsViewer);
    attachmentsViewerModal.addEventListener('click', e => {
        if (e.target === attachmentsViewerModal) closeAttachmentsViewer();
    });

    attachmentsViewerList.addEventListener('click', e => {
        const button = e.target.closest('.attachment-action-btn');
        if (!button) return;
    
        const contentId = Number(button.closest('.attachment-item-card').dataset.id);
        const item = dataManager.getContentById(contentId);
        if (!item) return;
    
        const primaryItemId = item.attachedTo; 
    
        if (button.classList.contains('edit-content-btn')) {
            closeAttachmentsViewer();
            openContentModal(item);
        } else if (button.classList.contains('delete-content-btn')) {
            if (confirm(`Tens a certeza que queres apagar "${item.title}"?`)) {
                dataManager.deleteContent(contentId);
                dataManager.saveAllData();
                openAttachmentsViewer(primaryItemId);
                renderContentGrid();
                renderPlaylists();
            }
        }
    });

    let draggedItemId = null;
    let draggedPlaylistId = null;

    playlistsListEl.addEventListener('dragstart', (e) => {
        if (!playlistsSidebar.classList.contains('edit-mode')) {
            e.preventDefault();
            return;
        }
        const playlistItem = e.target.closest('.playlist-item');
        if (playlistItem && playlistItem.dataset.id !== 'all') {
            draggedPlaylistId = Number(playlistItem.dataset.id);
            setTimeout(() => playlistItem.classList.add('dragging'), 0);
        }
    });

    playlistsListEl.addEventListener('dragend', (e) => {
        const playlistItem = e.target.closest('.playlist-item.dragging');
        if(playlistItem) playlistItem.classList.remove('dragging');
        document.querySelectorAll('.drag-over-indicator').forEach(el => el.remove());
        draggedPlaylistId = null;
    });
    
    playlistsListEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedPlaylistId) return;
    
        document.querySelectorAll('.drag-over-indicator').forEach(el => el.remove());
    
        const targetItem = e.target.closest('.playlist-item');
        if (targetItem && targetItem.dataset.id !== 'all' && Number(targetItem.dataset.id) !== draggedPlaylistId) {
            const rect = targetItem.getBoundingClientRect();
            const offset = e.clientY - rect.top;
            
            const indicator = document.createElement('div');
            indicator.className = 'drag-over-indicator';
    
            if (offset < rect.height / 2) {
                targetItem.before(indicator);
            } else {
                targetItem.after(indicator);
            }
        }
    });
    
    playlistsListEl.addEventListener('drop', (e) => {
        const playlists = dataManager.getPlaylists();
        e.preventDefault();
        document.querySelectorAll('.drag-over-indicator').forEach(el => el.remove());
        const targetItem = e.target.closest('.playlist-item');
    
        if (!draggedPlaylistId || !targetItem || targetItem.dataset.id === 'all') return;
    
        const draggedIndex = playlists.findIndex(p => p.id === draggedPlaylistId);
        const targetIndex = playlists.findIndex(p => p.id === Number(targetItem.dataset.id));
    
        if (draggedIndex === -1 || targetIndex === -1) return;
    
        const [movedPlaylist] = playlists.splice(draggedIndex, 1);
        
        const rect = targetItem.getBoundingClientRect();
        const offset = e.clientY - rect.top;
        const insertBefore = offset < rect.height / 2;
    
        let newIndex = playlists.findIndex(p => p.id === Number(targetItem.dataset.id));
    
        if(insertBefore){
            playlists.splice(newIndex, 0, movedPlaylist);
        } else {
            playlists.splice(newIndex + 1, 0, movedPlaylist);
        }
    
        dataManager.saveAllData();
        renderPlaylists();
        draggedPlaylistId = null;
    });

    contentGridEl.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.content-card');
        if (card) {
            draggedItemId = card.dataset.id;
            e.dataTransfer.setData('text/plain', draggedItemId);
            setTimeout(() => card.querySelector('.card-expander').classList.add('dragging'), 0);
        }
    });
    contentGridEl.addEventListener('dragend', (e) => {
        const card = e.target.closest('.content-card');
        if (card) card.querySelector('.card-expander').classList.remove('dragging');
        draggedItemId = null;
        playlistsListEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    playlistsListEl.addEventListener('dragenter', (e) => {
        const playlistItem = e.target.closest('.playlist-item');
        if (playlistItem && draggedItemId) {
            e.preventDefault();
            playlistsListEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            playlistItem.classList.add('drag-over');
        }
    });
    playlistsListEl.addEventListener('dragover', (e) => {
        const playlistItem = e.target.closest('.playlist-item');
        if (playlistItem && draggedItemId) e.preventDefault();
    });
    playlistsListEl.addEventListener('dragleave', (e) => {
        const playlistItem = e.target.closest('.playlist-item');
        if (playlistItem && !playlistItem.contains(e.relatedTarget)) playlistItem.classList.remove('drag-over');
    });
    playlistsListEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetPlaylistItem = e.target.closest('.playlist-item');
        if (targetPlaylistItem && draggedItemId) {
            const contentIdToMove = draggedItemId;
            const targetPlaylistId = targetPlaylistItem.dataset.id;
            moveContentToPlaylist(contentIdToMove, targetPlaylistId);
            targetPlaylistItem.classList.remove('drag-over');
        }
        draggedItemId = null;
    });

    // ===================================================================
    // LÓGICA DE DRAG AND DROP POR TOQUE PARA DISPOSITIVOS MÓVEIS
    // ===================================================================
    const handleTouchDragAndDrop = () => {
        let draggedItem = null;
        let ghostItem = null;
        let longPressTimer = null;
        let isDragging = false;
        let startX, startY;
        let offsetX, offsetY;

        const isMobileView = () => window.innerWidth <= 767;

        playlistsListEl.addEventListener('touchstart', (e) => {
            // Só ativa em modo de edição e em ecrãs móveis
            if (!playlistsSidebar.classList.contains('edit-mode') || !isMobileView()) return;
            
            const targetHandle = e.target.closest('.drag-handle');
            if (!targetHandle) return;

            e.preventDefault(); // Previne scroll enquanto segura o dedo

            draggedItem = targetHandle.closest('.playlist-item');
            if (!draggedItem || draggedItem.dataset.id === 'all') return;

            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;

            // Inicia o temporizador para o "long press"
            longPressTimer = setTimeout(() => {
                isDragging = true;
                
                // Cria um "fantasma" do item para arrastar
                ghostItem = draggedItem.cloneNode(true);
                ghostItem.classList.add('playlist-ghost');
                document.body.appendChild(ghostItem);

                // Calcula a diferença entre o toque e o canto do item
                const rect = draggedItem.getBoundingClientRect();
                offsetX = startX - rect.left;
                offsetY = startY - rect.top;

                // Move o fantasma para a posição inicial do toque
                ghostItem.style.transform = `translate(${startX - offsetX}px, ${startY - offsetY}px)`;
                
                // Esconde o item original
                draggedItem.classList.add('dragging');
                
                // Adiciona uma classe ao body para evitar seleção de texto
                document.body.classList.add('is-dragging-touch');

            }, 500); // 500ms para ativar o arrasto

        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging || !ghostItem) return;
            
            e.preventDefault();

            const touch = e.touches[0];
            const currentX = touch.clientX;
            const currentY = touch.clientY;
            
            // Move o fantasma para seguir o dedo
            ghostItem.style.transform = `translate(${currentX - offsetX}px, ${currentY - offsetY}px)`;
            
            // Remove indicadores existentes
            document.querySelectorAll('.drag-over-indicator').forEach(el => el.remove());
            
            // Encontra o item sobre o qual estamos a arrastar
            ghostItem.style.display = 'none'; // Esconde temporariamente para não interferir
            const elementBelow = document.elementFromPoint(currentX, currentY);
            ghostItem.style.display = ''; // Mostra de novo

            const targetItem = elementBelow ? elementBelow.closest('.playlist-item') : null;

            if (targetItem && targetItem !== draggedItem && targetItem.dataset.id !== 'all') {
                const rect = targetItem.getBoundingClientRect();
                const offset = currentY - rect.top;
                
                const indicator = document.createElement('div');
                indicator.className = 'drag-over-indicator';
        
                if (offset < rect.height / 2) {
                    targetItem.before(indicator);
                } else {
                    targetItem.after(indicator);
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            // Cancela o temporizador se o dedo for levantado antes do tempo
            clearTimeout(longPressTimer);

            if (!isDragging) return;

            const indicator = document.querySelector('.drag-over-indicator');
            if (indicator) {
                const playlists = dataManager.getPlaylists();
                const draggedId = Number(draggedItem.dataset.id);
                
                const children = Array.from(playlistsListEl.children);
                let targetIndex = children.indexOf(indicator) - 1; // -1 por causa do item "Todos"

                // Ajusta o índice se o item arrastado estava antes do alvo
                const originalIndex = playlists.findIndex(p => p.id === draggedId);
                if (originalIndex !== -1 && originalIndex < targetIndex) {
                    targetIndex--;
                }

                // Move o item no array de dados
                const [movedPlaylist] = playlists.splice(originalIndex, 1);
                playlists.splice(targetIndex, 0, movedPlaylist);
                
                dataManager.saveAllData();
                renderPlaylists(); // Re-renderiza a partir dos dados atualizados
            }
            
            // Limpeza
            if (ghostItem) ghostItem.remove();
            if (draggedItem) draggedItem.classList.remove('dragging');
            document.querySelectorAll('.drag-over-indicator').forEach(el => el.remove());
            document.body.classList.remove('is-dragging-touch');
            
            isDragging = false;
            draggedItem = null;
            ghostItem = null;
        });
    };

    const init = () => {
        if (typeof dataManager === 'undefined') {
            console.error("ERRO CRÍTICO: data-manager.js não foi carregado antes de playlists.js");
            alert("Ocorreu um erro crítico. A aplicação pode não funcionar corretamente.");
            return;
        }

        dataManager.loadAllData();
        renderPlaylists();
        populateFilters();
        updateFilterButtonsUI();
        renderContentGrid();
        
        setupMobileFilters();
        window.addEventListener('resize', setupMobileFilters);

        if (mobileFilterBtn) {
            mobileFilterBtn.addEventListener('click', () => {
                mobileFiltersModal.classList.remove('hidden');
            });
        }
        if (closeMobileFiltersBtn) {
            closeMobileFiltersBtn.addEventListener('click', () => {
                mobileFiltersModal.classList.add('hidden');
            });
        }
        if (mobileFiltersModal) {
            mobileFiltersModal.addEventListener('click', (e) => {
                if (e.target === mobileFiltersModal) {
                    mobileFiltersModal.classList.add('hidden');
                }
            });
        }
        
        // Lógica para o menu lateral em mobile
        if (mobileMenuButton) {
            mobileMenuButton.addEventListener('click', toggleSidebar);
        }
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', toggleSidebar);
        }

        handleTouchDragAndDrop();
    };

    init();
});

