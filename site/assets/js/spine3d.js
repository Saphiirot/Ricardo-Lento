/* ==========================================================================
   Ricardo Lento — motor 3D
   Coluna vertebral procedural (Three.js) com quatro modos:
     home      → coluna desalinhada que se alinha com o scroll, mapa da dor e
                 morph final em partículas que formam o logótipo
     vertebra  → vértebras lombares em vista explodida (Tratamentos)
     flex      → coluna em movimento / passada de corrida (Desporto)
     logo      → logótipo em partículas interativas (Sobre & Contacto)
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/addons/MeshSurfaceSampler.js';

const COL = {
  bone: 0xeef2f8,
  cyan: 0x35b4f0,
  royal: 0x1f4fd1,
  warm: 0xff6a4d,
};
const mqMobile = matchMedia('(max-width: 820px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const rand = mulberry(7);
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- geometria */
function vertebraGeometry() {
  const parts = [];
  // corpo vertebral: cilindro com "cintura" e secção em rim
  const body = new THREE.CylinderGeometry(0.5, 0.5, 0.42, 44, 6);
  const p = body.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 1 - 0.09 * (1 - (y / 0.21) ** 2);
    p.setX(i, p.getX(i) * k * 1.22);
    p.setZ(i, p.getZ(i) * k);
  }
  body.computeVertexNormals();
  parts.push(body);
  // arco posterior (pedículos + lâmina)
  const arch = new THREE.TorusGeometry(0.3, 0.085, 12, 28, Math.PI);
  arch.rotateX(-Math.PI / 2);
  arch.translate(0, 0, -0.46);
  parts.push(arch);
  // apófise espinhosa
  const sp = new THREE.ConeGeometry(0.1, 0.7, 14);
  sp.rotateX(-Math.PI / 2 - 0.4);
  sp.translate(0, -0.14, -1.05);
  parts.push(sp);
  // apófises transversas + articulares
  for (const s of [-1, 1]) {
    const t = new THREE.CylinderGeometry(0.065, 0.045, 0.5, 10);
    t.rotateZ(Math.PI / 2);
    t.rotateY(s * 0.35);
    t.translate(s * 0.52, 0.02, -0.62);
    parts.push(t);
    const f = new THREE.SphereGeometry(0.075, 12, 10);
    f.translate(s * 0.2, 0.2, -0.62);
    parts.push(f);
    const g = f.clone();
    g.translate(0, -0.4, 0);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

function discGeometry() {
  const g = new THREE.CylinderGeometry(0.47, 0.47, 0.12, 44, 1);
  g.scale(1.2, 1, 1);
  return g;
}

const REGIONS = {
  cervical: [0, 6],
  dorsal: [7, 18],
  lombar: [19, 23],
  all: [0, 23],
};
const TENSION = [5, 11, 21]; // discos em "sobrecarga" no estado desalinhado

function buildSpine(materials) {
  const curve = new THREE.CatmullRomCurve3(
    [
      [0, 5.4, 0.15], [0, 4.6, 0.5], [0, 3.6, 0.35], [0, 2.6, -0.2], [0, 1.2, -0.6],
      [0, -0.2, -0.45], [0, -1.5, 0.0], [0, -2.8, 0.45], [0, -4.1, 0.5], [0, -5.2, 0.1],
    ].map((a) => new THREE.Vector3(...a)),
    false, 'catmullrom', 0.5,
  );
  const L = curve.getLength();
  const sizes = [];
  for (let i = 0; i < 24; i++) {
    if (i < 7) sizes.push(lerp(0.52, 0.66, i / 6));
    else if (i < 19) sizes.push(lerp(0.7, 0.9, (i - 7) / 11));
    else sizes.push(lerp(0.98, 1.1, (i - 19) / 4));
  }
  const total = sizes.reduce((a, s) => a + 0.54 * s, 0);
  const k = (L * 0.97) / total;

  const vGeo = vertebraGeometry();
  const dGeo = discGeometry();
  const group = new THREE.Group();
  const up = new THREE.Vector3(0, 1, 0);
  const at = (dist) => {
    const u = clamp(dist / L, 0, 1);
    const pos = curve.getPointAt(u);
    const q = new THREE.Quaternion().setFromUnitVectors(up, curve.getTangentAt(u).negate());
    return { pos, q, u };
  };
  const verts = [];
  const discs = [];
  let d = L * 0.015;
  sizes.forEach((s0, i) => {
    const S = s0 * k;
    const b = at(d + 0.21 * S);
    const mat = materials.bone.clone();
    const mesh = new THREE.Mesh(vGeo, mat);
    mesh.scale.setScalar(S);
    group.add(mesh);
    // desalinhamento tipo escoliose + ruído
    const ph = b.u * Math.PI * 2.2 + 0.6;
    const off = new THREE.Vector3(0.6 * Math.sin(ph) + (rand() - 0.5) * 0.2, 0, (rand() - 0.5) * 0.24);
    const offQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.8, 0.38 * Math.cos(ph) + (rand() - 0.5) * 0.14),
    );
    verts.push({ i, S, mesh, mat, base: b.pos.clone(), q: b.q.clone(), off, offQ, h: 0 });
    if (i < 23) {
      const c = at(d + 0.48 * S);
      const dm = materials.disc.clone();
      const disc = new THREE.Mesh(dGeo, dm);
      disc.scale.setScalar(S);
      group.add(disc);
      discs.push({ i, S, mesh: disc, mat: dm, base: c.pos.clone(), q: c.q.clone(), tension: TENSION.includes(i) });
    }
    d += 0.54 * S;
  });
  discs.forEach((dc) => {
    const a = verts[dc.i], b = verts[dc.i + 1];
    dc.off = a.off.clone().add(b.off).multiplyScalar(0.5);
    dc.offQ = a.offQ.clone().slerp(b.offQ, 0.5);
  });
  const centers = {};
  for (const [name, [s, e]] of Object.entries(REGIONS)) {
    let y = 0;
    for (let i = s; i <= e; i++) y += verts[i].base.y;
    centers[name] = y / (e - s + 1);
  }
  // canal medular para o fluxo de partículas
  const canal = [];
  for (let i = 0; i <= 240; i++) {
    const u = i / 240;
    const pnt = curve.getPointAt(u);
    canal.push(new THREE.Vector3(pnt.x, pnt.y, pnt.z - 0.42 * lerp(0.6, 1.05, u)));
  }
  return { group, verts, discs, centers, canal, vGeo, dGeo };
}

