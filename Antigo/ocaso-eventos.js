// ocaso-eventos.js - Lógica para o novo gestor de eventos e papéis (v1.2 - Versão Corrigida)

document.addEventListener('DOMContentLoaded', () => {

    function initializeEventosSection() {
        const addCategoryBtn = document.getElementById('add-category-btn');
        const newCategoryForm = document.getElementById('new-category-form');
        const categoryFormContent = document.getElementById('category-form-content');
        const cancelCategoryBtn = document.getElementById('cancel-category-btn');
        const newCategoryNameInput = document.getElementById('new-category-name');
        const eventCategoriesList = document.getElementById('event-categories-list');

        if (!addCategoryBtn || !eventCategoriesList) {
            console.error("Elementos essenciais para o gestor de eventos não foram encontrados.");
            return; 
        }

        let eventCategories = (window.getOcasoData && window.getOcasoData().eventCategories) || [];

        function saveCategories() {
            if (typeof window.getOcasoData !== 'function' || typeof window.saveOcasoData !== 'function') return;
            const data = window.getOcasoData();
            data.eventCategories = eventCategories;
            window.saveOcasoData(data);
        }

        function renderCategories() {
            eventCategoriesList.innerHTML = '';
            if (eventCategories.length === 0) {
                eventCategoriesList.innerHTML = '<p class="empty-list-message">Nenhuma categoria de evento criada. Comece por adicionar uma acima.</p>';
                return;
            }

            eventCategories.forEach(category => {
                const categoryCard = createCategoryCard(category);
                eventCategoriesList.appendChild(categoryCard);
            });
        }
        
        function createCategoryCard(category) {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.dataset.id = category.id;

            card.innerHTML = `
                <div class="category-header">
                    <h3>${category.name}</h3>
                    <div class="header-actions">
                        <button class="icon-button delete-category-btn" title="Eliminar Categoria"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="management-section">
                    <div class="management-column">
                        <h4><i class="fas fa-bolt"></i> Situações</h4>
                        <ul class="situations-list"></ul>
                        <form class="add-item-form add-situation-form">
                            <input type="text" class="item-name-input" placeholder="Nome da Situação" required>
                            <input type="number" class="item-points-input" placeholder="Pontos" required>
                            <button type="submit" class="action-button-redesigned primary"><i class="fas fa-plus"></i></button>
                        </form>
                    </div>
                    <div class="management-column">
                        <h4><i class="fas fa-users"></i> Papéis</h4>
                        <ul class="roles-list"></ul>
                        <form class="add-item-form add-role-form">
                            <input type="text" class="item-name-input" placeholder="Nome do Papel" required>
                            <input type="number" class="item-points-input" placeholder="x Pontos" value="1" step="0.1" required>
                            <button type="submit" class="action-button-redesigned primary"><i class="fas fa-plus"></i></button>
                        </form>
                    </div>
                </div>`;
            
            const situationsList = card.querySelector('.situations-list');
            (category.situations || []).forEach(sit => situationsList.appendChild(createSituationItem(sit)));
            
            const rolesList = card.querySelector('.roles-list');
            (category.roles || []).forEach(role => rolesList.appendChild(createRoleItem(role)));

            card.querySelector('.delete-category-btn').addEventListener('click', () => deleteCategory(category.id));
            card.querySelector('.add-situation-form').addEventListener('submit', (e) => addSituation(e, category.id));
            card.querySelector('.add-role-form').addEventListener('submit', (e) => addRole(e, category.id));
            
            return card;
        }

        function createSituationItem(situation) {
            const item = document.createElement('li');
            item.className = 'situation-item';
            item.dataset.id = situation.id;
            const pointsClass = situation.points >= 0 ? 'positive' : 'negative';
            item.innerHTML = `
                <div class="item-details">
                    <span class="name">${situation.name}</span>
                    <span class="points ${pointsClass}">${situation.points > 0 ? '+' : ''}${situation.points}</span>
                </div>
                <button class="icon-button delete-item-btn"><i class="fas fa-times"></i></button>`;
            item.querySelector('.delete-item-btn').addEventListener('click', () => deleteSituation(item.closest('.category-card').dataset.id, situation.id));
            return item;
        }

        function createRoleItem(role) {
            const item = document.createElement('li');
            item.className = 'role-item';
            item.dataset.id = role.id;
            const multiplierClass = role.multiplier >= 0 ? 'positive' : 'negative';
            item.innerHTML = `
                <div class="item-details">
                    <span class="name">${role.name}</span>
                    <span class="points ${multiplierClass}">x${role.multiplier}</span>
                </div>
                <button class="icon-button delete-item-btn"><i class="fas fa-times"></i></button>`;
            item.querySelector('.delete-item-btn').addEventListener('click', () => deleteRole(item.closest('.category-card').dataset.id, role.id));
            return item;
        }

        function handleAddCategory(e) {
            e.preventDefault();
            const name = newCategoryNameInput.value.trim();
            if (!name) return;

            const newCategory = {
                id: 'cat_' + Date.now(),
                name: name,
                situations: [],
                roles: [
                    { id: 'role_' + Date.now(), name: 'Neutro', multiplier: 0 }
                ]
            };
            eventCategories.push(newCategory);
            saveCategories();
            renderCategories();
            newCategoryForm.style.display = 'none';
            categoryFormContent.reset();
        }

        function deleteCategory(catId) {
            if (!confirm("Tem a certeza que deseja eliminar esta categoria e todos os seus conteúdos?")) return;
            eventCategories = eventCategories.filter(c => c.id !== catId);
            saveCategories();
            renderCategories();
        }

        function addSituation(e, catId) {
            e.preventDefault();
            const form = e.target;
            const name = form.querySelector('.item-name-input').value.trim();
            const points = parseInt(form.querySelector('.item-points-input').value, 10);
            if (!name || isNaN(points)) return;
            
            const category = eventCategories.find(c => c.id === catId);
            if (!category) return;

            const newSituation = { id: 'sit_' + Date.now(), name, points };
            if (!category.situations) category.situations = [];
            category.situations.push(newSituation);
            saveCategories();
            
            const situationsList = form.closest('.management-column').querySelector('.situations-list');
            situationsList.appendChild(createSituationItem(newSituation));
            form.reset();
        }

        function deleteSituation(catId, sitId) {
            const category = eventCategories.find(c => c.id === catId);
            if (!category) return;
            category.situations = category.situations.filter(s => s.id !== sitId);
            saveCategories();
            renderCategories();
        }
        
        function addRole(e, catId) {
            e.preventDefault();
            const form = e.target;
            const name = form.querySelector('.item-name-input').value.trim();
            const multiplier = parseFloat(form.querySelector('.item-points-input').value);
            if (!name || isNaN(multiplier)) return;
            
            const category = eventCategories.find(c => c.id === catId);
            if (!category) return;

            const newRole = { id: 'role_' + Date.now(), name, multiplier };
            if (!category.roles) category.roles = [];
            category.roles.push(newRole);
            saveCategories();
            
            const rolesList = form.closest('.management-column').querySelector('.roles-list');
            rolesList.appendChild(createRoleItem(newRole));
            form.reset();
            form.querySelector('.item-points-input').value = "1";
        }
        
        function deleteRole(catId, roleId) {
            const category = eventCategories.find(c => c.id === catId);
            if (!category) return;
            if(category.roles.length <= 1) {
                alert("Cada categoria deve ter pelo menos um papel.");
                return;
            }
            category.roles = category.roles.filter(r => r.id !== roleId);
            saveCategories();
            renderCategories();
        }
        
        addCategoryBtn.addEventListener('click', () => {
            newCategoryForm.style.display = 'block';
            newCategoryNameInput.focus();
        });

        cancelCategoryBtn.addEventListener('click', () => {
            newCategoryForm.style.display = 'none';
            categoryFormContent.reset();
        });

        categoryFormContent.addEventListener('submit', handleAddCategory);
        
        renderCategories();
    }

    window.initializeEventosSection = initializeEventosSection;
});

