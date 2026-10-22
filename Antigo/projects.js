// projects.js - Lógica para a gestão de Projetos (Versão 3.8 - Compressão Final)

document.addEventListener('DOMContentLoaded', () => {
    // --- Seleção dos Elementos do DOM ---
    const projectSection = document.getElementById('section-gerir-projetos');
    let projectForm, projectsListContainer, projectNameInput, projectEpisodesInput, projectViewsInput, 
        projectYearInput, projectDescriptionInput, projectPhotoInput, projectPhotoPreview, 
        projectCreatorInput, projectGuestsInput, projectDetailsModal, projectDetailsModalBody, 
        projectDetailsModalCloseBtn, projectConfirmModal, projectConfirmYesBtn, projectConfirmNoBtn, 
        projectSearchInput, projectSortButtons, addProjectBtn, projectFormModal, projectFormModalCloseBtn,
        projectFormCancelBtn;

    // Novos elementos para avaliação
    let mainRatingStarsContainer, individualRatingNameInput, individualRatingStarsContainer,
        addIndividualRatingBtn, individualRatingsListContainer;

    let creatorSearchResults, selectedCreatorContainer, guestsSearchResults, selectedGuestsContainer;

    const defaultLogo = 'https://placehold.co/150x150/400414/a0a0a0?text=Logo';

    // --- Base de Dados e Estado ---
    let placarData = [];
    let currentlyEditingProjectId = null;
    let projectIdToDelete = null;
    let currentProjectCreator = null;
    let currentProjectGuests = [];
    let currentProjectSort = { key: 'year', direction: 'desc' };
    
    // Estado para as avaliações no formulário
    let currentMainRating = 0;
    let currentIndividualRatingValue = 0;
    let currentIndividualRatings = [];

    let isInitialized = false;

    // --- FUNÇÃO ATUALIZADA: Compressão ainda mais agressiva ---
    function compressImage(file, maxWidth = 150, maxHeight = 150, quality = 0.4) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    }

    // --- Funções Auxiliares ---
    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    function formatViews(viewsValue) {
        const num = parseViews(viewsValue);
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'K';
        return num.toString();
    }

    // --- Funções de Gestão de Dados ---
    function loadData() {
        placarData = window.getData();
        renderProjects();
    }

    // --- Funções de Renderização das Estrelas ---
    function createStarRatingHTML(rating = 0, maxStars = 10) {
        let starsHTML = '';
        for (let i = 1; i <= maxStars; i++) {
            starsHTML += `<i class="fas fa-star ${i <= rating ? 'filled' : ''}"></i>`;
        }
        return `<div class="star-rating">${starsHTML}</div>`;
    }
    
    // --- Funções de Renderização ---
    function renderProjects() {
        if (!projectsListContainer) return;
        
        const allProjects = placarData.flatMap(profile => profile.projects || []);
        const searchTerm = projectSearchInput ? projectSearchInput.value.toLowerCase() : '';
        let filteredProjects = allProjects.filter(project =>
            project.name.toLowerCase().includes(searchTerm)
        );

        filteredProjects.sort((a, b) => {
            let valA, valB;
            switch (currentProjectSort.key) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    return valA.localeCompare(valB);
                case 'views':
                    valA = parseViews(a.views);
                    valB = parseViews(b.views);
                    return valB - valA;
                case 'year':
                default:
                    valA = a.year || 0;
                    valB = b.year || 0;
                    return valB - valA;
            }
        });

        if (currentProjectSort.direction === 'asc') {
            filteredProjects.reverse();
        }

        projectsListContainer.innerHTML = '';
        if (filteredProjects.length === 0) {
            projectsListContainer.innerHTML = `<p class="empty-list-message">Nenhum projeto encontrado.</p>`;
            return;
        }

        filteredProjects.forEach(project => {
            const creatorName = project.creator ? project.creator.name : 'N/A';
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card';
            projectCard.setAttribute('data-id', project.id);
            projectCard.innerHTML = `
                <div class="project-card-header" style="background-image: url('${project.logo}')">
                    <div class="project-card-info">
                        <h4>${project.name}</h4>
                        <p>Criado por: <strong>${creatorName}</strong></p>
                    </div>
                </div>
                <div class="project-card-actions">
                    <button class="edit-btn" title="Editar Projeto"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" title="Eliminar Projeto"><i class="fas fa-trash"></i></button>
                </div>
                <div class="project-card-rating">
                    ${createStarRatingHTML(project.mainRating || 0)}
                </div>
                <div class="project-card-stats">
                     <span><i class="fas fa-film"></i> <span class="stat-value">${project.episodes}</span> Episódios</span>
                     <span><i class="fas fa-eye"></i> <span class="stat-value">${formatViews(project.views)}</span> Views</span>
                     <span><i class="fas fa-calendar-alt"></i> <span class="stat-value">${project.year}</span> Ano</span>
                </div>
            `;
            projectCard.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                showDetailsModal(project.id);
            });
            projectsListContainer.appendChild(projectCard);
        });
        
        addProjectCardEventListeners();
        updateProjectSortButtonsUI();
    }

    function updateProjectSortButtonsUI() {
        projectSortButtons.forEach(button => {
            const sortKey = button.dataset.sort;
            const icon = button.querySelector('i');
            button.classList.toggle('active', sortKey === currentProjectSort.key);
            if (sortKey === currentProjectSort.key) {
                icon.className = currentProjectSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    // --- Funções de Interação (Formulário, Modais) ---
    function handleFormSubmit(event) {
        event.preventDefault();

        let currentData = window.getData();

        if (currentlyEditingProjectId) {
            // Lógica para EDITAR um projeto existente
            let projectToUpdate = null;
            let originalProfile = null;

            // Encontra a referência ao objeto do projeto e ao seu perfil original
            for (const profile of currentData) {
                const project = (profile.projects || []).find(p => p.id === currentlyEditingProjectId);
                if (project) {
                    projectToUpdate = project;
                    originalProfile = profile;
                    break;
                }
            }

            if (projectToUpdate) {
                const creatorHasChanged = projectToUpdate.creator.id !== currentProjectCreator.id;

                // Atualiza o objeto do projeto diretamente com os novos valores
                projectToUpdate.name = projectNameInput.value;
                projectToUpdate.description = projectDescriptionInput.value;
                projectToUpdate.episodes = parseInt(projectEpisodesInput.value, 10) || 0;
                projectToUpdate.views = projectViewsInput.value;
                projectToUpdate.year = parseInt(projectYearInput.value, 10) || 0;
                projectToUpdate.logo = projectPhotoPreview.src;
                projectToUpdate.guests = [...currentProjectGuests];
                projectToUpdate.mainRating = currentMainRating;
                projectToUpdate.individualRatings = [...currentIndividualRatings];
                projectToUpdate.creator = currentProjectCreator;

                // Se o criador mudou, move o projeto para o novo criador
                if (creatorHasChanged) {
                    const projectIndex = originalProfile.projects.findIndex(p => p.id === currentlyEditingProjectId);
                    originalProfile.projects.splice(projectIndex, 1);

                    const newCreatorProfile = currentData.find(p => p.id === currentProjectCreator.id);
                    if (newCreatorProfile) {
                        if (!newCreatorProfile.projects) newCreatorProfile.projects = [];
                        newCreatorProfile.projects.push(projectToUpdate);
                    }
                }
            }
        } else {
            // Lógica para CRIAR um novo projeto
            if (!currentProjectCreator) {
                alert("É obrigatório selecionar um criador para o projeto.");
                return;
            }
            const projectData = {
                id: 'proj_' + Date.now(),
                name: projectNameInput.value,
                description: projectDescriptionInput.value,
                episodes: parseInt(projectEpisodesInput.value, 10) || 0,
                views: projectViewsInput.value,
                year: parseInt(projectYearInput.value, 10) || 0,
                logo: projectPhotoPreview.src,
                creator: currentProjectCreator,
                guests: [...currentProjectGuests],
                mainRating: currentMainRating,
                individualRatings: [...currentIndividualRatings]
            };
            const creatorProfile = currentData.find(p => p.id === currentProjectCreator.id);
            if (creatorProfile) {
                if (!creatorProfile.projects) creatorProfile.projects = [];
                creatorProfile.projects.push(projectData);
            }
        }
        
        window.saveData(currentData);
        loadData();
        closeModal();
    }

    function setupEditForm(projectId) {
        const allProjects = placarData.flatMap(p => p.projects || []);
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        resetForm();

        currentlyEditingProjectId = projectId;
        projectNameInput.value = project.name;
        projectDescriptionInput.value = project.description;
        projectEpisodesInput.value = project.episodes;
        projectViewsInput.value = project.views;
        projectYearInput.value = project.year;
        projectPhotoPreview.src = project.logo;
        currentProjectCreator = project.creator;
        currentProjectGuests = project.guests || [];
        
        currentMainRating = project.mainRating || 0;
        currentIndividualRatings = project.individualRatings || [];

        updateStarDisplay(mainRatingStarsContainer, currentMainRating);
        renderIndividualRatingsList();
        
        renderSelectedCreator();
        renderSelectedGuests();
        if (currentProjectCreator) projectCreatorInput.style.display = 'none';
        
        projectFormModal.querySelector('h3').textContent = 'Editar Projeto';
        projectForm.querySelector('.submit-button').textContent = 'Guardar Alterações';
        openModal(projectFormModal);
    }
    
    function resetForm() {
        if (!projectForm) return;
        projectForm.reset();
        projectPhotoPreview.src = defaultLogo;
        currentlyEditingProjectId = null;
        currentProjectCreator = null;
        currentProjectGuests = [];
        currentMainRating = 0;
        currentIndividualRatings = [];
        currentIndividualRatingValue = 0;

        updateStarDisplay(mainRatingStarsContainer, 0);
        updateStarDisplay(individualRatingStarsContainer, 0);
        renderIndividualRatingsList();

        renderSelectedCreator();
        renderSelectedGuests();
        projectCreatorInput.style.display = 'block';
        projectFormModal.querySelector('h3').textContent = 'Adicionar Novo Projeto';
        projectForm.querySelector('.submit-button').textContent = 'Criar Projeto';
    }

    function showDetailsModal(projectId) {
        const allProjects = placarData.flatMap(p => p.projects || []);
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;
        
        const creatorName = project.creator ? project.creator.name : 'Não definido';
        
        const guestsListHTML = project.guests && project.guests.length > 0
            ? project.guests.map(g => `<span class="guest-tag">${g.name}</span>`).join('')
            : '<p>Sem convidados registados.</p>';
        
        let individualRatingsHTML;
        if (project.individualRatings && project.individualRatings.length > 0) {
            // Se existem avaliações, mapeia-as para elementos HTML
            individualRatingsHTML = project.individualRatings.map(r => `
                <div class="individual-rating-item">
                    <span class="rating-name">${r.name}</span>
                    ${createStarRatingHTML(r.rating)}
                </div>
            `).join('');
        } else {
            // Se não existem, mostra a mensagem padrão
            individualRatingsHTML = '<p class="empty-list-message" style="text-align: left; padding: 0;">Sem avaliações individuais.</p>';
        }

        projectDetailsModalBody.innerHTML = `
            <div class="modal-details-main">
                <img src="${project.logo}" alt="Logo de ${project.name}" class="modal-details-photo" onerror="this.src='${defaultLogo}'">
                <div class="modal-details-info">
                    <h2 class="modal-details-name">${project.name}</h2>
                    <p class="modal-details-content-type">Ano de Lançamento: ${project.year}</p>
                     <div class="project-card-rating" style="margin-top: 1rem; text-align: left;">
                        ${createStarRatingHTML(project.mainRating || 0)}
                    </div>
                </div>
            </div>
             <div class="modal-details-stats">
                <div><div class="stat-value">${formatViews(project.views)}</div><div class="stat-label">Visualizações</div></div>
                <div><div class="stat-value">${project.episodes}</div><div class="stat-label">Episódios</div></div>
            </div>
            
            <div class="project-details-section" style="margin-top: 2rem;">
                <h4>Descrição</h4>
                <p>${project.description || 'Sem descrição.'}</p>
            </div>

            <div class="project-details-grid">
                <div class="project-details-section">
                    <h4>Criador</h4>
                    <p>${creatorName}</p>
                </div>
                <div class="project-details-section">
                    <h4>Convidados</h4>
                    <div class="guest-list">${guestsListHTML}</div>
                </div>
            </div>

            <div class="project-details-section" style="margin-top: 1.5rem;">
                <h4>Avaliações Individuais</h4>
                <div class="individual-ratings-display-list">${individualRatingsHTML}</div>
            </div>`;
        openModal(projectDetailsModal);
    }
    
    function showConfirmDeleteModal(projectId) {
        projectIdToDelete = projectId;
        openModal(projectConfirmModal);
    }

    function deleteProject() {
        if (!projectIdToDelete) return;
        let currentData = window.getData();
        let found = false;
        for (const profile of currentData) {
            const projectIndex = (profile.projects || []).findIndex(p => p.id === projectIdToDelete);
            if (projectIndex > -1) {
                profile.projects.splice(projectIndex, 1);
                found = true;
                break;
            }
        }
        if (found) {
            window.saveData(currentData);
            loadData();
        }
        closeModal();
        projectIdToDelete = null;
    }

    // --- Lógica de Pesquisa e Seleção ---
    function handleSearch(event, listToExclude, resultsContainer, addFunction) {
        const searchTerm = event.target.value.toLowerCase();
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        if (searchTerm.length < 2) return;
        
        const allProfiles = window.getData();
        const filteredProfiles = allProfiles.filter(profile => 
            profile.name.toLowerCase().includes(searchTerm) &&
            !listToExclude.some(p => p && p.id === profile.id)
        );
        
        if (filteredProfiles.length > 0) {
            resultsContainer.style.display = 'block';
            filteredProfiles.forEach(profile => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = profile.name;
                item.addEventListener('click', () => addFunction(profile));
                resultsContainer.appendChild(item);
            });
        }
    }

    // --- Lógica para Criador e Convidados ---
    function addCreator(profile) { currentProjectCreator = { id: profile.id, name: profile.name }; renderSelectedCreator(); projectCreatorInput.value = ''; creatorSearchResults.style.display = 'none'; projectCreatorInput.style.display = 'none'; }
    function removeCreator() { currentProjectCreator = null; renderSelectedCreator(); projectCreatorInput.style.display = 'block'; }
    function renderSelectedCreator() { if(selectedCreatorContainer) { selectedCreatorContainer.innerHTML = ''; if (currentProjectCreator) { const tag = document.createElement('div'); tag.className = 'selected-participant-tag'; tag.innerHTML = `<span>${currentProjectCreator.name}</span><button type="button" class="remove-creator-btn">&times;</button>`; selectedCreatorContainer.appendChild(tag); } } }
    function addGuest(profile) { if (!currentProjectGuests.some(p => p.id === profile.id)) { currentProjectGuests.push({ id: profile.id, name: profile.name }); renderSelectedGuests(); projectGuestsInput.value = ''; guestsSearchResults.style.display = 'none'; } }
    function removeGuest(profileId) { currentProjectGuests = currentProjectGuests.filter(p => p.id !== profileId); renderSelectedGuests(); }
    function renderSelectedGuests() { if(selectedGuestsContainer) { selectedGuestsContainer.innerHTML = ''; currentProjectGuests.forEach(guest => { const tag = document.createElement('div'); tag.className = 'selected-participant-tag'; tag.innerHTML = `<span>${guest.name}</span><button type="button" class="remove-guest-btn" data-id="${guest.id}">&times;</button>`; selectedGuestsContainer.appendChild(tag); }); } }
    
    // --- Lógica para Avaliações ---
    function setupStarRatingInput(container, onRatingChange) {
        container.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const star = document.createElement('i');
            star.className = 'fas fa-star';
            star.dataset.value = i;
            container.appendChild(star);
        }

        container.addEventListener('mouseover', e => {
            if (e.target.matches('.fa-star')) {
                const hoverValue = parseInt(e.target.dataset.value, 10);
                updateStarDisplay(container, hoverValue, true);
            }
        });

        container.addEventListener('mouseout', () => {
             const currentValue = container === mainRatingStarsContainer ? currentMainRating : currentIndividualRatingValue;
             updateStarDisplay(container, currentValue);
        });

        container.addEventListener('click', e => {
            if (e.target.matches('.fa-star')) {
                const clickedValue = parseInt(e.target.dataset.value, 10);
                onRatingChange(clickedValue);
            }
        });
    }
    
    function updateStarDisplay(container, rating, isHover = false) {
        if (!container) return;
        const stars = container.querySelectorAll('.fa-star');
        stars.forEach(star => {
            const starValue = parseInt(star.dataset.value, 10);
            star.style.color = starValue <= rating ? '#ffc107' : '#555';
        });
    }

    function addIndividualRating() {
        const name = individualRatingNameInput.value.trim();
        if (!name) {
            alert('Por favor, insira o nome do avaliador.');
            return;
        }
        if (currentIndividualRatingValue === 0) {
            alert('Por favor, selecione uma avaliação de 1 a 10.');
            return;
        }
        currentIndividualRatings.push({ name, rating: currentIndividualRatingValue });
        renderIndividualRatingsList();
        individualRatingNameInput.value = '';
        currentIndividualRatingValue = 0;
        updateStarDisplay(individualRatingStarsContainer, 0);
    }

    function renderIndividualRatingsList() {
        individualRatingsListContainer.innerHTML = '';
        currentIndividualRatings.forEach((rating, index) => {
            const item = document.createElement('div');
            item.className = 'individual-rating-item';
            item.innerHTML = `
                <span class="rating-name">${rating.name}</span>
                ${createStarRatingHTML(rating.rating)}
                <button type="button" class="remove-rating-btn" data-index="${index}">&times;</button>
            `;
            individualRatingsListContainer.appendChild(item);
        });
    }

    // --- Event Listeners ---
    function addProjectCardEventListeners() {
        document.querySelectorAll('.project-card .edit-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); setupEditForm(e.currentTarget.closest('.project-card').dataset.id); }));
        document.querySelectorAll('.project-card .delete-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); showConfirmDeleteModal(e.currentTarget.closest('.project-card').dataset.id); }));
    }

    function initializePage() {
        if (isInitialized) return;

        projectForm = document.getElementById('project-form');
        projectsListContainer = document.getElementById('projects-list-container');
        projectNameInput = document.getElementById('project-name-input');
        projectEpisodesInput = document.getElementById('project-episodes-input');
        projectViewsInput = document.getElementById('project-views-input');
        projectYearInput = document.getElementById('project-year-input');
        projectDescriptionInput = document.getElementById('project-description-input');
        projectPhotoInput = document.getElementById('project-photo-input');
        projectPhotoPreview = document.getElementById('project-photo-preview');
        projectCreatorInput = document.getElementById('project-creator-input');
        projectGuestsInput = document.getElementById('project-guests-input');
        
        projectDetailsModal = document.getElementById('project-details-modal');
        projectDetailsModalBody = document.getElementById('project-details-modal-body');
        projectDetailsModalCloseBtn = document.getElementById('project-details-modal-close');
        projectConfirmModal = document.getElementById('project-confirm-modal');
        projectConfirmYesBtn = document.getElementById('project-confirm-yes-btn');
        projectConfirmNoBtn = document.getElementById('project-confirm-no-btn');
        
        projectSearchInput = document.getElementById('project-search-input');
        projectSortButtons = document.querySelectorAll('#project-sort-controls .sort-button');
        addProjectBtn = document.getElementById('add-project-btn');
        projectFormModal = document.getElementById('project-form-modal');
        projectFormModalCloseBtn = document.getElementById('project-form-modal-close');
        projectFormCancelBtn = document.getElementById('project-form-cancel-btn');

        // Selecionar novos elementos de avaliação
        mainRatingStarsContainer = document.getElementById('main-rating-stars');
        individualRatingNameInput = document.getElementById('individual-rating-name');
        individualRatingStarsContainer = document.getElementById('individual-rating-stars');
        addIndividualRatingBtn = document.getElementById('add-individual-rating-btn');
        individualRatingsListContainer = document.getElementById('individual-ratings-list');


        function createSearchContainer(inputElement) {
            const container = document.createElement('div');
            container.className = 'participants-container';
            inputElement.parentNode.insertBefore(container, inputElement.nextSibling);

            const searchResults = document.createElement('div');
            searchResults.className = 'search-results-container';
            container.appendChild(searchResults);

            const selectedContainer = document.createElement('div');
            selectedContainer.className = 'selected-participants-container';
            inputElement.parentNode.insertBefore(selectedContainer, inputElement);
            
            return { searchResults, selectedContainer };
        }

        const creatorContainers = createSearchContainer(projectCreatorInput);
        creatorSearchResults = creatorContainers.searchResults;
        selectedCreatorContainer = creatorContainers.selectedContainer;

        const guestsContainers = createSearchContainer(projectGuestsInput);
        guestsSearchResults = guestsContainers.searchResults;
        selectedGuestsContainer = guestsContainers.selectedContainer;

        loadData();
        
        // Setup inicial das estrelas no formulário
        setupStarRatingInput(mainRatingStarsContainer, (rating) => { currentMainRating = rating; updateStarDisplay(mainRatingStarsContainer, rating); });
        setupStarRatingInput(individualRatingStarsContainer, (rating) => { currentIndividualRatingValue = rating; updateStarDisplay(individualRatingStarsContainer, rating); });

        addProjectBtn.addEventListener('click', () => {
            resetForm();
            openModal(projectFormModal);
        });

        if (projectForm) projectForm.addEventListener('submit', handleFormSubmit);
        
        projectPhotoInput.addEventListener('change', async () => {
            const file = projectPhotoInput.files[0];
            if (file) {
                try {
                    projectPhotoPreview.style.opacity = '0.5';
                    const compressedDataUrl = await compressImage(file);
                    projectPhotoPreview.src = compressedDataUrl;
                    projectPhotoPreview.style.opacity = '1';
                } catch (error) {
                    console.error("Erro ao comprimir o logo:", error);
                    projectPhotoPreview.style.opacity = '1';
                    const reader = new FileReader();
                    reader.onload = (e) => projectPhotoPreview.src = e.target.result;
                    reader.readAsDataURL(file);
                    alert('Não foi possível otimizar o logo. A imagem original será usada, mas poderá causar problemas de armazenamento.');
                }
            }
        });

        projectCreatorInput.addEventListener('input', (e) => handleSearch(e, [currentProjectCreator, ...currentProjectGuests], creatorSearchResults, addCreator));
        selectedCreatorContainer.addEventListener('click', (e) => { if (e.target.classList.contains('remove-creator-btn') || e.target.parentElement.classList.contains('remove-creator-btn')) removeCreator(); });
        projectGuestsInput.addEventListener('input', (e) => handleSearch(e, [currentProjectCreator, ...currentProjectGuests], guestsSearchResults, addGuest));
        selectedGuestsContainer.addEventListener('click', (e) => { if (e.target.classList.contains('remove-guest-btn') || e.target.parentElement.classList.contains('remove-guest-btn')) removeGuest(e.target.dataset.id); });
        
        addIndividualRatingBtn.addEventListener('click', addIndividualRating);
        individualRatingsListContainer.addEventListener('click', e => {
            if (e.target.matches('.remove-rating-btn')) {
                const indexToRemove = parseInt(e.target.dataset.index, 10);
                currentIndividualRatings.splice(indexToRemove, 1);
                renderIndividualRatingsList();
            }
        });

        document.addEventListener('click', (event) => { if (creatorSearchResults && !creatorSearchResults.parentElement.contains(event.target)) creatorSearchResults.style.display = 'none'; if (guestsSearchResults && !guestsSearchResults.parentElement.contains(event.target)) guestsSearchResults.style.display = 'none'; });
        
        if(projectDetailsModalCloseBtn) projectDetailsModalCloseBtn.addEventListener('click', closeModal);
        if(projectConfirmYesBtn) projectConfirmYesBtn.addEventListener('click', deleteProject);
        if(projectConfirmNoBtn) projectConfirmNoBtn.addEventListener('click', closeModal);
        if(projectFormModalCloseBtn) projectFormModalCloseBtn.addEventListener('click', closeModal);
        if(projectFormCancelBtn) projectFormCancelBtn.addEventListener('click', closeModal);

        if (projectSearchInput) projectSearchInput.addEventListener('input', renderProjects);
        
        projectSortButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sortKey = button.dataset.sort;
                if (currentProjectSort.key === sortKey) {
                    currentProjectSort.direction = currentProjectSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentProjectSort.key = sortKey;
                    currentProjectSort.direction = 'desc';
                }
                renderProjects();
            });
        });

        isInitialized = true;
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = projectSection.style.display !== 'none';
                if (isVisible) {
                    initializePage();
                }
            }
        }
    });

    if (projectSection) {
        observer.observe(projectSection, { attributes: true });
    }
});

