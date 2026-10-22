// ocaso-geral.js - Lógica geral e de navegação para o módulo "O Caso" (v2.1 - Carregamento Robusto)

// [MUDANÇA] Espera pelo evento 'load' em vez de 'DOMContentLoaded'.
// O evento 'load' só é disparado depois de todos os recursos (incluindo todos os scripts)
// terem sido completamente carregados e executados. Isto resolve o problema de temporização.
window.addEventListener('load', () => {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const contentSections = document.querySelectorAll('.ocaso-main-content .content-section');

    const sectionInitializers = {
        'section-casos': window.initializeCasosSection,
        'section-pessoas': window.initializePessoasSection,
        'section-grupos': window.initializeGruposSection,
        'section-conexoes': window.initializeConexoesSection,
        'section-dashboard': window.initializeDashboardSection,
        'section-eventos': window.initializeEventosSection,
        'section-settings': window.initializeSettingsSection,
        'section-analise': window.initializeAnaliseSection
    };

    function switchTab(targetId) {
        contentSections.forEach(section => {
            if (section) {
                section.classList.remove('active');
                section.style.display = 'none';
            }
        });
        navLinks.forEach(navLink => {
            if (navLink) navLink.classList.remove('active');
        });

        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
        }

        const targetLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if (targetLink) targetLink.classList.add('active');

        const initializer = sectionInitializers[targetId];
        if (typeof initializer === 'function') {
            initializer();
        } else {
            // Este aviso só aparecerá agora se um script estiver realmente em falta ou com erro.
            console.warn(`Função de inicialização para a secção '${targetId}' não encontrada.`);
        }
    }

    function reInitializeCurrentView() {
        const activeLink = document.querySelector('.sidebar-nav .nav-link.active');
        if (activeLink) {
            const currentTabId = activeLink.getAttribute('data-target');
            const initializer = sectionInitializers[currentTabId];
            if (typeof initializer === 'function') {
                initializer();
            }
        }
    }
    
    // Adiciona o listener para o evento de importação de dados.
    window.addEventListener('ocaso:dataImported', reInitializeCurrentView);

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (targetId) {
                switchTab(targetId);
            }
        });
    });

    // Ativa a tab inicial
    const activeLink = document.querySelector('.sidebar-nav .nav-link.active') || document.querySelector('.sidebar-nav .nav-link');
    const initialTab = activeLink ? activeLink.getAttribute('data-target') : 'section-casos';
    
    if (initialTab) {
        // O setTimeout já não é necessário porque o evento 'load' garante que tudo está pronto.
        switchTab(initialTab);
    }
    
    window.navigateToSection = switchTab;
});

