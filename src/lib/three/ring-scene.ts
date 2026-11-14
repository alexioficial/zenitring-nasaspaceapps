import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface RingVisualState {
  connected: boolean;
  pressed: boolean;
  pulse: number;
  emergency: boolean;
}

/** Procedural concept model; the light indicates UI state, not a hardware sensor. */
export function createRingScene(host: HTMLElement, onLost: () => void) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 0.2, 6.2);
  camera.lookAt(0, 0, 0);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  let environment: THREE.WebGLRenderTarget | undefined;
  let observer: ResizeObserver | undefined;
  let intersection: IntersectionObserver | undefined;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false;
  let visible = true;
  let state: RingVisualState = { connected: true, pressed: false, pulse: 0, emergency: false };
  let flashAt = -10000;
  let lastFrame = 0;
  const ring = new THREE.Group();
  scene.add(ring);
  const material = (options: THREE.MeshStandardMaterialParameters) => {
    const result = new THREE.MeshStandardMaterial(options);
    materials.push(result);
    return result;
  };
  const mesh = (geometry: THREE.BufferGeometry, surface: THREE.Material) => {
    geometries.push(geometry);
    const result = new THREE.Mesh(geometry, surface);
    ring.add(result);
    return result;
  };
  const render = (time = performance.now()) => {
    if (disposed) return;
    const animate = !motion.matches;
    ring.rotation.set(0.95 + (animate ? Math.sin(time * 0.00035) * 0.045 : 0), 0.15, -0.38);
    ring.position.y = animate ? Math.sin(time * 0.0008) * 0.035 : 0;
    const flash = animate ? Math.max(0, 1 - (time - flashAt) / 900) : 0;
    ring.scale.setScalar(state.pressed ? 0.96 : 1 + (animate ? flash * 0.025 : 0));
    light.color.set(state.connected ? (state.emergency ? '#ff9a79' : '#9fffe0') : '#a2aab6');
    light.emissive.copy(light.color);
    light.emissiveIntensity = state.connected ? (state.pressed ? 2.5 : 0.7 + flash * 3) : 0.08;
    renderer.render(scene, camera);
  };
  const loop = (time: number) => {
    if (time - lastFrame < 1000 / 30) return;
    lastFrame = time;
    render(time);
  };
  const activity = () => {
    renderer.setAnimationLoop(!document.hidden && visible && !motion.matches ? loop : null);
    if (!document.hidden && visible) render();
  };
  const lost = (event: Event) => {
    event.preventDefault();
    dispose();
    onLost();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    observer?.disconnect();
    intersection?.disconnect();
    document.removeEventListener('visibilitychange', activity);
    motion.removeEventListener('change', activity);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    environment?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
  const light = material({ color: '#9fffe0', emissive: '#9fffe0', roughness: 0.25 });
  try {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
    } finally {
      room.dispose();
      pmrem.dispose();
    }
    const titanium = material({ color: '#aab6c3', metalness: 1, roughness: 0.28 });
    const edge = material({ color: '#dde6ec', metalness: 1, roughness: 0.16 });
    const ceramic = material({ color: '#0b1921', metalness: 0.25, roughness: 0.24 });
    const glass = material({ color: '#24443f', metalness: 0.55, roughness: 0.15 });
    // Closed, rounded cross section revolved around the finger axis (Y).
    const section = new THREE.Shape();
    section.moveTo(0.87, -0.34);
    section.lineTo(1.035, -0.34);
    section.quadraticCurveTo(1.09, -0.34, 1.09, -0.285);
    section.lineTo(1.09, 0.285);
    section.quadraticCurveTo(1.09, 0.34, 1.035, 0.34);
    section.lineTo(0.87, 0.34);
    section.quadraticCurveTo(0.82, 0.34, 0.82, 0.285);
    section.lineTo(0.82, -0.285);
    section.quadraticCurveTo(0.82, -0.34, 0.87, -0.34);
    mesh(new THREE.LatheGeometry(section.getPoints(8), 96), titanium);
    mesh(new THREE.CylinderGeometry(0.818, 0.818, 0.51, 96, 1, true), ceramic);
    ceramic.side = THREE.DoubleSide;
    for (const y of [-0.3, 0.3]) {
      const rail = mesh(new THREE.TorusGeometry(1.065, 0.016, 8, 96), edge);
      rail.rotation.x = Math.PI / 2;
      rail.position.y = y;
    }
    for (const angle of [-0.7, 0, 0.7, Math.PI]) {
      const sensor = mesh(new THREE.BoxGeometry(0.16, 0.21, 0.035), glass);
      sensor.position.set(Math.sin(angle) * 0.801, 0, Math.cos(angle) * 0.801);
      sensor.rotation.y = angle;
      const diode = mesh(new THREE.SphereGeometry(0.025, 12, 8), light);
      diode.position.set(Math.sin(angle) * 0.777, 0, Math.cos(angle) * 0.777);
    }
    const slit = mesh(new THREE.BoxGeometry(0.29, 0.035, 0.018), light);
    slit.position.set(0, 0, 1.095);
    const key = new THREE.DirectionalLight('#e8f3ff', 3);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#9ed9cd', 1.4);
    fill.position.set(4, -2, 2);
    scene.add(fill);
    observer = new ResizeObserver(() => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    });
    observer.observe(host);
    intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      activity();
    });
    intersection.observe(host);
    document.addEventListener('visibilitychange', activity);
    motion.addEventListener('change', activity);
    renderer.domElement.addEventListener('webglcontextlost', lost);
    activity();
    return {
      update(next: RingVisualState) {
        if (disposed) return;
        if (next.pulse !== state.pulse) flashAt = performance.now();
        state = next;
        if (visible && !document.hidden) render();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
