// ocaso-grupos.js - Lógica para a nova secção de Gestão de Grupos

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos ---
    const addGrupoBtn = document.getElementById('add-grupo-btn');
    const grupoFormContainer = document.querySelector('.grupo-form-container');
    const grupoForm = document.getElementById('grupo-form');
    const cancelGrupoBtn = document.getElementById('cancel-grupo-btn');
    const formTitle = document.getElementById('grupo-form-title');
    const gruposListContainer = document.getElementById('grupos-list-container');

    // Campos do formulário
    const grupoNameInput = document.getElementById('grupo-name-input');
    const grupoTypeSelect = document.getElementById('grupo-type-select');
    const memberSearchInput = document.getElementById('grupo-member-search');
    const memberSearchResults = document.getElementById('grupo-member-search-results');
    const selectedMembersGrid = document.getElementById('grupo-selected-members');

    // --- Estado da Aplicação ---
    let ocasoPessoas = [];
    let ocasoGrupos = [];
    let selectedMembers = [];
    let editingGrupoId = null;

    function initializeGruposSection() {
        const data = window.getOcasoData();
        ocasoPessoas = data.pessoas || [];
        ocasoGrupos = data.grupos || [];
        
        addEventListenersGrupos();
        renderGruposList();
    }

    // --- Lógica de Dados (CRUD) ---
    function handleGrupoFormSubmit(event) {
        event.preventDefault();
        const data = window.getOcasoData();

        const grupoData = {
            name: grupoNameInput.value,
            type: grupoTypeSelect.value,
            members: selectedMembers.map(p => p.id)
        };

        if (editingGrupoId) {
            const grupoIndex = data.grupos.findIndex(g => g.id === editingGrupoId);
            if (grupoIndex > -1) {
                data.grupos[grupoIndex] = { ...data.grupos[grupoIndex], ...grupoData };
            }
        } else {
            const newGrupo = {
                id: 'grupo_' + Date.now(),
                ...grupoData
            };
            data.grupos.push(newGrupo);
        }

        window.saveOcasoData(data);
        initializeGruposSection();
        resetGrupoForm();
    }

    function deleteGrupo(grupoId) {
        // Adicionar confirmação se necessário
        const data = window.getOcasoData();
        data.grupos = data.grupos.filter(g => g.id !== grupoId);
        window.saveOcasoData(data);
        initializeGruposSection();
    }

    function editGrupo(grupoId) {
        const grupo = ocasoGrupos.find(g => g.id === grupoId);
        if (!grupo) return;

        editingGrupoId = grupoId;
        formTitle.textContent = "Editar Grupo";
        
        grupoNameInput.value = grupo.name;
        grupoTypeSelect.value = grupo.type;

        selectedMembers = (grupo.members || []).map(pID => ocasoPessoas.find(p => p.id === pID)).filter(Boolean);
        
        renderSelectedMembers();
        grupoFormContainer.style.display = 'block';
        window.scrollTo(0, 0);
    }

    // --- Lógica de Membros ---
    function handleMemberSearch() {
        const searchTerm = memberSearchInput.value.toLowerCase();
        memberSearchResults.innerHTML = '';
        if (searchTerm.length < 2) return;

        const filteredPessoas = ocasoPessoas.filter(p => 
            !selectedMembers.some(sm => sm.id === p.id) &&
            (p.artisticName.toLowerCase().includes(searchTerm) || (p.realName && p.realName.toLowerCase().includes(searchTerm)))
        );

        filteredPessoas.slice(0, 5).forEach(pessoa => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `<img src="${pessoa.photo}" alt="${pessoa.artisticName}"><div class="info"><strong>${pessoa.artisticName}</strong><small>${pessoa.realName || ''}</small></div>`;
            item.addEventListener('click', () => addMember(pessoa));
            memberSearchResults.appendChild(item);
        });
    }

    function addMember(pessoa) {
        if (!selectedMembers.some(p => p.id === pessoa.id)) {
            selectedMembers.push(pessoa);
        }
        memberSearchInput.value = '';
        memberSearchResults.innerHTML = '';
        renderSelectedMembers();
    }

    function removeMember(pessoaId) {
        selectedMembers = selectedMembers.filter(p => p.id !== pessoaId);
        renderSelectedMembers();
    }

    function renderSelectedMembers() {
        selectedMembersGrid.innerHTML = '';
        selectedMembers.forEach(p => {
            const pill = document.createElement('div');
            pill.className = 'participant-pill';
            pill.innerHTML = `<img src="${p.photo}" alt="${p.artisticName}"><span>${p.artisticName}</span><button type="button" class="remove-pill-btn">&times;</button>`;
            pill.querySelector('.remove-pill-btn').addEventListener('click', () => removeMember(p.id));
            selectedMembersGrid.appendChild(pill);
        });
    }

    // --- Funções de Renderização e UI ---
    function renderGruposList() {
        gruposListContainer.innerHTML = '';
        if (ocasoGrupos.length === 0) {
            gruposListContainer.innerHTML = '<p class="empty-list-message">Nenhum grupo criado. Crie um para começar a organizar as pessoas.</p>';
            return;
        }

        ocasoGrupos.forEach(grupo => {
            const grupoCard = createGrupoCard(grupo);
            gruposListContainer.appendChild(grupoCard);
        });
    }

    function createGrupoCard(grupo) {
        const card = document.createElement('div');
        card.className = 'ocaso-card grupo-card';
        card.dataset.type = grupo.type;

        const typeNames = {
            amigos: 'Grupo de Amigos',
            rivais: 'Grupo de Rivais',
            neutro: 'Neutro / Organização'
        };

        const membersData = (grupo.members || []).map(pID => ocasoPessoas.find(p => p.id === pID)).filter(Boolean);
        const membersHTML = membersData.map(p => 
            `<img src="${p.photo}" alt="${p.artisticName}" title="${p.artisticName}" class="member-avatar">`
        ).join('');

        card.innerHTML = `
            <div class="grupo-card-header">
                <div class="grupo-info">
                    <h3>${grupo.name}</h3>
                </div>
                <span class="grupo-type-tag type-${grupo.type}">${typeNames[grupo.type] || 'Desconhecido'}</span>
            </div>
            <div class="grupo-card-body">
                <h4>${membersData.length} Membros</h4>
                <div class="member-list">
                    ${membersHTML}
                </div>
            </div>
            <div class="grupo-card-footer">
                <button class="icon-button edit-btn"><i class="fas fa-edit"></i></button>
                <button class="icon-button delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;

        card.querySelector('.edit-btn').addEventListener('click', () => editGrupo(grupo.id));
        card.querySelector('.delete-btn').addEventListener('click', () => deleteGrupo(grupo.id));

        return card;
    }
    
    function resetGrupoForm() {
        grupoForm.reset();
        editingGrupoId = null;
        selectedMembers = [];
        renderSelectedMembers();
        formTitle.textContent = "Criar Novo Grupo";
        grupoFormContainer.style.display = 'none';
    }
    
    // --- Event Listeners ---
    function addEventListenersGrupos() {
        if (addGrupoBtn) {
            addGrupoBtn.addEventListener('click', () => {
                resetGrupoForm();
                grupoFormContainer.style.display = 'block';
            });
        }
        if (cancelGrupoBtn) {
            cancelGrupoBtn.addEventListener('click', resetGrupoForm);
        }
        if (grupoForm) {
            grupoForm.addEventListener('submit', handleGrupoFormSubmit);
        }
        if (memberSearchInput) {
            memberSearchInput.addEventListener('input', handleMemberSearch);
        }
    }

    // Disponibiliza a função de inicialização globalmente para ser chamada pelo ocaso-geral.js
    window.initializeGruposSection = initializeGruposSection;
});
