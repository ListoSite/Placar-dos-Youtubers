// projectsTable.js - Lógica para a Tabela de Classificação de Projetos (Versão 2.0 - Unificada)

document.addEventListener('DOMContentLoaded', () => {

    const tableBody = document.getElementById('projects-leaderboard-table-body');
    const tableSection = document.getElementById('section-projetos-tabela');
    const sortToggleButton = document.getElementById('project-sort-toggle-btn');

    let sortDirection = 'desc';

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
    
    function updateSortButtonUI() {
        if (!sortToggleButton) return;
        const icon = sortToggleButton.querySelector('i');
        icon.className = sortDirection === 'desc' ? 'fas fa-sort-down' : 'fas fa-sort-up';
        sortToggleButton.title = sortDirection === 'desc' ? "Ordenar por Rank (Crescente)" : "Ordenar por Rank (Decrescente)";
    }

    function renderProjectsLeaderboard() {
        if (!tableBody) return;

        const profiles = window.getData();
        const allProjects = profiles.flatMap(p => p.projects || []);
        tableBody.innerHTML = '';

        if (allProjects.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum projeto criado ainda.</td></tr>';
            return;
        }

        const projectsWithScore = allProjects.map(project => {
            const totalViews = parseViews(project.views);
            const episodes = parseInt(project.episodes, 10);
            const viewsPerEpisode = (episodes > 0) ? (totalViews / episodes) : 0;
            return { ...project, totalViews, viewsPerEpisode };
        });

        let sortedProjects = projectsWithScore.sort((a, b) => b.viewsPerEpisode - a.viewsPerEpisode);
        let top50Projects = sortedProjects.slice(0, 50);

        if (sortDirection === 'asc') {
            top50Projects.reverse();
        }

        top50Projects.forEach((project, index) => {
            const row = document.createElement('tr');
            const rank = (sortDirection === 'desc') ? index + 1 : 50 - index;
            const creatorName = project.creator ? project.creator.name : 'N/A';

            row.innerHTML = `
                <td class="rank-col">#${rank}</td>
                <td class="name-col">
                    <img src="${project.logo}" class="project-logo" alt="Logo" onerror="this.src='https://placehold.co/40x40/400414/a0a0a0?text=Logo'">
                    <span>${project.name}</span>
                </td>
                <td>${creatorName}</td>
                <td style="text-align: center;">${project.episodes}</td>
                <td style="text-align: right;">${formatNumber(project.totalViews)}</td>
                <td class="success-col">${Math.round(project.viewsPerEpisode).toLocaleString('pt-PT')}</td>
            `;
            tableBody.appendChild(row);
        });
        
        updateSortButtonUI();
    }
    
    if (sortToggleButton) {
        sortToggleButton.addEventListener('click', () => {
            sortDirection = (sortDirection === 'desc') ? 'asc' : 'desc';
            renderProjectsLeaderboard();
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = tableSection.style.display !== 'none';
                if (isVisible) renderProjectsLeaderboard();
            }
        }
    });

    if (tableSection) observer.observe(tableSection, { attributes: true });
});
