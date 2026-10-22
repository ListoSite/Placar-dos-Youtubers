/**
 * ===================================================================
 * CINEVERSO DATA MANAGER (v1.0)
 * ===================================================================
 * Este ficheiro centraliza toda a gestão de dados da aplicação,
 * incluindo o carregamento, a gravação e a manipulação de conteúdos,
 * playlists e universos.
 *
 * Funciona como a "única fonte da verdade" para toda a aplicação.
 * Qualquer outra parte do site deve usar as funções aqui expostas
 * para ler ou modificar dados.
 */

// Usamos um IIFE (Immediately Invoked Function Expression) para criar um módulo global `dataManager`
// Isto evita poluir o escopo global e mantém todo o código de dados encapsulado.
const dataManager = (() => {

    // -------------------------------------------------------------------
    // ESTADO INTERNO (OS DADOS DA APLICAÇÃO)
    // -------------------------------------------------------------------
    let allContent = [];
    let playlists = [];
    let universes = [];
    let unlockedAchievements = {};

    // Nomes das chaves usadas no localStorage para consistência
    const KEYS = {
        content: 'cineverso_allContent',
        playlists: 'cineverso_playlists',
        universes: 'movieUniverses',
        achievements: 'cineverso_unlocked_achievements'
    };

    // -------------------------------------------------------------------
    // FUNÇÕES PRIVADAS (LÓGICA INTERNA DO MÓDULO)
    // -------------------------------------------------------------------

    /**
     * Mostra um erro no console quando o localStorage está cheio.
     */
    const handleStorageError = (error) => {
        console.error("ERRO DE ARMAZENAMENTO: O localStorage está cheio ou ocorreu um problema.", error);
        // No futuro, podemos emitir um evento global para que a UI possa mostrar uma notificação.
        // Por agora, o Cineverso.js já tem uma notificação visual que pode ser adaptada.
    };

    // -------------------------------------------------------------------
    // API PÚBLICA (FUNÇÕES EXPOSTAS PARA O RESTO DA APLICAÇÃO)
    // -------------------------------------------------------------------
    const publicApi = {
        /**
         * Carrega todos os dados do localStorage para a memória.
         * Deve ser chamada no início de cada página.
         */
        loadAllData: () => {
            try {
                const storedContent = localStorage.getItem(KEYS.content);
                allContent = storedContent ? JSON.parse(storedContent) : [];

                const storedPlaylists = localStorage.getItem(KEYS.playlists);
                playlists = storedPlaylists ? JSON.parse(storedPlaylists) : [];

                const storedUniverses = localStorage.getItem(KEYS.universes);
                universes = storedUniverses ? JSON.parse(storedUniverses) : [];
                
                const storedAchievements = localStorage.getItem(KEYS.achievements);
                unlockedAchievements = storedAchievements ? JSON.parse(storedAchievements) : {};

                console.log("Data Manager: Todos os dados foram carregados do localStorage.");
            } catch (e) {
                console.error("Data Manager: Erro ao carregar os dados.", e);
            }
        },

        /**
         * Guarda todos os dados da memória para o localStorage.
         * Deve ser chamada sempre que houver uma alteração nos dados.
         */
        saveAllData: () => {
            try {
                localStorage.setItem(KEYS.content, JSON.stringify(allContent));
                localStorage.setItem(KEYS.playlists, JSON.stringify(playlists));
                localStorage.setItem(KEYS.universes, JSON.stringify(universes));
                localStorage.setItem(KEYS.achievements, JSON.stringify(unlockedAchievements));
                 console.log("Data Manager: Todos os dados foram guardados no localStorage.");
            } catch (e) {
                handleStorageError(e);
            }
        },

        // --- MÉTODOS DE ACESSO (GETTERS) ---

        getAllContent: () => allContent,
        getPlaylists: () => playlists,
        getUniverses: () => universes,
        getUnlockedAchievements: () => unlockedAchievements,

        /**
         * Encontra um conteúdo específico pelo seu ID.
         * @param {number} id - O ID do conteúdo a ser encontrado.
         * @returns {object|undefined} O objeto do conteúdo ou undefined se não for encontrado.
         */
        getContentById: (id) => {
            const numericId = Number(id);
            return allContent.find(item => item.id === numericId);
        },
        
        getPlaylistById: (id) => {
            const numericId = Number(id);
            return playlists.find(p => p.id === numericId);
        },

        getUniverseById: (id) => {
            const numericId = Number(id);
            return universes.find(u => u.id === numericId);
        },


        // --- MÉTODOS DE MANIPULAÇÃO (SETTERS/MODIFIERS) ---
        
        /**
         * Adiciona ou atualiza um item de conteúdo.
         * Se o item já tiver um ID, ele é atualizado. Caso contrário, é adicionado.
         * @param {object} itemData - O objeto de conteúdo a ser salvo.
         */
        saveContent: (itemData) => {
            const existingIndex = allContent.findIndex(item => item.id === itemData.id);
            if (existingIndex > -1) {
                // Atualiza o item existente
                allContent[existingIndex] = itemData;
            } else {
                // Adiciona um novo item (garantindo que tem um ID)
                if (!itemData.id) {
                    itemData.id = Date.now();
                }
                allContent.push(itemData);
            }
        },

        /**
         * Apaga um conteúdo pelo ID, bem como as suas referências noutros locais.
         * @param {number} id - O ID do conteúdo a ser apagado.
         */
        deleteContent: (id) => {
            const numericId = Number(id);
            
            // Apaga o item principal e quaisquer itens anexados a ele
            const attachments = allContent.filter(c => c.attachedTo === numericId);
            const idsToDelete = new Set(attachments.map(a => a.id));
            idsToDelete.add(numericId);

            allContent = allContent.filter(c => !idsToDelete.has(c.id));
            
            // Remove as referências de todas as playlists e universos
            playlists.forEach(p => p.contentIds = p.contentIds.filter(cid => !idsToDelete.has(cid)));
            universes.forEach(u => u.timeline = u.timeline.filter(uid => !idsToDelete.has(uid)));
        },

        addPlaylist: (playlistName) => {
            const newPlaylist = { 
                id: Date.now(), 
                name: playlistName.trim(), 
                contentIds: [] 
            };
            playlists.push(newPlaylist);
        },

        deletePlaylist: (id) => {
            const numericId = Number(id);
            playlists = playlists.filter(p => p.id !== numericId);
        },
        
        // --- FUNÇÕES PARA IMPORTAR/EXPORTAR ---

        /**
         * Gera um objeto com todos os dados prontos para serem exportados.
         * @returns {string} Uma string JSON com todos os dados da aplicação.
         */
        exportDataAsJSON: () => {
            const dataToExport = {
                [KEYS.content]: allContent,
                [KEYS.playlists]: playlists,
                [KEYS.universes]: universes,
                [KEYS.achievements]: unlockedAchievements
            };
            return JSON.stringify(dataToExport, null, 2);
        },

        /**
         * Importa dados de uma string JSON, substituindo os dados atuais.
         * @param {string} jsonString - A string JSON contendo os dados do backup.
         * @returns {boolean} True se a importação for bem-sucedida, false caso contrário.
         */
        importDataFromJSON: (jsonString) => {
            try {
                const importedData = JSON.parse(jsonString);
                // Validação básica para garantir que o ficheiro parece correto
                if (importedData[KEYS.content] && importedData[KEYS.playlists] && importedData[KEYS.universes]) {
                    allContent = importedData[KEYS.content] || [];
                    playlists = importedData[KEYS.playlists] || [];
                    universes = importedData[KEYS.universes] || [];
                    unlockedAchievements = importedData[KEYS.achievements] || {};
                    
                    // Limpa as conquistas "novas" para evitar notificações falsas
                    localStorage.removeItem('cineverso_new_achievements');

                    publicApi.saveAllData();
                    return true;
                }
                return false;
            } catch (e) {
                console.error("Data Manager: Erro ao importar JSON.", e);
                return false;
            }
        },

        /**
         * Importa e funde dados de uma string JSON com os dados locais, sem apagar nada.
         * @param {string} jsonString - A string JSON contendo os dados do backup.
         * @returns {{success: boolean, added: number, updated: number, message: string}} Objeto com o resultado da operação.
         */
        importAndMergeDataFromJSON: (jsonString) => {
            try {
                const importedData = JSON.parse(jsonString);
                // Validação para garantir que o ficheiro tem a estrutura mínima
                if (!importedData[KEYS.content] || !importedData[KEYS.playlists] || !importedData[KEYS.universes]) {
                    return { success: false, added: 0, updated: 0, message: 'Ficheiro inválido ou com formato incorreto.' };
                }

                const stats = { content: { added: 0, updated: 0 }, playlists: { added: 0, updated: 0 }, universes: { added: 0, updated: 0 } };

                // Função auxiliar para fundir os dados, tratando adições e atualizações
                const mergeArraysById = (localArray, importedArray, category) => {
                    const localMap = new Map(localArray.map(item => [item.id, item]));
                    
                    (importedArray || []).forEach(importedItem => {
                        // Ignora itens sem ID, pois não podem ser rastreados
                        if (!importedItem.id) return;

                        if (localMap.has(importedItem.id)) {
                            stats[category].updated++;
                        } else {
                            stats[category].added++;
                        }
                        // Adiciona o item novo ou substitui o antigo com a versão importada
                        localMap.set(importedItem.id, importedItem);
                    });
                    
                    return Array.from(localMap.values());
                };

                // Funde cada tipo de dado
                allContent = mergeArraysById(allContent, importedData[KEYS.content], 'content');
                playlists = mergeArraysById(playlists, importedData[KEYS.playlists], 'playlists');
                universes = mergeArraysById(universes, importedData[KEYS.universes], 'universes');

                // Funde as conquistas, mantendo todas as que já foram desbloqueadas
                const importedAchievements = importedData[KEYS.achievements] || {};
                unlockedAchievements = { ...unlockedAchievements, ...importedAchievements };

                publicApi.saveAllData();
                
                const totalAdded = stats.content.added + stats.playlists.added + stats.universes.added;
                const totalUpdated = stats.content.updated + stats.playlists.updated + stats.universes.updated;
                
                return { 
                    success: true, 
                    added: totalAdded, 
                    updated: totalUpdated,
                    message: `Sincronização concluída! ${totalAdded} itens adicionados e ${totalUpdated} atualizados.`
                };

            } catch (e) {
                console.error("Data Manager: Erro ao fundir dados do JSON.", e);
                return { success: false, added: 0, updated: 0, message: 'Ocorreu um erro ao ler o ficheiro.' };
            }
        },
        
        /**
         * Apaga todos os dados do Cineverso do localStorage.
         */
        deleteAllData: () => {
            Object.values(KEYS).forEach(key => localStorage.removeItem(key));
            // Limpa chaves dinâmicas também
            localStorage.removeItem('cineverso_new_achievements');
            localStorage.removeItem('selectedUniverseId');
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('expandedState_')) {
                    localStorage.removeItem(key);
                }
            });
            // Reseta o estado na memória
            allContent = [];
            playlists = [];
            universes = [];
            unlockedAchievements = {};
        }
    };

    return publicApi;
})();
