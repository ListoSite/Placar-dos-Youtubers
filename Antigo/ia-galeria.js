// js/ia-galeria.js - Lógica para a secção da Galeria de Projetos

window.initializeGaleria = function() {
    
    // --- Seleção dos Elementos ---
    const galeriaView = document.querySelector('.galeria-view');
    const folderView = document.querySelector('.folder-view');
    const tabContentsContainer = document.querySelector('.tab-content-container');
    const searchInput = document.getElementById('folder-search-input');
    
    // Elementos da Vista de Pastas
    const addFolderBtn = document.getElementById('add-folder-button');
    const filterSelects = document.querySelectorAll('.filter-select');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const galeriaTabs = document.querySelectorAll('.galeria-tab-link');

    // Elementos da Vista de Ficheiros
    const backToGalleryBtn = document.getElementById('back-to-gallery-btn');
    const folderViewTitle = document.getElementById('folder-view-title');
    const folderViewDescription = document.getElementById('folder-view-description');
    const addFileBtn = document.getElementById('add-file-button');
    const fileGridContainer = document.getElementById('file-grid-container');

    // Modais
    const folderModal = document.getElementById('folder-modal');
    const fileModal = document.getElementById('file-modal');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');

    // Elementos do Modal de Ficheiro (Upload)
    const fileUploadWrapper = document.querySelector('.file-upload-wrapper');
    const fileUploadInput = document.getElementById('file-upload');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const filePreview = document.getElementById('file-preview');


    // --- Estado da Aplicação ---
    let currentCategoryTarget = 'galeria-fotos';
    let currentOpenFolderId = null;
    let itemToDelete = { id: null, type: null }; // type pode ser 'folder' ou 'file'
    let uploadedFileContent = null; // Armazena o conteúdo do ficheiro carregado (base64)

    // --- Base de Dados em Memória (simulação) ---
    let foldersDatabase = {
        'galeria-fotos': [{
            id: Date.now() + 1, name: 'Paisagens Futuristas', description: 'Imagens de cidades e natureza no futuro.',
            tags: { personagens: ['Robô', 'Ciborgue'], pessoas: [], locais: ['Cidade', 'Espaço'], tipo: ['Conceito'] },
            files: [{ 
                id: Date.now() + 101, name: 'Ciborgue na Chuva', url: 'https://placehold.co/600x400/0A0B0D/FFF?text=Imagem+Exemplo',
                tags: { personagens: ['Ciborgue'], pessoas: [], locais: ['Cidade'], tipo: ['Arte 3D'] }
            }]
        }],
        'galeria-videos': [],
        'galeria-musicas': [{
            id: Date.now() + 2, name: 'Músicas Lo-fi', description: 'Batidas relaxantes para estudar/trabalhar.',
            tags: { personagens: [], pessoas: [], locais: [], tipo: ['Relaxante'] },
            files: []
        }],
        'galeria-textos': [{
            id: Date.now() + 3, name: 'Artigos sobre IA', description: 'Documentos e pesquisas sobre IA.',
            tags: { personagens: [], pessoas: ['Cientista'], locais: [], tipo: ['Pesquisa'] },
            files: []
        }],
        'galeria-outros': []
    };
    
    // --- Funções de Ajuda ---
    const getFormTags = (prefix) => ({
        personagens: stringToTags(document.getElementById(`${prefix}-tags-personagens`).value),
        pessoas: stringToTags(document.getElementById(`${prefix}-tags-pessoas`).value),
        locais: stringToTags(document.getElementById(`${prefix}-tags-locais`).value),
        tipo: stringToTags(document.getElementById(`${prefix}-tags-tipo`).value),
    });
    const setFormTags = (prefix, tags) => {
        if (!tags) return;
        document.getElementById(`${prefix}-tags-personagens`).value = tagsToString(tags.personagens);
        document.getElementById(`${prefix}-tags-pessoas`).value = tagsToString(tags.pessoas);
        document.getElementById(`${prefix}-tags-locais`).value = tagsToString(tags.locais);
        document.getElementById(`${prefix}-tags-tipo`).value = tagsToString(tags.tipo);
    };
    const stringToTags = (str) => str.split(',').map(tag => tag.trim()).filter(Boolean);
    const tagsToString = (tagsArr) => (tagsArr || []).join(', ');
    const generateTagsHTML = (tags) => {
        if (!tags || Object.values(tags).every(arr => arr.length === 0)) return '';
        let html = '<div class="folder-tags">';
        for (const category in tags) {
            if (tags[category]) {
                tags[category].forEach(tag => { html += `<span class="tag ${category}">${tag}</span>`; });
            }
        }
        return html + '</div>';
    };

    // --- Funções de Navegação entre Vistas ---
    function showFolderView(folderId) {
        currentOpenFolderId = folderId;
        const folder = foldersDatabase[currentCategoryTarget]?.find(f => f.id == folderId);
        if (!folder) return;

        folderViewTitle.innerHTML = `<i class="${document.querySelector(`.galeria-tab-link[data-target="${currentCategoryTarget}"] i`).className}"></i> ${folder.name}`;
        folderViewDescription.textContent = folder.description;
        
        renderFiles(folder);

        galeriaView.classList.add('hidden');
        folderView.classList.remove('hidden');
    }

    function showGalleryView() {
        currentOpenFolderId = null;
        galeriaView.classList.remove('hidden');
        folderView.classList.add('hidden');
        updateAndRenderFolders();
    }

    // --- Funções de Renderização ---
    function renderFolders() {
        const foldersToRender = (foldersDatabase[currentCategoryTarget] || []).filter(folder => {
            const searchTerm = searchInput.value.toLowerCase();
            const filters = {};
            filterSelects.forEach(s => { filters[s.id.split('-')[1]] = s.value; });
            
            if (searchTerm && !folder.name.toLowerCase().includes(searchTerm)) return false;
            for (const category in filters) {
                if (filters[category] && (!folder.tags || !folder.tags[category] || !folder.tags[category].includes(filters[category]))) return false;
            }
            return true;
        });

        const tabContent = document.getElementById(currentCategoryTarget);
        if (!tabContent) return;
        
        const categoryData = document.querySelector(`.galeria-tab-link.active`);
        const categoryName = categoryData.dataset.category;
        const iconClass = categoryData.querySelector('i').className;

        if (foldersToRender.length === 0) {
            tabContent.innerHTML = `<p class="section-placeholder">Nenhuma pasta encontrada.</p>`;
            return;
        }

        tabContent.innerHTML = '<div class="folder-grid"></div>';
        const grid = tabContent.querySelector('.folder-grid');
        foldersToRender.forEach(folder => {
            const card = document.createElement('div');
            card.className = 'folder-card';
            card.dataset.id = folder.id;
            card.innerHTML = `
                <div class="folder-actions">
                    <button class="folder-action-btn edit-btn" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button class="folder-action-btn delete-btn" title="Apagar"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="folder-icon"><i class="${iconClass}"></i></div>
                <div class="folder-info">
                    <h3>${folder.name}</h3>
                    <p>${folder.files.length} Ficheiro(s)</p>
                </div>
                ${generateTagsHTML(folder.tags)}
                <div class="folder-footer"><span>${categoryName}</span></div>`;
            grid.appendChild(card);
        });
    }
    
    function renderFiles(folder) {
        fileGridContainer.innerHTML = '';
        if (folder.files.length === 0) {
            fileGridContainer.innerHTML = `<p class="section-placeholder">Nenhum ficheiro nesta pasta. Clique em "Novo Ficheiro" para adicionar.</p>`;
            return;
        }
        folder.files.forEach(file => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.id = file.id;
            card.innerHTML = `
                <div class="file-actions">
                    <button class="file-action-btn edit-btn" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button class="file-action-btn delete-btn" title="Apagar"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="file-preview">
                    <img src="${file.url}" alt="${file.name}">
                </div>
                <div class="file-info"><h4>${file.name}</h4></div>
                ${generateTagsHTML(file.tags)}`;
            fileGridContainer.appendChild(card);
        });
    }
    
    function updateAndRenderFolders() {
        const allTags = { personagens: new Set(), pessoas: new Set(), locais: new Set(), tipo: new Set() };
        (foldersDatabase[currentCategoryTarget] || []).forEach(folder => {
            for (const category in folder.tags) {
                folder.tags[category].forEach(tag => allTags[category].add(tag));
            }
        });
        filterSelects.forEach(select => {
            const category = select.id.split('-')[1];
            const currentValue = select.value;
            select.innerHTML = `<option value="">Todos os ${category}</option>`;
            allTags[category].forEach(tag => { select.innerHTML += `<option value="${tag}">${tag}</option>`; });
            select.value = currentValue;
        });
        renderFolders();
    }

    // --- Funções dos Modais ---
    const setupModal = (modalId, closeSelectors, cancelSelectors) => {
        const modal = document.getElementById(modalId);
        if (closeSelectors) {
            document.querySelectorAll(closeSelectors).forEach(el => el.addEventListener('click', () => modal.classList.remove('show')));
        }
        if (cancelSelectors) {
            document.querySelectorAll(cancelSelectors).forEach(el => el.addEventListener('click', () => modal.classList.remove('show')));
        }
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
        return modal;
    };
    
    setupModal('folder-modal', '#close-modal-btn', '#cancel-folder-btn');
    setupModal('file-modal', '#close-file-modal-btn', '#cancel-file-btn');
    setupModal('confirm-delete-modal', '', '#cancel-delete-btn');
    
    // --- Lógica de Gestão (CRUD) ---
    function openCreateFolderModal() {
        document.getElementById('folder-form').reset();
        document.getElementById('folder-id').value = '';
        document.getElementById('modal-title').textContent = `Criar Pasta de ${document.querySelector('.galeria-tab-link.active').dataset.category}`;
        document.getElementById('submit-folder-btn').textContent = 'Criar Pasta';
        folderModal.classList.add('show');
    }
    function openEditFolderModal(folderId) {
        const folder = foldersDatabase[currentCategoryTarget].find(f => f.id == folderId);
        if (!folder) return;
        document.getElementById('folder-form').reset();
        document.getElementById('folder-id').value = folder.id;
        document.getElementById('folder-name').value = folder.name;
        document.getElementById('folder-description').value = folder.description || '';
        setFormTags('folder', folder.tags);
        document.getElementById('modal-title').textContent = `Editar "${folder.name}"`;
        document.getElementById('submit-folder-btn').textContent = 'Guardar';
        folderModal.classList.add('show');
    }
    
    function resetFileUpload() {
        uploadedFileContent = null;
        fileUploadInput.value = '';
        filePreviewContainer.style.display = 'none';
        filePreview.src = '#';
    }

    function openCreateFileModal() {
        document.getElementById('file-form').reset();
        document.getElementById('file-id').value = '';
        resetFileUpload();
        document.getElementById('file-modal-title').textContent = 'Adicionar Novo Ficheiro';
        document.getElementById('submit-file-btn').textContent = 'Adicionar';
        fileModal.classList.add('show');
    }
    function openEditFileModal(fileId) {
        const folder = foldersDatabase[currentCategoryTarget].find(f => f.id == currentOpenFolderId);
        const file = folder?.files.find(f => f.id == fileId);
        if (!file) return;
        document.getElementById('file-form').reset();
        document.getElementById('file-id').value = file.id;
        document.getElementById('file-name').value = file.name;
        setFormTags('file', file.tags);

        uploadedFileContent = file.url; // Guarda o URL atual
        filePreview.src = file.url;
        filePreviewContainer.style.display = 'block';

        document.getElementById('file-modal-title').textContent = `Editar "${file.name}"`;
        document.getElementById('submit-file-btn').textContent = 'Guardar';
        fileModal.classList.add('show');
    }
    
    function handleFolderSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('folder-id').value;
        const data = {
            name: document.getElementById('folder-name').value.trim(),
            description: document.getElementById('folder-description').value.trim(),
            tags: getFormTags('folder'),
        };
        if (id) {
            const folder = foldersDatabase[currentCategoryTarget].find(f => f.id == id);
            Object.assign(folder, data);
        } else {
            foldersDatabase[currentCategoryTarget].push({ id: Date.now(), files: [], ...data });
        }
        folderModal.classList.remove('show');
        updateAndRenderFolders();
    }
    function handleFileSubmit(e) {
        e.preventDefault();
        if (!uploadedFileContent) {
            alert('Por favor, carregue uma imagem.');
            return;
        }
        const id = document.getElementById('file-id').value;
        const folder = foldersDatabase[currentCategoryTarget].find(f => f.id == currentOpenFolderId);
        if (!folder) return;
        const data = {
            name: document.getElementById('file-name').value.trim(),
            url: uploadedFileContent, // USA O CONTEÚDO CARREGADO
            tags: getFormTags('file'),
        };
        if (id) {
            const file = folder.files.find(f => f.id == id);
            Object.assign(file, data);
        } else {
            folder.files.push({ id: Date.now(), ...data });
        }
        fileModal.classList.remove('show');
        renderFiles(folder);
    }
    
    function openDeleteModal(id, type) {
        itemToDelete = { id, type };
        confirmDeleteModal.classList.add('show');
    }
    function handleDeleteConfirm() {
        const { id, type } = itemToDelete;
        if (type === 'folder') {
            const index = foldersDatabase[currentCategoryTarget].findIndex(f => f.id == id);
            if (index > -1) foldersDatabase[currentCategoryTarget].splice(index, 1);
            updateAndRenderFolders();
        } else if (type === 'file') {
            const folder = foldersDatabase[currentCategoryTarget].find(f => f.id == currentOpenFolderId);
            if (folder) {
                const index = folder.files.findIndex(f => f.id == id);
                if (index > -1) folder.files.splice(index, 1);
                renderFiles(folder);
            }
        }
        confirmDeleteModal.classList.remove('show');
    }

    // --- Lógica de Upload de Ficheiros ---
    function handleFileSelect(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedFileContent = e.target.result;
                filePreview.src = e.target.result;
                filePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            alert('Por favor, selecione um ficheiro de imagem válido.');
        }
    }

    // --- Event Listeners ---
    addFolderBtn.addEventListener('click', openCreateFolderModal);
    document.getElementById('folder-form').addEventListener('submit', handleFolderSubmit);
    addFileBtn.addEventListener('click', openCreateFileModal);
    document.getElementById('file-form').addEventListener('submit', handleFileSubmit);
    
    backToGalleryBtn.addEventListener('click', showGalleryView);
    searchInput.addEventListener('input', renderFolders);
    filterSelects.forEach(s => s.addEventListener('change', renderFolders));
    clearFiltersBtn.addEventListener('click', () => { filterSelects.forEach(s => s.value = ''); renderFolders(); });
    
    galeriaTabs.forEach(tab => tab.addEventListener('click', () => {
        currentCategoryTarget = tab.dataset.target;
        galeriaTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.galeria-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(currentCategoryTarget).classList.add('active');
        clearFiltersBtn.click();
    }));
    
    tabContentsContainer.addEventListener('click', e => {
        const folderCard = e.target.closest('.folder-card');
        if (!folderCard) return;
        const id = folderCard.dataset.id;
        if (e.target.closest('.edit-btn')) openEditFolderModal(id);
        else if (e.target.closest('.delete-btn')) openDeleteModal(id, 'folder');
        else showFolderView(id);
    });

    fileGridContainer.addEventListener('click', e => {
        const fileCard = e.target.closest('.file-card');
        if (!fileCard) return;
        const id = fileCard.dataset.id;
        if (e.target.closest('.edit-btn')) openEditFileModal(id);
        else if (e.target.closest('.delete-btn')) openDeleteModal(id, 'file');
    });

    document.getElementById('confirm-delete-btn').addEventListener('click', handleDeleteConfirm);
    
    // Eventos para Upload
    fileUploadInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    fileUploadWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadWrapper.classList.add('dragover');
    });
    fileUploadWrapper.addEventListener('dragleave', () => fileUploadWrapper.classList.remove('dragover'));
    fileUploadWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadWrapper.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files[0]);
    });

    // --- Inicialização ---
    showGalleryView();
    console.log("Módulo da Galeria com upload de ficheiros inicializado!");
};

