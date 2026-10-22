// presentation.js - Lógica para o Modo de Apresentação (Versão 2.0 - Unificada)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos do DOM ---
    const startBtn = document.getElementById('start-presentation-btn');
    const mainHeader = document.querySelector('.main-header');
    const mainContent = document.querySelector('.main-content');
    const presentationMonthInput = document.getElementById('presentation-month-input');

    // --- Variáveis de Estado da Apresentação ---
    let presentationTimeoutId = null;
    let currentPhaseIndex = 0;
    let youtubersForPresentation = [];
    let presentationContainer = null;
    let presentationMonth = '';
    
    let currentPhaseYoutubers = [];
    let currentPageIndex = 0;
    const CARDS_PER_PAGE = 3;

    let podiumStep = 0;

    // --- Funções Auxiliares ---
    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase();
        let number = parseFloat(stringValue.replace(',', '.'));
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : number;
    }

    function calculateRanks(profiles) {
        const sortedProfiles = [...profiles]
            .sort((a, b) => parseViews(b.stats.views) - parseViews(a.stats.views));
        
        return profiles.map(profile => {
            const rank = sortedProfiles.findIndex(p => p.id === profile.id) + 1;
            return { ...profile, rank };
        });
    }

    function formatViews(viewsValue) {
        const num = parseViews(viewsValue);
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'K';
        return num.toString();
    }

    function getRankChangeDetails(profile) {
        if (!profile.performanceHistory || profile.performanceHistory.length === 0) {
            return { direction: 'none', tooltip: 'Sem dados históricos.' };
        }
        const lastRecord = profile.performanceHistory[profile.performanceHistory.length - 1];
        
        // Para calcular a mudança de rank, precisaríamos dos dados completos do snapshot anterior.
        // Simplificando, comparamos as views, que é mais visual.
        const lastViews = parseViews(lastRecord.stats.views);
        const currentViews = parseViews(profile.stats.views);
        const viewDiff = currentViews - lastViews;

        let direction = 'same';
        if (viewDiff > 0) direction = 'up';
        if (viewDiff < 0) direction = 'down';

        const tooltipViewPart = viewDiff >= 0 
            ? `Ganhou ${formatViews(viewDiff)} views desde ${lastRecord.month}.`
            : `Perdeu ${formatViews(Math.abs(viewDiff))} views desde ${lastRecord.month}.`;

        return { direction, tooltip: tooltipViewPart };
    }

    /**
     * Inicia o modo de apresentação.
     */
    function startPresentation() {
        presentationMonth = presentationMonthInput.value.trim() || 'Ranking Geral';

        const profiles = window.getData(); // Usa a nova função
        
        presentationContainer = document.createElement('div');
        presentationContainer.id = 'presentation-container';
        
        presentationContainer.innerHTML = `
            <div class="presentation-background"></div>
            <div id="particle-container"></div>
            <div class="presentation-content"></div>
        `;
        document.body.appendChild(presentationContainer);

        mainHeader.style.display = 'none';
        mainContent.style.display = 'none';

        const profilesWithRanks = calculateRanks(profiles);
        youtubersForPresentation = [...profilesWithRanks].sort((a, b) => a.rank - b.rank);

        currentPhaseIndex = 0;
        runPresentationSequence();
    }

    /**
     * Para e sai do modo de apresentação.
     */
    function stopPresentation() {
        clearTimeout(presentationTimeoutId);
        if (presentationContainer) {
            presentationContainer.remove();
            presentationContainer = null;
        }
        mainHeader.style.display = 'block';
        mainContent.style.display = 'block';
    }

    /**
     * Mostra os botões de controlo (Sair, Continuar/Próximo).
     */
    function showControlButtons(isPodium = false) {
        const controlsWrapper = document.getElementById('presentation-controls-wrapper');
        if (!controlsWrapper) return;

        controlsWrapper.innerHTML = '';

        const stopBtn = document.createElement('button');
        stopBtn.className = 'action-button secondary';
        stopBtn.innerHTML = '<i class="fas fa-times"></i> Sair';
        stopBtn.addEventListener('click', stopPresentation);
        controlsWrapper.appendChild(stopBtn);

        const continueBtn = document.createElement('button');
        continueBtn.id = 'presentation-continue-btn';
        continueBtn.className = 'action-button';
        continueBtn.innerHTML = 'Próximo <i class="fas fa-arrow-right"></i>';
        
        continueBtn.addEventListener('click', () => {
            if (isPodium) {
                podiumStep++;
                showPodiumStep();
            } else {
                const isLastPage = (currentPageIndex + 1) * CARDS_PER_PAGE >= currentPhaseYoutubers.length;
                if (isLastPage) {
                    currentPhaseIndex++;
                    runPresentationSequence();
                } else {
                    currentPageIndex++;
                    showRevealPage();
                }
            }
        }, { once: true });
        controlsWrapper.appendChild(continueBtn);

        controlsWrapper.style.display = 'flex';
        controlsWrapper.classList.add('animated', 'fadeInUp');
    }

    /**
     * Controla a sequência de fases da apresentação.
     */
    function runPresentationSequence() {
        clearTimeout(presentationTimeoutId);
        
        const content = presentationContainer.querySelector('.presentation-content');
        if (!content) return;

        const phases = [
            { type: 'intro' },
            { type: 'reveal', startRank: 50, endRank: 41 },
            { type: 'reveal', startRank: 40, endRank: 31 },
            { type: 'reveal', startRank: 30, endRank: 21 },
            { type: 'reveal', startRank: 20, endRank: 11 },
            { type: 'reveal', startRank: 10, endRank: 4 },
            { type: 'final_top' },
            { type: 'end' }
        ];

        if (currentPhaseIndex >= phases.length) {
            stopPresentation();
            return;
        }

        const phase = phases[currentPhaseIndex];
        
        const titleHtml = `
            <div class="phase-title-container">
                <h2 class="phase-title">Placar dos Youtubers - Portugal</h2>
                <p class="phase-subtitle">${presentationMonth}</p>
            </div>
        `;

        const controlsHtml = `<div id="presentation-controls-wrapper" style="display: none;"></div>`;

        if (youtubersForPresentation.length === 0 && phase.type !== 'end' && phase.type !== 'intro') {
             content.innerHTML = `
                ${titleHtml}
                <div class="presentation-phase">
                    <p>Não há perfis para apresentar.</p>
                </div>
                ${controlsHtml}
            `;
            showControlButtons();
            return;
        }

        switch (phase.type) {
            case 'intro':
                content.innerHTML = `
                    <div></div>
                    <div class="intro-phase animated fadeInUp">
                        <h1>Placar dos Youtubers</h1>
                        <p>A apresentação vai começar...</p>
                    </div>
                    ${controlsHtml}
                `;
                showControlButtons();
                break;
            case 'reveal':
                content.innerHTML = `
                    ${titleHtml}
                    <div id="reveal-cards-grid"></div>
                    ${controlsHtml}
                `;
                currentPhaseYoutubers = youtubersForPresentation
                    .filter(p => p.rank <= phase.startRank && p.rank >= phase.endRank)
                    .sort((a, b) => b.rank - a.rank);
                currentPageIndex = 0;
                showRevealPage();
                break;
            case 'final_top':
                content.innerHTML = `
                    ${titleHtml}
                    <div class="final-top-youtubers">
                        ${generateFinalTopHtml([3, 2, 1])}
                    </div>
                    ${controlsHtml}
                `;
                podiumStep = 0;
                showPodiumStep();
                break;
            case 'end':
                content.innerHTML = `
                    <div class="end-screen-container">
                        <div class="end-screen-box animated fadeInUp">
                            <i class="fas fa-trophy end-screen-icon"></i>
                            <h1 class="final-message">Fim da Apresentação!</h1>
                            <p class="end-screen-subtitle">Obrigado por assistir.</p>
                        </div>
                    </div>
                `;
                presentationTimeoutId = setTimeout(stopPresentation, 5000);
                break;
        }
    }

    /**
     * Mostra uma "página" de até 3 cartões.
     */
    function showRevealPage() {
        const cardsGrid = document.getElementById('reveal-cards-grid');
        if (!cardsGrid) return;

        cardsGrid.innerHTML = '';

        const startIndex = currentPageIndex * CARDS_PER_PAGE;
        const endIndex = startIndex + CARDS_PER_PAGE;
        const pageYoutubers = currentPhaseYoutubers.slice(startIndex, endIndex);

        if (pageYoutubers.length === 0) {
            currentPhaseIndex++;
            runPresentationSequence();
            return;
        }

        pageYoutubers.forEach((youtuber, index) => {
            const rankChange = getRankChangeDetails(youtuber);
            let rankChangeHtml = '';
            if (rankChange.direction !== 'none') {
                let iconContent = '<span>-</span>';
                if (rankChange.direction === 'up') iconContent = '<i class="fas fa-arrow-up"></i>';
                if (rankChange.direction === 'down') iconContent = '<i class="fas fa-arrow-down"></i>';
                rankChangeHtml = `<div class="rank-change-indicator ${rankChange.direction}" title="${rankChange.tooltip}">${iconContent}</div>`;
            }

            const card = document.createElement('div');
            card.className = 'youtuber-reveal-card';
            card.style.opacity = '0';
            card.innerHTML = `
                <div class="card-header">
                    <span class="rank-number">#${youtuber.rank}</span>
                    ${rankChangeHtml}
                </div>
                <div class="youtuber-photo-frame">
                    <img src="${youtuber.photo}" class="youtuber-photo" onerror="this.src='https://placehold.co/180x180/400414/a0a0a0?text=Foto'">
                </div>
                <div class="youtuber-details">
                    <h3 class="youtuber-name">${youtuber.name}</h3>
                    <p class="youtuber-content-type">${youtuber.contentType}</p>
                    <div class="youtuber-views">
                        <span class="youtuber-views-number">${formatViews(youtuber.stats.views)}</span>
                        <span class="youtuber-views-text">Views</span>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                card.classList.add('animated', 'fadeInUp');
                card.style.opacity = '1';
            }, index * 400);

            cardsGrid.appendChild(card);
        });

        const totalAnimationTime = (pageYoutubers.length * 400) + 200;
        presentationTimeoutId = setTimeout(() => {
            showControlButtons();
        }, totalAnimationTime);
    }

    /**
     * Gera o HTML para os cartões do pódio.
     */
    function generateFinalTopHtml(ranks) {
        let topYoutubersHtml = '';
        ranks.forEach(rank => {
            const youtuber = youtubersForPresentation.find(p => p.rank === rank);
            if (youtuber) {
                topYoutubersHtml += `
                    <div class="top-youtuber-card rank-${rank}">
                        <span class="rank-number">#${youtuber.rank}</span>
                        <img src="${youtuber.photo}" class="youtuber-photo" onerror="this.src='https://placehold.co/150x150/400414/a0a0a0?text=Foto'">
                        <h3 class="youtuber-name">${youtuber.name}</h3>
                        <p class="youtuber-content-type">${youtuber.contentType}</p>
                        <div class="top-podium-views">
                            <i class="fas fa-eye views-icon"></i>
                            <span class="views-number">${formatViews(youtuber.stats.views)}</span>
                        </div>
                    </div>
                `;
            }
        });
        return topYoutubersHtml;
    }
    
    /**
     * Controla a revelação sequencial do pódio.
     */
    function showPodiumStep() {
        const ranksToShow = [3, 2, 1];
        if (podiumStep >= ranksToShow.length) {
            currentPhaseIndex++;
            runPresentationSequence();
            return;
        }

        const rank = ranksToShow[podiumStep];
        const card = document.querySelector(`.top-youtuber-card.rank-${rank}`);
        
        if (card) {
            card.style.visibility = 'visible';
            card.classList.add('animated', 'fadeInUp');

            if (rank === 1) {
                createParticles(40);
            }
        }
        
        showControlButtons(true);
    }

    /**
     * Cria e anima as partículas de celebração.
     */
    function createParticles(count) {
        const particleContainer = document.getElementById('particle-container');
        if (!particleContainer) return;
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 10 + 5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}vw`;
            particle.style.animationDelay = `${Math.random() * 2}s`;
            particle.style.animationDuration = `${Math.random() * 2 + 2}s`;
            
            const colors = ['#FFD700', '#C0C0C0', '#FFFFFF'];
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

            particleContainer.appendChild(particle);
        }
    }

    // --- Event Listeners ---
    if (startBtn) {
        startBtn.addEventListener('click', startPresentation);
    }
});
