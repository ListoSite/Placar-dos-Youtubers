// table.js - Lógica para a Tabela de Classificação (Versão 3.2 - Correção Final)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos do DOM ---
    const tableBody = document.getElementById('leaderboard-table-body');
    const tableSection = document.getElementById('section-tabela');
    const sortModeBtn = document.getElementById('table-sort-mode-btn');
    const sortDirectionBtn = document.getElementById('table-sort-direction-btn');

    // --- Estado da Tabela ---
    let sortMode = 'top'; // 'top' para os melhores, 'bottom' para os piores
    let sortDirection = 'asc'; // 'asc' para 1-50, 'desc' para 50-1

    // --- Funções Auxiliares ---
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
        // CORREÇÃO: Alterado de parseInteger para parseInt
        return isNaN(number) ? 0 : parseInt(number, 10);
    }
    
    function calculateAndAssignRanks(data) {
        const profilesWithStats = data.filter(p => p.stats); // Garantir que apenas perfis com stats são classificados
        const sortedProfiles = [...profilesWithStats]
            .sort((a, b) => parseViews(b.stats.views) - parseViews(a.stats.views));
        
        return data.map(profile => {
            if (!profile.stats) return { ...profile, rank: 9999 }; // Atribuir um rank baixo se não tiver stats
            const rank = sortedProfiles.findIndex(p => p.id === profile.id) + 1;
            return { ...profile, rank: rank > 0 ? rank : 9999 };
        });
    }

    function getRankChangeDetails(profile) {
        if (!profile.performanceHistory || profile.performanceHistory.length === 0 || !profile.stats) {
            return { direction: 'none' };
        }
        const lastRecord = profile.performanceHistory[profile.performanceHistory.length - 1];
        
        if (!lastRecord.stats) return { direction: 'none' };

        const lastViews = parseViews(lastRecord.stats.views);
        const currentViews = parseViews(profile.stats.views);

        let direction = 'same';
        if (currentViews > lastViews) direction = 'up';
        if (currentViews < lastViews) direction = 'down';
        
        return { direction };
    }

    /**
     * Atualiza a aparência dos botões de ordenação.
     */
    function updateSortButtonsUI() {
        if (!sortModeBtn || !sortDirectionBtn) return;

        // Botão de Modo (Melhores/Piores)
        if (sortMode === 'top') {
            sortModeBtn.innerHTML = '<i class="fas fa-trophy"></i> Melhores 50';
        } else {
            sortModeBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Piores 50';
        }

        // Botão de Direção (1-50 / 50-1)
        if (sortDirection === 'asc') {
            sortDirectionBtn.innerHTML = '<i class="fas fa-sort-amount-up"></i> 1-50';
        } else {
            sortDirectionBtn.innerHTML = '<i class="fas fa-sort-amount-down"></i> 50-1';
        }
    }


    /**
     * Renderiza a tabela de classificação.
     */
    function renderLeaderboardTable() {
        if (!tableBody) return;

        const profiles = window.getData();
        tableBody.innerHTML = '';

        if (profiles.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Não há perfis para exibir.</td></tr>';
            return;
        }

        let profilesWithRanks = calculateAndAssignRanks(profiles);
        
        // Ordenar a lista completa pelo rank antes de cortar
        profilesWithRanks.sort((a, b) => a.rank - b.rank);

        let profilesToDisplay;

        if (sortMode === 'top') {
            profilesToDisplay = profilesWithRanks.slice(0, 50);
        } else {
            // Pega nos 50 últimos e inverte para o pior ficar no topo da lista
            profilesToDisplay = profilesWithRanks.slice(-50).reverse();
        }

        if (sortDirection === 'desc') {
            profilesToDisplay.reverse();
        }

        profilesToDisplay.forEach(profile => {
            const row = document.createElement('tr');

            const rankText = profile.rank > 9000 ? 'N/A' : `#${profile.rank}`;
            row.innerHTML = `
                <td class="rank-col">${rankText}</td>
                <td class="name-col">${profile.name || 'N/A'}</td>
                <td>${profile.contentType || 'N/A'}</td>
                <td class="views-cell">
                    <span>${formatViews(profile.stats?.views)}</span>
                    ${getRankIndicatorHTML(profile)}
                </td>
            `;

            // Células do Histórico (últimos 3 meses)
            const history = profile.performanceHistory ? [...profile.performanceHistory].reverse() : [];
            for (let i = 0; i < 3; i++) {
                const historyCell = document.createElement('td');
                historyCell.className = 'history-cell';
                const record = history[i];
                if (record) {
                    historyCell.innerHTML = `
                        <div class="history-data">
                            <div class="history-data-month">${record.month}</div>
                            <div class="history-data-stats">
                                <span class="views">${formatViews(record.stats?.views)}</span>
                            </div>
                        </div>
                    `;
                } else {
                    historyCell.textContent = '-';
                }
                row.appendChild(historyCell);
            }

            tableBody.appendChild(row);
        });

        updateSortButtonsUI();
    }

    function getRankIndicatorHTML(profile) {
        const rankChange = getRankChangeDetails(profile);
        if (rankChange.direction === 'none') return '';
        
        let iconClass = 'fa-minus';
        if (rankChange.direction === 'up') iconClass = 'fa-arrow-up';
        if (rankChange.direction === 'down') iconClass = 'fa-arrow-down';
        
        return `<div class="rank-change-indicator ${rankChange.direction}"><i class="fas ${iconClass}"></i></div>`;
    }
    
    // --- Event Listeners para os novos botões ---
    if (sortModeBtn) {
        sortModeBtn.addEventListener('click', () => {
            sortMode = (sortMode === 'top') ? 'bottom' : 'top';
            renderLeaderboardTable();
        });
    }

    if (sortDirectionBtn) {
        sortDirectionBtn.addEventListener('click', () => {
            sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
            renderLeaderboardTable();
        });
    }

    // --- Observador para renderizar a tabela apenas quando estiver visível ---
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = tableSection.style.display !== 'none';
                if (isVisible) {
                    renderLeaderboardTable();
                }
            }
        }
    });

    if (tableSection) {
        observer.observe(tableSection, { attributes: true });
    }
});

