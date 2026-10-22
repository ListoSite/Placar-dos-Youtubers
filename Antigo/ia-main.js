// js/ia-main.js - Lógica geral e de navegação para o Laboratório IA

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const contentSections = document.querySelectorAll('.ia-main-content .content-section');

    // Mapeia cada secção à sua função de inicialização
    const sectionInitializers = {
        'section-dashboard': window.initializeDashboard,
        'section-galeria': window.initializeGaleria,
    };

    // Objeto para garantir que cada inicializador corre apenas uma vez
    const initializedSections = {};

    function switchTab(targetId) {
        contentSections.forEach(section => {
            section.classList.remove('active');
        });
        navLinks.forEach(navLink => {
            navLink.classList.remove('active');
        });

        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        const targetLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }

        // Executa a função de inicialização da secção, se existir e não tiver sido executada
        if (sectionInitializers[targetId] && !initializedSections[targetId]) {
            sectionInitializers[targetId]();
            initializedSections[targetId] = true; // Marca como inicializada
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (targetId) {
                switchTab(targetId);
            }
        });
    });

    // Ativa a secção inicial e corre o seu inicializador
    const initialTab = document.querySelector('.sidebar-nav .nav-link.active');
    if (initialTab) {
        switchTab(initialTab.getAttribute('data-target'));
    }
});
