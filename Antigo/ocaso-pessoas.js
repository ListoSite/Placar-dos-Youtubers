// ocaso-pessoas.js - Lógica da Secção de Gestão de Pessoas (v5.2 - Otimização de Imagens e Notificações)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos ---
    const pessoasListContainer = document.getElementById('pessoas-list-container');
    const pessoaFormContainer = document.querySelector('.pessoa-form-container');
    const pessoaForm = document.getElementById('pessoa-form');
    const addPessoaBtn = document.getElementById('add-pessoa-btn');
    const cancelPessoaBtn = document.getElementById('cancel-pessoa-btn');
    const pessoaPhotoInput = document.getElementById('pessoa-photo-input');
    const pessoaPhotoPreview = document.getElementById('pessoa-photo-preview');
    const formTitle = document.querySelector('.pessoa-form-container h3');
    
    // Campos do formulário
    const artisticNameInput = document.getElementById('pessoa-artistic-name-input');
    const realNameInput = document.getElementById('pessoa-real-name-input');
    const dobInput = document.getElementById('pessoa-dob-input');
    const ageDisplay = document.getElementById('pessoa-age-display');
    const socialSelect = document.getElementById('pessoa-social-select');
    const youtuberSearchInput = document.getElementById('youtuber-link-search');
    const youtuberSearchResults = document.getElementById('youtuber-search-results');
    const youtuberLinkedProfile = document.getElementById('youtuber-linked-profile');
    const occupationGroup = document.getElementById('pessoa-occupation-group');
    const occupationSelect = document.getElementById('pessoa-occupation-select');

    // Elementos de Filtro e Busca
    const pessoaSearchInput = document.getElementById('pessoa-search-input');
    const pessoaSortSelect = document.getElementById('pessoa-sort-select');
    const pessoaSocialFilterSelect = document.getElementById('pessoa-social-filter-select');
    
    const defaultPersonPhoto = 'https://placehold.co/160x160/301934/EAE6F0?text=Foto';

    // --- Estado da Aplicação ---
    let placarData = [];
    let ocasoData = {};
    let linkedYoutuberProfile = null;
    let editingPessoaId = null;

    // [NOVO] Função de notificação copiada de ocaso-settings.js para ser usada localmente.
    function showNotification(message, type = 'success') {
        const existingNotification = document.querySelector('.ocaso-notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.className = `ocaso-notification ${type}`;
        notification.textContent = message;
        Object.assign(notification.style, {
            position: 'fixed', bottom: '20px', right: '20px', padding: '15px 25px', borderRadius: '8px',
            zIndex: '1001', fontFamily: "'Inter', sans-serif", fontWeight: '600', boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
            transition: 'opacity 0.5s, transform 0.5s ease-out', opacity: '0', transform: 'translateX(20px)',
            backgroundColor: type === 'success' ? 'var(--ocaso-sucesso, #20F0A0)' : 'var(--ocaso-erro, #F02050)',
            color: 'var(--ocaso-fundo, #121019)'
        });
        document.body.appendChild(notification);
        setTimeout(() => { notification.style.opacity = '1'; notification.style.transform = 'translateX(0)'; }, 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(20px)';
            setTimeout(() => notification.remove(), 500);
        }, 5000); // Aumentado o tempo para 5 segundos para dar tempo de ler
    }

    function initializePessoas() {
        placarData = typeof window.getData === 'function' ? window.getData() : [];
        ocasoData = window.getOcasoData();
        
        addEventListenersPessoas();
        renderFilteredPessoasList();
    }
    
    function handlePessoaFormSubmit(event) {
        event.preventDefault();
        const data = window.getOcasoData();

        const photoData = pessoaPhotoPreview.src.startsWith('data:image') ? pessoaPhotoPreview.src : null;
        
        // [CORREÇÃO] Substituído console.error por notificação visual para o utilizador.
        if(photoData && photoData.length > 500 * 1024) { 
            showNotification("A imagem é demasiado grande. Por favor, use uma mais pequena.", "error");
            return;
        }

        const pessoaDataObject = {
            artisticName: artisticNameInput.value,
            realName: realNameInput.value,
            dob: dobInput.value,
            mainSocial: socialSelect.value,
            occupation: socialSelect.value === 'outra' ? occupationSelect.value : null,
            linkedYoutuberId: linkedYoutuberProfile ? linkedYoutuberProfile.id : null,
            photo: photoData 
        };

        if (editingPessoaId) {
            const pessoaIndex = data.pessoas.findIndex(p => p.id === editingPessoaId);
            if (pessoaIndex > -1) {
                data.pessoas[pessoaIndex] = {
                    ...data.pessoas[pessoaIndex],
                    ...pessoaDataObject
                };
            }
        } else {
            const newPessoa = {
                id: 'pessoa_' + Date.now(),
                aura: 10,
                ...pessoaDataObject
            };
            data.pessoas.push(newPessoa);
        }

        window.saveOcasoData(data);
        initializePessoas();
        resetPessoaForm();
    }

    function deletePessoa(pessoaId) {
        const data = window.getOcasoData();
        const person = data.pessoas.find(p => p.id === pessoaId);
        if (!confirm(`Tem a certeza que deseja eliminar ${person.artisticName}? Esta ação também irá remover todas as suas afiliações e relações.`)) return;
        
        data.pessoas = data.pessoas.filter(p => p.id !== pessoaId);
        
        data.grupos.forEach(grupo => {
            grupo.members = (grupo.members || []).filter(memberId => memberId !== pessoaId);
        });
        
        Object.keys(data.relacionamentos).forEach(relKey => {
            if (relKey.includes(pessoaId)) {
                delete data.relacionamentos[relKey];
            }
        });
        
        data.casos.forEach(caso => {
            if (!caso.isArchived) {
                caso.participants = (caso.participants || []).filter(p => p !== pessoaId);
                (caso.timeline || []).forEach(evento => {
                    if (evento.auraDistribution && evento.auraDistribution[pessoaId]) delete evento.auraDistribution[pessoaId];
                    if (evento.roleAssignments) {
                        Object.keys(evento.roleAssignments).forEach(roleId => {
                            evento.roleAssignments[roleId] = (evento.roleAssignments[roleId] || []).filter(id => id !== pessoaId);
                        });
                    }
                });
            }
        });
    
        window.saveOcasoData(data);
        initializePessoas();
        if (typeof window.initializeCasosSection === 'function') window.initializeCasosSection();
        if (typeof window.initializeConexoesSection === 'function') window.initializeConexoesSection();
    }

    function editPessoa(pessoaId) {
        const pessoa = ocasoData.pessoas.find(p => p.id === pessoaId);
        if (!pessoa || !formTitle) return;

        editingPessoaId = pessoaId;

        formTitle.textContent = "Editar Pessoa";
        artisticNameInput.value = pessoa.artisticName || '';
        realNameInput.value = pessoa.realName || '';
        dobInput.value = pessoa.dob || '';
        socialSelect.value = pessoa.mainSocial || 'nenhuma';
        occupationSelect.value = pessoa.occupation || '';
        pessoaPhotoPreview.src = pessoa.photo || defaultPersonPhoto;
        
        if (pessoa.linkedYoutuberId) {
            const linkedProfile = placarData.find(p => p.id === pessoa.linkedYoutuberId);
            if(linkedProfile) linkYoutuberProfile(linkedProfile);
        } else {
            unlinkYoutuberProfile();
        }

        calculateAge(dobInput.value);
        toggleOccupationField();
        pessoaFormContainer.style.display = 'block';
        window.scrollTo(0, 0);
    }
    
    function getPersonAffiliations(pessoaId) {
        let friends = 0, rivals = 0;
        (ocasoData.grupos || []).forEach(grupo => {
            if (grupo.members.includes(pessoaId)) {
                if (grupo.type === 'amigos') friends += grupo.members.length - 1;
                else if (grupo.type === 'rivais') rivals += grupo.members.length - 1;
            }
        });
        return { friends, rivals };
    }

    function renderFilteredPessoasList() {
        if (!pessoaSearchInput || !pessoaSortSelect || !pessoaSocialFilterSelect) return;
        const searchTerm = pessoaSearchInput.value.toLowerCase();
        const sortOrder = pessoaSortSelect.value;
        const socialFilter = pessoaSocialFilterSelect.value;
        let pessoasFiltradas = [...(ocasoData.pessoas || [])];
        if (searchTerm) {
            pessoasFiltradas = pessoasFiltradas.filter(p => 
                (p.artisticName && p.artisticName.toLowerCase().includes(searchTerm)) ||
                (p.realName && p.realName.toLowerCase().includes(searchTerm))
            );
        }
        if (socialFilter !== 'todos') {
            pessoasFiltradas = pessoasFiltradas.filter(p => p.mainSocial === socialFilter);
        }
        switch (sortOrder) {
            case 'a-z': pessoasFiltradas.sort((a, b) => (a.artisticName || '').localeCompare(b.artisticName || '')); break;
            case 'z-a': pessoasFiltradas.sort((a, b) => (b.artisticName || '').localeCompare(a.artisticName || '')); break;
            case 'novo-antigo': pessoasFiltradas.sort((a, b) => new Date(b.dob) - new Date(a.dob)); break;
            case 'antigo-novo': pessoasFiltradas.sort((a, b) => new Date(a.dob) - new Date(b.dob)); break;
        }
        renderPessoasList(pessoasFiltradas);
    }

    function renderPessoasList(pessoas) {
        if (!pessoasListContainer) return;
        pessoasListContainer.innerHTML = '';
        if (pessoas.length === 0) {
            pessoasListContainer.innerHTML = '<p class="empty-list-message">Nenhuma pessoa encontrada.</p>';
            return;
        }
        const socialIcons = { youtube: 'fab fa-youtube', instagram: 'fab fa-instagram', tiktok: 'fab fa-tiktok', twitch: 'fab fa-twitch', outra: 'fas fa-user-tie', nenhuma: 'fas fa-question-circle' };
        pessoas.forEach(pessoa => {
            const { totalPoints, rank } = getAuraData(pessoa.id);
            const { friends, rivals } = getPersonAffiliations(pessoa.id);
            const affiliationHTML = `<div class="affiliation-summary"><div class="summary-item friends"><i class="fas fa-users"></i><span class="count">${friends}</span></div><div class="summary-item rivals"><i class="fas fa-user-ninja"></i><span class="count">${rivals}</span></div></div>`;
            const idade = pessoa.dob ? getAge(pessoa.dob) + ' anos' : 'Idade não definida';
            const socialIcon = socialIcons[pessoa.mainSocial] || socialIcons['nenhuma'];
            let socialText = pessoa.mainSocial ? (pessoa.mainSocial.charAt(0).toUpperCase() + pessoa.mainSocial.slice(1)) : 'Nenhuma';
            if (pessoa.mainSocial === 'outra') socialText = pessoa.occupation || 'Outra';
            let linkedProfileHTML = '<p><i class="fas fa-link icon"></i>Não associado</p>';
            if (pessoa.linkedYoutuberId) {
                const linkedProfile = placarData.find(p => p.id === pessoa.linkedYoutuberId);
                linkedProfileHTML = linkedProfile ? `<p class="linked"><i class="fas fa-link icon"></i>Associado a: <strong>${linkedProfile.name}</strong></p>` : `<p class="unlinked"><i class="fas fa-link icon"></i>Perfil associado não encontrado</p>`;
            }
            const card = document.createElement('div');
            card.className = 'ocaso-card pessoa-card-v2';
            card.innerHTML = `
                <div class="pessoa-card-header">
                    <img src="${pessoa.photo || defaultPersonPhoto}" alt="Foto de ${pessoa.artisticName}" class="person-photo">
                    <div class="person-info">
                        <h4>${pessoa.artisticName || 'Nome não especificado'}</h4>
                        <p>${pessoa.realName || 'Nome não especificado'}</p>
                    </div>
                    <div class="person-actions">
                         <button class="icon-button edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
                         <button class="icon-button delete-btn" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="pessoa-card-body">
                     <div class="aura-info">
                        <div class="aura-display">
                            <span class="points">${totalPoints} <i class="fas fa-bolt"></i></span>
                        </div>
                        <span class="aura-rank rank-${rank.id}">${rank.name}</span>
                    </div>
                    <div class="details-grid">
                        <p><i class="fas fa-birthday-cake icon"></i>${idade}</p>
                        <p><i class="${socialIcon} icon"></i>${socialText}</p>
                    </div>
                    ${affiliationHTML}
                    ${linkedProfileHTML}
                </div>
                <div class="pessoa-card-footer">
                    <button class="action-button-redesigned tertiary view-relations-btn" data-person-id="${pessoa.id}">Analisar Relações</button>
                </div>`;
            card.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); editPessoa(pessoa.id); });
            card.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deletePessoa(pessoa.id); });
            card.querySelector('.view-relations-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof window.navigateToSection === 'function') {
                    window.navigateToSection('section-conexoes');
                    setTimeout(() => { if (typeof window.analyzePersonInConnections === 'function') window.analyzePersonInConnections(e.currentTarget.dataset.personId); }, 150);
                }
            });
            pessoasListContainer.appendChild(card);
        });
    }

    function resetPessoaForm() {
        if(pessoaForm) pessoaForm.reset();
        editingPessoaId = null;
        if(formTitle) formTitle.textContent = "Adicionar Nova Pessoa";
        if(pessoaPhotoPreview) pessoaPhotoPreview.src = defaultPersonPhoto;
        if(ageDisplay) ageDisplay.textContent = '--';
        unlinkYoutuberProfile();
        toggleOccupationField();
        if(pessoaFormContainer) pessoaFormContainer.style.display = 'none';
    }

    function getAuraData(pessoaId) {
        const pessoa = ocasoData.pessoas.find(p => p.id === pessoaId);
        if (!pessoa) return { totalPoints: 0, rank: getAuraRank(0) };
        const totalPoints = pessoa.aura || 0;
        const rank = getAuraRank(totalPoints);
        return { totalPoints, rank };
    }

    function getAuraRank(points) {
        if (points >= 95) return { id: 'angel', name: 'Anjo' };
        if (points >= 50) return { id: 'very-good', name: 'Muito Boa' };
        if (points >= 20) return { id: 'good', name: 'Boa' };
        if (points > -20) return { id: 'neutral', name: 'Neutra' };
        if (points > -50) return { id: 'bad', name: 'Má' };
        if (points > -85) return { id: 'very-bad', name: 'Muito Má' };
        return { id: 'demon', name: 'Demónio' };
    }

    function getAge(dobString) {
        if (!dobString) return '--';
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age >= 0 ? age : '--';
    }

    function calculateAge(dobString) { if(ageDisplay) ageDisplay.textContent = getAge(dobString) !== '--' ? `${getAge(dobString)} anos` : '--'; }
    function toggleOccupationField() { if(occupationGroup && socialSelect) occupationGroup.style.display = (socialSelect.value === 'outra') ? 'block' : 'none'; }
    
    function handleYoutuberSearch() {
        const searchTerm = youtuberSearchInput.value.toLowerCase();
        youtuberSearchResults.innerHTML = '';
        if (searchTerm.length < 2) return;
        const filteredYoutubers = placarData.filter(p => p.name.toLowerCase().includes(searchTerm));
        filteredYoutubers.slice(0, 5).forEach(profile => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `<img src="${profile.photo || 'https://placehold.co/40x40/301934/EAE6F0?text=?'}" alt="Foto de ${profile.name}"><div class="info"><strong>${profile.name}</strong><small>${profile.contentType || 'Sem categoria'}</small></div>`;
            item.addEventListener('click', () => linkYoutuberProfile(profile));
            youtuberSearchResults.appendChild(item);
        });
    }

    function linkYoutuberProfile(profile) { linkedYoutuberProfile = profile; renderLinkedProfile(); }
    function unlinkYoutuberProfile() { linkedYoutuberProfile = null; renderLinkedProfile(); }
    function renderLinkedProfile() {
        if (!youtuberLinkedProfile || !youtuberSearchInput) return;
        youtuberLinkedProfile.innerHTML = '';
        youtuberSearchInput.value = '';
        youtuberSearchInput.style.display = linkedYoutuberProfile ? 'none' : 'block';
        youtuberSearchResults.innerHTML = '';
        if (linkedYoutuberProfile) {
            const card = document.createElement('div');
            card.className = 'linked-profile-card';
            card.innerHTML = `<img src="${linkedYoutuberProfile.photo}" alt="Foto de ${linkedYoutuberProfile.name}"><div class="linked-profile-info"><strong>${linkedYoutuberProfile.name}</strong><small>Perfil do Placar associado</small></div><button type="button" class="icon-button" id="unlink-yt-btn" title="Desassociar Perfil"><i class="fas fa-times-circle"></i></button>`;
            youtuberLinkedProfile.appendChild(card);
            document.getElementById('unlink-yt-btn').addEventListener('click', unlinkYoutuberProfile);
        }
    }
    
    // [CORREÇÃO] Redimensiona a imagem para ser mais pequena e com mais compressão para evitar exceder a quota.
    function resizeImage(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 160; // Reduzido de 300 para 160
                const MAX_HEIGHT = 160; // Reduzido de 300 para 160
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.7)); // Qualidade reduzida para 0.7
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function addEventListenersPessoas() {
        if (addPessoaBtn) addPessoaBtn.addEventListener('click', () => { resetPessoaForm(); if(pessoaFormContainer) pessoaFormContainer.style.display = 'block'; });
        if (cancelPessoaBtn) cancelPessoaBtn.addEventListener('click', resetPessoaForm);
        if (pessoaForm) pessoaForm.addEventListener('submit', handlePessoaFormSubmit);
        if (pessoaPhotoInput) {
            pessoaPhotoInput.addEventListener('change', () => {
                const file = pessoaPhotoInput.files[0];
                if (file) {
                    resizeImage(file, (resizedDataUrl) => {
                         if(pessoaPhotoPreview) pessoaPhotoPreview.src = resizedDataUrl;
                    });
                } else {
                    if(pessoaPhotoPreview) pessoaPhotoPreview.src = defaultPersonPhoto;
                }
            });
        }
        if (dobInput) dobInput.addEventListener('change', () => calculateAge(dobInput.value));
        if (youtuberSearchInput) youtuberSearchInput.addEventListener('input', handleYoutuberSearch);
        if (socialSelect) socialSelect.addEventListener('change', toggleOccupationField);
        if (pessoaSearchInput) pessoaSearchInput.addEventListener('input', renderFilteredPessoasList);
        if (pessoaSortSelect) pessoaSortSelect.addEventListener('change', renderFilteredPessoasList);
        if (pessoaSocialFilterSelect) pessoaSocialFilterSelect.addEventListener('change', renderFilteredPessoasList);
    }

    window.initializePessoasSection = initializePessoas;
});
