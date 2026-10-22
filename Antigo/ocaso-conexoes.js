// ocaso-conexoes.js - Lógica para a secção Rede de Conexões (v2.1 - Correção de Erro de Inicialização)

document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos Globais da Secção ---
    let canvas, sidebar, searchInput, searchResultsContainer, ctx, wrapper;
    let ocasoData = {};
    let nodes = [], links = [];

    // --- Estado do Gráfico ---
    let selectedNode = null;
    let isDragging = false, draggedNode = null;
    let mouseOffset = { x: 0, y: 0 };
    let animationFrameId;
    
    // --- Estado da Sidebar de Análise ---
    let activePanels = []; // Array de personIds a serem exibidos

    function initializeConexoesSection() {
        // Selecionar elementos
        canvas = document.getElementById('conexoes-canvas');
        sidebar = document.getElementById('conexoes-comparison-sidebar');
        searchInput = document.getElementById('conexoes-search-input');
        searchResultsContainer = document.getElementById('conexoes-search-results');
        
        if (!canvas || !sidebar || !searchInput || !searchResultsContainer) {
            console.error("Elementos essenciais para a Rede de Conexões não encontrados.");
            return;
        }

        ctx = canvas.getContext('2d');
        wrapper = canvas.parentElement;

        // Adicionar Listeners
        searchInput.addEventListener('input', handlePersonSearch);
        document.addEventListener('click', (e) => { // Clicar fora para fechar resultados
            if (searchInput && !searchInput.contains(e.target)) {
                searchResultsContainer.innerHTML = '';
            }
        });
        
        // [CORREÇÃO] Listeners do canvas movidos para aqui para garantir que 'canvas' existe
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp); // Para o caso de o rato sair do canvas

        // Configurar e iniciar
        setupCanvas();
        renderComparisonSidebar(); // Render inicial da sidebar (com placeholder)
    }

    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        loadAndProcessData();
    }

    function loadAndProcessData() {
        ocasoData = window.getOcasoData(); // Atualiza a variável global
        const ocasoPessoas = ocasoData.pessoas || [];

        // 1. Criar os nós (Nodes) a partir das pessoas
        nodes = ocasoPessoas.map(p => ({
            id: p.id,
            name: p.realName || p.artisticName,
            artisticName: p.artisticName,
            photoUrl: p.photo,
            photo: new Image(),
            radius: 25,
            x: Math.random() * wrapper.clientWidth,
            y: Math.random() * wrapper.clientHeight,
            vx: 0,
            vy: 0
        }));
        
        nodes.forEach(node => {
            node.photo.src = node.photoUrl || 'https://placehold.co/50x50/301934/EAE6F0?text=?';
        });

        // 2. Calcular as ligações (Links) a partir dos dados de relacionamentos
        const allPersonIds = new Set(ocasoPessoas.map(p => p.id));
        links = Object.entries(ocasoData.relacionamentos || {})
            .map(([key, score]) => {
                const [p1Id, p2Id] = key.split('-');
                
                if (!allPersonIds.has(p1Id) || !allPersonIds.has(p2Id)) return null;

                const sourceNode = nodes.find(n => n.id === p1Id);
                const targetNode = nodes.find(n => n.id === p2Id);
                
                if (sourceNode && targetNode) {
                    return { source: sourceNode, target: targetNode, score: score };
                }
                return null;
            }).filter(Boolean);

        startSimulation();
    }
    
    // --- Lógica da Simulação Física ---
    const simulation = {
        attraction: 0.02,
        repulsion: 800,
        damping: 0.95
    };

    function updatePositions() {
        nodes.forEach(node1 => {
            nodes.forEach(node2 => {
                if (node1 === node2) return;
                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                distance = Math.max(1, distance);
                const force = -simulation.repulsion / (distance * distance);
                node1.vx += (dx / distance) * force;
                node1.vy += (dy / distance) * force;
            });
        });

        links.forEach(link => {
            const dx = link.target.x - link.source.x;
            const dy = link.target.y - link.source.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            distance = Math.max(1, distance);
            const force = simulation.attraction * (distance - 150);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            link.source.vx += fx;
            link.source.vy += fy;
            link.target.vx -= fx;
            link.target.vy -= fy;
        });
        
        nodes.forEach(node => {
             if (node === draggedNode) return;
             const dx = (wrapper.clientWidth / 2) - node.x;
             const dy = (wrapper.clientHeight / 2) - node.y;
             node.vx += dx * 0.0005;
             node.vy += dy * 0.0005;
             node.vx *= simulation.damping;
             node.vy *= simulation.damping;
             node.x += node.vx;
             node.y += node.vy;
             node.x = Math.max(node.radius, Math.min(wrapper.clientWidth - node.radius, node.x));
             node.y = Math.max(node.radius, Math.min(wrapper.clientHeight - node.radius, node.y));
        });
    }
    
    // --- Lógica de Desenho no Canvas ---
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        links.forEach(link => {
            ctx.beginPath();
            ctx.moveTo(link.source.x, link.source.y);
            ctx.lineTo(link.target.x, link.target.y);

            let alpha = 0.3;
            if (selectedNode && (link.source === selectedNode || link.target === selectedNode)) {
                alpha = 1;
            }
            
            if(link.score > 10) {
                ctx.strokeStyle = `rgba(32, 240, 160, ${alpha})`;
                ctx.lineWidth = 2.5;
            } else if(link.score < -10) {
                ctx.strokeStyle = `rgba(240, 32, 80, ${alpha})`;
                ctx.lineWidth = 2.5;
            } else {
                ctx.strokeStyle = `rgba(169, 162, 185, ${alpha * 0.5})`;
                ctx.lineWidth = 1;
            }
            ctx.stroke();
        });

        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
            
            let isNeighbor = selectedNode && links.some(l => (l.source === selectedNode && l.target === node) || (l.target === selectedNode && l.source === node));
            
            if (node === selectedNode) {
                ctx.fillStyle = "rgba(160, 32, 240, 0.3)";
                ctx.fill();
                ctx.strokeStyle = "rgba(160, 32, 240, 1)";
                ctx.lineWidth = 3;
            } else if (isNeighbor) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                ctx.fill();
                ctx.strokeStyle = "rgba(160, 32, 240, 0.7)";
                ctx.lineWidth = 1.5;
            } else if (selectedNode) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                ctx.fill();
                ctx.strokeStyle = "rgba(169, 162, 185, 0.2)";
                ctx.lineWidth = 1;
            } else {
                ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                ctx.fill();
                ctx.strokeStyle = "rgba(169, 162, 185, 0.5)";
                ctx.lineWidth = 1;
            }
            ctx.stroke();

            ctx.save();
            ctx.clip();
            try {
                ctx.drawImage(node.photo, node.x - node.radius, node.y - node.radius, node.radius * 2, node.radius * 2);
            } catch(e) {/* Imagem pode não ter carregado ainda */}
            ctx.restore();
        });
    }
    
    function animate() {
        updatePositions();
        draw();
        animationFrameId = requestAnimationFrame(animate);
    }

    function startSimulation() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animate();
    }

    // --- Lógica de Interação ---
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function handleMouseDown(e) {
        const pos = getMousePos(e);
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            const dx = pos.x - node.x;
            const dy = pos.y - node.y;
            if (dx * dx + dy * dy < node.radius * node.radius) {
                isDragging = true;
                draggedNode = node;
                mouseOffset.x = pos.x - node.x;
                mouseOffset.y = pos.y - node.y;
                break;
            }
        }
    }

    function handleMouseMove(e) {
        if (isDragging && draggedNode) {
            const pos = getMousePos(e);
            draggedNode.x = pos.x - mouseOffset.x;
            draggedNode.y = pos.y - mouseOffset.y;
            draggedNode.vx = 0;
            draggedNode.vy = 0;
        }
    }

    function handleMouseUp(e) {
        const wasDragging = isDragging;
        isDragging = false;
        draggedNode = null;

        if (!wasDragging) {
             const pos = getMousePos(e);
             let clickedOnNode = null;
             for (let i = nodes.length - 1; i >= 0; i--) {
                const node = nodes[i];
                const dx = pos.x - node.x;
                const dy = pos.y - node.y;
                if (dx * dx + dy * dy < node.radius * node.radius) {
                    clickedOnNode = node;
                    break;
                }
            }
            handleNodeClick(clickedOnNode);
        }
    }
    
    function handleNodeClick(clickedNode) {
        selectedNode = clickedNode; 
        if (clickedNode) {
            addComparisonPanel(clickedNode.id);
        }
    }

    // --- Lógica de Análise na Sidebar ---
    function handlePersonSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        searchResultsContainer.innerHTML = '';
        if (searchTerm.length < 2) return;

        const filteredPessoas = (ocasoData.pessoas || []).filter(p =>
            !activePanels.includes(p.id) &&
            (p.artisticName.toLowerCase().includes(searchTerm) || (p.realName && p.realName.toLowerCase().includes(searchTerm)))
        );

        filteredPessoas.slice(0, 5).forEach(pessoa => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `<img src="${pessoa.photo}" alt="${pessoa.artisticName}"><div class="info"><strong>${pessoa.artisticName}</strong><small>${pessoa.realName || ''}</small></div>`;
            item.addEventListener('click', () => addComparisonPanel(pessoa.id));
            searchResultsContainer.appendChild(item);
        });
    }
    
    function addComparisonPanel(personId) {
        if (!activePanels.includes(personId)) {
            activePanels.push(personId);
            renderComparisonSidebar();
        }
        searchInput.value = '';
        searchResultsContainer.innerHTML = '';
    }

    function removeComparisonPanel(personId) {
        activePanels = activePanels.filter(id => id !== personId);
        renderComparisonSidebar();
    }
    
    window.analyzePersonInConnections = function(personId) {
        activePanels = [];
        addComparisonPanel(personId);
    }
    
    function renderComparisonSidebar() {
        // Limpa apenas os painéis, mantendo a barra de pesquisa
        const existingPanels = sidebar.querySelectorAll('.comparison-panel, .sidebar-placeholder');
        existingPanels.forEach(p => p.remove());

        if (activePanels.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'sidebar-placeholder';
            placeholder.innerHTML = `<i class="fas fa-search"></i><p>Pesquise ou selecione uma pessoa no mapa para começar a análise.</p>`;
            sidebar.appendChild(placeholder);
            return;
        }

        activePanels.forEach(personId => {
            const panelHTML = createPanelHTML(personId);
            sidebar.insertAdjacentHTML('beforeend', panelHTML);
        });
        
        sidebar.querySelectorAll('.remove-panel-btn').forEach(btn => {
            btn.addEventListener('click', () => removeComparisonPanel(btn.dataset.personId));
        });
    }

    function createPanelHTML(personId) {
        const person = ocasoData.pessoas.find(p => p.id === personId);
        if (!person) return '';

        const personLinks = links
            .filter(l => l.source.id === personId || l.target.id === personId)
            .map(l => {
                const otherPersonNode = l.source.id === personId ? l.target : l.source;
                return {
                    person: ocasoData.pessoas.find(p => p.id === otherPersonNode.id),
                    score: l.score
                };
            })
            .filter(conn => conn.person)
            .sort((a, b) => b.score - a.score);
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        const connectionsHTML = personLinks.map(conn => {
            let scoreClass = 'neutral';
            if (conn.score > 10) { scoreClass = 'positive'; positiveCount++; }
            else if (conn.score < -10) { scoreClass = 'negative'; negativeCount++; }
            
            return `
                <li class="connection-item">
                    <img src="${conn.person.photo}" alt="${conn.person.artisticName}">
                    <div class="connection-info">
                        <strong>${conn.person.artisticName}</strong>
                    </div>
                    <div class="connection-score ${scoreClass}">
                        <span>${conn.score.toFixed(0)}</span>
                    </div>
                </li>`;
        }).join('');

        return `
            <div class="comparison-panel" data-person-id="${personId}">
                <div class="panel-header">
                    <div class="person-info">
                        <img src="${person.photo}" alt="${person.artisticName}">
                        <h5>${person.artisticName}</h5>
                    </div>
                    <div class="panel-controls">
                        <button class="icon-button remove-panel-btn" data-person-id="${personId}" title="Remover Painel"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="connection-summary">
                        <div class="summary-item positive">
                            <i class="fas fa-heart"></i>
                            <div>
                                <strong>Relações Positivas</strong>
                                <span>${positiveCount}</span>
                            </div>
                        </div>
                        <div class="summary-item negative">
                            <i class="fas fa-heart-broken"></i>
                            <div>
                                <strong>Relações Negativas</strong>
                                <span>${negativeCount}</span>
                            </div>
                        </div>
                    </div>
                    <div class="person-connections-list">
                        <h4>Todas as Relações</h4>
                        <ul>${connectionsHTML || '<li><small>Nenhuma relação direta encontrada.</small></li>'}</ul>
                    </div>
                </div>
            </div>`;
    }

    // --- Inicialização e Redimensionamento ---
    window.addEventListener('resize', setupCanvas);
    // A inicialização agora é chamada apenas pelo script geral de navegação
    // initializeConexoesSection();

    window.initializeConexoesSection = initializeConexoesSection;
});

