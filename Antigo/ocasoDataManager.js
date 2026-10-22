// ocasoDataManager.js - Lógica para guardar e carregar dados do módulo "O Caso" (v3.1 - Gestão de Erro de Quota)

(function() {
    // --- Chave de Armazenamento e Versão Atual dos Dados ---
    const OCASO_DATA_KEY = 'ocasoDataV5';
    const CURRENT_DATA_VERSION = 3; 

    // [NOVO] Função de notificação para ser usada em caso de erro ao guardar.
    function showStorageNotification(message, type = 'error') {
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
        }, 8000); // Tempo mais longo para um erro crítico
    }

    /**
     * Migra uma estrutura de dados antiga para a mais recente.
     */
    function migrateData(data) {
        const version = data._version || 1; 

        if (version < 2) {
            data.grupos = data.grupos || [];
            data.relacionamentos = data.relacionamentos || {};
        }

        if (version < 3) {
            if (data.eventTypes && !data.eventCategories) {
                data.eventCategories = data.eventTypes;
                delete data.eventTypes;
            }
            data.eventCategories = data.eventCategories || [];
        }
        
        const defaultStructure = {
            pessoas: [],
            casos: [],
            eventCategories: [],
            grupos: [],
            relacionamentos: {}
        };

        const migratedData = { ...defaultStructure, ...data };
        migratedData._version = CURRENT_DATA_VERSION; 

        return migratedData;
    }

    /**
     * Obtém os dados do módulo "O Caso" a partir do localStorage.
     */
    window.getOcasoData = function() {
        try {
            const dataString = localStorage.getItem(OCASO_DATA_KEY);
            if (!dataString) {
                return migrateData({});
            }
            const parsedData = JSON.parse(dataString);
            return migrateData(parsedData);
        } catch (e) {
            console.error("Erro ao analisar dados do 'O Caso'. A restaurar para o padrão.", e);
            return migrateData({});
        }
    }

    /**
     * Guarda os dados do módulo "O Caso" no localStorage.
     */
    window.saveOcasoData = function(data) {
        try {
            const dataToSave = migrateData(data);
            localStorage.setItem(OCASO_DATA_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            // [CORREÇÃO] Captura especificamente o erro de quota e informa o utilizador.
            if (e.name === 'QuotaExceededError') {
                console.error("Erro de Quota: O armazenamento local está cheio.", e);
                showStorageNotification("Erro: Armazenamento cheio! Remova pessoas com fotos grandes ou exporte um backup.");
            } else {
                console.error("Erro ao guardar os dados do módulo 'O Caso':", e);
            }
        }
    }

})();
