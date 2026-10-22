// social.js - Lógica para a página Gerir Social (Versão 8.1 - Correção ao guardar)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos do DOM ---
    const socialSection = document.getElementById('section-gerir-social');
    const socialGrid = document.getElementById('social-grid-container');
    const socialSearchInput = document.getElementById('social-search-input');
    const modal = document.getElementById('social-modal');
    const modalBody = document.getElementById('social-modal-body');
    const modalCloseBtn = document.getElementById('social-modal-close-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    
    const nameModal = document.getElementById('history-name-modal');
    const nameConfirmBtn = document.getElementById('history-name-confirm-btn');
    const nameCancelBtn = document.getElementById('history-name-cancel-btn');
    const nameInput = document.getElementById('history-name-input');
    
    const historyDetailsModal = document.getElementById('history-details-modal');
    const historyDetailsBody = document.getElementById('history-details-modal-body');
    const historyDetailsCloseBtn = document.getElementById('history-details-modal-close');


    // --- Estado da Aplicação ---
    let placarData = [];
    let currentEditingProfileId = null;
    let isSocialModalOpen = false;
    let archiveAction = null; // 'create'

    // --- Funções Auxiliares ---
    function loadData() {
        placarData = window.getData();
    }

    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    function formatViews(viewsValue) {
        const num = parseViews(viewsValue);
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toLocaleString('pt-PT'); // Alterado para K com separador
        return num.toLocaleString('pt-PT');
    }
    
    function calculateAndAssignRanks(data) {
        const sortedProfiles = [...data]
            .sort((a, b) => parseViews(b.stats?.views) - parseViews(a.stats?.views));
        
        return data.map(profile => {
            const rank = sortedProfiles.findIndex(p => p.id === profile.id) + 1;
            return { ...profile, rank }; 
        });
    }

    // --- Funções de Renderização da Página Principal ---
    function renderSocialGrid() {
        if (!socialGrid) return;
        loadData();
        socialGrid.innerHTML = '';

        const searchTerm = socialSearchInput ? socialSearchInput.value.toLowerCase() : '';
        let profilesToRender = placarData;

        if (searchTerm) {
            profilesToRender = placarData.filter(profile => 
                profile.name.toLowerCase().includes(searchTerm)
            );
        }

        if (profilesToRender.length === 0) {
            socialGrid.innerHTML = '<p class="empty-list-message">Nenhum perfil encontrado.</p>';
            return;
        }

        const sortedProfiles = [...profilesToRender].sort((a, b) => a.name.localeCompare(b.name));

        sortedProfiles.forEach(profile => {
            const card = document.createElement('div');
            card.className = 'social-main-card';
            card.setAttribute('data-profile-id', profile.id);
            card.innerHTML = `
                <img src="${profile.photo}" alt="Foto de ${profile.name}" class="social-main-photo" onerror="this.src='https://placehold.co/80x80/400414/a0a0a0?text=Foto'">
                <h3 class="social-main-name">${profile.name}</h3>
                <p class="social-main-cta">Gerir Métricas &rarr;</p>
            `;
            card.addEventListener('click', () => openSocialModal(profile.id));
            socialGrid.appendChild(card);
        });
    }

    // --- Funções de Gestão do Modal Social ---
    function openSocialModal(profileId) {
        currentEditingProfileId = profileId;
        const allData = window.getData();
        const allDataWithRanks = calculateAndAssignRanks(allData);
        const profileToDisplay = allDataWithRanks.find(p => p.id === profileId);
        
        if (!profileToDisplay) {
            console.error("Perfil não encontrado:", profileId);
            return;
        }

        if (!profileToDisplay.socials) profileToDisplay.socials = {};

        placarData = allData;
        modalBody.innerHTML = createModalContent(profileToDisplay);
        openModal(modal);
        isSocialModalOpen = true;
        addModalEventListeners();
        switchTab('youtube');
    }

    function createModalContent(profile) {
        const profileSocials = profile.socials || {};
        
        return `
            <div class="social-modal-header">
                <img src="${profile.photo}" alt="${profile.name}" class="social-modal-photo" onerror="this.src='https://placehold.co/80x80/400414/a0a0a0?text=Foto'">
                <div><h2 class="social-modal-title">${profile.name}</h2><p class="social-modal-subtitle">Gestão de Métricas Sociais</p></div>
            </div>
            <div class="social-modal-tabs">
                <button class="social-tab-btn active" data-tab="youtube"><i class="fab fa-youtube"></i> YouTube</button>
                <button class="social-tab-btn" data-tab="instagram"><i class="fab fa-instagram"></i> Instagram</button>
                <button class="social-tab-btn" data-tab="twitch"><i class="fab fa-twitch"></i> Twitch</button>
                <button class="social-tab-btn" data-tab="tiktok"><i class="fab fa-tiktok"></i> TikTok</button>
                <button class="social-tab-btn" data-tab="history"><i class="fas fa-history"></i> Histórico</button>
            </div>
            <div class="social-modal-content">
                ${createTabContent('youtube', profileSocials.youtube, profile)}
                ${createTabContent('instagram', profileSocials.instagram)}
                ${createTabContent('twitch', profileSocials.twitch)}
                ${createTabContent('tiktok', profileSocials.tiktok)}
                ${createTabContent('history', {}, profile)}
            </div>
             <div class="social-modal-footer">
                <button id="save-social-data-btn" class="action-button">Guardar Alterações</button>
            </div>
        `;
    }

    function createTabContent(platform, data = {}, profile = {}) {
        let fieldsHtml = '';
        const link = data?.link || '';
        const linkActionsHtml = `
            <div class="link-actions-group">
                <label for="${platform}-link">Link do Perfil</label>
                <div class="input-with-actions">
                    <input type="text" id="${platform}-link" class="social-input" value="${link}" placeholder="https://...">
                    <a href="${link}" target="_blank" class="social-action-btn" title="Abrir Link"><i class="fas fa-external-link-alt"></i></a>
                </div>
            </div>`;
        
        const totalProjectViews = (profile.projects || []).reduce((sum, p) => sum + parseViews(p.views), 0);

        switch (platform) {
            case 'youtube':
                fieldsHtml = `
                    ${linkActionsHtml}
                    <div class="social-form-grid">
                         <div class="form-group">
                            <label for="youtube-subs">Subscritores</label>
                            <input type="number" id="youtube-subs" class="social-input" value="${data?.subs || ''}" placeholder="Ex: 150000">
                        </div>
                        <div class="form-group">
                            <label for="youtube-totalVideos">Total de Vídeos</label>
                            <input type="number" id="youtube-totalVideos" class="social-input" value="${data?.totalVideos || ''}" placeholder="Ex: 500">
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>Total de Views do Canal</label>
                            <input type="text" id="youtube-total-channel-views" class="social-input" value="${data?.totalChannelViews || ''}" placeholder="Ex: 15000000 ou 15M">
                        </div>
                    </div>
                    <div class="social-form-grid auto-stats">
                         <div class="form-group readonly">
                            <label>Rank Atual (Automático)</label>
                            <input type="text" class="social-input" value="#${profile.rank || 'N/A'}" readonly>
                        </div>
                        <div class="form-group readonly">
                            <label>Nº de Projetos (Automático)</label>
                            <input type="text" class="social-input" value="${(profile.projects || []).length}" readonly>
                        </div>
                         <div class="form-group">
                            <label for="youtube-month-views">Views do Mês</label>
                            <input type="text" id="youtube-month-views" class="social-input" value="${profile.stats?.views || 0}">
                        </div>
                        <div class="form-group">
                            <label for="youtube-month-points">Pontos do Mês</label>
                            <input type="number" id="youtube-month-points" class="social-input" value="${profile.stats?.points || 0}">
                        </div>
                        <div class="form-group readonly">
                            <label>Views de Projetos (Automático)</label>
                            <input type="text" class="social-input" value="${formatViews(totalProjectViews)}" readonly>
                        </div>
                    </div>
                    `;
                break;
            case 'instagram':
                fieldsHtml = `
                    ${linkActionsHtml}
                    <div class="social-form-grid">
                        <div class="form-group">
                            <label for="instagram-followers">Seguidores</label>
                            <input type="number" id="instagram-followers" class="social-input" value="${data?.followers || ''}" placeholder="Ex: 50000">
                        </div>
                        <div class="form-group">
                            <label for="instagram-posts">Nº de Posts</label>
                            <input type="number" id="instagram-posts" class="social-input" value="${data?.posts || ''}" placeholder="Ex: 1200">
                        </div>
                        <div class="form-group">
                            <label for="instagram-likes">Total de Likes</label>
                            <input type="number" id="instagram-likes" class="social-input" value="${data?.likes || ''}" placeholder="Ex: 2500000">
                        </div>
                        <div class="form-group">
                            <label for="instagram-comments">Total de Comentários</label>
                            <input type="number" id="instagram-comments" class="social-input" value="${data?.comments || ''}" placeholder="Ex: 50000">
                        </div>
                    </div>`;
                break;
            case 'twitch':
                 fieldsHtml = `
                    ${linkActionsHtml}
                    <div class="social-form-grid">
                        <div class="form-group">
                            <label for="twitch-followers">Seguidores</label>
                            <input type="number" id="twitch-followers" class="social-input" value="${data?.followers || ''}" placeholder="Ex: 25000">
                        </div>
                    </div>`;
                break;
            case 'tiktok':
                 fieldsHtml = `
                    ${linkActionsHtml}
                    <div class="social-form-grid">
                        <div class="form-group">
                            <label for="tiktok-followers">Seguidores</label>
                            <input type="number" id="tiktok-followers" class="social-input" value="${data?.followers || ''}" placeholder="Ex: 120000">
                        </div>
                        <div class="form-group">
                            <label for="tiktok-likes">Total de Likes</label>
                            <input type="number" id="tiktok-likes" class="social-input" value="${data?.likes || ''}" placeholder="Ex: 3000000">
                        </div>
                        <div class="form-group">
                            <label for="tiktok-videos">Nº de Vídeos</label>
                            <input type="number" id="tiktok-videos" class="social-input" value="${data?.videos || ''}" placeholder="Ex: 350">
                        </div>
                    </div>`;
                break;
            case 'history':
                fieldsHtml = `
                    <div class="history-actions-container">
                        <div class="history-action-box">
                            <h4>Criar Nova Pasta de Mês</h4>
                            <p>Guarda o estado atual deste perfil e zera as suas estatísticas do mês.</p>
                            <button id="create-history-btn" class="action-button"><i class="fas fa-folder-plus"></i> Criar Nova...</button>
                        </div>
                        <div class="history-action-box">
                            <h4>Atualizar Pasta Existente</h4>
                            <p>Substitui os dados de uma pasta existente com os dados atuais deste perfil.</p>
                            <div id="update-history-controls">
                                <select id="history-select-dropdown" class="social-input"></select>
                                <button id="confirm-update-history-btn" class="action-button secondary"><i class="fas fa-sync-alt"></i> Atualizar Selecionada</button>
                            </div>
                        </div>
                    </div>
                    <div class="toolbar" style="margin-top: 2rem; justify-content: center;">
                        <h3>Histórico de Desempenho (Pastas deste Perfil)</h3>
                    </div>
                    <div id="history-log-container"></div>
                `;
                break;
        }
        return `<div id="tab-${platform}" class="social-tab-content">${fieldsHtml}</div>`;
    }

    function switchTab(tabId) {
        document.querySelectorAll('.social-tab-content').forEach(content => content.style.display = 'none');
        document.querySelectorAll('.social-tab-btn').forEach(btn => btn.classList.remove('active'));
        
        const tab = document.getElementById(`tab-${tabId}`);
        const button = document.querySelector(`.social-tab-btn[data-tab="${tabId}"]`);
        if(tab) tab.style.display = 'block';
        if(button) button.classList.add('active');

        const profile = placarData.find(p => p.id === currentEditingProfileId);
        if (!profile) return;

        if (tabId === 'history') {
            renderHistoryTab(profile);
            addHistoryTabEventListeners(profile);
        }
    }

    function renderHistoryTab(profile) {
        const container = document.getElementById('history-log-container');
        if (!container) return;
        const history = profile.performanceHistory || [];
        if (history.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Nenhum histórico arquivado para este perfil.</p>';
            return;
        }
        const sortedHistory = [...history].sort((a,b) => b.month.localeCompare(a.month)); // Ordena alfabeticamente descendente
        container.innerHTML = sortedHistory.map((log, index) => `
            <div class="history-log-item" data-history-month="${log.month}">
                <div class="history-log-header">
                    <i class="fas fa-folder"></i>
                    <h3>${log.month}</h3>
                </div>
                 <div class="history-log-preview">
                    <div class="preview-stats">
                        <span>Rank: #${log.rank || '?'}</span>
                        <span>Views: ${formatViews(log.stats?.views || 0)}</span>
                    </div>
                    <div class="history-log-actions">
                        <button class="view-details-btn" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                        <button class="delete-history-entry-btn" title="Apagar Registo"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.history-log-item .view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const month = e.currentTarget.closest('.history-log-item').dataset.historyMonth;
                const historyIndex = profile.performanceHistory.findIndex(h => h.month === month);
                if(historyIndex > -1) showHistoryDetailsModal(profile, historyIndex);
            });
        });

        document.querySelectorAll('.history-log-item .delete-history-entry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const monthName = e.currentTarget.closest('.history-log-item').dataset.historyMonth;
                deleteHistoryEntry(profile.id, monthName);
            });
        });
    }

    function showHistoryDetailsModal(profile, historyIndex) {
        const historyEntry = profile.performanceHistory[historyIndex];
        if (!historyEntry) return;

        if (!historyDetailsBody) {
            console.error("Elemento 'history-details-modal-body' não encontrado.");
            return;
        }

        const stats = historyEntry.stats || {};
        const socials = historyEntry.socials || {};
        const youtubeSocials = socials.youtube || {};
        
        historyDetailsBody.innerHTML = `
            <div class="history-details-header">
                <h2>${historyEntry.month}</h2>
                <p>Snapshot do desempenho de ${profile.name}</p>
            </div>
            <div class="history-details-grid">
                <div class="history-details-box main-stats">
                    <h4>Estatísticas do Mês</h4>
                    <p><strong>Rank:</strong> #${historyEntry.rank || 'N/A'}</p>
                    <p><strong>Views:</strong> ${formatViews(stats.views || 0)}</p>
                    <p><strong>Pontos:</strong> ${(stats.points || 0).toLocaleString('pt-PT')}</p>
                </div>
                <div class="history-details-box">
                    <h4><i class="fab fa-youtube"></i> YouTube</h4>
                    <p><strong>Total de Views do Canal:</strong> ${formatViews(youtubeSocials.totalChannelViews || 0)}</p>
                    <p><strong>Subscritores:</strong> ${(youtubeSocials.subs || 0).toLocaleString('pt-PT')}</p>
                    <p><strong>Total de Vídeos:</strong> ${(youtubeSocials.totalVideos || 0).toLocaleString('pt-PT')}</p>
                </div>
            </div>
        `;
        openModal(historyDetailsModal);
    }
    
    function deleteHistoryEntry(profileId, monthName) {
        if (!confirm(`Tem a certeza que deseja apagar o registo do mês "${monthName}" para este perfil? Esta ação não pode ser revertida.`)) {
            return;
        }

        let currentData = window.getData();
        const profileIndex = currentData.findIndex(p => p.id === profileId);

        if (profileIndex > -1) {
            const profile = currentData[profileIndex];
            if (profile.performanceHistory) {
                profile.performanceHistory = profile.performanceHistory.filter(entry => entry.month !== monthName);
                window.saveData(currentData);
                placarData = currentData;
                // Re-render a tab de histórico para refletir a eliminação
                switchTab('history');
            }
        }
    }

    // --- Lógica de Sincronização e Eventos ---

    function saveCurrentDataFromForm() {
        if (!currentEditingProfileId) return;
        const profileIndex = placarData.findIndex(p => p.id === currentEditingProfileId);
        if (profileIndex === -1) return;
        
        const profile = placarData[profileIndex];

        // Stats Gerais
        const monthViewsInput = document.getElementById('youtube-month-views');
        if (monthViewsInput) profile.stats.views = monthViewsInput.value;
        const monthPointsInput = document.getElementById('youtube-month-points');
        if (monthPointsInput) profile.stats.points = parseInt(monthPointsInput.value, 10) || 0;

        // --- Início da Correção ---
        if (!profile.socials) profile.socials = {};

        // YouTube
        if (!profile.socials.youtube) profile.socials.youtube = {};
        profile.socials.youtube.link = document.getElementById('youtube-link')?.value || '';
        profile.socials.youtube.subs = parseInt(document.getElementById('youtube-subs')?.value, 10) || 0;
        profile.socials.youtube.totalVideos = parseInt(document.getElementById('youtube-totalVideos')?.value, 10) || 0;
        const totalChannelViewsInput = document.getElementById('youtube-total-channel-views');
        if (totalChannelViewsInput) {
            profile.socials.youtube.totalChannelViews = parseViews(totalChannelViewsInput.value) || 0;
        }

        // Instagram
        if (!profile.socials.instagram) profile.socials.instagram = {};
        profile.socials.instagram.link = document.getElementById('instagram-link')?.value || '';
        profile.socials.instagram.followers = parseInt(document.getElementById('instagram-followers')?.value, 10) || 0;
        profile.socials.instagram.posts = parseInt(document.getElementById('instagram-posts')?.value, 10) || 0;
        profile.socials.instagram.likes = parseInt(document.getElementById('instagram-likes')?.value, 10) || 0;
        profile.socials.instagram.comments = parseInt(document.getElementById('instagram-comments')?.value, 10) || 0;

        // Twitch
        if (!profile.socials.twitch) profile.socials.twitch = {};
        profile.socials.twitch.link = document.getElementById('twitch-link')?.value || '';
        profile.socials.twitch.followers = parseInt(document.getElementById('twitch-followers')?.value, 10) || 0;

        // TikTok
        if (!profile.socials.tiktok) profile.socials.tiktok = {};
        profile.socials.tiktok.link = document.getElementById('tiktok-link')?.value || '';
        profile.socials.tiktok.followers = parseInt(document.getElementById('tiktok-followers')?.value, 10) || 0;
        profile.socials.tiktok.likes = parseInt(document.getElementById('tiktok-likes')?.value, 10) || 0;
        profile.socials.tiktok.videos = parseInt(document.getElementById('tiktok-videos')?.value, 10) || 0;
        // --- Fim da Correção ---

        window.saveData(placarData);
    }

    function saveAndClose() {
        if (!isSocialModalOpen) return;
        saveCurrentDataFromForm();
        document.dispatchEvent(new CustomEvent('dataUpdated'));
        window.closeModal();
        isSocialModalOpen = false;
        currentEditingProfileId = null;
    }
    
    function addModalEventListeners() {
        const saveBtn = document.getElementById('save-social-data-btn');
        if(saveBtn) saveBtn.addEventListener('click', saveAndClose);
        document.querySelectorAll('.social-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', saveAndClose);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) saveAndClose();
        });
    }

    // --- Lógica do Histórico ---
    function addHistoryTabEventListeners(profile) {
        const createBtn = document.getElementById('create-history-btn');
        const historyDropdown = document.getElementById('history-select-dropdown');
        const confirmUpdateBtn = document.getElementById('confirm-update-history-btn');
        
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                archiveAction = 'create';
                nameInput.value = ''; // Limpa o campo
                openModal(nameModal);
            });
        }
        
        // Popular o dropdown de atualização
        if(historyDropdown) {
            const history = profile.performanceHistory || [];
            if (history.length > 0) {
                historyDropdown.innerHTML = '<option value="">Selecione uma pasta para atualizar...</option>';
                // Ordenar para consistência
                [...history].sort((a,b) => b.month.localeCompare(a.month)).forEach(entry => {
                    const option = document.createElement('option');
                    option.value = entry.month;
                    option.textContent = entry.month;
                    historyDropdown.appendChild(option);
                });
                confirmUpdateBtn.parentElement.style.display = 'block';
            } else {
                historyDropdown.innerHTML = '<option value="">Nenhum histórico para atualizar</option>';
                confirmUpdateBtn.parentElement.style.display = 'none';
            }
        }

        if (confirmUpdateBtn) {
            confirmUpdateBtn.addEventListener('click', () => {
                const selectedMonth = historyDropdown.value;
                if (!selectedMonth) {
                    alert("Por favor, selecione uma pasta para atualizar.");
                    return;
                }
                if (confirm(`Tem a certeza que deseja substituir os dados da pasta "${selectedMonth}" com os dados atuais?`)) {
                    // Primeiro, guardar quaisquer alterações não salvas no formulário
                    saveCurrentDataFromForm();
                    if (window.updateArchivedMonthForProfile(profile.id, selectedMonth)) {
                        // Recarrega o modal para ver as alterações
                        const currentId = currentEditingProfileId;
                        closeModal();
                        openSocialModal(currentId);
                        setTimeout(() => switchTab('history'), 100);
                    }
                }
            });
        }
    }
    
    // Confirmação do nome e execução da ação de arquivar
    if (nameConfirmBtn) {
        nameConfirmBtn.addEventListener('click', () => {
            const monthName = nameInput.value.trim();
            if (!monthName) {
                alert("O nome não pode estar vazio.");
                return;
            }

            if (archiveAction === 'create') {
                // Primeiro, guardar quaisquer alterações não salvas no formulário
                saveCurrentDataFromForm();
                if (window.archiveMonthForProfile(currentEditingProfileId, monthName)) {
                    const currentId = currentEditingProfileId;
                    closeModal(); // Fecha o modal do nome
                    // O modal social já foi fechado pela função closeModal() chamada pelo overlay ou botão
                    openSocialModal(currentId); // Reabre com dados frescos
                    setTimeout(() => switchTab('history'), 100);
                }
            }
        });
    }

    if (nameCancelBtn) nameCancelBtn.addEventListener('click', () => closeModal(nameModal));
    if (historyDetailsCloseBtn) historyDetailsCloseBtn.addEventListener('click', () => closeModal(historyDetailsModal));

    // --- Inicialização da secção ---
    const sectionObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = socialSection.style.display !== 'none';
                if (isVisible) {
                    renderSocialGrid();
                }
            }
        }
    });

    if (socialSection) sectionObserver.observe(socialSection, { attributes: true });
    if (socialSearchInput) socialSearchInput.addEventListener('input', renderSocialGrid);
});