function applyPose(spine, misalign, tmpQ = new THREE.Quaternion()) {
  const I = new THREE.Quaternion();
  for (const v of spine.verts) {
    v.mesh.position.copy(v.base).addScaledVector(v.off, misalign);
    tmpQ.copy(I).slerp(v.offQ, misalign);
    v.mesh.quaternion.copy(v.q).multiply(tmpQ);
  }
  for (const dc of spine.discs) {
    dc.mesh.position.copy(dc.base).addScaledVector(dc.off, misalign);
    tmpQ.copy(I).slerp(dc.offQ, misalign);
    dc.mesh.quaternion.copy(dc.q).multiply(tmpQ);
  }
}

function sampleSpineSurface(spine, n) {
  applyPose(spine, 0);
  const geos = [];
  for (const o of [...spine.verts, ...spine.discs]) {
    o.mesh.updateMatrix();
    geos.push(o.mesh.geometry.clone().applyMatrix4(o.mesh.matrix));
  }
  const merged = mergeGeometries(geos).toNonIndexed();
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(merged)).build();
  const out = new Float32Array(n * 3);
  const t = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    sampler.sample(t);
    out.set([t.x, t.y, t.z], i * 3);
  }
  merged.dispose();
  geos.forEach((g) => g.dispose());
  return out;
}

async function sampleLogo(n, size = 7.2) {
  const img = new Image();
  img.src = 'assets/brand/logo-rl-dark.png';
  await img.decode();
  const R = 380;
  const c = document.createElement('canvas');
  c.width = c.height = R;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, R, R);
  const data = ctx.getImageData(0, 0, R, R).data;
  const pool = [];
  for (let y = 0; y < R; y++)
    for (let x = 0; x < R; x++) {
      const a = data[(y * R + x) * 4 + 3];
      if (a > 90) pool.push(x, y, a);
    }
  const out = new Float32Array(n * 3);
  const shade = new Float32Array(n);
  const cnt = pool.length / 3;
  for (let i = 0; i < n; i++) {
    const j = Math.floor(rand() * cnt) * 3;
    const x = pool[j] + rand() - 0.5, y = pool[j + 1] + rand() - 0.5;
    out[i * 3] = (x / R - 0.5) * size;
    out[i * 3 + 1] = -(y / R - 0.5) * size;
    out[i * 3 + 2] = (rand() - 0.5) * 0.08;
    shade[i] = pool[j + 2] / 255; // traço cinzento do logótipo fica mais suave
  }
  return { pos: out, shade };
}

