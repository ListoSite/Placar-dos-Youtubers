document.addEventListener('DOMContentLoaded', () => {
    console.log("Script dos Universos v2.0 - Sincronizado com Data Manager.");

    // ===================================================================
    // SELEÇÃO DE ELEMENTOS DO DOM
    // ===================================================================
    const universeGrid = document.getElementById('universe-grid');
    const addUniverseBtn = document.getElementById('add-universe-btn');
    const emptyGridMessage = document.getElementById('empty-grid-message');
    const universeModal = document.getElementById('universe-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const universeForm = document.getElementById('universe-form');
    const modalTitle = document.getElementById('modal-title');
    const saveBtnText = document.getElementById('save-btn-text');
    const universeIdInput = document.getElementById('universe-id');
    const universeNameInput = document.getElementById('universe-name');
    const universeCoverInput = document.getElementById('universe-cover');
    const universeDescriptionInput = document.getElementById('universe-description');
    const universeStatusInput = document.getElementById('universe-status');

    // Elementos para a navegação móvel
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    // ===================================================================
    // LÓGICA DE NAVEGAÇÃO MÓVEL
    // ===================================================================
    const toggleSidebar = () => {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.toggle('is-open');
            sidebarOverlay.classList.toggle('is-visible');
        }
    };

    if (mobileMenuButton && sidebar && sidebarOverlay) {
        mobileMenuButton.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // ===================================================================
    // FUNÇÕES DE LÓGICA DE NEGÓCIO E AUXILIARES
    // ===================================================================
    
    const calculateSeriesAverageRating = (episodes = []) => {
        const ratedEpisodes = episodes.filter(ep => typeof ep.rating === 'number' && ep.rating > 0);
        if (ratedEpisodes.length === 0) return 'N/A';
        const totalRating = ratedEpisodes.reduce((sum, ep) => sum + ep.rating, 0);
        const average = totalRating / ratedEpisodes.length;
        return parseFloat(average.toFixed(1));
    };

    const calculateAverageRating = (items) => {
        if (!items || items.length === 0) return '0.0';

        const ratings = items.map(item => {
            if (item.type === 'series') {
                const average = calculateSeriesAverageRating(item.episodes);
                return average !== 'N/A' ? average : null;
            }
            return item.rating;
        }).filter(r => r !== null && !isNaN(parseFloat(r)) && r > 0);

        if (ratings.length === 0) return '0.0';

        const totalRating = ratings.reduce((sum, rating) => sum + parseFloat(rating), 0);
        return (totalRating / ratings.length).toFixed(1);
    };

    const getRatingColorClass = (rating) => {
        const r = parseFloat(rating);
        if (r >= 8) return 'text-green-400';
        if (r >= 6) return 'text-yellow-400';
        if (r >= 4) return 'text-orange-400';
        if (r > 0) return 'text-red-400';
        return 'text-gray-500';
    };

    const calculateUniverseProgress = (items) => {
        let totalItems = 0;
        let watchedItems = 0;

        items.forEach(item => {
            if (item.type === 'series') {
                const episodes = item.episodes || [];
                totalItems += episodes.length;
                watchedItems += episodes.filter(ep => ep.status === 'watched').length;
            } else {
                totalItems++;
                if (item.status === 'watched') {
                    watchedItems++;
                }
            }
        });

        return { totalItems, watchedItems };
    };
    
    const determineOverallStatus = (items) => {
        if (!items || items.length === 0) return 'planned';
        
        const statuses = items.map(item => {
            if (item.type === 'series') {
                const totalEpisodes = (item.episodes || []).length;
                if (totalEpisodes === 0) return 'planned';
                const watchedCount = item.episodes.filter(ep => ep.status === 'watched').length;
                if (watchedCount === totalEpisodes) return 'watched';
                if (item.episodes.some(ep => ep.status === 'watching' || ep.status === 'watched')) return 'watching';
                return 'planned';
            }
            return item.status === 'want_to_watch' ? 'planned' : item.status;
        });

        if (statuses.every(s => s === 'watched')) return 'watched';
        if (statuses.some(s => s === 'watching' || s === 'watched')) return 'watching';
        return 'planned';
    };


    // ===================================================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ===================================================================

    const renderUniverses = () => {
        const universes = dataManager.getUniverses();
        const allContent = dataManager.getAllContent();

        if (!universeGrid) return;
        universeGrid.innerHTML = '';

        if (universes.length === 0) {
            if (emptyGridMessage) emptyGridMessage.classList.remove('hidden');
        } else {
            if (emptyGridMessage) emptyGridMessage.classList.add('hidden');
            universes.forEach(universe => {
                const card = document.createElement('div');
                card.className = 'universe-card';
                card.dataset.id = universe.id;

                const associatedItems = (universe.timeline || [])
                    .map(id => dataManager.getContentById(id))
                    .filter(Boolean);

                const { totalItems, watchedItems } = calculateUniverseProgress(associatedItems);
                const percentage = totalItems > 0 ? Math.round((watchedItems / totalItems) * 100) : 0;
                const averageRating = calculateAverageRating(associatedItems);
                const ratingColor = getRatingColorClass(averageRating);
                
                const overallStatus = universe.manualStatus && universe.manualStatus !== 'auto' 
                    ? universe.manualStatus 
                    : determineOverallStatus(associatedItems);
                
                const statusConfig = {
                    planned: { text: 'Planeado', style: 'background-color: rgba(107, 114, 128, 0.5); color: #d1d5db;' },
                    watching: { text: 'A Ver', style: 'background-color: rgba(59, 130, 246, 0.5); color: #93c5fd;' },
                    watched: { text: 'Visto', style: 'background-color: rgba(34, 197, 94, 0.5); color: #86efac;' },
                };
                
                const currentStatus = statusConfig[overallStatus] || statusConfig.planned;

                card.innerHTML = `
                    <div class="card-background" style="background-image: url('${universe.cover || 'https://placehold.co/800x450/1f2937/4f46e5?text=Capa'}')"></div>
                    <div class="card-overlay"></div>
                    
                    <div class="card-actions">
                        <button class="card-action-btn edit-universe-btn" title="Editar Universo" data-id="${universe.id}"><i data-lucide="pencil"></i></button>
                        <button class="card-action-btn delete delete-universe-btn" title="Apagar Universo" data-id="${universe.id}"><i data-lucide="trash-2"></i></button>
                    </div>

                    <div class="card-status-badge" style="${currentStatus.style}">${currentStatus.text}</div>

                    <div class="card-content">
                        <div>
                            <h3 class="card-title">${universe.name}</h3>
                            <p class="card-description">${universe.description}</p>
                        </div>
                        <div class="card-stats">
                            <div class="stat-item" title="Classificação Média">
                                <i data-lucide="star" class="${ratingColor}"></i>
                                <span class="${ratingColor} font-bold">${averageRating}</span>
                            </div>
                            <div class="stat-item" title="Progresso">
                                <i data-lucide="check-circle-2" class="text-gray-400"></i>
                                <span>${watchedItems} / ${totalItems}</span>
                            </div>
                            <div class="stat-item" title="Concluído">
                                <i data-lucide="gauge-circle" class="text-gray-400"></i>
                                <span>${percentage}%</span>
                            </div>
                        </div>
                    </div>

                    <button class="card-view-button view-timeline-btn" data-id="${universe.id}">
                        <i data-lucide="align-end-horizontal"></i>
                        <span>Ver Timeline</span>
                    </button>
                `;
                universeGrid.appendChild(card);
            });
        }
        lucide.createIcons();
    };

    // ===================================================================
    // FUNÇÕES DE CONTROLO DO MODAL
    // ===================================================================

    const openUniverseModal = (universe = null) => {
        if (!universeForm) return;
        universeForm.reset();
        if (universe) {
            modalTitle.textContent = 'Editar Universo';
            saveBtnText.textContent = 'Guardar Alterações';
            universeIdInput.value = universe.id;
            universeNameInput.value = universe.name;
            universeCoverInput.value = universe.cover;
            universeDescriptionInput.value = universe.description;
            universeStatusInput.value = universe.manualStatus || 'auto';
        } else {
            modalTitle.textContent = 'Adicionar Novo Universo';
            saveBtnText.textContent = 'Guardar Universo';
            universeIdInput.value = '';
            universeStatusInput.value = 'auto';
        }
        if (universeModal) universeModal.classList.remove('hidden');
    };

    const closeUniverseModal = () => {
        if (universeModal) universeModal.classList.add('hidden');
    };

    // ===================================================================
    // EVENT LISTENERS
    // ===================================================================

    if (addUniverseBtn) addUniverseBtn.addEventListener('click', () => openUniverseModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeUniverseModal);
    if (universeModal) universeModal.addEventListener('click', (e) => {
        if (e.target === universeModal) closeUniverseModal();
    });

    if (universeForm) universeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const universes = dataManager.getUniverses();
        const id = universeIdInput.value;
        const statusValue = universeStatusInput.value;

        if (id) {
            // Editar
            const universe = universes.find(u => u.id == id);
            if (universe) {
                universe.name = universeNameInput.value;
                universe.cover = universeCoverInput.value;
                universe.description = universeDescriptionInput.value;
                universe.manualStatus = statusValue === 'auto' ? null : statusValue;
            }
        } else {
            // Criar novo
            const newUniverse = {
                id: Date.now(),
                name: universeNameInput.value,
                description: universeDescriptionInput.value,
                cover: universeCoverInput.value,
                timeline: [],
                manualStatus: statusValue === 'auto' ? null : statusValue,
            };
            universes.push(newUniverse);
        }
        dataManager.saveAllData();
        renderUniverses();
        closeUniverseModal();
    });
    
    if (universeGrid) universeGrid.addEventListener('click', (e) => {
        const buttonTarget = e.target.closest('button');

        // Lógica para os botões dentro do cartão
        if (buttonTarget) {
            const id = buttonTarget.dataset.id;
            if (buttonTarget.classList.contains('view-timeline-btn')) {
                localStorage.setItem('selectedUniverseId', id);
                window.location.href = 'timeline.html';
            } else if (buttonTarget.classList.contains('edit-universe-btn')) {
                const universeToEdit = dataManager.getUniverseById(id);
                openUniverseModal(universeToEdit);
            } else if (buttonTarget.classList.contains('delete-universe-btn')) {
                if (confirm(`Tens a certeza que queres apagar este universo? Todo o conteúdo associado perderá essa associação.`)) {
                    let universes = dataManager.getUniverses();
                    const indexToDelete = universes.findIndex(u => u.id == id);
                    if (indexToDelete > -1) {
                        universes.splice(indexToDelete, 1);
                    }
                    dataManager.saveAllData();
                    renderUniverses();
                }
            }
            return; // Impede que o clique no botão ative o clique no cartão
        }

        // Lógica para clicar no cartão em mobile
        const cardTarget = e.target.closest('.universe-card');
        if (cardTarget && window.innerWidth <= 767) {
            const id = cardTarget.dataset.id;
            localStorage.setItem('selectedUniverseId', id);
            window.location.href = 'timeline.html';
        }
    });

    // ===================================================================
    // INICIALIZAÇÃO
    // ===================================================================
    const init = () => {
        if (typeof dataManager === 'undefined') {
            console.error("ERRO CRÍTICO: data-manager.js não foi carregado antes de universo-filmes.js");
            alert("Ocorreu um erro crítico. A aplicação pode não funcionar corretamente.");
            return;
        }
        dataManager.loadAllData();
        renderUniverses();
    };

    init();
});

