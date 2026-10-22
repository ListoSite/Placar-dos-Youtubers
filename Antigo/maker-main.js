// maker-main.js - Lógica principal para o Video Maker

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const stepIndicators = document.querySelectorAll('.sidebar-step');
    const contentSections = document.querySelectorAll('.content-section');
    const backButton = document.getElementById('back-btn');
    const generateButton = document.getElementById('generate-video-btn');

    // Grids de seleção
    const categoryGrid = document.getElementById('category-grid');
    const themeGrid = document.getElementById('theme-grid');
    const formatGrid = document.getElementById('format-grid');

    // --- Secções de Opções (Passo 3) ---
    // Ranking Geral
    const step3Options = document.getElementById('step-3-options');
    const topSelectionGrid = document.getElementById('top-selection-grid');
    const monthSelect = document.getElementById('month-select');
    const monthSelectionGroup = document.getElementById('month-selection-group');

    // Batalha
    const battleOptions = document.getElementById('battle-options');
    const battleModeSelection = document.getElementById('battle-mode-selection');
    const battleYoutuberSelection = document.getElementById('battle-youtuber-selection');
    const youtuberSelect1 = document.getElementById('youtuber-select-1');
    const youtuberSelect2 = document.getElementById('youtuber-select-2');

    // Ranking por Categoria
    const categoryRankingOptions = document.getElementById('category-ranking-options');
    const categoryTopSelectionGrid = document.getElementById('category-top-selection-grid');
    const categoryModeGroup = document.getElementById('category-mode-group');
    const categoryModeSelection = document.getElementById('category-mode-selection');
    const categorySelectionContainer = document.getElementById('category-selection-container');
    const categorySelectionList = document.getElementById('category-selection-list');
    const categoryMonthSelectionGroup = document.getElementById('category-month-selection-group');
    const categoryMonthSelect = document.getElementById('category-month-select');

    // NOVO: Análise Inteligente
    const analiseInteligenteOptions = document.getElementById('analise-inteligente-options');
    const analiseModeSelection = document.getElementById('analise-mode-selection');
    const analiseYoutuberSelection = document.getElementById('analise-youtuber-selection');
    const analiseYoutuberSelect = document.getElementById('analise-youtuber-select');
    const analiseMonthSelection = document.getElementById('analise-month-selection');
    const analiseMonth1Select = document.getElementById('analise-month1-select');
    const analiseMonth2Select = document.getElementById('analise-month2-select');


    // Fallback
    const step3Default = document.getElementById('step-3-default');


    // --- Estado da Aplicação ---
    let currentStep = 1;
    let selectedCategory = null;
    let selectedTheme = null;
    let selectedFormat = null;

    // Estado do Ranking Geral
    let selectedTop = null;
    let selectedMonth = 'current';

    // Estado da Batalha
    let selectedBattleMode = null;
    let selectedYoutuber1 = null;
    let selectedYoutuber2 = null;

    // Estado do Ranking por Categoria
    let selectedCategoryTop = null;
    let selectedCategoryMode = null;
    let selectedContentTypes = [];
    let selectedCategoryMonth = 'current';

    // NOVO: Estado da Análise Inteligente
    let selectedAnaliseMode = null;
    let selectedAnaliseYoutuber = null;
    let selectedAnaliseMonth1 = null;
    let selectedAnaliseMonth2 = null;


    // Dados dos temas disponíveis para cada categoria
    const themesData = {
        'placar-youtubers': [
            { id: 'ranking-melhores', icon: 'fa-trophy', title: 'Ranking dos Melhores', description: 'Cria um vídeo com o ranking geral dos melhores Youtubers.' },
            { id: 'ranking-piores', icon: 'fa-sort-amount-down', title: 'Ranking dos Piores', description: 'Mostra os Youtubers com o desempenho mais baixo.' },
            { id: 'ranking-por-categoria', icon: 'fa-tags', title: 'Ranking por Categoria', description: 'Classifica os Youtubers dentro de categorias específicas.' },
            { id: 'ranking-piores-categoria', icon: 'fa-thumbs-down', title: 'Piores da Categoria', description: 'Mostra os Youtubers com o pior desempenho numa categoria.' },
            { id: 'batalha', icon: 'fa-fist-raised', title: 'Batalha de Youtubers', description: 'Uma comparação estatística entre dois Youtubers.' },
            { id: 'analise-inteligente', icon: 'fa-lightbulb', title: 'Análise Inteligente', description: 'Gera uma análise comparativa do desempenho de um Youtuber entre dois meses.' },
        ],
        // Outras categorias
    };
    
    // --- Funções de Navegação e UI ---

    function updateUI() {
        stepIndicators.forEach(indicator => {
            const step = parseInt(indicator.dataset.step, 10);
            indicator.classList.remove('active', 'completed');
            if (step < currentStep) {
                indicator.classList.add('completed');
            } else if (step === currentStep) {
                indicator.classList.add('active');
            }
        });

        contentSections.forEach(section => {
            section.classList.toggle('active', parseInt(section.dataset.step, 10) === currentStep);
        });

        backButton.style.display = currentStep > 1 ? 'inline-flex' : 'none';

        // Lógica para o Passo 3 (Opções)
        if (currentStep === 3) {
            // Esconde todas as opções por defeito
            step3Options.style.display = 'none';
            battleOptions.style.display = 'none';
            categoryRankingOptions.style.display = 'none';
            analiseInteligenteOptions.style.display = 'none';
            step3Default.style.display = 'none';

            if (selectedTheme === 'ranking-melhores' || selectedTheme === 'ranking-piores') {
                step3Options.style.display = 'block';
                populateMonthSelector(monthSelect);
            } else if (selectedTheme === 'ranking-por-categoria' || selectedTheme === 'ranking-piores-categoria') {
                categoryRankingOptions.style.display = 'block';
                populateCategorySelector();
                populateMonthSelector(categoryMonthSelect);
            } else if (selectedTheme === 'batalha') {
                battleOptions.style.display = 'block';
                populateYoutuberSelectors();
            } else if (selectedTheme === 'analise-inteligente') {
                analiseInteligenteOptions.style.display = 'block';
                populateAnaliseYoutuberSelector();
            } else {
                step3Default.style.display = 'block';
                 setTimeout(() => {
                    currentStep = 4;
                    updateUI();
                }, 1000);
            }
        }

        checkIfReadyToGenerate();
    }
    
    function checkIfReadyToGenerate() {
        let isReady = false;
        if (selectedCategory && selectedTheme && selectedFormat) {
            if (selectedTheme === 'ranking-melhores' || selectedTheme === 'ranking-piores') {
                if (selectedTop && selectedMonth) isReady = true;
            } else if (selectedTheme === 'ranking-por-categoria' || selectedTheme === 'ranking-piores-categoria') {
                if (selectedCategoryTop && selectedCategoryMonth && selectedCategoryMode) {
                    if (selectedCategoryMode === 'aleatorio' || (selectedCategoryMode === 'escolher' && selectedContentTypes.length > 0)) {
                        isReady = true;
                    }
                }
            } else if (selectedTheme === 'batalha') {
                if (selectedBattleMode === 'aleatorio' || (selectedBattleMode === 'escolher' && selectedYoutuber1 && selectedYoutuber2 && selectedYoutuber1 !== selectedYoutuber2)) {
                    isReady = true;
                }
            } else if (selectedTheme === 'analise-inteligente') {
                if (selectedAnaliseYoutuber && selectedAnaliseMonth1 !== null && selectedAnaliseMonth2 !== null && selectedAnaliseMonth1 !== selectedAnaliseMonth2) {
                    isReady = true;
                }
            } else {
                isReady = true;
            }
        }
        generateButton.disabled = !isReady;
    }
    
    function goBack() {
        if (currentStep > 1) {
            currentStep--;
            updateUI();
        }
    }

    // --- Funções de Lógica de Dados e Seleção ---

    function getPlacarData() {
        try {
            if (window.opener && typeof window.opener.getData === 'function') {
                const data = window.opener.getData();
                if (data && data.length > 0) return data;
            }
            const dataString = localStorage.getItem('placarDataV3');
            return dataString ? JSON.parse(dataString) : [];
        } catch (e) {
            console.error("Erro ao obter dados do Placar dos Youtubers:", e);
            return [];
        }
    }

    function populateThemes(category) {
        themeGrid.innerHTML = '';
        const themes = themesData[category] || [];
        themes.forEach(theme => {
            const card = document.createElement('div');
            card.className = 'theme-card';
            card.dataset.themeId = theme.id;
            card.innerHTML = `<i class="fas ${theme.icon} theme-icon"></i><h4>${theme.title}</h4><p>${theme.description}</p>`;
            themeGrid.appendChild(card);
        });
    }

    function populateMonthSelector(selectElement) {
        const placarData = getPlacarData();
        const allMonths = new Set();
        placarData.forEach(p => (p.performanceHistory || []).forEach(h => allMonths.add(h.month)));

        selectElement.innerHTML = '<option value="current">Mês Atual</option>';
        Array.from(allMonths).sort().reverse().forEach(month => {
            selectElement.innerHTML += `<option value="${month}">${month}</option>`;
        });
        selectElement.value = selectedMonth || 'current';
    }

    function populateYoutuberSelectors() {
        const placarData = getPlacarData();
        youtuberSelect1.innerHTML = '<option value="">Selecione o 1º</option>';
        youtuberSelect2.innerHTML = '<option value="">Selecione o 2º</option>';
        placarData.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
            youtuberSelect1.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            youtuberSelect2.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }

    function populateCategorySelector() {
        const placarData = getPlacarData();
        const allContentTypes = new Set(placarData.map(p => p.contentType).filter(Boolean));

        categorySelectionList.innerHTML = '';
        allContentTypes.forEach(type => {
            const item = document.createElement('div');
            item.className = 'category-checkbox-item';
            item.innerHTML = `
                <input type="checkbox" id="cat-${type.replace(/\s+/g, '-')}" value="${type}">
                <label for="cat-${type.replace(/\s+/g, '-')}">${type}</label>
            `;
            categorySelectionList.appendChild(item);
        });
    }

    function populateAnaliseYoutuberSelector() {
        const placarData = getPlacarData();
        const profilesWithHistory = placarData.filter(p => p.performanceHistory && p.performanceHistory.length >= 2);
        analiseYoutuberSelect.innerHTML = '<option value="">Selecione...</option>';
        profilesWithHistory.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
            analiseYoutuberSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }

    function populateAnaliseMonthSelectors(profileId) {
        const placarData = getPlacarData();
        const profile = placarData.find(p => p.id === profileId);
        analiseMonth1Select.innerHTML = '<option value="">Mês Antigo</option>';
        analiseMonth2Select.innerHTML = '<option value="">Mês Recente</option>';
        if (profile && profile.performanceHistory) {
            profile.performanceHistory.forEach((record, index) => {
                const optionHTML = `<option value="${index}">${record.month}</option>`;
                analiseMonth1Select.innerHTML += optionHTML;
                analiseMonth2Select.innerHTML += optionHTML;
            });
        }
    }


    function generateVideo() {
        if (generateButton.disabled) return;

        const placarData = getPlacarData();
        if (placarData.length === 0) {
            alert("Erro: Não foi possível carregar os dados do Placar dos Youtubers.");
            return;
        }

        const presentationOptions = {
            theme: selectedTheme,
            format: selectedFormat,
            // Ranking Geral
            top: selectedTop,
            month: selectedMonth,
            // Batalha
            battleMode: selectedBattleMode,
            youtuber1: selectedYoutuber1,
            youtuber2: selectedYoutuber2,
            // Ranking por Categoria
            categoryTop: selectedCategoryTop,
            categoryMode: selectedCategoryMode,
            contentTypes: selectedContentTypes,
            categoryMonth: selectedCategoryMonth,
            // Análise Inteligente
            analiseMode: selectedAnaliseMode,
            analiseYoutuberId: selectedAnaliseYoutuber,
            analiseMonth1Index: analiseMonth1Select.value, // CORREÇÃO: Lê o valor diretamente do elemento
            analiseMonth2Index: analiseMonth2Select.value, // CORREÇÃO: Lê o valor diretamente do elemento
        };
        
        try {
            sessionStorage.setItem('placarDataV3', JSON.stringify(placarData));
            sessionStorage.setItem('presentationOptions', JSON.stringify(presentationOptions));
        } catch (e) {
            alert("Erro ao preparar os dados para a apresentação.");
            return;
        }

        let presentationFile = '';
        if (selectedTheme === 'ranking-melhores' || selectedTheme === 'ranking-piores') {
            presentationFile = selectedFormat === '9-16' ? 'presentation-top50.html' : 'presentation-top50-16x9.html';
        } else if (selectedTheme === 'batalha') {
            presentationFile = selectedFormat === '9-16' ? 'batalha-9x16.html' : 'batalha-16x9.html';
        } else if (selectedTheme === 'ranking-por-categoria') {
            presentationFile = selectedFormat === '9-16' ? 'presentation-category-ranking.html' : 'presentation-category-ranking-16x9.html';
        } else if (selectedTheme === 'ranking-piores-categoria') {
             if (selectedFormat === '9-16') {
                presentationFile = 'presentation-piores-categoria.html';
            } else if (selectedFormat === '16-9') {
                presentationFile = 'presentation-piores-categoria-16x9.html';
            }
        } else if (selectedTheme === 'analise-inteligente') {
            presentationFile = 'presentation-analise-inteligente.html';
        }
        
        if (!presentationFile) {
            alert(`A apresentação para "${selectedTheme}" no formato ${selectedFormat} ainda não foi criada.`);
            return;
        }

        const features = selectedFormat === '9-16' ? 'width=470,height=820' : 'width=1280,height=720';
        window.open(presentationFile, '_blank', features);
    }

    // --- Event Listeners ---

    if (categoryGrid) {
        categoryGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.category-card');
            if (!card) return;
            selectedCategory = card.dataset.categoryId;
            categoryGrid.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            populateThemes(selectedCategory);
            currentStep = 2;
            updateUI();
        });
    }

    if (themeGrid) {
        themeGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.theme-card');
            if (!card) return;
            selectedTheme = card.dataset.themeId;
            themeGrid.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentStep = 3;
            updateUI();
        });
    }

    // Listeners para Ranking Geral
    if (topSelectionGrid) {
        topSelectionGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.category-card');
            if (!card) return;
            selectedTop = card.dataset.top;
            topSelectionGrid.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            monthSelectionGroup.style.display = 'block';
            checkIfReadyToGenerate();
        });
    }
    if (monthSelect) monthSelect.addEventListener('change', (e) => { selectedMonth = e.target.value; currentStep = 4; updateUI(); });

    // Listeners para Batalha
    if (battleModeSelection) {
        battleModeSelection.addEventListener('click', (e) => {
            const card = e.target.closest('.category-card');
            if (!card) return;
            selectedBattleMode = card.dataset.mode;
            battleModeSelection.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            battleYoutuberSelection.style.display = (selectedBattleMode === 'escolher') ? 'block' : 'none';
            if (selectedBattleMode === 'aleatorio') { currentStep = 4; updateUI(); }
            checkIfReadyToGenerate();
        });
    }
    if(youtuberSelect1) youtuberSelect1.addEventListener('change', (e) => { selectedYoutuber1 = e.target.value; if(selectedYoutuber1 && selectedYoutuber2) { currentStep = 4; updateUI(); } });
    if(youtuberSelect2) youtuberSelect2.addEventListener('change', (e) => { selectedYoutuber2 = e.target.value; if(selectedYoutuber1 && selectedYoutuber2) { currentStep = 4; updateUI(); } });

    // Listeners para Ranking por Categoria
    if (categoryTopSelectionGrid) {
        categoryTopSelectionGrid.addEventListener('click', e => {
            const card = e.target.closest('.category-card');
            if (!card) return;
            selectedCategoryTop = card.dataset.top;
            categoryTopSelectionGrid.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            categoryModeGroup.style.display = 'block';
            checkIfReadyToGenerate();
        });
    }
    if (categoryModeSelection) {
        categoryModeSelection.addEventListener('click', e => {
            const card = e.target.closest('.category-card');
            if (!card) return;
            selectedCategoryMode = card.dataset.mode;
            categoryModeSelection.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            categorySelectionContainer.style.display = (selectedCategoryMode === 'escolher') ? 'block' : 'none';
            categoryMonthSelectionGroup.style.display = 'block';
            checkIfReadyToGenerate();
        });
    }
    if(categorySelectionList) {
        categorySelectionList.addEventListener('change', e => {
            if(e.target.type === 'checkbox') {
                selectedContentTypes = Array.from(categorySelectionList.querySelectorAll('input:checked')).map(cb => cb.value);
                checkIfReadyToGenerate();
            }
        });
    }
    if(categoryMonthSelect) categoryMonthSelect.addEventListener('change', e => { selectedCategoryMonth = e.target.value; currentStep = 4; updateUI(); });

    // Listeners para Análise Inteligente
    if (analiseModeSelection) {
        analiseModeSelection.addEventListener('click', e => {
            const card = e.target.closest('.category-card');
            if (!card) return;
            selectedAnaliseMode = card.dataset.mode;
            analiseModeSelection.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            const placarData = getPlacarData();
            const profilesWithHistory = placarData.filter(p => p.performanceHistory && p.performanceHistory.length >= 2);

            if (selectedAnaliseMode === 'aleatorio') {
                if (profilesWithHistory.length > 0) {
                    const randomProfile = profilesWithHistory[Math.floor(Math.random() * profilesWithHistory.length)];
                    selectedAnaliseYoutuber = randomProfile.id;
                    populateAnaliseMonthSelectors(selectedAnaliseYoutuber);
                    analiseYoutuberSelection.style.display = 'none';
                    analiseYoutuberSelect.value = ""; // Limpa a seleção manual
                    analiseMonthSelection.style.display = 'block';
                } else {
                    alert("Não existem Youtubers com histórico suficiente para uma análise aleatória.");
                    selectedAnaliseMode = null; // Reset
                    analiseModeSelection.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
                }
            } else if (selectedAnaliseMode === 'escolher') {
                analiseYoutuberSelection.style.display = 'block';
                analiseMonthSelection.style.display = 'none';
                selectedAnaliseYoutuber = null;
                selectedAnaliseMonth1 = null;
                selectedAnaliseMonth2 = null;
            }
             checkIfReadyToGenerate();
        });
    }

    if (analiseYoutuberSelect) {
        analiseYoutuberSelect.addEventListener('change', e => {
            selectedAnaliseYoutuber = e.target.value;
            if (selectedAnaliseYoutuber) {
                populateAnaliseMonthSelectors(selectedAnaliseYoutuber);
                analiseMonthSelection.style.display = 'block';
            } else {
                analiseMonthSelection.style.display = 'none';
            }
            selectedAnaliseMonth1 = null;
            selectedAnaliseMonth2 = null;
            analiseMonth1Select.value = "";
            analiseMonth2Select.value = "";
            checkIfReadyToGenerate();
        });
    }

    if (analiseMonth1Select) analiseMonth1Select.addEventListener('change', e => { selectedAnaliseMonth1 = e.target.value; if(selectedAnaliseMonth1 && selectedAnaliseMonth2) { currentStep = 4; updateUI(); } });
    if (analiseMonth2Select) analiseMonth2Select.addEventListener('change', e => { selectedAnaliseMonth2 = e.target.value; if(selectedAnaliseMonth1 && selectedAnaliseMonth2) { currentStep = 4; updateUI(); } });


    if (formatGrid) {
        formatGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.format-card');
            if (!card) return;
            selectedFormat = card.dataset.format;
            formatGrid.querySelectorAll('.format-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            checkIfReadyToGenerate();
        });
    }

    if (backButton) backButton.addEventListener('click', goBack);
    if (generateButton) generateButton.addEventListener('click', generateVideo);
    
    // --- Inicialização ---
    updateUI();
});


