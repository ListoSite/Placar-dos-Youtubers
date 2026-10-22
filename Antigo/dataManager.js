// dataManager.js - Lógica centralizada para gestão de dados (Versão 6.2 - Melhoria na Mensagem de Erro)

document.addEventListener('DOMContentLoaded', () => {

    // --- Chaves de Armazenamento ---
    const PLACAR_DATA_KEY = 'placarDataV3'; 
    const HISTORY_SNAPSHOTS_KEY = 'historySnapshotsV2'; // Esta chave será mantida para compatibilidade, mas não será mais populada
    const BATTLE_HISTORY_KEY = 'battleHistoryV1';

    const ALL_DATA_KEYS = [PLACAR_DATA_KEY, HISTORY_SNAPSHOTS_KEY, BATTLE_HISTORY_KEY];

    // --- Chaves Antigas (para migração) ---
    const OLD_PROFILES_KEY = 'youtuberProfilesV2';
    const OLD_PROJECTS_KEY = 'youtuberProjectsV2';
    const OLD_SOCIAL_KEY = 'socialDataV1';

    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');

    // --- Funções Auxiliares ---
    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    function calculateRanks(data) {
        const sortedProfiles = [...data]
            .sort((a, b) => parseViews(b.stats?.views) - parseViews(a.stats?.views));
        
        return data.map(profile => {
            const rank = sortedProfiles.findIndex(p => p.id === profile.id) + 1;
            return { ...profile, rank };
        });
    }

    // =================================================================
    // FUNÇÕES GLOBAIS DE ACESSO AOS DADOS
    // =================================================================

    window.getData = function() {
        return JSON.parse(localStorage.getItem(PLACAR_DATA_KEY) || '[]');
    }

    window.saveData = function(data) {
        try {
            localStorage.setItem(PLACAR_DATA_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Erro ao guardar os dados:", e);
            if (e.name === 'QuotaExceededError') {
                alert('Erro: O armazenamento está cheio! Isto é geralmente causado por imagens de perfil ou logos de projeto muito grandes. Por favor, tente editar os perfis/projetos com imagens e re-carregá-las para que possam ser otimizadas.');
            } else {
                alert('Erro: Não foi possível guardar os dados. Ocorreu um problema inesperado.');
            }
        }
    }

    // =================================================================
    // LÓGICA DE MIGRAÇÃO
    // =================================================================
    
    function migrateData() {
        const oldProfilesStr = localStorage.getItem(OLD_PROFILES_KEY);
        const placarDataStr = localStorage.getItem(PLACAR_DATA_KEY);

        if (oldProfilesStr && !placarDataStr) {
            console.log("A iniciar migração de dados para a V3...");
            const oldProfiles = JSON.parse(oldProfilesStr);
            const oldProjects = JSON.parse(localStorage.getItem(OLD_PROJECTS_KEY) || '[]');
            const oldSocials = JSON.parse(localStorage.getItem(OLD_SOCIAL_KEY) || '{}');

            const newData = oldProfiles.map(profile => {
                const creatorProjects = oldProjects.filter(p => p.creator && p.creator.id === profile.id);
                const profileSocials = oldSocials[profile.id] ? oldSocials[profile.id].current : {};
                return {
                    id: profile.id, name: profile.name, contentType: profile.contentType, photo: profile.photo,
                    stats: { views: profile.views, points: profile.points },
                    performanceHistory: profile.history || [],
                    socials: profileSocials || {},
                    projects: creatorProjects || []
                };
            });

            window.saveData(newData);
            localStorage.removeItem(OLD_PROFILES_KEY);
            localStorage.removeItem(OLD_PROJECTS_KEY);
            localStorage.removeItem(OLD_SOCIAL_KEY);
            console.log("Migração concluída com sucesso!");
        }
    }

    // =================================================================
    // FUNÇÕES DE GESTÃO DE HISTÓRICO (POR PERFIL)
    // =================================================================

    window.archiveMonthForProfile = function(profileId, monthName) {
        let allData = window.getData();
        const profileIndex = allData.findIndex(p => p.id === profileId);

        if (profileIndex === -1) {
            console.error("Perfil não encontrado para arquivar:", profileId);
            return false;
        }

        const profile = allData[profileIndex];

        if (!profile.socials) profile.socials = {};
        if (!profile.socials.youtube) profile.socials.youtube = {};
        if (!profile.performanceHistory) profile.performanceHistory = [];

        if (profile.performanceHistory.some(entry => entry.month.toLowerCase() === monthName.toLowerCase())) {
            alert(`Erro: Já existe um registo com o nome "${monthName}" para este perfil. Use a opção de atualizar.`);
            return false;
        }

        const monthlyViews = parseViews(profile.stats.views);
        const currentTotalViews = parseViews(profile.socials.youtube.totalChannelViews);
        profile.socials.youtube.totalChannelViews = (currentTotalViews || 0) + monthlyViews;

        const rankData = calculateRanks(allData);
        const profileWithRank = rankData.find(p => p.id === profileId);

        const historyEntry = {
            month: monthName,
            rank: profileWithRank ? profileWithRank.rank : null,
            stats: JSON.parse(JSON.stringify(profile.stats)),
            socials: JSON.parse(JSON.stringify(profile.socials))
        };
        profile.performanceHistory.push(historyEntry);
        
        profile.stats.views = "0";
        profile.stats.points = 0;

        window.saveData(allData);
        alert(`Histórico "${monthName}" criado e estatísticas do mês repostas para ${profile.name}.`);
        return true;
    }

    window.updateArchivedMonthForProfile = function(profileId, monthName) {
        let allData = window.getData();
        const profileIndex = allData.findIndex(p => p.id === profileId);

        if (profileIndex === -1) {
            console.error("Perfil não encontrado para atualizar histórico:", profileId);
            return false;
        }

        const profile = allData[profileIndex];
        if (!profile.performanceHistory) profile.performanceHistory = [];
        
        const historyIndex = profile.performanceHistory.findIndex(entry => entry.month.toLowerCase() === monthName.toLowerCase());

        if (historyIndex === -1) {
            alert(`Erro: O registo de histórico "${monthName}" não foi encontrado para este perfil.`);
            return false;
        }

        const monthlyViews = parseViews(profile.stats.views);
        const currentTotalViews = parseViews(profile.socials.youtube.totalChannelViews);
        profile.socials.youtube.totalChannelViews = (currentTotalViews || 0) + monthlyViews;

        const rankData = calculateRanks(allData);
        const profileWithRank = rankData.find(p => p.id === profileId);

        const updatedHistoryEntry = {
            month: monthName,
            rank: profileWithRank ? profileWithRank.rank : null,
            stats: JSON.parse(JSON.stringify(profile.stats)),
            socials: JSON.parse(JSON.stringify(profile.socials))
        };
        
        profile.performanceHistory[historyIndex] = updatedHistoryEntry;
        
        profile.stats.views = "0";
        profile.stats.points = 0;

        window.saveData(allData);
        alert(`Histórico "${monthName}" atualizado com sucesso para ${profile.name}.`);
        return true;
    }

    // =================================================================
    // FUNÇÕES PARA O HISTÓRICO DE BATALHAS (REINTRODUZIDAS)
    // =================================================================
    
    window.getBattleHistory = function() {
        return JSON.parse(localStorage.getItem(BATTLE_HISTORY_KEY) || '{}');
    }

    window.saveBattleHistory = function(history) {
        localStorage.setItem(BATTLE_HISTORY_KEY, JSON.stringify(history));
    }


    // =================================================================
    // FUNÇÕES DE EXPORTAÇÃO, IMPORTAÇÃO E RESET
    // =================================================================

    function exportData() {
        const dataToExport = {
            placarData: window.getData(),
            battleHistory: window.getBattleHistory()
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().slice(0, 10);
        link.download = `placar_youtubers_backup_v4_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert("Backup completo exportado com sucesso!");
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!importedData || typeof importedData !== 'object' || !Array.isArray(importedData.placarData)) {
                     throw new Error("O ficheiro de backup está incompleto ou tem um formato inválido.");
                }
                if (confirm("Tem a certeza de que deseja importar estes dados? TODOS os dados e históricos atuais serão substituídos por este backup.")) {
                    window.saveData(importedData.placarData || []);
                    window.saveBattleHistory(importedData.battleHistory || {});
                    alert("Dados importados com sucesso! A página será recarregada.");
                    window.location.reload();
                }
            } catch (error) {
                console.error("Erro ao importar dados:", error);
                alert(`Ocorreu um erro ao importar o ficheiro: ${error.message}`);
            } finally {
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    }

    window.resetApplicationData = function() {
        if (confirm("Tem a certeza ABSOLUTA de que deseja apagar todos os dados? Esta ação é irreversível.")) {
            console.log("A apagar todos os dados da aplicação...");
            ALL_DATA_KEYS.forEach(key => {
                localStorage.removeItem(key);
                console.log(`- Chave removida: ${key}`);
            });
            alert("Todos os dados foram apagados com sucesso. A aplicação será recarregada.");
            window.location.reload();
        }
    }

    // --- Event Listeners ---
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
    if (importDataBtn) importDataBtn.addEventListener('click', () => importFileInput.click());
    if (importFileInput) importFileInput.addEventListener('change', importData);

    // --- INICIALIZAÇÃO ---
    migrateData();
});

