// projectsChart2D.js - Lógica para o Gráfico 2D de Projetos (Versão 2.2 - Multi-barra)

document.addEventListener('DOMContentLoaded', () => {

    const chartSection = document.getElementById('section-projetos-grafico-2d');
    const canvas = document.getElementById('projects-chart-canvas');
    
    let projectsChart = null;
    let activeIndex = null; // Para guardar o índice do projeto selecionado

    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    function formatViews(num) {
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'K';
        return num.toLocaleString('pt-PT');
    }

    const externalTooltipHandler = (context) => {
        let tooltipEl = document.getElementById('projects-chart-tooltip');
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'projects-chart-tooltip';
            canvas.closest('.chart-container')?.appendChild(tooltipEl);
        }

        const tooltipModel = context.tooltip;
        if (tooltipModel.opacity === 0) {
            tooltipEl.classList.remove('visible');
            return;
        }

        const dataPointIndex = tooltipModel.dataPoints[0].dataIndex;
        const projectData = context.chart.data.datasets[0].fullData[dataPointIndex];
        if (!projectData) return;
        
        const creatorName = projectData.creator ? projectData.creator.name : 'N/A';
        const guestsCount = projectData.guests ? projectData.guests.length : 0;

        tooltipEl.innerHTML = `
            <div class="tooltip-project-header">
                <img src="${projectData.logo}" alt="Logo" class="tooltip-project-logo" onerror="this.src='https://placehold.co/65x65/400414/a0a0a0?text=Logo'">
                <div class="tooltip-project-title-container">
                    <h3 class="tooltip-project-name">${projectData.name}</h3>
                    <p class="tooltip-project-creator">Criado por: ${creatorName}</p>
                </div>
            </div>
            <div class="tooltip-project-body">
                <div class="tooltip-project-stat">
                    <span class="tooltip-project-stat-label"><i class="fas fa-eye"></i> Views</span>
                    <span class="tooltip-project-stat-value views">${formatViews(parseViews(projectData.views))}</span>
                </div>
                <div class="tooltip-project-stat">
                    <span class="tooltip-project-stat-label"><i class="fas fa-film"></i> Episódios</span>
                    <span class="tooltip-project-stat-value episodes">${projectData.episodes}</span>
                </div>
                <div class="tooltip-project-stat">
                    <span class="tooltip-project-stat-label"><i class="fas fa-users"></i> Convidados</span>
                    <span class="tooltip-project-stat-value guests">${guestsCount}</span>
                </div>
                 <div class="tooltip-project-stat">
                    <span class="tooltip-project-stat-label"><i class="fas fa-user-tie"></i> Criador</span>
                    <span class="tooltip-project-stat-value creator">1</span>
                </div>
            </div>
        `;

        const { offsetLeft: canvasLeft, offsetTop: canvasTop } = context.chart.canvas;
        tooltipEl.classList.add('visible');
        tooltipEl.style.left = canvasLeft + tooltipModel.caretX + 20 + 'px';
        tooltipEl.style.top = canvasTop + tooltipModel.caretY - (tooltipEl.offsetHeight / 2) + 'px';
    };

    function renderProjectsChart() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const profiles = window.getData();
        const allProjects = profiles.flatMap(p => p.projects || []);

        const sortedProjects = [...allProjects].sort((a, b) => parseViews(b.views) - parseViews(a.views));
        const top15Projects = sortedProjects.slice(0, 15).reverse(); // Inverte para o #1 ficar no topo
        
        if (top15Projects.length === 0) {
            const wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) {
                wrapper.innerHTML = '<h3>Gráfico 2D - Top 15 Projetos por Views</h3><p class="empty-list-message">Não há projetos suficientes para mostrar no gráfico.</p>';
            }
            return;
        }

        const labels = top15Projects.map(p => p.name);
        const viewsData = top15Projects.map(p => parseViews(p.views));
        const episodesData = top15Projects.map(p => p.episodes || 0);
        const guestsData = top15Projects.map(p => p.guests ? p.guests.length : 0);
        const creatorData = top15Projects.map(() => 1);
        
        const rootStyles = getComputedStyle(document.documentElement);
        const colorRed = rootStyles.getPropertyValue('--cor-principal').trim();
        const colorBlue = '#36A2EB';
        const colorYellow = '#FFCE56';
        const colorCyan = '#4BC0C0';
        
        const colorRedFaded = 'rgba(166, 5, 34, 0.3)';
        const colorBlueFaded = 'rgba(54, 162, 235, 0.3)';
        const colorYellowFaded = 'rgba(255, 206, 86, 0.3)';
        const colorCyanFaded = 'rgba(75, 192, 192, 0.3)';

        const gridColor = 'rgba(255, 255, 255, 0.1)';
        const textColor = rootStyles.getPropertyValue('--cor-texto-secundario').trim();
        const textPrincipalColor = rootStyles.getPropertyValue('--cor-texto-principal').trim();
        
        const maxPeople = Math.max(...episodesData.map((e, i) => e + guestsData[i] + creatorData[i]));
        const maxAxisPeople = Math.ceil(maxPeople * 1.2);

        if (projectsChart) projectsChart.destroy();
        
        projectsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { 
                        label: 'Visualizações', 
                        data: viewsData, 
                        fullData: top15Projects, 
                        backgroundColor: (c) => activeIndex === null || c.dataIndex === activeIndex ? colorRed : colorRedFaded,
                        borderColor: colorRed,
                        borderWidth: 1, 
                        borderRadius: 4,
                        xAxisID: 'x'
                    },
                    {
                        label: 'Episódios',
                        data: episodesData,
                        backgroundColor: (c) => activeIndex === null || c.dataIndex === activeIndex ? colorBlue : colorBlueFaded,
                        borderColor: colorBlue,
                        borderWidth: 1,
                        borderRadius: 4,
                        xAxisID: 'x2',
                        stack: 'people'
                    },
                    {
                        label: 'Convidados',
                        data: guestsData,
                        backgroundColor: (c) => activeIndex === null || c.dataIndex === activeIndex ? colorYellow : colorYellowFaded,
                        borderColor: colorYellow,
                        borderWidth: 1,
                        borderRadius: 4,
                        xAxisID: 'x2',
                        stack: 'people'
                    },
                    {
                        label: 'Criador',
                        data: creatorData,
                        backgroundColor: (c) => activeIndex === null || c.dataIndex === activeIndex ? colorCyan : colorCyanFaded,
                        borderColor: colorCyan,
                        borderWidth: 1,
                        borderRadius: 4,
                        xAxisID: 'x2',
                        stack: 'people'
                    }
                ]
            },
            options: {
                responsive: true, 
                maintainAspectRatio: false, 
                indexAxis: 'y',
                layout: { padding: { left: 10, right: 10 } },
                scales: {
                    x: { 
                        position: 'bottom',
                        beginAtZero: true, 
                        ticks: { color: textColor, font: { family: "'Inter', sans-serif" }, callback: (v) => formatViews(v) }, 
                        grid: { color: gridColor, borderColor: gridColor } 
                    },
                    x2: {
                        position: 'top',
                        stacked: true,
                        beginAtZero: true,
                        grid: { display: false },
                        title: { display: true, text: 'Nº de Pessoas / Episódios', color: textColor },
                        max: maxAxisPeople,
                        ticks: { color: textColor, font: { family: "'Inter', sans-serif" }, stepSize: Math.ceil(maxAxisPeople / 5) || 1 }
                    },
                    y: { 
                        stacked: true,
                        ticks: { color: textPrincipalColor, font: { family: "'Inter', sans-serif", weight: 600, size: 14 } }, 
                        grid: { display: false } 
                    }
                },
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: { color: textColor, font: { size: 14 } }
                    },
                    tooltip: { 
                        enabled: false, 
                        external: externalTooltipHandler 
                    }
                },
                onClick: (event, elements) => {
                    activeIndex = (elements.length > 0 && activeIndex !== elements[0].index) ? elements[0].index : null;
                    projectsChart.update();
                }
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = chartSection.style.display !== 'none';
                if (isVisible) {
                    renderProjectsChart();
                } else if (projectsChart) {
                    projectsChart.destroy();
                    projectsChart = null;
                }
            }
        }
    });

    if (chartSection) {
        observer.observe(chartSection, { attributes: true });
    }
});
