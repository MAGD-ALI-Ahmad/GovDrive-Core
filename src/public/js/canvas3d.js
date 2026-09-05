/**
 * GovDrive-Core  ·  3D License Card Animation
 * Uses Three.js r128 (local ./three.min.js)
 * Renders an interactive, mouse-tracked holographic
 * driving-license card on the homepage hero section.
 */

(function () {
  'use strict';

  /* ── Wait until Three.js + DOM are ready ─────────────── */
  function init() {
    const wrap = document.getElementById('license-canvas-wrap');
    if (!wrap || typeof THREE === 'undefined') return;

    /* ── Scene setup ────────────────────────────────────── */
    const W = wrap.clientWidth  || 560;
    const H = wrap.clientHeight || 360;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    wrap.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    /* ── Lighting ────────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const dirLight = new THREE.DirectionalLight(0x6366f1, 1.8);
    dirLight.position.set(3, 4, 3);
    scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x22d3ee, 2.5, 8);
    cyanLight.position.set(-2, 2, 2);
    scene.add(cyanLight);

    const rimLight = new THREE.PointLight(0x818cf8, 1.5, 6);
    rimLight.position.set(2, -1.5, 1);
    scene.add(rimLight);

    /* ── Card geometry ───────────────────────────────────── */
    // Standard credit-card ratio 85.6mm × 53.98mm ≈ 1.586
    const cardGeo = new THREE.BoxGeometry(2.2, 1.386, 0.04, 1, 1, 1);

    /* ── Canvas texture ──────────────────────────────────── */
    const texCanvas = document.createElement('canvas');
    texCanvas.width  = 1024;
    texCanvas.height = 648;
    const ctx = texCanvas.getContext('2d');
    drawCardTexture(ctx, texCanvas.width, texCanvas.height);

    const cardTexture = new THREE.CanvasTexture(texCanvas);

    /* ── Materials ───────────────────────────────────────── */
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: cardTexture,
      metalness: 0.45,
      roughness: 0.2,
      reflectivity: 0.9,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15,
    });
    const edgeMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a6e,
      metalness: 0.8,
      roughness: 0.15,
    });

    const materials = [
      edgeMat,  // +x
      edgeMat,  // -x
      edgeMat,  // +y
      edgeMat,  // -y
      frontMat, // +z (front)
      edgeMat,  // -z (back)
    ];

    const card = new THREE.Mesh(cardGeo, materials);
    card.castShadow = true;
    scene.add(card);

    /* ── Particle field ──────────────────────────────────── */
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x6366f1, size: 0.03, transparent: true, opacity: 0.6,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    /* ── Holographic ring ────────────────────────────────── */
    const ringGeo = new THREE.TorusGeometry(1.6, 0.006, 16, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee, transparent: true, opacity: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    /* ── Mouse tracking ──────────────────────────────────── */
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let isHovered = false;

    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      const my = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      targetRotY =  mx * 0.55;
      targetRotX = -my * 0.35;
      isHovered = true;
    });
    wrap.addEventListener('mouseleave', () => {
      targetRotX = 0;
      targetRotY = 0;
      isHovered = false;
    });

    /* ── Touch support ───────────────────────────────────── */
    wrap.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const rect = wrap.getBoundingClientRect();
      const mx = ((t.clientX - rect.left) / rect.width  - 0.5) * 2;
      const my = ((t.clientY - rect.top)  / rect.height - 0.5) * 2;
      targetRotY =  mx * 0.5;
      targetRotX = -my * 0.3;
    }, { passive: true });
    wrap.addEventListener('touchend', () => { targetRotX = 0; targetRotY = 0; });

    /* ── Resize handler ──────────────────────────────────── */
    const ro = new ResizeObserver(() => {
      const nW = wrap.clientWidth;
      const nH = wrap.clientHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    });
    ro.observe(wrap);

    /* ── Animation loop ──────────────────────────────────── */
    let clock = 0;
    function animate() {
      requestAnimationFrame(animate);
      clock += 0.01;

      // Smooth lerp rotation
      const lerpFactor = isHovered ? 0.08 : 0.04;
      currentRotX += (targetRotX - currentRotX) * lerpFactor;
      currentRotY += (targetRotY - currentRotY) * lerpFactor;

      // Idle float + mouse tracking
      card.rotation.x = currentRotX + Math.sin(clock * 0.5) * 0.06;
      card.rotation.y = currentRotY + Math.sin(clock * 0.3) * 0.08;
      card.position.y = Math.sin(clock * 0.7) * 0.05;

      // Slow ring rotation
      ring.rotation.z += 0.003;
      ring.rotation.x  = Math.PI / 2 + Math.sin(clock * 0.4) * 0.15;

      // Gentle particle drift
      particles.rotation.y += 0.0008;
      particles.rotation.x += 0.0003;

      // Pulse cyan light
      cyanLight.intensity = 2.0 + Math.sin(clock * 1.5) * 0.6;

      renderer.render(scene, camera);
    }
    animate();
  }

  /* ── Draw card face on Canvas2D ──────────────────────── */
  function drawCardTexture(ctx, w, h) {
    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0,   '#060d1f');
    bg.addColorStop(0.4, '#0f2040');
    bg.addColorStop(1,   '#152b55');
    ctx.fillStyle = bg;
    ctx.roundRect(0, 0, w, h, 40);
    ctx.fill();

    // Glossy overlay strip
    const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    gloss.addColorStop(0,   'rgba(255,255,255,0.07)');
    gloss.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.roundRect(0, 0, w, h, 40);
    ctx.fill();

    // Holographic shimmer line
    ctx.save();
    ctx.globalAlpha = 0.18;
    const shimmer = ctx.createLinearGradient(0, h * 0.35, w, h * 0.42);
    shimmer.addColorStop(0,   'transparent');
    shimmer.addColorStop(0.3, '#22d3ee');
    shimmer.addColorStop(0.5, '#818cf8');
    shimmer.addColorStop(0.7, '#22d3ee');
    shimmer.addColorStop(1,   'transparent');
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, h * 0.35, w, h * 0.07);
    ctx.restore();

    // Indigo accent bar (top)
    const accentBar = ctx.createLinearGradient(0, 0, w * 0.3, 0);
    accentBar.addColorStop(0, '#6366f1');
    accentBar.addColorStop(1, '#22d3ee');
    ctx.fillStyle = accentBar;
    ctx.roundRect(40, 36, 260, 10, 5);
    ctx.fill();

    // Country flag strip (left edge vertical line)
    ctx.fillStyle = '#6366f1';
    ctx.roundRect(30, 30, 6, h - 60, 3);
    ctx.fill();

    // Logo / icon circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(80, 90, 28, 0, Math.PI * 2);
    const logoGrad = ctx.createRadialGradient(80, 90, 0, 80, 90, 28);
    logoGrad.addColorStop(0, '#6366f1');
    logoGrad.addColorStop(1, '#22d3ee');
    ctx.fillStyle = logoGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Logo glyph — steering wheel
    ctx.save();
    ctx.translate(80, 90);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    // spokes
    [[0,-16],[13,9],[-13,9]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dx, dy); ctx.stroke();
    });
    ctx.restore();

    // Title
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 38px "Space Grotesk", sans-serif';
    ctx.fillText('GovDrive', 122, 78);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('DRIVER LICENSE', 122, 108);

    // Divider line
    ctx.strokeStyle = 'rgba(99,102,241,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 138); ctx.lineTo(w - 40, 138); ctx.stroke();

    // Placeholder photo box
    ctx.save();
    ctx.strokeStyle = 'rgba(99,102,241,0.4)';
    ctx.lineWidth = 1.5;
    ctx.roundRect(40, 155, 120, 160, 12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(99,102,241,0.08)';
    ctx.roundRect(40, 155, 120, 160, 12);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.font = '42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👤', 100, 250);
    ctx.textAlign = 'left';
    ctx.restore();

    // Field labels & values
    const fields = [
      { label: 'FULL NAME',      value: 'John M. Doe',        x: 200, y: 190 },
      { label: 'NATIONAL NO.',   value: '10012345678901',     x: 200, y: 250 },
      { label: 'DATE OF BIRTH',  value: '01 / JAN / 1990',   x: 200, y: 310 },
      { label: 'LICENSE CLASS',  value: 'Class B — Private',  x: 200, y: 370 },
    ];

    fields.forEach(({ label, value, x, y }) => {
      ctx.fillStyle = '#6366f1';
      ctx.font = '500 14px Inter, sans-serif';
      ctx.fillText(label, x, y - 18);
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 20px "Space Grotesk", sans-serif';
      ctx.fillText(value, x, y);
    });

    // Expiry & Issue
    ctx.fillStyle = '#6366f1';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText('ISSUED', 200, 420);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px "Space Grotesk", sans-serif';
    ctx.fillText('01/01/2024', 200, 442);

    ctx.fillStyle = '#6366f1';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText('EXPIRES', 420, 420);
    ctx.fillStyle = '#22d3ee';
    ctx.font = '18px "Space Grotesk", sans-serif';
    ctx.fillText('01/01/2029', 420, 442);

    // Barcode placeholder
    ctx.save();
    ctx.fillStyle = 'rgba(99,102,241,0.12)';
    ctx.roundRect(40, 480, w - 80, 44, 6);
    ctx.fill();
    for (let i = 0; i < 58; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.2)';
      const bw = i % 3 === 0 ? 5 : 3;
      ctx.fillRect(50 + i * 16, 488, bw, 28);
    }
    ctx.restore();

    // ACTIVE badge
    ctx.save();
    ctx.fillStyle = 'rgba(16,185,129,0.18)';
    ctx.roundRect(w - 160, 36, 110, 36, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16,185,129,0.45)';
    ctx.lineWidth = 1.2;
    ctx.roundRect(w - 160, 36, 110, 36, 18);
    ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('● ACTIVE', w - 105, 60);
    ctx.textAlign = 'left';
    ctx.restore();

    // Bottom gradient fade
    const fade = ctx.createLinearGradient(0, h - 80, 0, h);
    fade.addColorStop(0, 'transparent');
    fade.addColorStop(1, 'rgba(6,13,31,0.5)');
    ctx.fillStyle = fade;
    ctx.roundRect(0, h - 80, w, 80, [0, 0, 40, 40]);
    ctx.fill();
  }

  /* ── Entry point ─────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
