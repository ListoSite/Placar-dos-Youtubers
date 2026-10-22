// profiles.js - Lógica para a gestão de perfis de Youtubers (Versão 3.7 - Compressão Agressiva)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos do DOM ---
    const profileSection = document.getElementById('section-gerir-perfis');
    const profileForm = document.getElementById('profile-form');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');
    const nameInput = document.getElementById('name-input');
    const contentTypeInput = document.getElementById('content-type-input');
    const viewsInput = document.getElementById('views-input');
    const pointsInput = document.getElementById('points-input');
    const profilesListContainer = document.getElementById('profiles-list-container');
    const formTitle = document.querySelector('.profile-form-container h3');
    const formSubmitButton = document.querySelector('.submit-button');
    const defaultPhoto = 'https://placehold.co/150x150/400414/a0a0a0?text=Foto';
    const searchInput = document.getElementById('profile-search-input');
    const sortButtons = document.querySelectorAll('#sort-controls .sort-button');

    // --- Seleção dos Elementos do Modal ---
    const detailsModal = document.getElementById('details-modal');
    const detailsModalBody = document.getElementById('details-modal-body');
    const detailsModalCloseBtn = document.getElementById('details-modal-close');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');

    // --- Estado da Aplicação ---
    let placarData = [];
    let currentlyEditingId = null;
    let profileIdToDelete = null;
    let currentSort = {
        key: 'rank',
        direction: 'asc'
    };
    let isInitialized = false;

    // --- FUNÇÃO ATUALIZADA: Compressão mais agressiva ---
    function compressImage(file, maxWidth = 200, maxHeight = 200, quality = 0.5) {
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

    // --- Funções Auxiliares de Formatação e Cálculo ---
    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase();
        let number = parseFloat(stringValue.replace(',', '.'));
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : number;
    }

    function formatViews(viewsValue) {
        const num = parseViews(viewsValue);
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'K';
        return num.toString();
    }

    function calculateAndAssignRanks(data) {
        const sortedProfiles = [...data]
            .sort((a, b) => parseViews(b.stats?.views) - parseViews(a.stats?.views));
        
        return data.map(profile => {
            const rank = sortedProfiles.findIndex(p => p.id === profile.id) + 1;
            return { ...profile, rank };
        });
    }

    // --- Funções de Lógica de Dados ---
    function loadData() {
        placarData = window.getData();
    }

    // --- Funções de Renderização e DOM ---
    function renderProfiles(searchTerm = '') {
        if (!profilesListContainer) return;
        let profilesToRender = calculateAndAssignRanks(placarData);
        profilesListContainer.innerHTML = '';

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        if (lowerCaseSearchTerm) {
            profilesToRender = profilesToRender.filter(profile =>
                profile.name.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        profilesToRender.sort((a, b) => {
            let valA, valB;
            switch (currentSort.key) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    return valA.localeCompare(valB);
                case 'views':
                    valA = parseViews(a.stats?.views);
                    valB = parseViews(b.stats?.views);
                    return valB - valA;
                case 'rank':
                default:
                    valA = a.rank;
                    valB = b.rank;
                    return valA - valB;
            }
        });

        if (currentSort.direction === 'desc') {
            profilesToRender.reverse();
        }

        if (profilesToRender.length === 0) {
            profilesListContainer.innerHTML = `<p class="empty-list-message">Nenhum perfil encontrado.</p>`;
            return;
        }

        profilesToRender.forEach(profile => {
            const profileCard = document.createElement('div');
            profileCard.className = 'profile-card';
            profileCard.setAttribute('data-id', profile.id);
            profileCard.innerHTML = `
                <div class="profile-card-rank-container">
                    <div class="profile-card-rank">#${profile.rank}</div>
                </div>
                <div class="profile-card-actions">
                    <button class="edit-btn" title="Editar Perfil"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" title="Eliminar Perfil"><i class="fas fa-trash"></i></button>
                </div>
                <img src="${profile.photo}" alt="Foto de ${profile.name}" onerror="this.src='${defaultPhoto}'">
                <div class="profile-card-info">
                    <h4>${profile.name}</h4>
                    <p>${profile.contentType}</p>
                </div>
                <div class="profile-card-stats">
                    <span><i class="fas fa-eye"></i> ${formatViews(profile.stats?.views)}</span>
                    <span><i class="fas fa-star"></i> ${(profile.stats?.points || 0).toLocaleString('pt-PT')}</span>
                </div>
            `;
            profilesListContainer.appendChild(profileCard);
        });

        addCardEventListeners();
        updateSortButtonsUI();
    }

    function updateSortButtonsUI() {
        sortButtons.forEach(button => {
            const sortKey = button.dataset.sort;
            const icon = button.querySelector('i');
            button.classList.toggle('active', sortKey === currentSort.key);
            if (sortKey === currentSort.key) {
                icon.className = currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }
    
    function addCardEventListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn => 
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.closest('.profile-card').dataset.id;
                setupEditForm(id);
            })
        );

        document.querySelectorAll('.delete-btn').forEach(btn => 
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.closest('.profile-card').dataset.id;
                showConfirmDeleteModal(id);
            })
        );

        document.querySelectorAll('.profile-card').forEach(card => 
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const id = e.currentTarget.dataset.id;
                showDetailsModal(id);
            })
        );
    }

    function setupEditForm(id) {
        const profile = placarData.find(p => p.id === id);
        if (!profile) return;

        currentlyEditingId = id;
        nameInput.value = profile.name;
        contentTypeInput.value = profile.contentType;
        viewsInput.value = profile.stats?.views || '';
        pointsInput.value = profile.stats?.points || 0;
        photoPreview.src = profile.photo;

        formTitle.textContent = 'Editar Perfil';
        formSubmitButton.textContent = 'Guardar Alterações';
        formSubmitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    function resetForm() {
        profileForm.reset();
        photoPreview.src = defaultPhoto;
        currentlyEditingId = null;
        formTitle.textContent = 'Adicionar Novo Perfil';
        formSubmitButton.textContent = 'Criar Perfil';
    }

    function showDetailsModal(id) {
        const profileDataWithRank = calculateAndAssignRanks(placarData);
        const profile = profileDataWithRank.find(p => p.id === id);
        if (!profile) return;

        detailsModalBody.innerHTML = `
            <div class="modal-details-main">
                <img src="${profile.photo}" alt="Foto de ${profile.name}" class="modal-details-photo" onerror="this.src='${defaultPhoto}'">
                <div class="modal-details-info">
                    <h2 class="modal-details-name">${profile.name}</h2>
                    <p class="modal-details-content-type">${profile.contentType}</p>
                    <div class="modal-details-rank">Rank Atual: #${profile.rank}</div>
                    <div class="modal-details-stats">
                        <div>
                            <div class="stat-value">${formatViews(profile.stats?.views)}</div>
                            <div class="stat-label">Visualizações Atuais</div>
                        </div>
                        <div>
                            <div class="stat-value">${(profile.stats?.points || 0).toLocaleString('pt-PT')}</div>
                            <div class="stat-label">Pontos</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        openModal(detailsModal);
    }

    function showConfirmDeleteModal(id) {
        profileIdToDelete = id;
        openModal(confirmModal);
    }

    function deleteProfile() {
        if (!profileIdToDelete) return;
        const updatedData = placarData.filter(p => p.id !== profileIdToDelete);
        window.saveData(updatedData);
        loadData();
        renderProfiles(searchInput.value);
        closeModal();
        profileIdToDelete = null;
    }

    function initializePage() {
        if (isInitialized) return;
        
        loadData();
        renderProfiles();

        if (photoInput) {
            photoInput.addEventListener('change', async () => {
                const file = photoInput.files[0];
                if (file) {
                    try {
                        photoPreview.style.opacity = '0.5';
                        const compressedDataUrl = await compressImage(file);
                        photoPreview.src = compressedDataUrl;
                        photoPreview.style.opacity = '1';
                    } catch (error) {
                        console.error("Erro ao comprimir a imagem:", error);
                        photoPreview.style.opacity = '1';
                        const reader = new FileReader();
                        reader.onload = (e) => photoPreview.src = e.target.result;
                        reader.readAsDataURL(file);
                        alert('Não foi possível otimizar a imagem. A imagem original será usada, mas poderá causar problemas de armazenamento.');
                    }
                }
            });
        }

        if (profileForm) {
            profileForm.addEventListener('submit', (event) => {
                event.preventDefault();
                let currentData = window.getData();

                if (currentlyEditingId) {
                    const profileIndex = currentData.findIndex(p => p.id === currentlyEditingId);
                    if (profileIndex > -1) {
                        currentData[profileIndex].name = nameInput.value;
                        currentData[profileIndex].contentType = contentTypeInput.value;
                        currentData[profileIndex].photo = photoPreview.src;
                        if (!currentData[profileIndex].stats) {
                            currentData[profileIndex].stats = {};
                        }
                        currentData[profileIndex].stats.views = viewsInput.value;
                        currentData[profileIndex].stats.points = parseInt(pointsInput.value, 10) || 0;
                    }
                } else {
                    const newProfile = {
                        id: 'yt_' + Date.now(),
                        name: nameInput.value,
                        contentType: contentTypeInput.value,
                        photo: photoPreview.src,
                        stats: {
                            views: viewsInput.value,
                            points: parseInt(pointsInput.value, 10) || 0
                        },
                        performanceHistory: [],
                        socials: {},
                        projects: []
                    };
                    currentData.push(newProfile);
                }

                window.saveData(currentData);
                document.dispatchEvent(new CustomEvent('dataUpdated'));

                loadData();
                renderProfiles();
                resetForm();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                renderProfiles(event.target.value);
            });
        }

        sortButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sortKey = button.dataset.sort;
                if (currentSort.key === sortKey) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.key = sortKey;
                    currentSort.direction = 'asc';
                }
                renderProfiles(searchInput.value);
            });
        });

        document.addEventListener('dataUpdated', () => {
            loadData();
            renderProfiles(searchInput.value);
        });

        if (detailsModalCloseBtn) detailsModalCloseBtn.addEventListener('click', closeModal);
        if (confirmYesBtn) confirmYesBtn.addEventListener('click', deleteProfile);
        if (confirmNoBtn) confirmNoBtn.addEventListener('click', closeModal);

        isInitialized = true;
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = profileSection.style.display !== 'none';
                if (isVisible) {
                    initializePage();
                }
            }
        }
    });

    if (profileSection) {
        observer.observe(profileSection, { attributes: true });
    }
});

