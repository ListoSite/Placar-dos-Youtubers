// projectsBubbleChart.js - Lógica para a Galáxia de Projetos (Versão 3.2 - Tooltip e Drag Corrigidos)

document.addEventListener('DOMContentLoaded', () => {

    const chartSection = document.getElementById('section-projetos-grafico-bola');
    const container = document.getElementById('bubble-chart-container');
    let isRendered = false;

    // --- Funções Auxiliares ---
    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase().replace(/,/g, '.');
        let number = parseFloat(stringValue);
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : parseInt(number, 10);
    }

    function formatViews(num) {
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'K';
        return num.toLocaleString('pt-PT');
    }

    // --- Lógica Principal do Gráfico ---
    function renderGalaxyChart() {
        if (!container || isRendered) return;
        container.innerHTML = '';

        const profiles = window.getData();
        const creatorsWithProjects = profiles.filter(p => p.projects && p.projects.length > 0);

        if (creatorsWithProjects.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Não há criadores com projetos para exibir.</p>';
            return;
        }

        const nodes = [];
        const links = [];
        const color = d3.scaleOrdinal(creatorsWithProjects.map(d => d.id), d3.schemeCategory10);

        creatorsWithProjects.forEach(creator => {
            const creatorNode = {
                id: creator.id,
                type: 'creator',
                name: creator.name,
                photo: creator.photo,
                radius: 18 + creator.projects.length * 2.5,
                projectCount: creator.projects.length,
                totalViews: creator.projects.reduce((sum, p) => sum + parseViews(p.views), 0),
                color: color(creator.id)
            };
            nodes.push(creatorNode);

            creator.projects.forEach(project => {
                const projectNode = {
                    id: project.id,
                    type: 'project',
                    name: project.name,
                    logo: project.logo,
                    views: parseViews(project.views),
                    episodes: project.episodes,
                    radius: 6 + Math.sqrt(parseViews(project.views)) / 800,
                    color: color(creator.id),
                    creatorName: creator.name
                };
                nodes.push(projectNode);
                links.push({ source: creator.id, target: project.id });
            });
        });

        const width = container.clientWidth;
        const height = container.clientHeight;

        const svg = d3.select(container).append("svg");
        const tooltip = d3.select(container).append("div").attr("class", "bubble-tooltip");
        
        const g = svg.append("g");

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.source.radius + d.target.radius + 20).strength(0.6))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(d => d.radius + 4));

        const link = g.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.15)
            .selectAll("line")
            .data(links)
            .join("line");

        // Função para arrastar os nós
        const drag = simulation => {
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("class", "node")
            .on("mouseover", (event, d) => {
                tooltip.classed("visible", true);
                updateTooltip(d);
            })
            .on("mousemove", (event) => {
                // CORREÇÃO: Usa d3.pointer para obter a posição correta relativa ao container
                const [x, y] = d3.pointer(event, container);
                tooltip.style("left", (x + 20) + "px")
                       .style("top", (y) + "px"); // Posiciona o tooltip ao lado do cursor
            })
            .on("mouseout", () => {
                tooltip.classed("visible", false);
            })
            .call(drag(simulation)); // Adiciona a funcionalidade de arrastar aos nós

        node.append("circle")
            .attr("r", d => d.radius)
            .attr("fill", d => d.color)
            .attr("class", d => d.type === 'creator' ? 'creator-node' : 'project-node');
        
        node.append("text")
             .attr("class", "node-label")
             .attr("dy", d => d.radius + 12)
             .text(d => d.name);
        
        const zoomHandler = d3.zoom()
            .scaleExtent([0.2, 5])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        
        // Impede que o zoom seja ativado ao arrastar um nó
        node.on("mousedown", (event) => event.stopPropagation());
        
        svg.call(zoomHandler);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x}, ${d.y})`);
            
            node.each(function(d) {
                const currentScale = d3.zoomTransform(svg.node()).k;
                const isVisible = d.radius * currentScale > 10;
                d3.select(this).classed("visible", isVisible);
            });
        });

        function updateTooltip(d) {
            if (d.type === 'creator') {
                tooltip.html(`
                    <div class="tooltip-header">
                        <img src="${d.photo}" class="tooltip-logo" onerror="this.src='https://placehold.co/60x60/400414/a0a0a0?text=Foto'">
                        <div class="tooltip-title-container">
                            <h3 class="tooltip-name">${d.name}</h3>
                            <p class="tooltip-subtitle">Criador de Conteúdo</p>
                        </div>
                    </div>
                    <div class="tooltip-body">
                        <div class="tooltip-stat">
                            <span class="tooltip-stat-label">Total Views</span>
                            <span class="tooltip-stat-value highlight">${formatViews(d.totalViews)}</span>
                        </div>
                        <div class="tooltip-stat">
                            <span class="tooltip-stat-label">Nº de Projetos</span>
                            <span class="tooltip-stat-value">${d.projectCount}</span>
                        </div>
                    </div>
                `);
            } else {
                tooltip.html(`
                    <div class="tooltip-header">
                        <img src="${d.logo}" class="tooltip-logo project" onerror="this.src='https://placehold.co/60x60/400414/a0a0a0?text=Logo'">
                        <div class="tooltip-title-container">
                            <h3 class="tooltip-name">${d.name}</h3>
                            <p class="tooltip-subtitle">Por: ${d.creatorName}</p>
                        </div>
                    </div>
                    <div class="tooltip-body">
                        <div class="tooltip-stat">
                            <span class="tooltip-stat-label">Views</span>
                            <span class="tooltip-stat-value highlight">${formatViews(d.views)}</span>
                        </div>
                        <div class="tooltip-stat">
                            <span class="tooltip-stat-label">Episódios</span>
                            <span class="tooltip-stat-value">${d.episodes}</span>
                        </div>
                    </div>
                `);
            }
        }

        isRendered = true;
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = chartSection.style.display !== 'none';
                if (isVisible) {
                    renderGalaxyChart();
                } else {
                    isRendered = false;
                    container.innerHTML = '';
                }
            }
        }
    });

    if (chartSection) {
        observer.observe(chartSection, { attributes: true });
    }
});
