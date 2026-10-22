// graficos.js - Lógica para a página de Gráficos Comparativos (Versão 1.1 - Corrigida)

document.addEventListener('DOMContentLoaded', () => {
    // --- Seleção dos Elementos do DOM ---
    const graficosSection = document.getElementById('section-graficos');
    let selectModal, selectModalBody, confirmSelectionBtn, closeModalBtn;

    // --- Variáveis Globais ---
    let allProfiles = [];
    let selectedYoutubers = [];
    let charts = {
        views: null,
        points: null,
        rank: null
    };
    let isInitialized = false;

    // --- Funções Auxiliares ---
    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    // --- Funções de Inicialização e UI ---
    function initializeGraficosPage() {
        if (isInitialized) return;

        graficosSection.innerHTML = `
            <div class="graficos-container">
                <div class="graficos-toolbar">
                    <button id="graficos-random-btn" class="action-button"><i class="fas fa-random"></i> Aleatório</button>
                    <button id="graficos-choose-btn" class="action-button secondary"><i class="fas fa-user-check"></i> Escolher</button>
                </div>
                <h2 class="graficos-comparison-title">
                    <span class="youtuber-name-1"></span> vs <span class="youtuber-name-2"></span>
                </h2>
                <div id="graficos-content-area">
                    <div class="graficos-initial-message">
                        <h2>Compare a Evolução</h2>
                        <p>Selecione "Aleatório" para ver uma comparação surpresa ou "Escolher" para selecionar dois Youtubers específicos.</p>
                    </div>
                </div>
            </div>
        `;

        selectModal = document.getElementById('graficos-select-modal');
        selectModalBody = document.getElementById('graficos-select-modal-body');
        confirmSelectionBtn = document.getElementById('graficos-confirm-selection-btn');
        closeModalBtn = document.getElementById('graficos-select-modal-close');
        
        allProfiles = window.getData().filter(p => p.performanceHistory && p.performanceHistory.length > 1);

        document.getElementById('graficos-random-btn').addEventListener('click', selectRandomYoutubers);
        document.getElementById('graficos-choose-btn').addEventListener('click', openSelectionModal);

        confirmSelectionBtn.addEventListener('click', () => {
            if (selectedYoutubers.length === 2) {
                const p1 = allProfiles.find(p => p.id === selectedYoutubers[0]);
                const p2 = allProfiles.find(p => p.id === selectedYoutubers[1]);
                generateComparisonCharts(p1, p2);
                closeModal();
            } else {
                alert("Por favor, selecione exatamente 2 Youtubers.");
            }
        });

        closeModalBtn.addEventListener('click', closeModal);

        isInitialized = true;
    }

    function openSelectionModal() {
        if (allProfiles.length < 2) {
            alert("É necessário ter pelo menos 2 Youtubers com histórico para comparar.");
            return;
        }

        selectedYoutubers = [];
        selectModalBody.innerHTML = `
            <div class="graficos-youtuber-selection-list">
                ${allProfiles.map(p => `
                    <div class="youtuber-selection-item" data-id="${p.id}">
                        <input type="checkbox" id="select-${p.id}">
                        <img src="${p.photo}" alt="${p.name}" onerror="this.src='https://placehold.co/40x40/400414/a0a0a0?text=Foto'">
                        <span>${p.name}</span>
                    </div>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('.youtuber-selection-item').forEach(item => {
            item.addEventListener('click', handleYoutuberSelection);
        });

        openModal(selectModal);
    }

    function handleYoutuberSelection(e) {
        const item = e.currentTarget;
        const id = item.dataset.id;

        if (selectedYoutubers.includes(id)) {
            selectedYoutubers = selectedYoutubers.filter(selectedId => selectedId !== id);
            item.classList.remove('selected');
        } else {
            if (selectedYoutubers.length < 2) {
                selectedYoutubers.push(id);
                item.classList.add('selected');
            } else {
                alert("Pode selecionar no máximo 2 Youtubers.");
            }
        }
    }

    function selectRandomYoutubers() {
        if (allProfiles.length < 2) {
            alert("É necessário ter pelo menos 2 Youtubers com histórico para comparar.");
            return;
        }

        let p1, p2;
        do {
            p1 = allProfiles[Math.floor(Math.random() * allProfiles.length)];
            p2 = allProfiles[Math.floor(Math.random() * allProfiles.length)];
        } while (p1.id === p2.id);

        generateComparisonCharts(p1, p2);
    }

    // --- Funções de Geração de Gráficos ---
    function generateComparisonCharts(p1, p2) {
        const contentArea = document.getElementById('graficos-content-area');
        contentArea.innerHTML = `
            <div class="graficos-charts-area">
                <div class="chart-wrapper">
                    <h3>Evolução de Views</h3>
                    <canvas id="graficos-views-chart"></canvas>
                </div>
                <div class="chart-wrapper">
                    <h3>Evolução de Pontos</h3>
                    <canvas id="graficos-points-chart"></canvas>
                </div>
                <div class="chart-wrapper">
                    <h3>Evolução de Rank</h3>
                    <canvas id="graficos-rank-chart"></canvas>
                </div>
            </div>
        `;

        const title = document.querySelector('.graficos-comparison-title');
        title.querySelector('.youtuber-name-1').textContent = p1.name;
        title.querySelector('.youtuber-name-2').textContent = p2.name;
        title.style.display = 'block';

        const commonMonths = getCommonMonths(p1.performanceHistory, p2.performanceHistory);
        const labels = commonMonths.map(m => m.month);

        const dataP1 = extractDataForMonths(p1.performanceHistory, commonMonths);
        const dataP2 = extractDataForMonths(p2.performanceHistory, commonMonths);

        charts.views = createLineChart('graficos-views-chart', labels, dataP1.views, dataP2.views, p1.name, p2.name);
        charts.points = createLineChart('graficos-points-chart', labels, dataP1.points, dataP2.points, p1.name, p2.name);
        charts.rank = createLineChart('graficos-rank-chart', labels, dataP1.rank, dataP2.rank, p1.name, p2.name, true);
    }

    function createLineChart(canvasId, labels, data1, data2, label1, label2, reverseY = false) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: label1,
                        data: data1,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: label2,
                        data: data2,
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        reverse: reverseY,
                        ticks: { color: '#f0f0f0' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#f0f0f0' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#f0f0f0' }
                    }
                }
            }
        });
    }

    // --- Funções de Processamento de Dados ---
    function getCommonMonths(history1, history2) {
        const months1 = new Set(history1.map(h => h.month));
        return history2.filter(h => months1.has(h.month))
                       .sort((a, b) => {
                           const dateA = a.createdAt ? new Date(a.createdAt) : 0;
                           const dateB = b.createdAt ? new Date(b.createdAt) : 0;
                           return dateA - dateB;
                       });
    }

    function extractDataForMonths(history, commonMonths) {
        const data = { views: [], points: [], rank: [] };
        const historyMap = new Map(history.map(h => [h.month, h]));
        
        commonMonths.forEach(monthObj => {
            const record = historyMap.get(monthObj.month);
            if (record) {
                data.views.push(parseViews(record.stats.views));
                data.points.push(record.stats.points || 0);
                data.rank.push(record.rank || null);
            }
        });
        return data;
    }

    // --- Observador para inicializar a página ---
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = graficosSection.style.display !== 'none';
                if (isVisible) {
                    initializeGraficosPage();
                }
            }
        }
    });

    if (graficosSection) {
        observer.observe(graficosSection, { attributes: true });
    }
});
