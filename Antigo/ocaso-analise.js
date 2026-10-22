// ocaso-analise.js - Lógica para o novo sistema de Análise de Casos (v1.1 - Navegação Corrigida)

document.addEventListener('DOMContentLoaded', () => {

    const analiseSection = document.getElementById('section-analise');

    function initializeAnaliseSection() {
        // A secção é populada dinamicamente, podemos adicionar listeners gerais aqui se necessário
    }

    /**
     * Ponto de entrada público para iniciar a análise de um caso.
     * @param {string} casoId O ID do caso a ser analisado.
     */
    window.launchAnalysis = function(casoId) {
        const data = window.getOcasoData();
        const caso = data.casos.find(c => c.id === casoId);
        if (!caso) {
            console.error("Caso não encontrado para análise:", casoId);
            return;
        }

        const participants = caso.participants
            .map(pId => data.pessoas.find(p => p.id === pId))
            .filter(Boolean);
        
        const eventCategories = data.eventCategories;

        if (!analiseSection) return;

        analiseSection.innerHTML = buildAnalysisHTML(caso, participants, eventCategories);

        // Adiciona o listener para o botão de fechar
        const closeBtn = analiseSection.querySelector('.close-analise-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                // Volta para a secção de casos ao fechar
                if (typeof window.navigateToSection === 'function') {
                    window.navigateToSection('section-casos');
                }
            });
        }

        // [CORREÇÃO] Mudar para a secção de análise usando a função de navegação global.
        if (typeof window.navigateToSection === 'function') {
            window.navigateToSection('section-analise');
        } else {
            console.error("A função de navegação global 'navigateToSection' não foi encontrada.");
        }
    };

    /**
     * Constrói o HTML completo para a página de análise.
     * @returns {string} O HTML gerado.
     */
    function buildAnalysisHTML(caso, participants, eventCategories) {
        const summaryStats = calculateSummaryStats(caso, participants);

        return `
            <div class="analise-container">
                <div class="analise-header">
                    <button class="icon-button close-analise-btn" title="Voltar aos Casos"><i class="fas fa-times"></i></button>
                    <p>Dossiê do Caso</p>
                    <h2>${caso.title}</h2>
                </div>

                <div class="summary-section">
                    <div class="summary-grid">
                        ${createSummaryCardHTML('fas fa-users', summaryStats.participantCount, 'Participantes Envolvidos')}
                        ${createSummaryCardHTML('fas fa-calendar-alt', summaryStats.eventCount, 'Eventos na Timeline')}
                        ${createSummaryCardHTML('fas fa-arrow-up', summaryStats.biggestGain.points, 'Maior Ganho de Aura', summaryStats.biggestGain.person, 'positive')}
                        ${createSummaryCardHTML('fas fa-arrow-down', summaryStats.biggestLoss.points, 'Maior Perda de Aura', summaryStats.biggestLoss.person, 'negative')}
                    </div>
                </div>

                <div class="participants-section">
                    <h3>Resumo dos Participantes</h3>
                    <div class="participants-grid">
                        ${participants.map(p => createParticipantPanelHTML(p, caso)).join('')}
                    </div>
                </div>

                <div class="timeline-section">
                    <h3>Linha do Tempo Narrativa</h3>
                    <div class="timeline">
                        ${caso.timeline.map((event, index) => createTimelineEventHTML(event, index, caso, participants, eventCategories)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cria o HTML para um cartão de resumo.
     */
    function createSummaryCardHTML(icon, value, label, person = null, valueClass = '') {
        let personHTML = '';
        if (person && value !== 0) {
            personHTML = `
                <div class="person-ref">
                    <img src="${person.photo}" alt="${person.artisticName}">
                    <span>${person.artisticName}</span>
                </div>
            `;
        }
        
        return `
            <div class="summary-card">
                <i class="${icon} icon"></i>
                <div class="value ${valueClass}">${value > 0 && valueClass ? '+' : ''}${value}</div>
                <div class="label">${label}</div>
                ${personHTML}
            </div>
        `;
    }
    
    /**
     * Cria o HTML para o painel de um participante.
     */
    function createParticipantPanelHTML(person, caso) {
        const totalChange = caso.timeline.reduce((acc, event) => {
            return acc + (event.auraDistribution[person.id] || 0);
        }, 0);
        
        const initialAura = (person.aura || 0) - (caso.isArchived ? totalChange : 0);
        const finalAura = initialAura + totalChange;
        const changeClass = totalChange > 0 ? 'positive' : (totalChange < 0 ? 'negative' : '');

        return `
            <div class="participant-panel">
                <div class="participant-panel-header">
                    <img src="${person.photo}" alt="${person.artisticName}">
                    <h4>${person.artisticName}</h4>
                </div>
                <div class="aura-flow">
                    <div class="aura-state">
                        ${initialAura}
                        <span>Aura Inicial</span>
                    </div>
                    <i class="fas fa-long-arrow-alt-right flow-arrow"></i>
                    <div class="total-change ${changeClass}">
                        ${totalChange >= 0 ? '+' : ''}${totalChange}
                        <span>Balanço no Caso</span>
                    </div>
                    <i class="fas fa-long-arrow-alt-right flow-arrow"></i>
                    <div class="aura-state">
                        ${finalAura}
                        <span>Aura Final</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cria o HTML para um evento na linha do tempo.
     */
    function createTimelineEventHTML(event, index, caso, participants, eventCategories) {
        const category = eventCategories.find(c => c.id === event.categoryId);
        const situation = category ? category.situations.find(s => s.id === event.situationId) : null;
        if (!category || !situation) return '';

        const narrative = generateNarrativeText(event, situation, category, participants);
        const changesHTML = Object.entries(event.auraDistribution)
            .filter(([_, points]) => points !== 0)
            .map(([personId, points]) => {
                const person = participants.find(p => p.id === personId);
                if (!person) return '';
                const changeClass = points > 0 ? 'positive' : 'negative';
                return `
                    <div class="aura-change-item">
                        <div class="person">
                            <img src="${person.photo}" alt="${person.artisticName}">
                            <span>${person.artisticName}</span>
                        </div>
                        <div class="change ${changeClass}">
                            ${points > 0 ? '+' : ''}${points} <i class="fas fa-bolt"></i>
                        </div>
                    </div>
                `;
            }).join('');

        return `
            <div class="timeline-event">
                <div class="timeline-icon"><i class="fas fa-bolt"></i></div>
                <div class="timeline-content">
                    <h5>${situation.name} <span>(Categoria: ${category.name})</span></h5>
                    <p class="narrative-text">${narrative}</p>
                    <div class="aura-changes-list">
                        ${changesHTML || '<p>Nenhuma alteração de Aura neste evento.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Gera o texto descritivo para um evento.
     */
    function generateNarrativeText(event, situation, category, participants) {
        let narrative = `Ocorreu um evento de <strong>${situation.name}</strong>. `;
        const rolesInvolved = {};

        for (const [roleId, personIds] of Object.entries(event.roleAssignments)) {
            const role = category.roles.find(r => r.id === roleId);
            if (!role || personIds.length === 0) continue;
            
            const peopleNames = personIds.map(id => {
                const p = participants.find(p => p.id === id);
                return p ? `<strong>${p.artisticName}</strong>` : '<i>Desconhecido</i>';
            });

            if (peopleNames.length > 0) {
                 rolesInvolved[role.name] = peopleNames;
            }
        }
        
        if (Object.keys(rolesInvolved).length > 0) {
            narrative += "Nesta situação, ";
            const roleClauses = Object.entries(rolesInvolved).map(([roleName, peopleNames]) => {
                 return `${peopleNames.join(' e ')} atuou como <span class="role">${roleName}</span>`;
            });
            narrative += roleClauses.join(', ') + '.';
        } else {
            narrative += "Não foram atribuídos papéis específicos aos participantes neste evento.";
        }
        
        return narrative;
    }

    /**
     * Calcula as estatísticas de resumo para o caso.
     */
    function calculateSummaryStats(caso, participants) {
        const stats = {
            participantCount: participants.length,
            eventCount: caso.timeline.length,
            biggestGain: { points: 0, person: null },
            biggestLoss: { points: 0, person: null }
        };

        const totalChanges = {};
        participants.forEach(p => totalChanges[p.id] = 0);

        caso.timeline.forEach(event => {
            for (const personId in event.auraDistribution) {
                if (totalChanges.hasOwnProperty(personId)) {
                    totalChanges[personId] += event.auraDistribution[personId];
                }
            }
        });

        for (const personId in totalChanges) {
            const points = totalChanges[personId];
            const person = participants.find(p => p.id === personId);
            if (!person) continue;

            if (points > stats.biggestGain.points) {
                stats.biggestGain = { points, person };
            }
            if (points < stats.biggestLoss.points) {
                stats.biggestLoss = { points, person };
            }
        }

        return stats;
    }

    window.initializeAnaliseSection = initializeAnaliseSection;
});
