document.addEventListener('DOMContentLoaded', () => {

    const profilePicture = document.getElementById('profile-picture');
    const profilePictureInput = document.getElementById('profile-picture-input');
    const statsGrid = document.getElementById('stats-grid');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    let universes = [];

    // ===================================================================
    // FUNÇÕES DE DADOS DO PERFIL
    // ===================================================================

    const loadProfileData = () => {
        const savedPicture = localStorage.getItem('profilePicture');
        if (savedPicture) {
            profilePicture.src = savedPicture;
        }
        const storedUniverses = localStorage.getItem('movieUniverses');
        universes = storedUniverses ? JSON.parse(storedUniverses) : [];
    };

    const saveProfilePicture = (imageData) => {
        localStorage.setItem('profilePicture', imageData);
    };

    // ===================================================================
    // FUNÇÕES DE GESTÃO DE DADOS (IMPORTAR/EXPORTAR)
    // ===================================================================

    const exportData = () => {
        const dataToExport = {
            movieUniverses: localStorage.getItem('movieUniverses') || '[]',
            profilePicture: localStorage.getItem('profilePicture') || null
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `universo-filmes_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const importedData = JSON.parse(event.target.result);

                    if (importedData.movieUniverses) {
                        localStorage.setItem('movieUniverses', importedData.movieUniverses);
                    }
                    if (importedData.profilePicture) {
                        localStorage.setItem('profilePicture', importedData.profilePicture);
                    }

                    alert('Dados importados com sucesso! A página será recarregada.');
                    location.reload();

                } catch (error) {
                    alert('Erro ao ler o ficheiro. Certifica-te que é um ficheiro de backup válido.');
                    console.error("Erro ao importar dados:", error);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    // ===================================================================
    // FUNÇÕES DE CÁLCULO DE ESTATÍSTICAS
    // ===================================================================

    const calculateStats = () => {
        const allItems = universes.flatMap(u => u.timeline);
        const watchedItems = allItems.filter(item => item.status === 'watched');
        const ratedItems = watchedItems.filter(item => typeof item.rating === 'number' && item.rating > 0);
        const moviesWatched = watchedItems.filter(item => item.type === 'movie').length;
        const seriesWatched = watchedItems.filter(item => item.type === 'series').length;
        let bestRated = null;
        if (ratedItems.length > 0) {
            bestRated = ratedItems.reduce((max, item) => item.rating > max.rating ? item : max, ratedItems[0]);
        }
        let worstRated = null;
        if (ratedItems.length > 0) {
            worstRated = ratedItems.reduce((min, item) => item.rating < min.rating ? item : min, ratedItems[0]);
        }
        const totalHours = moviesWatched * 2 + seriesWatched * 10;
        return {
            moviesWatched,
            seriesWatched,
            totalWatched: watchedItems.length,
            bestRated: bestRated ? `${bestRated.title} (${bestRated.rating} ★)` : 'N/A',
            worstRated: worstRated ? `${worstRated.title} (${worstRated.rating} ★)` : 'N/A',
            totalHours,
        };
    };

    // ===================================================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ===================================================================

    const renderStats = (stats) => {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-header"><i data-lucide="film" class="icon-movies"></i><span class="stat-card-title">Filmes Vistos</span></div>
                <p class="stat-card-value">${stats.moviesWatched}</p><p class="stat-card-description">Total de filmes concluídos.</p>
            </div>
            <div class="stat-card">
                <div class="stat-card-header"><i data-lucide="tv" class="icon-series"></i><span class="stat-card-title">Séries Vistas</span></div>
                <p class="stat-card-value">${stats.seriesWatched}</p><p class="stat-card-description">Total de séries concluídas.</p>
            </div>
            <div class="stat-card">
                <div class="stat-card-header"><i data-lucide="swords" class="icon-total"></i><span class="stat-card-title">Total de Itens Vistos</span></div>
                <p class="stat-card-value">${stats.totalWatched}</p><p class="stat-card-description">Filmes e séries combinados.</p>
            </div>
            <div class="stat-card">
                <div class="stat-card-header"><i data-lucide="award" class="icon-best"></i><span class="stat-card-title">Melhor Classificação</span></div>
                <p class="stat-card-value" style="font-size: 1.5rem;">${stats.bestRated}</p><p class="stat-card-description">O item com a tua nota mais alta.</p>
            </div>
            <div class="stat-card">
                <div class="stat-card-header"><i data-lucide="thumbs-down" class="icon-worst"></i><span class="stat-card-title">Pior Classificação</span></div>
                <p class="stat-card-value" style="font-size: 1.5rem;">${stats.worstRated}</p><p class="stat-card-description">O item com a tua nota mais baixa.</p>
            </div>
            <div class="stat-card">
                <div class="stat-card-header"><i data-lucide="clock" class="icon-hours"></i><span class="stat-card-title">Horas de Ecrã (Est.)</span></div>
                <p class="stat-card-value">${stats.totalHours}h</p><p class="stat-card-description">Uma estimativa do tempo investido.</p>
            </div>`;
        lucide.createIcons();
    };

    // ===================================================================
    // EVENT LISTENERS
    // ===================================================================

    profilePictureInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                profilePicture.src = imageData;
                saveProfilePicture(imageData);
            };
            reader.readAsDataURL(file);
        }
    });

    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', importData);

    // ===================================================================
    // INICIALIZAÇÃO
    // ===================================================================
    const init = () => {
        loadProfileData();
        const stats = calculateStats();
        renderStats(stats);
    };

    init();
});