/* ------------------------------------------------------------- partículas */
function particleMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMorph: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 2.8 },
      uPR: { value: 1 },
      uOpacity: { value: 0 },
      uMouse: { value: new THREE.Vector3(99, 99, 0) },
      uRepel: { value: 0 },
      uColA: { value: new THREE.Color(0xffffff) },
      uColB: { value: new THREE.Color(COL.cyan) },
    },
    vertexShader: /* glsl */ `
      uniform float uMorph, uTime, uSize, uPR, uRepel;
      uniform vec3 uMouse;
      attribute vec3 aTarget;
      attribute float aRand;
      attribute float aShade;
      varying float vMix;
      varying float vShade;
      void main(){
        float d = clamp(uMorph * 1.4 - aRand * 0.4, 0.0, 1.0);
        float e = d * d * (3.0 - 2.0 * d);
        vec3 p = mix(position, aTarget, e);
        float mid = sin(e * 3.14159);
        p += vec3(sin(aRand * 41.0 + uTime * 0.9), cos(aRand * 23.0 + uTime * 1.1), sin(aRand * 17.0 + uTime * 0.7)) * mid * 1.1;
        p += vec3(sin(uTime * 1.3 + aRand * 30.0), cos(uTime * 1.1 + aRand * 20.0), 0.0) * 0.018;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vec2 dir = wp.xy - uMouse.xy;
        float dist = length(dir);
        wp.xy += normalize(dir + 1e-4) * uRepel * smoothstep(1.7, 0.0, dist) * 0.85;
        vec4 mv = viewMatrix * wp;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR * (0.55 + aRand * 0.9) * (14.0 / -mv.z);
        vMix = step(0.86, aRand);
        vShade = mix(1.0, aShade, e);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColA, uColB;
      varying float vMix;
      varying float vShade;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.05, r);
        vec3 c = mix(uColA, uColB, vMix);
        gl_FragColor = vec4(c, a * uOpacity * (0.35 + 0.65 * vShade));
      }`,
  });
}

function makeParticles(fromPos, target, shade) {
  const n = target.length / 3;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(fromPos, 3));
  g.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) r[i] = rand();
  g.setAttribute('aRand', new THREE.BufferAttribute(r, 1));
  g.setAttribute('aShade', new THREE.BufferAttribute(shade || new Float32Array(n).fill(1), 1));
  const m = particleMaterial();
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeFlow(canal, count) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    size: 0.16, map: dotTexture(), color: COL.cyan, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  const seeds = Array.from({ length: count }, () => ({ u: rand(), v: 0.04 + rand() * 0.07, j: [(rand() - 0.5) * 0.12, (rand() - 0.5) * 0.12] }));
  const N = canal.length - 1;
  pts.userData.update = (dt, speed) => {
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      s.u = (s.u + dt * s.v * speed + 1) % 1;
      const f = s.u * N, k = Math.floor(f), t = f - k;
      const a = canal[k], b = canal[Math.min(k + 1, N)];
      pos[i * 3] = lerp(a.x, b.x, t) + s.j[0];
      pos[i * 3 + 1] = lerp(a.y, b.y, t);
      pos[i * 3 + 2] = lerp(a.z, b.z, t) + s.j[1];
    }
    g.attributes.position.needsUpdate = true;
  };
  return pts;
}

/* ------------------------------------------------------------- base stage */
function createStage(canvas, { fov = 35 } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0, 17);

  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x0b1a3a, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(COL.cyan, 2.6);
  rim.position.set(-6, 2, -6);
  scene.add(rim);
  const back = new THREE.PointLight(COL.royal, 30, 30);
  back.position.set(3, -3, -5);
  scene.add(back);

  const st = { renderer, scene, camera, w: 1, h: 1, pr: 1 };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    st.w = Math.max(1, r.width);
    st.h = Math.max(1, r.height);
    st.pr = Math.min(window.devicePixelRatio || 1, mqMobile.matches ? 1.5 : 1.75);
    renderer.setPixelRatio(st.pr);
    renderer.setSize(st.w, st.h, false);
    camera.aspect = st.w / st.h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);
  st.resize = resize;
  return st;
}

