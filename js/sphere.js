function initHeroSphere() {
  const container = document.getElementById('globe-canvas-wrapper');
  if (!container || typeof THREE === 'undefined') return;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 3.4;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const group = new THREE.Group();
  scene.add(group);

  const radius = 1.1, count = 7500;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    pos[i*3]   = radius * Math.cos(theta) * Math.sin(phi);
    pos[i*3+1] = radius * Math.sin(theta) * Math.sin(phi);
    pos[i*3+2] = radius * Math.cos(phi);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const dark = document.documentElement.classList.contains('dark');
  const ptMat = new THREE.PointsMaterial({ color: dark ? 0xcccccc : 0x444444, size: 0.012, transparent: true, opacity: 0.85 });
  group.add(new THREE.Points(geo, ptMat));

  const wireMat = new THREE.MeshBasicMaterial({ color: dark ? 0x222222 : 0xdddddd, wireframe: true, transparent: true, opacity: 0.25 });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 0.98, 24, 24), wireMat));

  gsap.to(group.rotation, { y: Math.PI * 2, duration: 35, repeat: -1, ease: 'none' });
  (function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); })();

  new MutationObserver(() => {
    const d = document.documentElement.classList.contains('dark');
    ptMat.color.setHex(d ? 0xcccccc : 0x444444);
    wireMat.color.setHex(d ? 0x222222 : 0xdddddd);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}
