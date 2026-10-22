// ocaso-casos.js - Lógica para a secção de Gestão de Casos (v7.1 - Botão Analisar Restaurado)

document.addEventListener('DOMContentLoaded', () => {

    // --- [NOVO] Constantes para a nova lógica de Relações e Afiliações ---
    const AFFILIATION_MULTIPLIERS = {
        ALLY_BOOST: 1.25,      // Bónus de Aura ao ajudar um membro do mesmo grupo de "amigos"
        FRIENDLY_FIRE: 0.5,    // Redução de penalidade de Aura ao prejudicar um "amigo"
        RIVAL_HARM: 1.5,       // Bónus de dano de Aura ao prejudicar um membro de um grupo de "rivais"
        UNEXPECTED_AID: 0.75   // Redução de ganho de Aura ao ajudar um "rival"
    };
    const RELATIONSHIP_POINT_VALUES = {
        ALLY_AID: 2,           // Pontos de Relação por ajudar um "amigo"
        RIVAL_HARM: 1,         // Pontos de Relação por prejudicar um "rival" (reforça a rivalidade)
        FRIENDLY_FIRE: -5,     // Penalidade severa de Relação por prejudicar um "amigo"
        UNEXPECTED_AID: 3,     // Bónus de Relação por ajudar um "rival" (cria tensão/reviravolta)
        NEUTRAL_INTERACTION: 1 // Interação padrão entre pessoas sem afiliação
    };
    
    // ... (restante da seleção de elementos é igual)
    const addCasoBtn = document.getElementById('add-caso-btn');
    const casoFormContainer = document.querySelector('.caso-form-container');
    const casoForm = document.getElementById('caso-form');
    const cancelCasoBtn = document.getElementById('cancel-caso-btn');
    const continueCasoBtn = document.getElementById('continue-caso-btn');
    const formTitle = document.getElementById('caso-form-title');
    const casoTitleInput = document.getElementById('caso-title-input');
    const participantSearchInput = document.getElementById('caso-participant-search');
    const participantSearchResults = document.getElementById('caso-participant-search-results');
    const selectedParticipantsGrid = document.getElementById('caso-selected-participants');
    const casoDescriptionInput = document.getElementById('caso-description-input');
    const casoLinksInput = document.getElementById('caso-links-input');
    const auraCalculatorSection = document.getElementById('aura-calculator-section');
    const situationCategorySelect = document.getElementById('caso-type-select');
    const subSituationsContainer = document.getElementById('sub-situations-container');
    const roleAssignmentSection = document.getElementById('role-assignment-section');
    const auraResultsPreview = document.getElementById('aura-results-preview');
    const casoTimelineContainer = document.getElementById('caso-timeline-container');
    const sectionCasos = document.getElementById('section-casos');
    const contentTabs = sectionCasos ? sectionCasos.querySelectorAll('.tabs .tab-link') : [];
    const tabContents = sectionCasos ? sectionCasos.querySelectorAll('.tab-content') : [];
    const casosAtuaisList = document.getElementById('casos-atuais-list');
    const casosArquivoList = document.getElementById('casos-arquivo-list');

    // --- Estado da Aplicação ---
    let ocasoData = {};
    let editingCasoId = null;
    let editingEventId = null;
    let selectedParticipants = [];
    let currentTimeline = [];
    let currentSelectedSituationId = null;
    let currentRoleAssignments = {};

    function initializeCasos() {
        ocasoData = window.getOcasoData();
        populateCategoryDropdown();
        addEventListenersCasos();
        renderCasosLists();
    }

    // --- [NOVO] Função Auxiliar para Afiliações ---
    function getParticipantAffiliations(p1Id, p2Id) {
        const { grupos } = ocasoData;
        for (const grupo of grupos) {
            const p1InGroup = grupo.members.includes(p1Id);
            const p2InGroup = grupo.members.includes(p2Id);
            if (p1InGroup && p2InGroup) {
                return grupo.type; // Retorna 'amigos' ou 'rivais'
            }
        }
        return 'neutro'; // Não estão no mesmo grupo
    }

    // --- [REESCRITO] Lógica de Cálculo de Evento ---
    function calculateEventOutcome() {
        const finalAuraDistribution = {};
        const relationshipChanges = {};
        selectedParticipants.forEach(p => finalAuraDistribution[p.id] = 0);

        if (!currentSelectedSituationId) return { finalAuraDistribution, relationshipChanges };

        const category = ocasoData.eventCategories.find(c => c.id === situationCategorySelect.value);
        const situation = category?.situations.find(s => s.id === currentSelectedSituationId);
        if (!situation) return { finalAuraDistribution, relationshipChanges };

        const basePoints = situation.points;
        const initialDistribution = {};

        // 1. Calcula a distribuição de pontos base
        Object.entries(currentRoleAssignments).forEach(([roleId, personIds]) => {
            const role = category.roles.find(r => r.id === roleId);
            if (role) {
                personIds.forEach(personId => {
                    initialDistribution[personId] = (initialDistribution[personId] || 0) + Math.round(basePoints * role.multiplier);
                });
            }
        });

        // 2. Itera sobre todos os pares de participantes para aplicar modificadores e pontos de relação
        const participantsInEvent = Object.keys(initialDistribution);
        for (let i = 0; i < participantsInEvent.length; i++) {
            for (let j = i + 1; j < participantsInEvent.length; j++) {
                const p1Id = participantsInEvent[i];
                const p2Id = participantsInEvent[j];
                const p1Points = initialDistribution[p1Id] || 0;
                const p2Points = initialDistribution[p2Id] || 0;

                const affiliation = getParticipantAffiliations(p1Id, p2Id);
                const relKey = [p1Id, p2Id].sort().join('-');
                relationshipChanges[relKey] = relationshipChanges[relKey] || 0;

                let p1Multiplier = 1, p2Multiplier = 1;

                // Conflito
                if (p1Points > 0 && p2Points < 0 || p1Points < 0 && p2Points > 0) {
                    if (affiliation === 'amigos') { 
                        relationshipChanges[relKey] += RELATIONSHIP_POINT_VALUES.FRIENDLY_FIRE;
                        p1Multiplier = AFFILIATION_MULTIPLIERS.FRIENDLY_FIRE;
                        p2Multiplier = AFFILIATION_MULTIPLIERS.FRIENDLY_FIRE;
                    }
                    if (affiliation === 'rivais') {
                        relationshipChanges[relKey] += RELATIONSHIP_POINT_VALUES.RIVAL_HARM;
                        p1Multiplier = AFFILIATION_MULTIPLIERS.RIVAL_HARM;
                        p2Multiplier = AFFILIATION_MULTIPLIERS.RIVAL_HARM;
                    }
                }
                // Cooperação
                else if (p1Points > 0 && p2Points > 0) {
                    if (affiliation === 'amigos') {
                        relationshipChanges[relKey] += RELATIONSHIP_POINT_VALUES.ALLY_AID;
                        p1Multiplier = AFFILIATION_MULTIPLIERS.ALLY_BOOST;
                        p2Multiplier = AFFILIATION_MULTIPLIERS.ALLY_BOOST;
                    }
                    if (affiliation === 'rivais') {
                        relationshipChanges[relKey] += RELATIONSHIP_POINT_VALUES.UNEXPECTED_AID;
                        p1Multiplier = AFFILIATION_MULTIPLIERS.UNEXPECTED_AID;
                        p2Multiplier = AFFILIATION_MULTIPLIERS.UNEXPECTED_AID;
                    }
                }
                 // Interação neutra ou outras combinações
                else {
                    relationshipChanges[relKey] += RELATIONSHIP_POINT_VALUES.NEUTRAL_INTERACTION;
                }

                finalAuraDistribution[p1Id] += p1Points * p1Multiplier;
                finalAuraDistribution[p2Id] += p2Points * p2Multiplier;
            }
        }
        
        // Arredonda os valores finais
        for(const key in finalAuraDistribution) {
            finalAuraDistribution[key] = Math.round(finalAuraDistribution[key]);
        }
        
        return { finalAuraDistribution, relationshipChanges };
    }


    // --- [ATUALIZADO] Lógica da Timeline ---
    function handleUpdateTimeline() {
        if (!currentSelectedSituationId) return;

        const { finalAuraDistribution, relationshipChanges } = calculateEventOutcome();
        
        const eventData = {
            categoryId: situationCategorySelect.value,
            situationId: currentSelectedSituationId,
            roleAssignments: currentRoleAssignments,
            auraDistribution: finalAuraDistribution,
            relationshipChanges: relationshipChanges
        };

        if (editingEventId) {
            currentTimeline = currentTimeline.map(e => e.id === editingEventId ? { ...e, ...eventData } : e);
        } else {
            currentTimeline.push({ id: 'evt_' + Date.now(), ...eventData });
        }

        renderTimeline();
        resetEventCreator();
    }
    
    // --- [ATUALIZADO] Lógica de Arquivamento e Eliminação ---
    function toggleArchiveCaso(casoId) {
        const data = window.getOcasoData();
        const caso = data.casos.find(c => c.id === casoId);
        if (!caso) return;

        const isNowArchived = !caso.isArchived;

        (caso.timeline || []).forEach(event => {
            // Aplicar/Reverter Aura
            Object.entries(event.auraDistribution).forEach(([pId, points]) => {
                const person = data.pessoas.find(p => p.id === pId);
                if (person) {
                    person.aura = (person.aura || 0) + (isNowArchived ? points : -points);
                }
            });
            // Aplicar/Reverter Relação
            Object.entries(event.relationshipChanges).forEach(([relKey, points]) => {
                data.relacionamentos[relKey] = (data.relacionamentos[relKey] || 0) + (isNowArchived ? points : -points);
            });
        });
        
        caso.isArchived = isNowArchived;
        window.saveOcasoData(data);
        initializeCasos();
        if (typeof window.initializePessoasSection === 'function') window.initializePessoasSection();
        if (typeof window.initializeConexoesSection === 'function') window.initializeConexoesSection();
    }
    
    function deleteCaso(casoId){
        const data = window.getOcasoData();
        const caso = data.casos.find(c => c.id === casoId);
        if (!caso) return;
        
        if (!confirm(`Tem a certeza que deseja eliminar o caso "${caso.title}"?`)) return;

        if(caso.isArchived){
            (caso.timeline || []).forEach(event => {
                 Object.entries(event.auraDistribution).forEach(([pId, points]) => {
                    const person = data.pessoas.find(p => p.id === pId);
                    if (person) person.aura = (person.aura || 0) - points;
                });
                Object.entries(event.relationshipChanges).forEach(([relKey, points]) => {
                    data.relacionamentos[relKey] = (data.relacionamentos[relKey] || 0) - points;
                });
            });
        }
        
        data.casos = data.casos.filter(c => c.id !== casoId);
        window.saveOcasoData(data);
        initializeCasos();
    }

    function handleCasoFormSubmit(event) {
        event.preventDefault();
        if (currentSelectedSituationId) {
            handleUpdateTimeline();
        }
        const data = window.getOcasoData();
        const casoData = {
            title: casoTitleInput.value,
            participants: selectedParticipants.map(p => p.id),
            description: casoDescriptionInput.value,
            links: casoLinksInput.value.split(',').map(link => link.trim()).filter(Boolean),
            timeline: currentTimeline,
        };
        if (editingCasoId) {
            const casoIndex = data.casos.findIndex(c => c.id === editingCasoId);
            if (casoIndex > -1) { data.casos[casoIndex] = { ...data.casos[casoIndex], ...casoData }; }
        } else {
            const newCaso = { id: 'caso_' + Date.now(), createdAt: new Date().toISOString(), isArchived: false, ...casoData };
            data.casos.push(newCaso);
        }
        window.saveOcasoData(data);
        initializeCasos();
        resetCasoForm();
    }

    function editCaso(casoId) {
        const caso = ocasoData.casos.find(c => c.id === casoId);
        if (!caso) return;
        editingCasoId = casoId;
        formTitle.textContent = "Editar Caso";
        casoTitleInput.value = caso.title;
        casoDescriptionInput.value = caso.description;
        casoLinksInput.value = (caso.links || []).join(', ');
        selectedParticipants = (caso.participants || []).map(pID => ocasoData.pessoas.find(p => p.id === pID)).filter(Boolean);
        currentTimeline = JSON.parse(JSON.stringify(caso.timeline || []));
        casoFormContainer.style.display = 'block';
        renderSelectedParticipants();
        renderTimeline();
        resetEventCreator();
        window.scrollTo(0, 0);
    }

    function handleParticipantSearch() {
        const searchTerm = participantSearchInput.value.toLowerCase();
        participantSearchResults.innerHTML = '';
        if (searchTerm.length < 2) return;
        const filteredPessoas = ocasoData.pessoas.filter(p => !selectedParticipants.some(sp => sp.id === p.id) && (p.artisticName.toLowerCase().includes(searchTerm) || (p.realName && p.realName.toLowerCase().includes(searchTerm))));
        filteredPessoas.slice(0, 5).forEach(pessoa => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `<img src="${pessoa.photo}" alt="${pessoa.artisticName}"><div class="info"><strong>${pessoa.artisticName}</strong><small>${pessoa.realName || ''}</small></div>`;
            item.addEventListener('click', () => addParticipant(pessoa));
            participantSearchResults.appendChild(item);
        });
    }

    function addParticipant(pessoa) { if (!selectedParticipants.some(p => p.id === pessoa.id)) { selectedParticipants.push(pessoa); } participantSearchInput.value = ''; participantSearchResults.innerHTML = ''; renderSelectedParticipants(); }
    function removeParticipant(pessoaId) { selectedParticipants = selectedParticipants.filter(p => p.id !== pessoaId); Object.keys(currentRoleAssignments).forEach(roleId => { currentRoleAssignments[roleId] = currentRoleAssignments[roleId].filter(id => id !== pessoaId); }); renderSelectedParticipants(); updateAuraCalculatorUI(); }
    function removeEventFromTimeline(eventId) { currentTimeline = currentTimeline.filter(event => event.id !== eventId); if(editingEventId === eventId) resetEventCreator(); renderTimeline(); }
    
    function loadEventForEditing(eventId) {
        const eventToEdit = currentTimeline.find(e => e.id === eventId);
        if (!eventToEdit) return;
        editingEventId = eventId;
        situationCategorySelect.value = eventToEdit.categoryId;
        updateAuraCalculatorUI();
        currentSelectedSituationId = eventToEdit.situationId;
        currentRoleAssignments = JSON.parse(JSON.stringify(eventToEdit.roleAssignments));
        updateAuraCalculatorUI(); 
        continueCasoBtn.innerHTML = '<i class="fas fa-check"></i> Atualizar Evento';
    }

    function renderTimeline() {
        if (!casoTimelineContainer) return;
        casoTimelineContainer.innerHTML = '';
        currentTimeline.forEach(event => {
            const category = ocasoData.eventCategories.find(c => c.id === event.categoryId);
            const situation = category?.situations.find(s => s.id === event.situationId);
            if (!category || !situation) return;
            const item = document.createElement('div');
            item.className = 'timeline-event-item';
            const participantsInEventHTML = Object.entries(event.auraDistribution).map(([pId, points]) => {
                const person = ocasoData.pessoas.find(p => p.id === pId);
                if (!person || points === 0) return '';
                const pointsClass = points > 0 ? 'positive' : 'negative';
                return `<div class="aura-result-item"><div class="person"><img src="${person.photo}"><span>${person.artisticName}</span></div><div class="points ${pointsClass}"><span>${points > 0 ? '+' : ''}${points}</span><i class="fas fa-bolt"></i></div></div>`;
            }).join('');
            item.innerHTML = `<div class="timeline-item-header"><h5>${situation.name} <span class="category-name">(${category.name})</span></h5><div class="actions"><button type="button" class="icon-button edit-event-btn" data-event-id="${event.id}"><i class="fas fa-edit"></i></button><button type="button" class="icon-button delete-event-btn" data-event-id="${event.id}"><i class="fas fa-trash"></i></button></div></div><div class="timeline-item-body">${participantsInEventHTML || '<p>Nenhuma alteração de Aura neste evento.</p>'}</div>`;
            casoTimelineContainer.appendChild(item);
        });
        rebindTimelineActionButtons();
    }

    function rebindTimelineActionButtons() { document.querySelectorAll('.delete-event-btn').forEach(b => b.onclick = () => removeEventFromTimeline(b.dataset.eventId)); document.querySelectorAll('.edit-event-btn').forEach(b => b.onclick = () => loadEventForEditing(b.dataset.eventId)); }
    function populateCategoryDropdown() { if (!situationCategorySelect) return; situationCategorySelect.innerHTML = '<option value="selecionar">-- Selecionar Categoria --</option>'; ocasoData.eventCategories.forEach(cat => { const o = document.createElement('option'); o.value = cat.id; o.textContent = cat.name; situationCategorySelect.appendChild(o); }); }
    
    function updateAuraCalculatorUI() {
        if (!situationCategorySelect) return;
        const categoryId = situationCategorySelect.value;
        const category = ocasoData.eventCategories.find(cat => cat.id === categoryId);
        if (!category || categoryId === 'selecionar') { auraCalculatorSection.style.display = 'none'; if(continueCasoBtn) continueCasoBtn.style.display = 'none'; return; }
        auraCalculatorSection.style.display = 'block';
        roleAssignmentSection.style.display = 'grid';
        if(continueCasoBtn) continueCasoBtn.style.display = 'inline-flex';
        subSituationsContainer.innerHTML = (category.situations || []).map(e => `<button type="button" class="situation-card ${currentSelectedSituationId === e.id ? 'selected' : ''}" data-id="${e.id}"><strong>${e.name}</strong><span>${e.points > 0 ? '+' : ''}${e.points} <i class="fas fa-bolt"></i></span></button>`).join('');
        roleAssignmentSection.innerHTML = (category.roles || []).map(r => `<div class="role-column"><label>${r.name} (x${r.multiplier})</label><div class="role-selector" data-role-id="${r.id}"></div></div>`).join('');
        addSituationCardListeners(); addDropzoneListeners(); populateRoleSelectors(); calculateAndPreviewAura();
    }
    
    function addSituationCardListeners() { document.querySelectorAll('.situation-card').forEach(c => c.onclick = () => { currentSelectedSituationId = c.classList.contains('selected') ? null : c.dataset.id; updateAuraCalculatorUI(); }); }
    
    function calculateAndPreviewAura() { const { finalAuraDistribution } = calculateEventOutcome(); renderAuraPreview(finalAuraDistribution); }
    
    function renderAuraPreview(distribution) {
        if (!auraResultsPreview) return;
        auraResultsPreview.innerHTML = '';
        if (!currentSelectedSituationId) { auraResultsPreview.innerHTML = '<p>Selecione uma situação e atribua papéis para ver o resultado.</p>'; return; }
        let hasContent = false;
        Object.entries(distribution).forEach(([personId, points]) => {
            const person = ocasoData.pessoas.find(p => p.id === personId);
            if (!person || (points === 0 && !Object.values(currentRoleAssignments).flat().includes(personId))) return;
            hasContent = true;
            const item = document.createElement('div'); item.className = 'aura-result-item';
            const pointsClass = points > 0 ? 'positive' : (points < 0 ? 'negative' : 'neutral');
            item.innerHTML = `<div class="person"><img src="${person.photo}" alt="${person.artisticName}"><span>${person.artisticName}</span></div><div class="points ${pointsClass}"><span>${points > 0 ? '+' : ''}${points}</span><i class="fas fa-bolt"></i></div>`;
            auraResultsPreview.appendChild(item);
        });
        if (!hasContent) { auraResultsPreview.innerHTML = '<p>Atribua papéis para ver a distribuição de pontos.</p>'; }
    }

    function renderCasosLists() {
        if (!casosAtuaisList || !casosArquivoList) return;
        casosAtuaisList.innerHTML = ''; casosArquivoList.innerHTML = '';
        if (ocasoData.casos.length === 0) { casosAtuaisList.innerHTML = '<p class="empty-list-message">Nenhum caso criado ainda.</p>'; }
        ocasoData.casos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(caso => {
            const casoCard = createCasoCard(caso);
            (caso.isArchived ? casosArquivoList : casosAtuaisList).appendChild(casoCard);
        });
        if (casosAtuaisList.innerHTML === '') casosAtuaisList.innerHTML = '<p class="empty-list-message">Não há casos ativos.</p>';
        if (casosArquivoList.innerHTML === '') casosArquivoList.innerHTML = '<p class="empty-list-message">Não há casos arquivados.</p>';
    }
    
    function createCasoCard(caso) {
        const card = document.createElement('div');
        card.className = 'ocaso-card caso-card';
        const participantsData = (caso.participants || []).map(pID => ocasoData.pessoas.find(p => p.id === pID)).filter(Boolean);
        let totalAuraForCaso = {};
        (caso.timeline || []).forEach(event => {
            Object.entries(event.auraDistribution).forEach(([pId, points]) => {
                totalAuraForCaso[pId] = (totalAuraForCaso[pId] || 0) + points;
            });
        });
        let participantsHTML = participantsData.map(p => {
            const currentAura = p.aura || 0;
            const pointsChange = totalAuraForCaso[p.id] || 0;
            const auraBefore = caso.isArchived ? (currentAura - pointsChange) : currentAura;
            const displayPointsChange = caso.isArchived ? 0 : pointsChange;
            const changeClass = displayPointsChange > 0 ? 'positive' : (displayPointsChange < 0 ? 'negative' : 'neutral');
            return `<div class="participant-aura-preview"><img src="${p.photo}" alt="${p.artisticName}" title="${p.artisticName}"><div class="aura-details"><strong>${p.artisticName}</strong><span>Aura: ${auraBefore}</span><span class="change ${changeClass}">(${displayPointsChange > 0 ? '+' : ''}${displayPointsChange})</span></div></div>`;
        }).join('');
        card.innerHTML = `<div class="caso-card-header"><div class="caso-card-title"><h3>${caso.title}</h3><span class="caso-card-date">${new Date(caso.createdAt).toLocaleDateString('pt-PT')}</span></div></div><div class="caso-card-body"><div class="caso-card-participants-preview">${participantsHTML}</div></div><div class="caso-card-footer"><button class="action-button-redesigned tertiary analyse-btn">Analisar</button><button class="action-button-redesigned secondary archive-btn">${caso.isArchived ? 'Desarquivar' : 'Arquivar'}</button><div class="footer-actions"><button class="icon-button edit-btn"><i class="fas fa-edit"></i></button><button class="icon-button delete-btn"><i class="fas fa-trash"></i></button></div></div>`;
        card.querySelector('.edit-btn').addEventListener('click', () => editCaso(caso.id));
        card.querySelector('.delete-btn').addEventListener('click', () => deleteCaso(caso.id));
        card.querySelector('.archive-btn').addEventListener('click', () => toggleArchiveCaso(caso.id));
        card.querySelector('.analyse-btn').addEventListener('click', () => { if (typeof window.launchAnalysis === 'function') window.launchAnalysis(caso.id); });
        return card;
    }
    
    function renderSelectedParticipants() { if (selectedParticipantsGrid) { selectedParticipantsGrid.innerHTML = ''; selectedParticipants.forEach(p => { selectedParticipantsGrid.appendChild(createParticipantPill(p, true, true)); }); } }
    function createParticipantPill(pessoa, isDraggable, showRemoveBtn) { const pill = document.createElement('div'); pill.className = 'participant-pill'; pill.dataset.personId = pessoa.id; pill.innerHTML = `<img src="${pessoa.photo}" alt="${pessoa.artisticName}"><span>${pessoa.artisticName}</span>`; if (isDraggable) { pill.draggable = true; pill.addEventListener('dragstart', handleDragStart); pill.addEventListener('dragend', handleDragEnd); } if (showRemoveBtn) { const btn = document.createElement('button'); btn.className = 'remove-pill-btn'; btn.innerHTML = '&times;'; btn.onclick = () => removeParticipant(pessoa.id); pill.appendChild(btn); } return pill; }
    function resetCasoForm() { if(casoForm) casoForm.reset(); editingCasoId = null; selectedParticipants = []; currentTimeline = []; renderSelectedParticipants(); renderTimeline(); resetEventCreator(); if(casoFormContainer) casoFormContainer.style.display = 'none'; }
    function resetEventCreator() { editingEventId = null; currentSelectedSituationId = null; currentRoleAssignments = {}; if(situationCategorySelect) situationCategorySelect.value = "selecionar"; updateAuraCalculatorUI(); if(continueCasoBtn) { continueCasoBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar à Timeline'; continueCasoBtn.style.display = 'none'; } }
    let draggedPill = null;
    function handleDragStart(e) { draggedPill = e.target.closest('.participant-pill'); setTimeout(() => draggedPill.classList.add('dragging'), 0); e.dataTransfer.setData('text/plain', draggedPill.dataset.personId); }
    function handleDragEnd() { if(draggedPill) draggedPill.classList.remove('dragging'); draggedPill = null; }
    function addDropzoneListeners() { document.querySelectorAll('.role-selector, #caso-selected-participants').forEach(z => { z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drag-over'); }); z.addEventListener('dragleave', () => z.classList.remove('drag-over')); z.addEventListener('drop', handleDrop); }); }
    function handleDrop(e) { e.preventDefault(); const t = e.currentTarget; if(!t || !draggedPill) return; t.classList.remove('drag-over'); const pId = e.dataTransfer.getData('text/plain'); if (!pId) return; const rId = t.dataset.roleId; Object.keys(currentRoleAssignments).forEach(rid => { currentRoleAssignments[rid] = (currentRoleAssignments[rid] || []).filter(id => id !== pId); }); if (rId) { if (!currentRoleAssignments[rId]) currentRoleAssignments[rId] = []; if (!currentRoleAssignments[rId].includes(pId)) currentRoleAssignments[rId].push(pId); } populateRoleSelectors(); calculateAndPreviewAura(); }
    function populateRoleSelectors() { document.querySelectorAll('.role-selector').forEach(s => s.innerHTML = ''); Object.entries(currentRoleAssignments).forEach(([rId, pIds]) => { const s = document.querySelector(`.role-selector[data-role-id="${rId}"]`); if (!s) return; (pIds || []).forEach(pId => { const p = selectedParticipants.find(p => p.id === pId); if(p) s.appendChild(createParticipantPill(p, true, false)); }); }); }
    function addEventListenersCasos() { if (addCasoBtn) addCasoBtn.addEventListener('click', () => { resetCasoForm(); if(casoFormContainer) casoFormContainer.style.display = 'block'; }); if (cancelCasoBtn) cancelCasoBtn.addEventListener('click', resetCasoForm); if (continueCasoBtn) continueCasoBtn.addEventListener('click', handleUpdateTimeline); if (casoForm) casoForm.addEventListener('submit', handleCasoFormSubmit); if (participantSearchInput) participantSearchInput.addEventListener('input', handleParticipantSearch); contentTabs.forEach(t => t.onclick = () => { contentTabs.forEach(tb => tb.classList.remove('active')); t.classList.add('active'); tabContents.forEach(c => c.classList.remove('active')); document.getElementById(t.dataset.target)?.classList.add('active'); }); if(situationCategorySelect) situationCategorySelect.onchange = updateAuraCalculatorUI; addDropzoneListeners(); }
    window.initializeCasosSection = initializeCasos;
});

