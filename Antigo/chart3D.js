// chart3D.js - Lógica para o Gráfico 3D de Visualizações (Versão 2.4 - Correção de Reinicialização)

document.addEventListener('DOMContentLoaded', () => {

    const chartSection = document.getElementById('section-grafico-3d');
    let container, infoPanel;

    let scene, camera, renderer, controls, raycaster, mouse;
    let bars = [], labels = [];
    let INTERSECTED, isDetailedView = false, animationFrameId;
    let allProfilesSorted = [], comparisonObjects = [];
    const barWidth = 12;
    let isInitialized = false; // Flag para controlar a inicialização

    function parseViews(viewsStr) {
        if (typeof viewsStr !== 'string' && typeof viewsStr !== 'number') return 0;
        const stringValue = String(viewsStr).toUpperCase();
        let number = parseFloat(stringValue.replace(',', '.'));
        if (stringValue.includes('M')) number *= 1000000;
        else if (stringValue.includes('K')) number *= 1000;
        return isNaN(number) ? 0 : number;
    }

    function formatViews(viewsValue) {
        const num = parseViews(String(viewsValue));
        if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'K';
        return num.toString();
    }

    function createLabelTexture(profile) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const nameText = profile.name;
        context.font = 'bold 24px Inter';
        const nameWidth = context.measureText(nameText).width;
        canvas.width = Math.max(200, nameWidth + 40);
        canvas.height = 100;
        context.fillStyle = 'rgba(20, 20, 20, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'bold 28px Bebas Neue';
        context.fillStyle = '#D9073F';
        context.textAlign = 'center';
        context.fillText(`#${profile.rank}`, canvas.width / 2, 30);
        context.font = 'bold 22px Inter';
        context.fillStyle = 'white';
        context.fillText(nameText, canvas.width / 2, 60);
        context.font = '18px Inter';
        context.fillStyle = '#a0a0a0';
        context.fillText(`${formatViews(profile.stats.views)} Views`, canvas.width / 2, 85);
        return new THREE.CanvasTexture(canvas);
    }

    function init() {
        container = document.getElementById('chart-3d-container');
        infoPanel = document.getElementById('chart-3d-info-panel');
        if (!container || !infoPanel || isInitialized) return;

        isInitialized = true;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x262626);
        camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 70, 180);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.domElement.style.position = 'absolute';
        container.appendChild(renderer.domElement);
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 20, 0);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 75);
        scene.add(directionalLight);
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        
        renderer.domElement.addEventListener('mousemove', onMouseMove, false);
        renderer.domElement.addEventListener('click', onClick, false);
        window.addEventListener('resize', onWindowResize, false);
        
        infoPanel.addEventListener('click', (event) => {
            if (event.target.closest('.info-panel-close-btn')) exitDetailedView();
        });

        const profiles = window.getData();
        allProfilesSorted = [...profiles]
            .filter(p => p.stats)
            .sort((a, b) => parseViews(b.stats.views) - parseViews(a.stats.views))
            .map((p, i) => ({ ...p, rank: i + 1 }));

        createTop20Chart();
        animate();
    }

    function clearChart() {
        [...bars, ...comparisonObjects].forEach(obj => {
            if (obj.userData.label) scene.remove(obj.userData.label);
            scene.remove(obj);
        });
        bars = []; comparisonObjects = []; labels = [];
    }

    function createTop20Chart() {
        clearChart();
        const top20Data = allProfilesSorted.slice(0, 20);
        if (top20Data.length === 0) return;
        const maxViews = top20Data.length > 0 ? parseViews(top20Data[0].stats.views) : 1;
        const gap = 6, gridSide = 5;
        const totalWidth = gridSide * (barWidth + gap);
        top20Data.forEach((profile, i) => {
            const barHeight = Math.max(0.1, (parseViews(profile.stats.views) / maxViews) * 100) || 0.1;
            const x = (i % gridSide) * (barWidth + gap) - totalWidth / 2;
            const z = Math.floor(i / gridSide) * (barWidth + gap) - totalWidth / 2;
            const geometry = new THREE.BoxGeometry(barWidth, barHeight, barWidth);
            const material = new THREE.MeshStandardMaterial({ color: 0xA60522, metalness: 0.3, roughness: 0.6 });
            const bar = new THREE.Mesh(geometry, material);
            bar.position.set(x, barHeight / 2, z);
            const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: createLabelTexture(profile), transparent: true }));
            label.position.set(x, barHeight + 15, z);
            label.scale.set(label.material.map.image.width * 0.15, label.material.map.image.height * 0.15, 1);
            label.visible = false;
            bar.userData = { profile, label };
            scene.add(bar, label);
            bars.push(bar);
        });
    }

    function showDetailedInfoPanel(profile) {
        infoPanel.innerHTML = `
            <button class="info-panel-close-btn"><i class="fas fa-times"></i></button>
            <div class="info-panel-header">
                <img src="${profile.photo}" class="info-panel-photo" onerror="this.src='https://placehold.co/70x70/400414/a0a0a0?text=Foto'">
                <div class="info-panel-title"><h3>${profile.name}</h3><p>${profile.contentType}</p></div>
            </div>
            <div class="info-panel-body">
                <div class="info-panel-stat"><span class="label">Rank Geral</span><span class="value rank">#${profile.rank}</span></div>
                <div class="info-panel-stat"><span class="label">Visualizações</span><span class="value">${formatViews(profile.stats.views)}</span></div>
                <div class="info-panel-stat"><span class="label">Pontos</span><span class="value">${(profile.stats.points || 0).toLocaleString('pt-PT')}</span></div>
            </div>`;
        infoPanel.classList.add('visible');
    }

    function hideDetailedInfoPanel() { 
        if(infoPanel) infoPanel.classList.remove('visible'); 
    }

    function exitDetailedView() {
        if (!isDetailedView) return;
        isDetailedView = false;
        if (renderer) renderer.domElement.style.pointerEvents = 'auto';
        hideDetailedInfoPanel();
        new TWEEN.Tween(camera.position).to({ x: 0, y: 70, z: 180 }, 1000).easing(TWEEN.Easing.Quadratic.InOut).start();
        new TWEEN.Tween(controls.target).to({ x: 0, y: 20, z: 0 }, 1000).easing(TWEEN.Easing.Quadratic.InOut).onComplete(() => controls.enabled = true).start();
        createTop20Chart();
    }

    function animate() {
        if (!isInitialized) return;
        animationFrameId = requestAnimationFrame(animate);
        TWEEN.update();
        controls.update();
        if (renderer) renderer.render(scene, camera);
    }

    function onMouseMove(event) {
        if (isDetailedView || !renderer) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(bars);
        if (intersects.length > 0) {
            if (INTERSECTED !== intersects[0].object) {
                if (INTERSECTED) {
                    INTERSECTED.material.color.set(0xA60522);
                    INTERSECTED.userData.label.visible = false;
                }
                INTERSECTED = intersects[0].object;
                INTERSECTED.material.color.set(0xD9073F);
                INTERSECTED.userData.label.visible = true;
            }
        } else {
            if (INTERSECTED) {
                INTERSECTED.material.color.set(0xA60522);
                INTERSECTED.userData.label.visible = false;
            }
            INTERSECTED = null;
        }
    }

    function onClick() {
        if (isDetailedView || !INTERSECTED) return;
        isDetailedView = true;
        if (renderer) renderer.domElement.style.pointerEvents = 'none';
        showDetailedInfoPanel(INTERSECTED.userData.profile);
        clearChart();
        const clickedProfile = INTERSECTED.userData.profile;
        INTERSECTED = null;
        const topProfile = allProfilesSorted.length > 0 ? allProfilesSorted[0] : null;
        const lastProfile = allProfilesSorted.length >= 50 ? allProfilesSorted[49] : null;
        const profileMap = new Map();
        if (topProfile) profileMap.set(topProfile.id, { profile: topProfile, color: 0xFFD700 });
        if (clickedProfile) profileMap.set(clickedProfile.id, { profile: clickedProfile, color: 0xFFFFFF });
        if (lastProfile) profileMap.set(lastProfile.id, { profile: lastProfile, color: 0xCD7F32 });
        const profilesToCompare = Array.from(profileMap.values());
        const maxViews = topProfile ? parseViews(topProfile.stats.views) : 1;
        const totalWidth = (profilesToCompare.length - 1) * 40;
        profilesToCompare.forEach((item, i) => {
            const xPos = (i * 40) - totalWidth / 2;
            const barHeight = Math.max(0.1, (parseViews(item.profile.stats.views) / maxViews) * 100) || 0.1;
            const geometry = new THREE.BoxGeometry(barWidth, barHeight, barWidth);
            const material = new THREE.MeshStandardMaterial({ color: item.color, metalness: 0.3, roughness: 0.6 });
            const bar = new THREE.Mesh(geometry, material);
            bar.position.set(xPos, barHeight / 2, 30);
            const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: createLabelTexture(item.profile) }));
            label.position.set(xPos, barHeight + 15, 30);
            label.scale.set(label.material.map.image.width * 0.15, label.material.map.image.height * 0.15, 1);
            scene.add(bar, label);
            comparisonObjects.push(bar, label);
        });
        new TWEEN.Tween(camera.position).to({ x: 0, y: 80, z: 150 }, 1500).easing(TWEEN.Easing.Quadratic.InOut).start();
        new TWEEN.Tween(controls.target).to({ x: 0, y: 40, z: 0 }, 1500).easing(TWEEN.Easing.Quadratic.InOut).onComplete(() => controls.enabled = true).start();
    }

    function onWindowResize() {
        if (!isInitialized || !renderer || !camera || !container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function cleanup() {
        if (!isInitialized) return;
        
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onWindowResize);
        
        // CORREÇÃO: Remove apenas o canvas do renderer, não todos os filhos do container.
        if (renderer && renderer.domElement && container) {
            container.removeChild(renderer.domElement);
        }
        
        renderer?.dispose();
        // Limpar todas as variáveis para um estado limpo
        scene = null;
        camera = null;
        controls = null;
        renderer = null;
        bars = [];
        labels = [];
        comparisonObjects = [];
        INTERSECTED = null;
        isInitialized = false;
        isDetailedView = false;
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                const isVisible = chartSection.style.display !== 'none';
                if (isVisible) {
                    init();
                } else {
                    cleanup();
                }
            }
        }
    });

    if (chartSection) observer.observe(chartSection, { attributes: true });
});

