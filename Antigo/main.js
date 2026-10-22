// main.js - Lógica geral da aplicação (Versão 2.9 - Adicionado Módulo Universo Filmes)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seleção dos Elementos da Estrutura ---
    const mainHeader = document.querySelector('.main-header');
    const selectPlacarBtn = document.getElementById('select-placar-youtubers');
    const selectOCasoBtn = document.getElementById('select-o-caso');
    const selectLaboratorioIABtn = document.getElementById('select-laboratorio-ia');
    const selectVideoMakerBtn = document.getElementById('select-video-maker');
    const selectUniversoFilmesBtn = document.getElementById('select-universo-filmes'); // NOVO
    const navPlacar = document.getElementById('nav-placar-youtubers');

    // --- Seleção dos Elementos de Navegação ---
    const allNavLinks = document.querySelectorAll('.main-nav .nav-menu a');
    const contentSections = document.querySelectorAll('.content-section');
    
    // --- Submenus Placar ---
    const gerirButton = document.querySelector('#nav-placar-youtubers .gerir-menu-item > a');
    const gerirSubmenu = document.getElementById('gerir-submenu');
    const plusButton = document.querySelector('#nav-placar-youtubers .plus-menu-item > a');
    const plusSubmenu = document.getElementById('plus-submenu');
    const placarButton = document.querySelector('#nav-placar-youtubers .placar-menu-item > a');
    const placarSubmenu = document.getElementById('placar-submenu');
    const placarProjetosButton = document.querySelector('#nav-placar-youtubers .placar-projetos-menu-item > a');
    const placarProjetosSubmenu = document.getElementById('placar-projetos-submenu');

    // --- Seleção Centralizada de Todos os Modais e Triggers ---
    const modalOverlay = document.getElementById('modal-overlay');
    const allModals = document.querySelectorAll('.modal-content');
    
    // Triggers
    const settingsIcon = document.getElementById('settings-icon');

    // Modais
    const settingsModal = document.getElementById('settings-modal');
    const resetConfirmModal = document.getElementById('reset-confirm-modal');

    // Botões
    const allCloseButtons = document.querySelectorAll('.modal-close-btn');
    const resetDataBtn = document.getElementById('reset-data-btn');
    const resetConfirmYesBtn = document.getElementById('reset-confirm-yes-btn');
    const resetConfirmNoBtn = document.getElementById('reset-confirm-no-btn');

    // --- Funções Globais de UI ---
    window.openModal = function(modal) {
        if (!modal) return;
        allModals.forEach(m => m.style.display = 'none');
        modal.style.display = 'block';
        modalOverlay.classList.add('active');
    }

    window.closeModal = function() {
        modalOverlay.classList.remove('active');
    }

    function switchView(targetId) {
        if (targetId === 'section-home') {
            mainHeader.style.display = 'none';
        } else {
            mainHeader.style.display = 'block';
        }

        contentSections.forEach(section => {
            section.style.display = 'none';
        });
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        allNavLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-target') === targetId) {
                link.classList.add('active');
            }
        });

        const allSubmenus = [gerirSubmenu, plusSubmenu, placarSubmenu, placarProjetosSubmenu];
        allSubmenus.forEach(submenu => {
            if (submenu) submenu.classList.remove('active');
        });
    }


    // --- Event Listeners ---
    if (selectPlacarBtn) {
        selectPlacarBtn.addEventListener('click', () => {
            navPlacar.style.display = 'flex';
            switchView('section-gerir-perfis');
        });
    }
    
    if (selectOCasoBtn) {
        selectOCasoBtn.addEventListener('click', () => {
            window.location.href = 'ocaso.html'; // Redireciona para a página do Caso
        });
    }

    if (selectLaboratorioIABtn) {
        selectLaboratorioIABtn.addEventListener('click', () => {
            window.location.href = 'laboratorio.html'; // Redireciona para a página do Laboratório IA
        });
    }

    if (selectVideoMakerBtn) {
        selectVideoMakerBtn.addEventListener('click', () => {
            window.location.href = 'maker.html'; // Redireciona para a página do Video Maker
        });
    }

    // NOVO: Listener para o módulo Universo Filmes
    if (selectUniversoFilmesBtn) {
        selectUniversoFilmesBtn.addEventListener('click', () => {
            window.location.href = 'universo-filmes.html'; // Redireciona para a página do Universo Filmes
        });
    }

    allNavLinks.forEach(link => {
        if (link.hasAttribute('data-target')) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const targetId = link.getAttribute('data-target');
                if (targetId) {
                    switchView(targetId);
                }
            });
        }
    });

    function setupSubmenuToggle(button, submenu) {
        if (!button || !submenu) return;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isAlreadyActive = submenu.classList.contains('active');
            const allSubmenus = document.querySelectorAll('#nav-placar-youtubers .submenu');
            allSubmenus.forEach(s => s.classList.remove('active'));
            if (!isAlreadyActive) {
                submenu.classList.add('active');
            }
        });
    }

    // Configura os submenus do Placar
    setupSubmenuToggle(gerirButton, gerirSubmenu);
    setupSubmenuToggle(plusButton, plusSubmenu);
    setupSubmenuToggle(placarButton, placarSubmenu);
    setupSubmenuToggle(placarProjetosButton, placarProjetosSubmenu);
    
    document.addEventListener('click', () => {
        const allSubmenus = document.querySelectorAll('#nav-placar-youtubers .submenu');
        allSubmenus.forEach(s => s.classList.remove('active'));
    });


    // Listeners para Modais
    if (settingsIcon) {
        settingsIcon.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(settingsModal);
        });
    }

    allCloseButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    if (resetDataBtn) {
        resetDataBtn.addEventListener('click', () => {
            openModal(resetConfirmModal);
        });
    }

    if (resetConfirmYesBtn) {
        resetConfirmYesBtn.addEventListener('click', () => {
            if (window.resetApplicationData) {
                window.resetApplicationData();
            } else {
                alert("Erro: A função de reposição não foi encontrada.");
            }
        });
    }

    if (resetConfirmNoBtn) {
        resetConfirmNoBtn.addEventListener('click', () => {
            openModal(settingsModal);
        });
    }

    // --- Inicialização da Aplicação ---
    switchView('section-home');
});

