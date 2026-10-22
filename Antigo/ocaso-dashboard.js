// ocaso-dashboard.js - Lógica para o novo Dashboard de Análise Estratégica (v1.1 - Parâmetros Ajustados)

document.addEventListener('DOMContentLoaded', () => {

    function initializeDashboardSection() {
        const dashboardSection = document.getElementById('section-dashboard');
        if (!dashboardSection) return;

        const data = window.getOcasoData();
        
        if (!data.pessoas || data.pessoas.length < 2) {
            dashboardSection.innerHTML = `<div class="toolbar"><h2>Análise Estratégica</h2></div><p class="empty-list-message">Dados insuficientes para gerar uma análise estratégica. Adicione mais pessoas, grupos e relações para começar.</p>`;
            return;
        }
        
        buildDashboardUI(dashboardSection, data);
    }

    function buildDashboardUI(container, data) {
        const { pessoas, grupos, relacionamentos } = data;

        // [AJUSTE] O limite para conflito foi reduzido para -15 para ser detetado mais cedo.
        const conflitos = Object.entries(relacionamentos)
            .map(([key, score]) => ({ key, score }))
            .filter(rel => rel.score <= -15) 
            .sort((a, b) => a.score - b.score);

        // A lógica de Pessoas-Chave permanece a mesma (membro de mais de 1 grupo)
        const personGroupMap = {};
        pessoas.forEach(p => personGroupMap[p.id] = []);
        grupos.forEach(g => {
            g.members.forEach(mId => {
                if (personGroupMap[mId]) {
                    personGroupMap[mId].push(g);
                }
            });
        });
        const pessoasChave = Object.entries(personGroupMap)
            .map(([personId, personGrupos]) => ({ personId, personGrupos }))
            .filter(item => item.personGrupos.length > 1)
            .sort((a, b) => b.personGrupos.length - a.personGrupos.length);
            
        // A lógica de Tensões Latentes permanece a mesma
        const tensoes = [];
        const rivalGroups = grupos.filter(g => g.type === 'rivais');
        const allRivalMembers = new Set(rivalGroups.flatMap(g => g.members));

        allRivalMembers.forEach(memberAId => {
            allRivalMembers.forEach(memberBId => {
                if (memberAId >= memberBId) return; 

                const groupA = grupos.find(g => g.members.includes(memberAId));
                const groupB = grupos.find(g => g.members.includes(memberBId));

                if (groupA && groupB && groupA.id !== groupB.id) {
                     const relKey = [memberAId, memberBId].sort().join('-');
                    if (!relacionamentos[relKey]) { 
                        tensoes.push({ p1: memberAId, p2: memberBId });
                    }
                }
            });
        });
        
        // A lógica de Alianças Prováveis permanece a mesma
        const aliancas = [];
        for(let i = 0; i < pessoas.length; i++) {
            for(let j = i + 1; j < pessoas.length; j++) {
                const p1Id = pessoas[i].id;
                const p2Id = pessoas[j].id;

                const commonRivals = findCommonRivals(p1Id, p2Id, data);
                const relKey = [p1Id, p2Id].sort().join('-');
                const areFriends = getAffiliation(p1Id, p2Id, data) === 'amigos';

                if (commonRivals.length > 0 && !relacionamentos[relKey] && !areFriends) {
                     aliancas.push({p1: p1Id, p2: p2Id, commonRivalId: commonRivals[0]});
                }
            }
        }

        container.innerHTML = `
            <div class="toolbar">
                <h2>Análise Estratégica</h2>
            </div>
            <div class="dashboard-grid">
                <div class="dashboard-card card-large card-conflito">
                    <div class="dashboard-card-header">
                        <div class="icon"><i class="fas fa-exclamation-triangle"></i></div>
                        <h3>Alerta de Conflito Iminente</h3>
                    </div>
                    <div class="dashboard-card-content" id="dashboard-conflitos"></div>
                </div>
                 <div class="dashboard-card card-small card-chave">
                    <div class="dashboard-card-header">
                        <div class="icon"><i class="fas fa-key"></i></div>
                        <h3>Pessoas-Chave</h3>
                    </div>
                    <div class="dashboard-card-content" id="dashboard-pessoas-chave"></div>
                </div>
                <div class="dashboard-card card-medium card-tensao">
                    <div class="dashboard-card-header">
                        <div class="icon"><i class="fas fa-search"></i></div>
                        <h3>Pontos de Tensão Latente</h3>
                    </div>
                    <div class="dashboard-card-content" id="dashboard-tensoes"></div>
                </div>
                <div class="dashboard-card card-medium card-alianca">
                    <div class="dashboard-card-header">
                        <div class="icon"><i class="fas fa-handshake"></i></div>
                        <h3>Alianças Prováveis</h3>
                    </div>
                    <div class="dashboard-card-content" id="dashboard-aliancas"></div>
                </div>
            </div>
        `;
        
        renderConflictList(document.getElementById('dashboard-conflitos'), conflitos.slice(0, 5), pessoas);
        renderKeyPersonList(document.getElementById('dashboard-pessoas-chave'), pessoasChave.slice(0, 5), pessoas);
        renderTensionList(document.getElementById('dashboard-tensoes'), tensoes.slice(0, 5), pessoas);
        renderAllianceList(document.getElementById('dashboard-aliancas'), aliancas.slice(0, 5), pessoas);
    }

    function getAffiliation(p1Id, p2Id, data) {
        for (const grupo of data.grupos) {
            const p1InGroup = grupo.members.includes(p1Id);
            const p2InGroup = grupo.members.includes(p2Id);
            if (p1InGroup && p2InGroup) {
                return grupo.type;
            }
        }
        return 'neutro';
    }

    function findCommonRivals(p1Id, p2Id, data) {
        const p1Groups = data.grupos.filter(g => g.members.includes(p1Id));
        const p2Groups = data.grupos.filter(g => g.members.includes(p2Id));
        const p1Rivals = new Set();
        const p2Rivals = new Set();

        p1Groups.forEach(g => {
            if (g.type === 'rivais') g.members.forEach(m => { if(m !== p1Id) p1Rivals.add(m); });
        });
        p2Groups.forEach(g => {
            if (g.type === 'rivais') g.members.forEach(m => { if(m !== p2Id) p2Rivals.add(m); });
        });

        return [...p1Rivals].filter(rival => p2Rivals.has(rival));
    }

    function renderConflictList(container, conflitos, allPessoas) {
        if (!container) return;
        if (conflitos.length === 0) {
            // [NOVO] Mensagem de ajuda adicionada
            container.innerHTML = `<p class="dashboard-placeholder">Nenhuma relação crítica (score < -15) encontrada. Crie casos com eventos negativos entre pessoas para gerar alertas.</p>`;
            return;
        }
        container.innerHTML = conflitos.map(rel => {
            const [p1Id, p2Id] = rel.key.split('-');
            const p1 = allPessoas.find(p => p.id === p1Id);
            const p2 = allPessoas.find(p => p.id === p2Id);
            if (!p1 || !p2) return '';
            return `
                <div class="relation-item conflito">
                    <div class="relation-pair">
                        <img src="${p1.photo}" alt="${p1.artisticName}" title="${p1.artisticName}">
                        <strong>${p1.artisticName}</strong>
                        <span class="separator"><i class="fas fa-arrows-alt-h"></i></span>
                        <strong>${p2.artisticName}</strong>
                        <img src="${p2.photo}" alt="${p2.artisticName}" title="${p2.artisticName}">
                    </div>
                    <div class="relation-score negative">${rel.score}</div>
                </div>
            `;
        }).join('');
    }

    function renderKeyPersonList(container, pessoasChave, allPessoas) {
        if (!container) return;
        if (pessoasChave.length === 0) {
            // [NOVO] Mensagem de ajuda adicionada
            container.innerHTML = `<p class="dashboard-placeholder">Nenhuma pessoa-chave identificada. Uma pessoa-chave pertence a mais do que um grupo.</p>`;
            return;
        }
        container.innerHTML = pessoasChave.map(item => {
            const pessoa = allPessoas.find(p => p.id === item.personId);
            if (!pessoa) return '';
            const groupsHTML = item.personGrupos.map(g => `<span class="group-tag" style="border-color: ${g.type === 'amigos' ? 'var(--ocaso-sucesso)' : g.type === 'rivais' ? 'var(--ocaso-erro)' : 'var(--ocaso-borda)'}">${g.name}</span>`).join('');
            return `
                <div class="key-person-item">
                    <div class="key-person-info">
                         <img src="${pessoa.photo}" alt="${pessoa.artisticName}" title="${pessoa.artisticName}">
                         <strong>${pessoa.artisticName}</strong>
                    </div>
                    <div class="key-person-groups">${groupsHTML}</div>
                </div>
            `;
        }).join('');
    }
    
    function renderTensionList(container, tensoes, allPessoas) {
        if (!container) return;
         if (tensoes.length === 0) {
            // [NOVO] Mensagem de ajuda adicionada
            container.innerHTML = `<p class="dashboard-placeholder">Nenhuma tensão latente. Crie grupos de 'Rivais' para que o sistema possa analisar possíveis pontos de conflito.</p>`;
            return;
        }
        container.innerHTML = tensoes.map(item => {
            const p1 = allPessoas.find(p => p.id === item.p1);
            const p2 = allPessoas.find(p => p.id === item.p2);
            if (!p1 || !p2) return '';
            return `
                 <div class="relation-item tensao">
                    <div class="relation-pair">
                        <img src="${p1.photo}" alt="${p1.artisticName}" title="${p1.artisticName}">
                        <strong>${p1.artisticName}</strong>
                        <span class="separator"><i class="fas fa-question"></i></span>
                        <strong>${p2.artisticName}</strong>
                        <img src="${p2.photo}" alt="${p2.artisticName}" title="${p2.artisticName}">
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function renderAllianceList(container, aliancas, allPessoas) {
        if (!container) return;
        if (aliancas.length === 0) {
            // [NOVO] Mensagem de ajuda adicionada
            container.innerHTML = `<p class="dashboard-placeholder">Nenhuma aliança provável. Alianças são sugeridas entre pessoas que partilham rivais em comum.</p>`;
            return;
        }
        container.innerHTML = aliancas.map(item => {
            const p1 = allPessoas.find(p => p.id === item.p1);
            const p2 = allPessoas.find(p => p.id === item.p2);
            const rival = allPessoas.find(p => p.id === item.commonRivalId);
            if (!p1 || !p2 || !rival) return '';
            return `
                <div class="alliance-item">
                    <div class="alliance-header">
                        <img src="${p1.photo}" title="${p1.artisticName}">
                        <span class="plus"><i class="fas fa-plus"></i></span>
                        <img src="${p2.photo}" title="${p2.artisticName}">
                        <div class="alliance-names">
                           <strong>${p1.artisticName} & ${p2.artisticName}</strong>
                        </div>
                    </div>
                    <div class="alliance-reason">Rival em comum: <strong>${rival.artisticName}</strong></div>
                </div>
            `;
        }).join('');
    }

    window.initializeDashboardSection = initializeDashboardSection;
});