function loop(canvas, frame, { alwaysVisible = false } = {}) {
  let visible = true, running = true, last = performance.now();
  if (!alwaysVisible && 'IntersectionObserver' in window) {
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!running || !visible) return;
    frame(dt, now / 1000);
  };
  requestAnimationFrame(tick);
}

function pointer() {
  const m = { x: 0, y: 0, sx: 0, sy: 0, active: false };
  window.addEventListener('pointermove', (e) => {
    m.x = (e.clientX / innerWidth) * 2 - 1;
    m.y = -((e.clientY / innerHeight) * 2 - 1);
    m.active = true;
  }, { passive: true });
  return m;
}

function materials() {
  return {
    bone: new THREE.MeshPhysicalMaterial({
      color: COL.bone, roughness: 0.34, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.35,
      sheen: 0.5, sheenColor: new THREE.Color(0x9fd8ff), sheenRoughness: 0.45,
      envMapIntensity: 0.7, transparent: true, emissive: new THREE.Color(COL.cyan), emissiveIntensity: 0,
    }),
    disc: new THREE.MeshPhysicalMaterial({
      color: 0x8fd9ff, emissive: new THREE.Color(COL.cyan), emissiveIntensity: 0.45,
      roughness: 0.22, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.94, envMapIntensity: 0.6,
    }),
  };
}

/* ================================================================ HOME */
const PRESETS = {
  desktop: {
    hero:        { x: 3.3, y: 0, rotY: -0.55, rotX: 0.06, scale: 1, camZ: 17, camY: 0, focus: null, align: 0, tension: 1, flow: 0, morph: 0, opacity: 1, spin: 0.16, hud: 1, region: null },
    align:       { x: -3.5, y: 0, rotY: -1.32, rotX: 0.02, scale: 1, camZ: 17, camY: 0, focus: null, align: 1, tension: 0, flow: 1, morph: 0, opacity: 1, spin: 0.03, hud: 0, region: null },
    'map-cervical': { x: 3.0, y: 0, rotY: -1.05, rotX: 0, scale: 1, camZ: 9.5, camY: 0, focus: 'cervical', align: 1, tension: 0, flow: 0.6, morph: 0, opacity: 1, spin: 0.02, hud: 0, region: 'cervical' },
    'map-dorsal':   { x: 3.0, y: 0, rotY: -0.65, rotX: 0, scale: 1, camZ: 11.5, camY: 0, focus: 'dorsal', align: 1, tension: 0, flow: 0.6, morph: 0, opacity: 1, spin: 0.02, hud: 0, region: 'dorsal' },
    'map-lombar':   { x: 3.0, y: 0, rotY: -1.2, rotX: 0, scale: 1, camZ: 10, camY: 0, focus: 'lombar', align: 1, tension: 0, flow: 0.6, morph: 0, opacity: 1, spin: 0.02, hud: 0, region: 'lombar' },
    'map-desporto': { x: 3.0, y: 0, rotY: -0.3, rotX: 0, scale: 1, camZ: 16.5, camY: 0, focus: null, align: 1, tension: 0, flow: 1.6, morph: 0, opacity: 1, spin: 0.25, hud: 0, region: 'all' },
    rest:        { x: 0, y: -2, rotY: -0.5, rotX: 0, scale: 1, camZ: 17, camY: 0, focus: null, align: 1, tension: 0, flow: 0.5, morph: 0, opacity: 0, spin: 0.05, hud: 0, region: null },
    logo:        { x: 3.0, y: 0, rotY: 0, rotX: 0, scale: 1, camZ: 16, camY: 0, focus: null, align: 1, tension: 0, flow: 0, morph: 1, opacity: 1, spin: 0, hud: 0, region: null },
  },
};
PRESETS.mobile = Object.fromEntries(
  Object.entries(PRESETS.desktop).map(([k, v]) => {
    const m = { ...v, x: 0 };
    if (k === 'hero') Object.assign(m, { y: 2.35, scale: 0.46, opacity: 0.95, rotY: -0.7 });
    if (k === 'align') Object.assign(m, { x: 1.6, y: 0.4, scale: 0.5, opacity: 0.22 });
    if (k.startsWith('map')) Object.assign(m, { scale: 0.62, camZ: k === 'map-desporto' ? 17 : 12, camY: -2.9 });
    if (k === 'logo') Object.assign(m, { y: 2.75, scale: 0.52, camZ: 17 });
    return [k, m];
  }),
);
const NUM_KEYS = ['x', 'y', 'rotY', 'rotX', 'scale', 'camZ', 'camY', 'align', 'tension', 'flow', 'morph', 'opacity', 'spin', 'hud'];

