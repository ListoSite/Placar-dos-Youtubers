// ocaso-settings.js - Lógica para a secção de Importar e Exportar Dados (v2.0 - Validação Flexível)

document.addEventListener('DOMContentLoaded', () => {
    const section = document.getElementById('section-settings');
    if (!section) return;

    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');
    const importInput = document.getElementById('import-data-input');
    const importFileName = document.getElementById('import-file-name');

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
        }, 4000);
    }

    const handleExport = () => {
        try {
            const dataToExport = window.getOcasoData();
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date();
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            a.href = url;
            a.download = `ocaso_backup_${dateString}.json`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showNotification("Dados exportados com sucesso!", "success");
        } catch (error) {
            console.error("Ocorreu um erro ao exportar os dados:", error);
            showNotification("Erro ao exportar dados.", "error");
        }
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) {
            if (importFileName) importFileName.textContent = 'Nenhum ficheiro selecionado.';
            return;
        }
        if (importFileName) importFileName.textContent = `Ficheiro: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const importedData = JSON.parse(jsonString);

                // Validação mínima: verifica se é um objeto. A validação completa será feita pelo dataManager.
                if (typeof importedData !== 'object' || importedData === null) {
                    throw new Error("O ficheiro JSON é inválido ou não é um objeto.");
                }

                // Guarda os dados (o dataManager irá migrá-los se necessário).
                window.saveOcasoData(importedData);
                showNotification("Dados importados com sucesso! A atualizar a aplicação...", "success");

                // [MUDANÇA CRÍTICA] Em vez de recarregar a página, dispara um evento personalizado.
                // O ocaso-geral.js irá ouvir este evento e reinicializar a vista.
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('ocaso:dataImported'));
                    // Limpa o input para permitir uma nova importação do mesmo ficheiro.
                    if (importInput) importInput.value = '';
                    if (importFileName) importFileName.textContent = 'Nenhum ficheiro selecionado.';
                }, 1000);

            } catch (error) {
                console.error("Erro ao importar o ficheiro:", error);
                if (importFileName) importFileName.textContent = "Erro: Ficheiro inválido!";
                showNotification(error.message || "O ficheiro selecionado é inválido ou está corrompido.", "error");
                if (importInput) importInput.value = '';
            }
        };
        reader.onerror = () => {
             console.error("Erro ao ler o ficheiro.");
             if (importFileName) importFileName.textContent = "Erro ao ler o ficheiro.";
             showNotification("Não foi possível ler o ficheiro.", "error");
        };
        reader.readAsText(file);
    };

    function initializeSettingsSection() {
        if (exportBtn) exportBtn.addEventListener('click', handleExport);
        if (importBtn && importInput) {
            importBtn.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', handleImport);
        }
    }
    
    window.initializeSettingsSection = initializeSettingsSection;
});

