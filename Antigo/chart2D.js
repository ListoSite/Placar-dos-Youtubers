// chart2D.js - Lógica para o Gráfico 2D de Pontos (Versão 2.2 - Corrigido)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos do DOM ---
    const chartSection = document.getElementById('section-grafico-2d');
    const canvas = document.getElementById('points-chart-canvas');

    // --- Variáveis de Estado ---
    let pointsChart = null;

    // --- Funções Auxiliares ---
    function formatViews(viewsValue) {
        const num = parseInt(String(viewsValue).replace(/[^0-9]/g, ''), 10);
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'K';
        return num.toString();
    }

    const externalTooltipHandler = (context) => {
        let tooltipEl = document.getElementById('chartjs-tooltip-v2');
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip-v2';
            // Garante que o tooltip é adicionado ao container correto
            const container = canvas.closest('.chart-container');
            if (container) {
                container.appendChild(tooltipEl);
            } else {
                document.body.appendChild(tooltipEl);
            }
        }

        const tooltipModel = context.tooltip;
        if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
        }

        const dataPointIndex = tooltipModel.dataPoints[0].dataIndex;
        const profileData = context.chart.data.datasets[0].fullData[dataPointIndex];

        if (!profileData) return;

        tooltipEl.innerHTML = `
            <div class="tooltip-header">
                <img src="${profileData.photo}" alt="Foto de ${profileData.name}" class="tooltip-photo" onerror="this.src='https://placehold.co/60x60/400414/a0a0a0?text=Foto'">
                <div class="tooltip-title-container">
                    <h3 class="tooltip-name">${profileData.name}</h3>
                    <p class="tooltip-content-type">${profileData.contentType}</p>
                </div>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-stat">
                    <span class="tooltip-stat-label">Pontos</span>
                    <span class="tooltip-stat-value points">${(profileData.stats.points || 0).toLocaleString('pt-PT')}</span>
                </div>
                <div class="tooltip-stat">
                    <span class="tooltip-stat-label">Views</span>
                    <span class="tooltip-stat-value">${formatViews(profileData.stats.views)}</span>
                </div>
                <div class="tooltip-stat">
                    <span class="tooltip-stat-label">Rank (Geral)</span>
                    <span class="tooltip-stat-value">#${profileData.rank}</span>
                </div>
            </div>
        `;

        const { offsetLeft: canvasLeft, offsetTop: canvasTop } = context.chart.canvas;
        tooltipEl.style.opacity = 1;
        tooltipEl.style.left = canvasLeft + tooltipModel.caretX + 15 + 'px';
        tooltipEl.style.top = canvasTop + tooltipModel.caretY - (tooltipEl.offsetHeight / 2) + 'px';
    };

    function renderPointsChart() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const profiles = window.getData();

        // Ordena por pontos, tratando valores nulos ou inválidos como 0.
        const sortedProfiles = [...profiles].sort((a, b) => (b.stats.points || 0) - (a.stats.points || 0));
        
        // Atribui ranks para o tooltip
        const rankedProfiles = sortedProfiles.map((profile, index) => ({...profile, rank: index + 1 }));

        const top15Profiles = rankedProfiles.slice(0, 15);
        if (top15Profiles.length === 0) return;

        const labels = top15Profiles.map(p => p.name);
        // Garante que os dados do gráfico são sempre números válidos, tratando nulos como 0.
        const data = top15Profiles.map(p => p.stats.points || 0);

        const rootStyles = getComputedStyle(document.documentElement);
        // CORREÇÃO: Usar as variáveis de cor corretas (--cor-principal e --cor-destaque)
        const colorStart = rootStyles.getPropertyValue('--cor-principal').trim();
        const colorEnd = rootStyles.getPropertyValue('--cor-destaque').trim();
        const gridColor = 'rgba(255, 255, 255, 0.1)';
        const textColor = rootStyles.getPropertyValue('--cor-texto-principal').trim();
        const rankColor = rootStyles.getPropertyValue('--cor-destaque').trim();

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, colorEnd);
        gradient.addColorStop(1, colorStart);

        if (pointsChart) pointsChart.destroy();
        
        const customYAxisLabelsPlugin = {
            id: 'customYAxisLabels',
            afterDraw: (chart) => {
                const { ctx, scales: { y } } = chart;
                ctx.save();
                const profiles = chart.data.datasets[0].fullData;
                profiles.forEach((profile, index) => {
                    const yPos = y.getPixelForValue(index);
                    if (yPos === undefined) return;
                    const rank = index + 1;
                    ctx.font = '900 24px "Bebas Neue"';
                    ctx.fillStyle = rankColor;
                    ctx.textAlign = 'left';
                    ctx.fillText(`#${rank}`, 10, yPos + 8);
                    const rankTextWidth = ctx.measureText(`#${rank}`).width;
                    ctx.font = '500 16px "Inter"';
                    ctx.fillStyle = textColor;
                    ctx.fillText(profile.name, 10 + rankTextWidth + 10, yPos + 8);
                });
                ctx.restore();
            }
        };

        pointsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pontos',
                    data: data,
                    fullData: top15Profiles,
                    backgroundColor: gradient,
                    borderColor: colorEnd,
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: colorEnd
                }]
            },
            plugins: [customYAxisLabelsPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                layout: { padding: { left: 250 } },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { color: textColor, font: { family: "'Inter', sans-serif" } },
                        grid: { color: gridColor, borderColor: gridColor }
                    },
                    y: {
                        reverse: true,
                        ticks: { display: false },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false, external: externalTooltipHandler }
                }
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = chartSection.style.display !== 'none';
                if (isVisible) renderPointsChart();
            }
        }
    });

    if (chartSection) observer.observe(chartSection, { attributes: true });
});