async function initHome(canvas) {
  const st = createStage(canvas);
  if (!st) return;
  const { scene, camera, renderer } = st;
  const mats = materials();
  const spine = buildSpine(mats);
  const root = new THREE.Group();
  root.add(spine.group);
  scene.add(root);

  const flow = makeFlow(spine.canal, mqMobile.matches ? 160 : 280);
  spine.group.add(flow);

  // partículas: superfície da coluna alinhada → logótipo
  const N = mqMobile.matches ? 6500 : 13000;
  const fromPos = sampleSpineSurface(spine, N);
  const logo = await sampleLogo(N, 6.6);
  const particles = makeParticles(fromPos, logo.pos, logo.shade);
  const pGroup = new THREE.Group();
  pGroup.add(particles);
  scene.add(pGroup);

  const anchors = [...document.querySelectorAll('[data-3d]')].map((el) => ({ el, key: el.dataset['3d'] }));
  const huds = [...document.querySelectorAll('[data-hud]')].map((el) => ({
    el, i: +el.dataset.hud, region: el.dataset.hudRegion || null, left: el.classList.contains('left'), o: 0,
  }));
  const mouse = pointer();

  const table = () => (mqMobile.matches ? PRESETS.mobile : PRESETS.desktop);
  const cur = { ...table().hero };
  let region = null;

  function target() {
    const T = table();
    if (reduced) {
      const pre = { ...T.align, x: T.hero.x, y: T.hero.y, scale: T.hero.scale, spin: 0, flow: 0 };
      return pre;
    }
    const sy = window.scrollY, vh = innerHeight;
    const pts = anchors.map((a) => {
      const r = a.el.getBoundingClientRect();
      return { f: r.top + sy + r.height / 2 - vh / 2, p: T[a.key] || T.rest };
    });
    if (!pts.length) return T.hero;
    if (sy <= pts[0].f) return pts[0].p;
    for (let i = 0; i < pts.length - 1; i++) {
      if (sy < pts[i + 1].f) {
        let t = (sy - pts[i].f) / Math.max(1, pts[i + 1].f - pts[i].f);
        t = smooth(clamp((t - 0.18) / 0.64));
        const a = pts[i].p, b = pts[i + 1].p;
        const o = {};
        for (const k of NUM_KEYS) o[k] = lerp(a[k], b[k], t);
        o.region = t < 0.5 ? a.region : b.region;
        o.focus = t < 0.5 ? a.focus : b.focus;
        o.focusA = a.focus; o.focusB = b.focus; o.t = t;
        // ao atravessar o ecrã, a coluna recua para o fundo e fica mais discreta
        const dip = Math.sin(Math.PI * t) * Math.min(1, Math.abs(b.x - a.x) / 4);
        o.camZ += 11 * dip;
        o.opacity *= 1 - 0.6 * dip;
        o.hud *= 1 - dip;
        return o;
      }
    }
    return pts[pts.length - 1].p;
  }

  const tmpQ = new THREE.Quaternion();
  const I = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const pQ = new THREE.Quaternion();
  const warm = new THREE.Color(COL.warm), cyan = new THREE.Color(COL.cyan);
  let spinAngle = 0;
  let regionOn = 0;
  const boneC = new THREE.Color(COL.bone), dimC = new THREE.Color(0x3a4766), glowC = new THREE.Color(0xbfe8fb);

  const focusY = (f, scale) => (f ? spine.centers[f] * scale : 0);

  loop(canvas, (dt, time) => {
    const tg = target();
    const damp = 1 - Math.exp(-dt * 4.2);
    for (const k of NUM_KEYS) cur[k] = lerp(cur[k], tg[k], damp);
    region = tg.region;
    // foco da câmara (interpolado entre regiões)
    let fy;
    if (tg.focusA !== undefined) fy = lerp(focusY(tg.focusA, cur.scale), focusY(tg.focusB, cur.scale), tg.t);
    else fy = focusY(tg.focus, cur.scale);
    cur.fy = lerp(cur.fy ?? fy, fy, damp);

    mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.05);
    spinAngle += dt * cur.spin;

    const mis = smooth(clamp(1 - cur.align));
    applyPose(spine, mis, tmpQ);

    // destaque por região
    const R = region ? REGIONS[region] : null;
    regionOn = lerp(regionOn, R && region !== 'all' ? 1 : 0, 1 - Math.exp(-dt * 5));
    for (const v of spine.verts) {
      const on = R && v.i >= R[0] && v.i <= R[1] ? 1 : 0;
      v.h = lerp(v.h, on, 1 - Math.exp(-dt * 6));
      const dim = regionOn * (1 - v.h);
      v.dim = dim;
      v.mat.color.copy(boneC).lerp(dimC, dim * 0.9).lerp(glowC, v.h * regionOn * 0.45);
      v.mat.emissiveIntensity = v.h * (region === 'all' ? 0.28 : 0.85) * (0.85 + 0.15 * Math.sin(time * 3 + v.i * 0.5));
      v.mat.opacity = cur.opacity * (1 - smooth(clamp(cur.morph * 2.4))) * (1 - 0.72 * dim);
      v.mesh.visible = v.mat.opacity > 0.01;
    }
    for (const dc of spine.discs) {
      const tens = dc.tension ? cur.tension * mis : 0;
      const pulse = 0.5 + 0.5 * Math.sin(time * 4 + dc.i);
      dc.mat.emissive.copy(cyan).lerp(warm, tens);
      dc.mat.color.set(0x8fd9ff).lerp(warm, tens * 0.8);
      dc.mat.emissiveIntensity = 0.4 + tens * (0.8 + pulse * 1.2);
      const ddim = Math.min(spine.verts[dc.i].dim ?? 0, spine.verts[dc.i + 1].dim ?? 0);
      dc.mat.opacity = 0.94 * cur.opacity * (1 - smooth(clamp(cur.morph * 2.4))) * (1 - 0.75 * ddim);
      dc.mesh.visible = dc.mat.opacity > 0.01;
    }

    flow.userData.update(dt, 1 + cur.flow * 1.5);
    flow.material.opacity = 0.85 * clamp(cur.flow) * (1 - mis) * cur.opacity * (1 - clamp(cur.morph * 3));

    // transformação da coluna
    root.position.set(cur.x, cur.y, 0);
    root.scale.setScalar(cur.scale);
    root.rotation.set(cur.rotX + mouse.sy * 0.06, cur.rotY + spinAngle + mouse.sx * 0.12, 0);

    // partículas: herdam a pose da coluna e evoluem para o logótipo de frente
    const m = smooth(clamp(cur.morph));
    pGroup.position.set(cur.x, cur.y, 0);
    pGroup.scale.setScalar(mqMobile.matches ? cur.scale : lerp(cur.scale, 1, m));
    pQ.setFromEuler(root.rotation);
    pGroup.quaternion.copy(pQ).slerp(I.set(0, 0, 0, 1).setFromEuler(new THREE.Euler(mouse.sy * 0.08 * m, mouse.sx * 0.14 * m, 0)), m);
    const u = particles.material.uniforms;
    u.uMorph.value = clamp((cur.morph - 0.15) / 0.85);
    u.uTime.value = time;
    u.uPR.value = st.pr;
    u.uOpacity.value = smooth(clamp(cur.morph * 2.2)) * 0.95;
    u.uRepel.value = m;
    v3.set(mouse.sx, mouse.sy, 0.5).unproject(camera).sub(camera.position).normalize();
    const dist = -camera.position.z / v3.z;
    u.uMouse.value.copy(camera.position).addScaledVector(v3, dist);
    particles.visible = u.uOpacity.value > 0.005;

    camera.position.set(0, cur.fy + cur.camY, cur.camZ);
    camera.lookAt(0, cur.fy + cur.camY, 0);
    if (!mqMobile.matches) camera.position.x = 0;

    // HUD: etiquetas presas às vértebras
    if (huds.length) {
      root.updateMatrixWorld();
      for (const h of huds) {
        const v = spine.verts[h.i];
        v.mesh.getWorldPosition(v3).project(camera);
        const x = (v3.x * 0.5 + 0.5) * st.w, y = (-v3.y * 0.5 + 0.5) * st.h;
        h.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(${h.left ? '-100%' : '0'}, -50%)`;
        if (h.region) {
          h.o = lerp(h.o, region === h.region ? 1 : 0, 1 - Math.exp(-dt * 6));
          h.el.style.opacity = (h.o * cur.opacity).toFixed(3);
        } else {
          h.el.style.opacity = (cur.hud ** 3 * cur.opacity).toFixed(3);
        }
      }
    }
    renderer.render(scene, camera);
  }, { alwaysVisible: true });
  canvas.classList.add('is-ready');
  window.__spine = { cur, spine };
}

/* ============================================================ VERTEBRA */
function initVertebra(canvas) {
  const st = createStage(canvas, { fov: 32 });
  if (!st) return;
  const { scene, camera, renderer } = st;
  const mats = materials();
  const vGeo = vertebraGeometry(), dGeo = discGeometry();
  const group = new THREE.Group();
  scene.add(group);
  const items = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(vGeo, mats.bone.clone());
    m.scale.setScalar(1.9);
    group.add(m);
    items.push({ m, kind: 'v', i });
    if (i < 2) {
      const d = new THREE.Mesh(dGeo, mats.disc.clone());
      d.scale.setScalar(1.9);
      group.add(d);
      items.push({ m: d, kind: 'd', i });
    }
  }
  // anel de energia à volta do disco central
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.012, 8, 120),
    new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.5 }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const ring2 = ring.clone();
  ring2.material = ring.material.clone();
  ring2.scale.setScalar(1.35);
  group.add(ring2);

  const mouse = pointer();
  const hero = canvas.closest('section') || document.body;
  let ex = 0;
  loop(canvas, (dt, time) => {
    const r = hero.getBoundingClientRect();
    const prog = clamp(-r.top / Math.max(1, r.height * 0.8));
    const target = reduced ? 0.6 : 0.35 + 0.65 * smooth(prog) + Math.sin(time * 0.8) * 0.06;
    ex = lerp(ex, target, 1 - Math.exp(-dt * 4));
    const gap = 1.06 * 1.9 * 0.27;
    for (const it of items) {
      const base = it.kind === 'v' ? (1 - it.i) * gap * 2 : (0.5 - it.i) * gap * 2;
      it.m.position.y = base * (1 + ex * 1.6);
      if (it.kind === 'v') it.m.rotation.y = (it.i - 1) * ex * 0.5;
      else it.m.material.emissiveIntensity = 0.5 + ex * 0.8 + Math.sin(time * 3 + it.i) * 0.2;
    }
    ring.position.y = items[1].m.position.y;
    ring.scale.setScalar(1 + ex * 0.3 + Math.sin(time * 2) * 0.03);
    ring.material.opacity = 0.2 + ex * 0.35;
    ring2.position.y = items[3].m.position.y;
    ring2.material.opacity = 0.12 + ex * 0.25;
    mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.05);
    const mobile = mqMobile.matches;
    group.position.set(mobile ? 0 : 2.6, mobile ? 2.55 : 0, 0);
    group.scale.setScalar(mobile ? 0.4 : 1);
    group.rotation.set(0.35 + mouse.sy * 0.25, (reduced ? 0.6 : time * 0.25) + mouse.sx * 0.6, 0.12);
    camera.position.set(0, 0, 13);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
  canvas.classList.add('is-ready');
}

/* ================================================================ FLEX */
function initFlex(canvas) {
  const st = createStage(canvas);
  if (!st) return;
  const { scene, camera, renderer } = st;
  const spine = buildSpine(materials());
  const root = new THREE.Group();
  root.add(spine.group);
  scene.add(root);
  const flow = makeFlow(spine.canal, 260);
  spine.group.add(flow);
  flow.material.opacity = 0.9;

  // linhas de velocidade
  const L = 140;
  const lineGeo = new THREE.BufferGeometry();
  const lp = new Float32Array(L * 6);
  const seeds = Array.from({ length: L }, () => ({ x: (rand() - 0.5) * 30, y: (rand() - 0.5) * 16, z: -2 - rand() * 10, len: 0.6 + rand() * 2.4, v: 6 + rand() * 10 }));
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
  lines.frustumCulled = false;
  scene.add(lines);

  const tmpQ = new THREE.Quaternion();
  const e = new THREE.Euler();
  const mouse = pointer();
  const hero = canvas.closest('section') || document.body;
  let rotY = -1.2;
  loop(canvas, (dt, time) => {
    const r = hero.getBoundingClientRect();
    const prog = clamp(-r.top / Math.max(1, r.height * 0.9));
    const speed = reduced ? 0 : 1 + prog * 1.5;
    applyPose(spine, 0, tmpQ);
    for (const o of [...spine.verts, ...spine.discs]) {
      const k = o.i / 23;
      e.set(
        Math.sin(time * 5.2 * (reduced ? 0 : 1) + k * 3) * 0.018,
        Math.sin(time * 2.6 * (reduced ? 0 : 1) + k * 2.4) * 0.09 * (1 - k * 0.5),
        Math.sin(time * 2.6 * (reduced ? 0 : 1) + k * 3.1) * 0.05,
      );
      tmpQ.setFromEuler(e);
      o.mesh.quaternion.multiply(tmpQ);
      o.mesh.position.x += Math.sin(time * 2.6 * (reduced ? 0 : 1) + k * 3.1) * 0.12 * k;
      o.mesh.position.y += Math.abs(Math.sin(time * 2.6 * (reduced ? 0 : 1))) * 0.08;
      if (o.mat && o.mat.emissiveIntensity !== undefined && o.mesh.geometry === spine.vGeo) {
        o.mat.emissiveIntensity = Math.max(0, Math.sin(time * 5.2 - o.i * 0.45)) * 0.35;
      }
    }
    flow.userData.update(dt, 2.2 * speed + 0.4);
    for (let i = 0; i < L; i++) {
      const s = seeds[i];
      s.x -= dt * s.v * speed;
      if (s.x < -16) { s.x = 16; s.y = (rand() - 0.5) * 16; }
      lp.set([s.x, s.y, s.z, s.x + s.len, s.y, s.z], i * 6);
    }
    lineGeo.attributes.position.needsUpdate = true;
    lines.material.opacity = reduced ? 0.12 : 0.18 + prog * 0.2;
    mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
    rotY = lerp(rotY, -1.25 + prog * 1.0 + mouse.sx * 0.25, 1 - Math.exp(-dt * 3));
    const mobile = mqMobile.matches;
    root.position.set(mobile ? 0 : 3.3, mobile ? 2.45 : 0, 0);
    root.scale.setScalar(mobile ? 0.4 : 0.98);
    root.rotation.set(0.05, rotY, 0);
    camera.position.set(0, 0, 17);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
  canvas.classList.add('is-ready');
}

/* ================================================================ LOGO */
async function initLogo(canvas) {
  const st = createStage(canvas);
  if (!st) return;
  const { scene, camera, renderer } = st;
  const N = mqMobile.matches ? 5200 : 9000;
  const logo = await sampleLogo(N, 7.6);
  const from = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1), r = 6 + rand() * 6;
    from.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph) - 4], i * 3);
  }
  const pts = makeParticles(from, logo.pos, logo.shade);
  const g = new THREE.Group();
  g.add(pts);
  scene.add(g);
  const u = pts.material.uniforms;
  u.uSize.value = 2.4;
  const mouse = pointer();
  const v3 = new THREE.Vector3();
  const t0 = performance.now() / 1000;
  const hero = canvas.closest('section') || document.body;
  loop(canvas, (dt, time) => {
    const r = hero.getBoundingClientRect();
    const prog = clamp(-r.top / Math.max(1, r.height));
    const intro = reduced ? 1 : smooth(clamp((time - t0 - 0.2) / 2.6));
    u.uMorph.value = intro * (1 - prog * 0.6);
    u.uTime.value = time;
    u.uPR.value = st.pr;
    u.uOpacity.value = 0.95;
    u.uRepel.value = intro;
    mouse.sx = lerp(mouse.sx, mouse.x, 0.06);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.06);
    const mobile = mqMobile.matches;
    g.position.set(mobile ? 0 : 3.2, mobile ? 2.7 : 0, 0);
    g.scale.setScalar(mobile ? 0.5 : 1);
    g.rotation.set(mouse.sy * 0.12, mouse.sx * 0.22, 0);
    v3.set(mouse.sx, mouse.sy, 0.5).unproject(camera).sub(camera.position).normalize();
    u.uMouse.value.copy(camera.position).addScaledVector(v3, -camera.position.z / v3.z);
    camera.position.set(0, 0, 16);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
  canvas.classList.add('is-ready');
}

/* --------------------------------------------------------------- arranque */
const MODES = { home: initHome, vertebra: initVertebra, flex: initFlex, logo: initLogo };
document.querySelectorAll('canvas[data-stage]').forEach((c) => {
  const fn = MODES[c.dataset.stage];
  if (fn) Promise.resolve(fn(c)).catch((e) => {
    console.error('[3D]', e);
    document.documentElement.classList.add('no-webgl');
  });
});
