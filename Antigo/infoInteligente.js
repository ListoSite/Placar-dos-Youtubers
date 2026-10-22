// infoInteligente.js - Lógica para a página de Análise Inteligente (Versão 2.1 - Análise Melhorada)

document.addEventListener('DOMContentLoaded', () => {

    const analysisSection = document.getElementById('section-info-inteligente');
    const youtuberSelect = document.getElementById('youtuber-select');
    const month1Select = document.getElementById('month1-select');
    const month2Select = document.getElementById('month2-select');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsContainer = document.getElementById('analysis-results-container');

    let allProfiles = [];
    let comparisonChart = null;

    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    function formatNumber(num, isPercentage = false) {
        const options = isPercentage ? { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 } : {};
        return num.toLocaleString('pt-PT', options);
    }

    function initializePage() {
        allProfiles = window.getData();
        populateYoutuberSelect();
        youtuberSelect?.addEventListener('change', updateMonthSelectors);
        analyzeBtn?.addEventListener('click', performAnalysis);
    }

    function populateYoutuberSelect() {
        if (!youtuberSelect) return;
        youtuberSelect.innerHTML = '<option value="">Selecione um Youtuber...</option>';
        // A análise requer pelo menos 2 meses de histórico para comparação
        const profilesWithHistory = allProfiles.filter(p => p.performanceHistory && p.performanceHistory.length >= 2);
        
        if (profilesWithHistory.length === 0) {
            youtuberSelect.innerHTML = '<option value="">Nenhum youtuber com histórico suficiente</option>';
            youtuberSelect.disabled = true;
            analyzeBtn.disabled = true;
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
                resultsContainer.innerHTML = `<div class="empty-state-message"><h3>Sem Dados para Análise</h3><p>A Análise Inteligente requer que pelo menos um youtuber tenha 2 ou mais meses de histórico guardado para poder fazer comparações.</p></div>`;
            }
            return;
        }

        profilesWithHistory.sort((a, b) => a.name.localeCompare(b.name)).forEach(profile => {
            const option = document.createElement('option');
            option.value = profile.id;
            option.textContent = profile.name;
            youtuberSelect.appendChild(option);
        });
        youtuberSelect.disabled = false;
    }

    function updateMonthSelectors() {
        const selectedYoutuberId = youtuberSelect.value;
        month1Select.innerHTML = '<option value="">Mês Antigo</option>';
        month2Select.innerHTML = '<option value="">Mês Recente</option>';
        month1Select.disabled = true;
        month2Select.disabled = true;
        analyzeBtn.disabled = true;

        if (!selectedYoutuberId) return;

        const profile = allProfiles.find(p => p.id === selectedYoutuberId);
        if (!profile || !profile.performanceHistory) return;

        // Preenche os seletores com os meses do histórico do youtuber
        profile.performanceHistory.forEach((record, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = record.month;
            month1Select.appendChild(option.cloneNode(true));
            month2Select.appendChild(option);
        });

        month1Select.disabled = false;
        month2Select.disabled = false;
        analyzeBtn.disabled = false;
    }

    function performAnalysis() {
        const youtuberId = youtuberSelect.value;
        const month1Index = month1Select.value;
        const month2Index = month2Select.value;

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="loading-spinner"></div>';

        if (!youtuberId || month1Index === '' || month2Index === '' || month1Index === month2Index) {
            resultsContainer.innerHTML = '<p class="empty-state-message">Por favor, selecione um Youtuber e dois meses <strong>diferentes</strong> para comparar.</p>';
            return;
        }

        const profile = allProfiles.find(p => p.id === youtuberId);
        const history = profile.performanceHistory;
        const data1 = history[month1Index];
        const data2 = history[month2Index];
        
        // Garante que 'oldData' é sempre o registo mais antigo
        const [oldData, newData] = new Date(data1.createdAt) < new Date(data2.createdAt) ? [data1, data2] : [data2, data1];

        setTimeout(() => generateAnalysisReport(profile, oldData, newData), 500);
    }

    function generateAnalysisReport(profile, oldData, newData) {
        // Análise de Views
        const oldViews = parseViews(oldData.stats.views);
        const newViews = parseViews(newData.stats.views);
        const viewsChange = newViews - oldViews;
        const viewsChangePercent = oldViews > 0 ? (viewsChange / oldViews) : (newViews > 0 ? 1 : 0);

        // Análise de Pontos
        const oldPoints = oldData.stats.points || 0;
        const newPoints = newData.stats.points || 0;
        const pointsChange = newPoints - oldPoints;
        const pointsChangePercent = oldPoints > 0 ? (pointsChange / oldPoints) : (newPoints > 0 ? 1 : 0);

        // Gera a sugestão de texto
        const getSuggestion = (change, changePercent, metricName) => {
            const direction = change > 0 ? 'aumento' : 'uma queda';
            const advice = change > 0 ? 'Analise os vídeos publicados neste período para replicar o sucesso.' : 'Verifique a consistência das publicações e o feedback da comunidade.';
            return `Houve ${direction} de <strong>${formatNumber(change)} ${metricName}</strong> (${formatNumber(changePercent, true)}). ${advice}`;
        };

        resultsContainer.innerHTML = `
            <div class="analysis-result-card">
                <h3><i class="fas fa-eye"></i> Análise de Visualizações</h3>
                <p>${getSuggestion(viewsChange, viewsChangePercent, 'views')}</p>
            </div>
            <div class="analysis-result-card">
                <h3><i class="fas fa-star"></i> Análise de Pontos</h3>
                <p>${getSuggestion(pointsChange, pointsChangePercent, 'pontos')}</p>
            </div>
            <div class="analysis-result-card chart-card">
                <h3><i class="fas fa-chart-bar"></i> Gráfico Comparativo</h3>
                <div class="chart-wrapper" style="height: 300px;"><canvas id="comparison-chart"></canvas></div>
            </div>
        `;

        renderComparisonChart(profile, oldData, newData);
    }

    function renderComparisonChart(profile, oldData, newData) {
        const ctx = document.getElementById('comparison-chart')?.getContext('2d');
        if (!ctx) return;
        if (comparisonChart) comparisonChart.destroy();

        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [oldData.month, newData.month],
                datasets: [
                    {
                        label: `Views`,
                        data: [parseViews(oldData.stats.views), parseViews(newData.stats.views)],
                        backgroundColor: 'rgba(217, 7, 63, 0.7)',
                        borderColor: 'rgba(217, 7, 63, 1)',
                        borderWidth: 1
                    },
                    {
                        label: `Pontos`,
                        data: [oldData.stats.points || 0, newData.stats.points || 0],
                        backgroundColor: 'rgba(255, 215, 0, 0.7)',
                        borderColor: 'rgba(255, 215, 0, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { 
                            color: '#f0f0f0', 
                            callback: (v) => formatNumber(v) 
                        }, 
                        grid: { color: 'rgba(255, 255, 255, 0.1)' } 
                    },
                    x: { ticks: { color: '#f0f0f0' }, grid: { display: false } }
                },
                plugins: { 
                    legend: { labels: { color: '#f0f0f0' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString('pt-PT');
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = analysisSection.style.display !== 'none';
                if (isVisible) {
                    // Re-inicializa sempre que a secção se torna visível para ter os dados mais recentes
                    initializePage();
                }
            }
        }
    });

    if (analysisSection) observer.observe(analysisSection, { attributes: true });
});
