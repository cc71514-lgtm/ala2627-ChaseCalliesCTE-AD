import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas = document.getElementById('game-canvas');
const stageEl = document.getElementById('stage');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const centerMessage = document.getElementById('center-message');
const messageKicker = centerMessage.querySelector('.message-kicker');
const messageTitle = centerMessage.querySelector('h2');
const messageCopy = centerMessage.querySelector('p');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');

const STAGES = [
  { length: 100, spawn: 1.25, speed: 4, fruits: 1 },
  { length: 130, spawn: 0.95, speed: 4.7, fruits: 2 },
  { length: 160, spawn: 0.72, speed: 5.5, fruits: 2 },
  { length: 200, spawn: 0.54, speed: 6.4, fruits: 3 },
  { length: 250, spawn: 0.38, speed: 7.5, fruits: 4 },
];
const FRUITS = [
  { color: 0xe94343, scale: 0.75 }, { color: 0xff9838, scale: 0.7 },
  { color: 0xef5270, scale: 1.05 }, { color: 0xf5c743, scale: 0.82 },
  { color: 0x8bc34a, scale: 0.68 },
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x56b6d5);
scene.fog = new THREE.Fog(0x56b6d5, 42, 135);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 220);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xd8f6ff, 0x175c3c, 2.2));
const sun = new THREE.DirectionalLight(0xfff3c1, 3.8);
sun.position.set(-20, 42, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const hill = new THREE.Group();
scene.add(hill);
const hillMesh = new THREE.Mesh(new THREE.BoxGeometry(38, 3, 150), new THREE.MeshStandardMaterial({ color: 0x22a65b, roughness: 0.9 }));
hillMesh.position.set(0, -1.7, -59);
hillMesh.rotation.x = 0.12;
hillMesh.receiveShadow = true;
hill.add(hillMesh);
const path = new THREE.Mesh(new THREE.PlaneGeometry(16, 148), new THREE.MeshStandardMaterial({ color: 0x31c36b, roughness: 0.86 }));
path.rotation.x = -Math.PI / 2 + 0.12;
path.position.set(0, 0.02, -59);
path.receiveShadow = true;
hill.add(path);

function hillHeight(z) { return Math.max(0, (-z - 2) * 0.12); }

function createScenery() {
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x714832 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x4d9f42 });
  for (let index = 0; index < 34; index += 1) {
    const side = index % 2 ? 1 : -1;
    const z = -8 - (index * 4.1) % 122;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.3, 7), trunkMaterial);
    trunk.position.y = 1.15;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.55 + (index % 3) * 0.3, 3.8, 7), leafMaterial);
    leaves.position.y = 3.2;
    tree.add(trunk, leaves);
    tree.position.set(side * (11 + (index % 4) * 2.5), hillHeight(z), z);
    tree.scale.setScalar(0.8 + (index % 4) * 0.12);
    tree.traverse((part) => { part.castShadow = true; });
    scene.add(tree);
  }
}
createScenery();

function makePlayer() {
  const player = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x8d684f, roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xf48478, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x283b35 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 14), shirt);
  body.scale.set(0.8, 1.12, 0.68); body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 14), fur); head.position.y = 2.05;
  const earGeometry = new THREE.SphereGeometry(0.23, 12, 10);
  const leftEar = new THREE.Mesh(earGeometry, fur); leftEar.position.set(-0.42, 2.34, 0);
  const rightEar = new THREE.Mesh(earGeometry, fur); rightEar.position.set(0.42, 2.34, 0);
  const eyeGeometry = new THREE.SphereGeometry(0.065, 10, 8);
  const leftEye = new THREE.Mesh(eyeGeometry, dark); leftEye.position.set(-0.2, 2.1, 0.52);
  const rightEye = new THREE.Mesh(eyeGeometry, dark); rightEye.position.set(0.2, 2.1, 0.52);
  const footGeometry = new THREE.CapsuleGeometry(0.16, 0.42, 5, 10);
  const leftFoot = new THREE.Mesh(footGeometry, dark); leftFoot.position.set(-0.3, 0.28, 0.12);
  const rightFoot = new THREE.Mesh(footGeometry, dark); rightFoot.position.set(0.3, 0.28, 0.12);
  player.add(body, head, leftEar, rightEar, leftEye, rightEye, leftFoot, rightFoot);
  player.traverse((part) => { part.castShadow = true; });
  return player;
}

const player = makePlayer();
scene.add(player);
const state = {
  active: false, paused: false, score: 0, distance: 0, stage: 0, spawnTimer: 0,
  best: Number(localStorage.getItem('fruit-fall-best') || 0), fruits: [], keys: new Set(), yaw: 0,
};
bestEl.textContent = state.best;

function resize() {
  const bounds = canvas.getBoundingClientRect();
  renderer.setSize(bounds.width, bounds.height, false);
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
}

function updateHud() {
  const stage = STAGES[state.stage];
  const progress = Math.min(100, Math.round((state.distance / stage.length) * 100));
  stageEl.textContent = `${state.stage + 1} / ${STAGES.length}`;
  scoreEl.textContent = state.score;
  progressText.textContent = `${progress}%`;
  progressBar.style.width = `${progress}%`;
}

