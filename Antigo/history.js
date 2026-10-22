// history.js - Lógica para a página de Gestão de Histórico (Versão 3.1 - Filtros na Tabela)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos do DOM ---
    const historySection = document.getElementById('section-gerir-historico');
    const historyContainer = document.getElementById('history-main-container');
    
    // --- Estado da Interface ---
    let currentView = 'snapshots'; // 'snapshots' ou 'details'
    let selectedSnapshot = null;
    let allSnapshots = [];
    let currentSort = { key: 'rank', direction: 'asc' }; // Estado para a ordenação da tabela

    // --- Funções Auxiliares de Formatação ---
    function formatViews(viewsValue) {
        const num = parseInt(String(viewsValue).replace(/[^0-9]/g, ''), 10);
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'K';
        return num.toString();
    }
    
    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase();
        let number = parseFloat(stringValue.replace(',', '.'));
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    // --- Funções de Renderização Principal ---

    function render() {
        // Esta função agora precisa de construir os "snapshots" a partir dos dados individuais dos perfis.
        const allProfiles = window.getData();
        const snapshotMap = new Map();

        allProfiles.forEach(profile => {
            (profile.performanceHistory || []).forEach(entry => {
                if (!snapshotMap.has(entry.month)) {
                    snapshotMap.set(entry.month, {
                        id: `snap_${entry.month}`, // ID gerado para consistência
                        name: entry.month,
                        createdAt: new Date().toISOString(), // Data simulada, pode ser melhorada
                        profiles: []
                    });
                }
                const snapshot = snapshotMap.get(entry.month);
                // Adicionar uma cópia do perfil ATUAL mas com os stats e socials do HISTÓRICO
                snapshot.profiles.push({
                    ...profile,
                    stats: entry.stats,
                    socials: entry.socials,
                    rank: entry.rank
                });
            });
        });

        allSnapshots = Array.from(snapshotMap.values()).sort((a, b) => b.name.localeCompare(a.name));

        if (currentView === 'snapshots') {
            renderSnapshotsList();
        } else if (currentView === 'details' && selectedSnapshot) {
            renderSnapshotDetails();
        }
    }

    function renderSnapshotsList() {
        let contentHtml = `
            <div class="toolbar">
                <h2>Gerir Histórico ("Pastas")</h2>
            </div>
            <p class="history-subtitle">
                Aqui pode ver e comparar "snapshots" de todos os seus perfis em diferentes momentos. O histórico é gerido na secção "Gerir Social".
            </p>
            <div id="history-snapshots-grid">
        `;

        if (allSnapshots.length === 0) {
            contentHtml += '<p class="empty-list-message">Ainda não foi guardado nenhum histórico.</p>';
        } else {
            allSnapshots.forEach(snapshot => {
                const profileCount = (snapshot.profiles && Array.isArray(snapshot.profiles)) ? snapshot.profiles.length : 0;

                contentHtml += `
                    <div class="snapshot-folder-card" data-snapshot-id="${snapshot.id}">
                        <div class="folder-icon"><i class="fas fa-folder"></i></div>
                        <div class="folder-info">
                            <h3>${snapshot.name}</h3>
                            <span><i class="fas fa-users"></i> ${profileCount} Perfis</span>
                        </div>
                        <div class="folder-actions">
                            <button class="delete-snapshot-btn" title="Eliminar este snapshot"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }
        
        contentHtml += '</div>';
        historyContainer.innerHTML = contentHtml;
        addSnapshotsListEventListeners();
    }

    function renderSnapshotDetails() {
        let contentHtml = `
            <div class="toolbar">
                <button id="history-back-btn" class="action-button secondary"><i class="fas fa-arrow-left"></i> Voltar às Pastas</button>
                <h2 class="history-details-title">Detalhes de: ${selectedSnapshot.name}</h2>
                 <div class="sort-controls">
                    <button class="sort-button" data-sort="rank"><span>Rank</span><i class="fas fa-sort"></i></button>
                    <button class="sort-button" data-sort="views"><span>Views</span><i class="fas fa-sort"></i></button>
                    <button class="sort-button" data-sort="total"><span>Total Canal</span><i class="fas fa-sort"></i></button>
                    <button class="sort-button" data-sort="subs"><span>Subs</span><i class="fas fa-sort"></i></button>
                </div>
            </div>
            <div class="table-container">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th class="rank-col">Rank</th>
                            <th class="name-col">Nome</th>
                            <th>Views</th>
                            <th>Total Views Canal</th>
                            <th>Subscritores</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let rankedProfiles = (selectedSnapshot.profiles || []);

        // Aplicar ordenação
        rankedProfiles.sort((a, b) => {
            let valA, valB;
            switch (currentSort.key) {
                case 'views':
                    valA = parseViews(a.stats?.views);
                    valB = parseViews(b.stats?.views);
                    return valA - valB;
                case 'total':
                    valA = parseViews(a.socials?.youtube?.totalChannelViews);
                    valB = parseViews(b.socials?.youtube?.totalChannelViews);
                    return valA - valB;
                case 'subs':
                    valA = a.socials?.youtube?.subs || 0;
                    valB = b.socials?.youtube?.subs || 0;
                    return valA - valB;
                case 'rank':
                default:
                    valA = a.rank || 999;
                    valB = b.rank || 999;
                    return valA - valB;
            }
        });

        if (currentSort.direction === 'desc') {
            rankedProfiles.reverse();
        }

        if (rankedProfiles.length === 0) {
            contentHtml += '<tr><td colspan="5" class="empty-list-message">Este snapshot não contém perfis.</td></tr>';
        } else {
            rankedProfiles.forEach(profile => {
                contentHtml += `<tr>`;
                contentHtml += `<td class="rank-col">#${profile.rank || '?'}</td>`;
                contentHtml += `<td class="name-col">${profile.name}</td>`;
                contentHtml += `<td>${formatViews(profile.stats?.views)}</td>`;
                contentHtml += `<td>${formatViews(profile.socials?.youtube?.totalChannelViews)}</td>`;
                contentHtml += `<td>${(profile.socials?.youtube?.subs || 0).toLocaleString('pt-PT')}</td>`;
                contentHtml += `</tr>`;
            });
        }

        contentHtml += '</tbody></table></div>';
        historyContainer.innerHTML = contentHtml;
        addDetailsViewEventListeners();
    }

    // --- Funções de Ação e Event Listeners ---
    function updateSortButtonsUI() {
        const sortButtons = document.querySelectorAll('#history-main-container .sort-button');
        sortButtons.forEach(button => {
            const sortKey = button.dataset.sort;
            const icon = button.querySelector('i');
            button.classList.toggle('active', sortKey === currentSort.key);
            if (sortKey === currentSort.key) {
                icon.className = currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    function addSnapshotsListEventListeners() {
        document.querySelectorAll('.snapshot-folder-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.delete-snapshot-btn')) return;
                const snapshotId = card.dataset.snapshotId;
                selectedSnapshot = allSnapshots.find(s => s.id === snapshotId);
                currentView = 'details';
                // Resetar a ordenação ao entrar numa nova pasta
                currentSort = { key: 'rank', direction: 'asc' };
                render();
            });
        });

        document.querySelectorAll('.delete-snapshot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const snapshotName = e.currentTarget.closest('.snapshot-folder-card').querySelector('h3').textContent;
                if (confirm(`Tem a certeza que deseja eliminar permanentemente a pasta "${snapshotName}" e todos os registos associados a ela em todos os perfis?`)) {
                    let allData = window.getData();
                    allData.forEach(profile => {
                        if (profile.performanceHistory) {
                            profile.performanceHistory = profile.performanceHistory.filter(entry => entry.month !== snapshotName);
                        }
                    });
                    window.saveData(allData);
                    render(); // Re-render a vista
                }
            });
        });
    }

    function addDetailsViewEventListeners() {
        const backBtn = document.getElementById('history-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                selectedSnapshot = null;
                currentView = 'snapshots';
                render();
            });
        }
        
        // Listeners para os novos botões de ordenação
        const sortButtons = document.querySelectorAll('#history-main-container .sort-button');
        sortButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sortKey = button.dataset.sort;
                if (currentSort.key === sortKey) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.key = sortKey;
                    // Define a direção padrão para cada tipo de ordenação
                    currentSort.direction = (sortKey === 'rank') ? 'asc' : 'desc';
                }
                render();
            });
        });

        updateSortButtonsUI(); // Atualiza a UI dos botões após a renderização
    }
    
    // --- Observador para renderizar apenas quando visível ---
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = historySection.style.display !== 'none';
                if (isVisible) {
                    currentView = 'snapshots';
                    selectedSnapshot = null;
                    render();
                }
            }
        }
    });

    if (historySection) {
        observer.observe(historySection, { attributes: true });
    }
});

