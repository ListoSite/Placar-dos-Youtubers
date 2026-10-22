// workerChart.js - Lógica para o Placar do Trabalhador (Versão 2.0 - Redesign)

document.addEventListener('DOMContentLoaded', () => {

    const chartSection = document.getElementById('section-projetos-trabalhador');
    const container = document.getElementById('worker-chart-container');
    const searchInput = document.getElementById('worker-search-input');
    const sortButtons = document.querySelectorAll('#worker-sort-controls .sort-button');

    let currentSort = { key: 'rank', direction: 'asc' };

    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    function formatNumber(num) {
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toLocaleString('pt-PT');
    }

    function renderWorkerChart() {
        if (!container) return;

        const profiles = window.getData();
        if (profiles.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Não há dados para gerar o placar.</p>';
            return;
        }

        const workerStats = profiles.map(profile => {
            const projects = profile.projects || [];
            const totalViews = projects.reduce((sum, p) => sum + parseViews(p.views), 0);
            const totalEpisodes = projects.reduce((sum, p) => sum + (parseInt(p.episodes, 10) || 0), 0);
            return {
                ...profile,
                projectCount: projects.length,
                totalViews,
                totalEpisodes
            };
        });

        let workers = workerStats.filter(worker => worker.projectCount > 0);
        workers.sort((a, b) => b.projectCount - a.projectCount || b.totalViews - a.totalViews)
               .forEach((worker, index) => worker.rank = index + 1);

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        if (searchTerm) {
            workers = workers.filter(worker => worker.name.toLowerCase().includes(searchTerm));
        }

        workers.sort((a, b) => {
            switch (currentSort.key) {
                case 'name': return a.name.localeCompare(b.name);
                case 'views': return b.totalViews - a.totalViews;
                case 'projects': return b.projectCount - a.projectCount;
                default: return a.rank - b.rank;
            }
        });

        if (currentSort.direction === 'desc') workers.reverse();

        container.innerHTML = '';
        if (workers.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Nenhum criador encontrado.</p>';
            return;
        }

        workers.forEach((worker) => {
            const card = document.createElement('div');
            card.className = 'worker-card';
            card.innerHTML = `
                <div class="worker-header">
                    <img src="${worker.photo}" alt="Foto de ${worker.name}" class="worker-photo" onerror="this.src='https://placehold.co/80x80/400414/a0a0a0?text=Foto'">
                    <div class="worker-info">
                        <div class="worker-name">${worker.name}</div>
                    </div>
                    <div class="worker-rank">#${worker.rank}</div>
                </div>
                <div class="worker-stats-container">
                    <div class="worker-stat-highlight">
                        <span class="stat-value">${worker.projectCount}</span>
                        <span class="stat-label">Projetos Criados</span>
                    </div>
                    <div class="worker-stats-secondary">
                        <div class="worker-stat-item">
                            <span class="stat-value">${formatNumber(worker.totalViews)}</span>
                            <span class="stat-label">Total Views</span>
                        </div>
                        <div class="worker-stat-item">
                            <span class="stat-value">${worker.totalEpisodes}</span>
                            <span class="stat-label">Total Episódios</span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        updateSortButtonsUI();
    }

    function updateSortButtonsUI() {
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

    if (searchInput) searchInput.addEventListener('input', renderWorkerChart);
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sortKey = button.dataset.sort;
            if (currentSort.key === sortKey) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.key = sortKey;
                currentSort.direction = (sortKey === 'name' || sortKey === 'rank') ? 'asc' : 'desc';
            }
            renderWorkerChart();
        });
    });

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = chartSection.style.display !== 'none';
                if (isVisible) renderWorkerChart();
            }
        }
    });

    if (chartSection) observer.observe(chartSection, { attributes: true });
});