function showMessage(kicker, title, copy, buttonText) {
  messageKicker.textContent = kicker; messageTitle.textContent = title; messageCopy.textContent = copy;
  startBtn.textContent = buttonText; centerMessage.classList.remove('hidden');
}

function makeFruit() {
  const type = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  const fruit = new THREE.Group();
  const fruitMesh = new THREE.Mesh(new THREE.SphereGeometry(type.scale, 16, 12), new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.58 }));
  fruitMesh.scale.set(1, 1.05, 0.9);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x315b32 }));
  stem.position.y = type.scale * 1.05;
  fruit.add(fruitMesh, stem);
  fruit.position.set((Math.random() - 0.5) * 13, 8 + Math.random() * 5, player.position.z - 13 - Math.random() * 20);
  fruit.userData.velocity = 0;
  fruit.traverse((part) => { part.castShadow = true; });
  scene.add(fruit);
  state.fruits.push(fruit);
}

function spawnWave() { for (let index = 0; index < STAGES[state.stage].fruits; index += 1) makeFruit(); }
function clearFruits() { state.fruits.forEach((fruit) => scene.remove(fruit)); state.fruits = []; }

function newGame() {
  state.active = true; state.paused = false; state.score = 0; state.distance = 0; state.stage = 0; state.spawnTimer = 0; state.yaw = 0;
  state.keys.clear(); clearFruits(); player.position.set(0, 0, 0); player.rotation.set(0, Math.PI, 0);
  pauseBtn.textContent = 'Pause'; centerMessage.classList.add('hidden'); updateHud();
}

function movePlayer(delta) {
  const stage = STAGES[state.stage];
  const forward = state.keys.has('w') || state.keys.has('arrowup');
  const backward = state.keys.has('s') || state.keys.has('arrowdown');
  const left = state.keys.has('a') || state.keys.has('arrowleft');
  const right = state.keys.has('d') || state.keys.has('arrowright');
  const climb = (forward ? 1 : 0) - (backward ? 1 : 0);
  const strafe = (right ? 1 : 0) - (left ? 1 : 0);
  player.position.z -= climb * stage.speed * delta;
  player.position.x += strafe * stage.speed * 0.72 * delta;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -6.2, 6.2);
  player.position.y = hillHeight(player.position.z);
  player.rotation.y = Math.PI + state.yaw * 0.3;
  state.distance = Math.max(0, -player.position.z);
}

function updateFruits(delta) {
  state.fruits = state.fruits.filter((fruit) => {
    fruit.userData.velocity += 18 * delta;
    fruit.position.y -= fruit.userData.velocity * delta;
    fruit.rotation.x += delta * 4; fruit.rotation.z += delta * 3;
    if (fruit.position.distanceTo(player.position) < 1.25 && fruit.position.y < player.position.y + 2.2) { endGame(false); return false; }
    if (fruit.position.y < hillHeight(fruit.position.z) + 0.2) { scene.remove(fruit); return false; }
    return true;
  });
}

function update(delta) {
  const stage = STAGES[state.stage];
  movePlayer(delta);
  state.spawnTimer += delta;
  if (state.spawnTimer >= stage.spawn) { state.spawnTimer = 0; spawnWave(); }
  updateFruits(delta);
  if (state.distance >= stage.length) {
    if (state.stage === STAGES.length - 1) { endGame(true); return; }
    state.stage += 1; state.score += 100; state.spawnTimer = 0; clearFruits();
  }
  updateHud();
}

function endGame(won) {
  if (!state.active) return;
  state.active = false;
  if (won) showMessage('Summit reached', 'You own the hill!', `Final score: ${state.score}. The fruit storm could not stop you.`, 'Climb again');
  else showMessage('Bonk!', 'Fruit took you down.', `You made it to stage ${state.stage + 1}. Score: ${state.score}.`, 'Try again');
  state.best = Math.max(state.best, state.score); bestEl.textContent = state.best;
  localStorage.setItem('fruit-fall-best', String(state.best));
}

function updateCamera() {
  const target = new THREE.Vector3(player.position.x, player.position.y + 1.5, player.position.z - 10);
  const cameraOffset = new THREE.Vector3(Math.sin(state.yaw) * 8, 5.3, Math.cos(state.yaw) * 8);
  camera.position.set(player.position.x + cameraOffset.x, player.position.y + cameraOffset.y, player.position.z + cameraOffset.z);
  camera.lookAt(target);
}

function animate(time) {
  requestAnimationFrame(animate);
  const delta = Math.min(0.04, (time - (animate.lastTime || time)) / 1000);
  animate.lastTime = time;
  if (state.active && !state.paused) update(delta);
  updateCamera();
  renderer.render(scene, camera);
}

function togglePause() {
  if (!state.active) return;
  state.paused = !state.paused; pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
  state.keys.add(key);
  if (key === ' ') togglePause();
});
window.addEventListener('keyup', (event) => state.keys.delete(event.key.toLowerCase()));
canvas.addEventListener('mousemove', (event) => { state.yaw = ((event.clientX / window.innerWidth) - 0.5) * 1.1; });
startBtn.addEventListener('click', newGame);
pauseBtn.addEventListener('click', togglePause);

resize();
updateHud();
animate(0);
