const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
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
  { name: 'Fresh start', length: 100, spawn: 900, speed: 0.15, fruits: 2 },
  { name: 'Berry rush', length: 130, spawn: 720, speed: 0.2, fruits: 3 },
  { name: 'Citrus climb', length: 160, spawn: 560, speed: 0.25, fruits: 4 },
  { name: 'Melon mayhem', length: 200, spawn: 420, speed: 0.31, fruits: 5 },
  { name: 'Summit storm', length: 250, spawn: 310, speed: 0.38, fruits: 6 },
];
const FRUITS = [
  { emoji: '🍎', color: '#e94343', size: 1 },
  { emoji: '🍊', color: '#ff9838', size: 0.9 },
  { emoji: '🍉', color: '#ef5270', size: 1.25 },
  { emoji: '🍍', color: '#f5c743', size: 1.1 },
  { emoji: '🥝', color: '#8bc34a', size: 0.88 },
];

const state = {
  active: false, paused: false, won: false, score: 0, distance: 0, stage: 0,
  best: Number(localStorage.getItem('fruit-fall-best') || 0), player: { x: 0, y: 0 },
  fruits: [], particles: [], lastTime: 0, spawnTimer: 0, look: 0,
};
const keys = new Set();

bestEl.textContent = state.best;

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function randomFruit() {
  const type = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  const stage = STAGES[state.stage];
  return { ...type, x: (Math.random() - 0.5) * 1.7, z: 0.06 + Math.random() * 0.25, y: 0.03, fall: 0, speed: stage.speed * (0.75 + Math.random() * 0.7), spin: Math.random() * Math.PI };
}

function newGame() {
  state.active = true; state.paused = false; state.won = false; state.score = 0; state.distance = 0; state.stage = 0;
  state.player = { x: 0, y: 0 }; state.fruits = []; state.particles = []; state.spawnTimer = 0; state.lastTime = performance.now();
  pauseBtn.textContent = 'Pause'; startBtn.textContent = 'Restart climb'; centerMessage.classList.add('hidden'); updateHud();
  requestAnimationFrame(gameLoop);
}

function updateHud() {
  const current = STAGES[state.stage];
  const progress = Math.min(100, Math.round((state.distance / current.length) * 100));
  stageEl.textContent = `${state.stage + 1} / ${STAGES.length}`;
  scoreEl.textContent = state.score;
  progressText.textContent = `${progress}%`;
  progressBar.style.width = `${progress}%`;
}

function showMessage(kicker, title, copy, buttonText) {
  messageKicker.textContent = kicker; messageTitle.textContent = title; messageCopy.textContent = copy; startBtn.textContent = buttonText; centerMessage.classList.remove('hidden');
}

function movePlayer(delta, elapsed) {
  const direction = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  state.player.x += direction * elapsed * 0.00125;
  state.player.x = Math.max(-0.78, Math.min(0.78, state.player.x));
  state.look += (state.player.x * 0.7 - state.look) * elapsed * 0.004;
}

function spawnFruit() {
  const amount = STAGES[state.stage].fruits;
  for (let index = 0; index < amount; index += 1) state.fruits.push(randomFruit());
}

function update(elapsed) {
  const stage = STAGES[state.stage];
  movePlayer(0, elapsed);
  state.distance += elapsed * 0.006;
  state.spawnTimer += elapsed;
  if (state.spawnTimer > stage.spawn) { state.spawnTimer = 0; spawnFruit(); }

  state.fruits.forEach((fruit) => { fruit.fall += elapsed * 0.001 * fruit.speed; fruit.z += elapsed * 0.00005 * fruit.speed; fruit.spin += elapsed * 0.004; });
  state.fruits = state.fruits.filter((fruit) => {
    const playerY = 0.86;
    const nearPlayer = fruit.fall > 0.76 && fruit.fall < 0.98 && Math.abs(fruit.x - state.player.x) < 0.13;
    if (nearPlayer) { endGame(false); return false; }
    return fruit.fall < 1.08;
  });
  state.particles.forEach((particle) => { particle.life -= elapsed * 0.001; particle.y -= elapsed * 0.00012; });
  state.particles = state.particles.filter((particle) => particle.life > 0);

  if (state.distance >= stage.length) {
    if (state.stage === STAGES.length - 1) { endGame(true); return; }
    state.stage += 1; state.distance = 0; state.fruits = []; state.score += 100; spawnConfetti();
  }
  updateHud();
}

function endGame(won) {
  if (!state.active) return;
  state.active = false; state.won = won;
  if (won) { showMessage('Summit reached', 'You own the hill!', `Final score: ${state.score}. The fruit storm could not stop you.`, 'Climb again'); }
  else { showMessage('Bonk!', 'Fruit took you down.', `You made it to stage ${state.stage + 1}. Score: ${state.score}.`, 'Try again'); }
  state.best = Math.max(state.best, state.score); bestEl.textContent = state.best; localStorage.setItem('fruit-fall-best', String(state.best));
}

function spawnConfetti() { for (let index = 0; index < 24; index += 1) state.particles.push({ x: (Math.random() - 0.5) * 1.2, y: 0.42, life: 1, color: FRUITS[index % FRUITS.length].color }); }

function hillPoint(width, height, depth, camera) {
  const horizon = height * 0.28;
  const bottom = height * 1.06;
  const center = width * (0.5 + camera * 0.05);
  const half = 18 + depth * width * 0.76;
  return { x: center + depth * width * 0.16, y: horizon + depth * (bottom - horizon), half };
}

function drawScene(time) {
  const width = canvas.clientWidth; const height = canvas.clientHeight;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#4a9dcc'); gradient.addColorStop(0.48, '#9bd7d0'); gradient.addColorStop(0.49, '#67bd61'); gradient.addColorStop(1, '#157344');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  drawClouds(width, height, time);

  const near = hillPoint(width, height, 1, state.look);
  const far = hillPoint(width, height, 0, state.look);
  ctx.fillStyle = '#1c8c55'; ctx.beginPath(); ctx.moveTo(far.x - far.half, far.y); ctx.lineTo(far.x + far.half, far.y); ctx.lineTo(near.x + near.half, near.y); ctx.lineTo(near.x - near.half, near.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#28a85d'; ctx.beginPath(); ctx.moveTo(far.x - 9, far.y); ctx.lineTo(far.x + 9, far.y); ctx.lineTo(near.x + near.half * 0.82, near.y); ctx.lineTo(near.x - near.half * 0.82, near.y); ctx.closePath(); ctx.fill();
  drawHillDetails(width, height, time);
  state.fruits.slice().sort((a, b) => a.fall - b.fall).forEach((fruit) => drawFruit(fruit, width, height));
  drawPlayer(width, height, time);
  state.particles.forEach((particle) => drawParticle(particle, width, height));
}

function drawClouds(width, height, time) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; for (let index = 0; index < 5; index += 1) { const x = ((index * 231 + time * 0.008) % (width + 180)) - 90; const y = height * (0.1 + (index % 3) * 0.07); ctx.beginPath(); ctx.ellipse(x, y, 70, 16, 0, 0, Math.PI * 2); ctx.ellipse(x + 38, y - 8, 42, 21, 0, 0, Math.PI * 2); ctx.fill(); } }
function drawHillDetails(width, height, time) { const details = 14; for (let index = 0; index < details; index += 1) { const depth = (index + 1) / details; const point = hillPoint(width, height, depth, state.look); const sway = Math.sin(time * 0.001 + index) * 4; ctx.strokeStyle = depth > 0.7 ? '#0c633e' : '#147846'; ctx.lineWidth = Math.max(1, depth * 4); ctx.beginPath(); ctx.moveTo(point.x + sway, point.y); ctx.lineTo(point.x - point.half * 0.35 + sway, point.y - point.half * 0.12); ctx.stroke(); } }

function drawFruit(fruit, width, height) { const point = hillPoint(width, height, fruit.fall, state.look); const scale = 0.35 + fruit.fall * 1.1; const x = point.x + fruit.x * point.half; const y = point.y - 42 * scale - fruit.fall * 90; const size = 27 * scale * fruit.size; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(fruit.spin) * 0.4); ctx.font = `${size * 1.9}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(7,47,35,0.45)'; ctx.shadowBlur = size * 0.4; ctx.shadowOffsetY = size * 0.35; ctx.fillText(fruit.emoji, 0, 0); ctx.restore(); }
function drawPlayer(width, height, time) { const point = hillPoint(width, height, 0.79, state.look); const x = point.x + state.player.x * point.half; const y = point.y - 32; const bounce = Math.sin(time * 0.01) * 2; ctx.save(); ctx.translate(x, y + bounce); ctx.scale(1, 0.8); ctx.fillStyle = 'rgba(0,57,39,0.42)'; ctx.beginPath(); ctx.ellipse(0, 42, 31, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.scale(1, 1.25); ctx.fillStyle = '#f49b85'; ctx.beginPath(); ctx.ellipse(0, 7, 22, 27, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9b6b52'; ctx.beginPath(); ctx.arc(0, -19, 19, Math.PI, Math.PI * 2); ctx.lineTo(17, -4); ctx.lineTo(-17, -4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#172d29'; ctx.beginPath(); ctx.arc(-7, -14, 2.5, 0, Math.PI * 2); ctx.arc(7, -14, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#315f42'; ctx.fillRect(-17, 29, 11, 12); ctx.fillRect(6, 29, 11, 12); ctx.restore(); }
function drawParticle(particle, width, height) { const point = hillPoint(width, height, 0.7, state.look); ctx.globalAlpha = particle.life; ctx.fillStyle = particle.color; ctx.fillRect(point.x + particle.x * point.half, point.y - particle.y * 120, 5, 5); ctx.globalAlpha = 1; }

function gameLoop(timestamp) { drawScene(timestamp); if (!state.active || state.paused) return; const elapsed = Math.min(40, timestamp - state.lastTime); state.lastTime = timestamp; update(elapsed); requestAnimationFrame(gameLoop); }

function togglePause() { if (!state.active) return; state.paused = !state.paused; pauseBtn.textContent = state.paused ? 'Resume' : 'Pause'; if (!state.paused) { state.lastTime = performance.now(); requestAnimationFrame(gameLoop); } }

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault(); keys.add(key); if (key === ' ') togglePause(); });
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
canvas.addEventListener('mousemove', (event) => { const bounds = canvas.getBoundingClientRect(); state.look = ((event.clientX - bounds.left) / bounds.width - 0.5) * 1.5; });
startBtn.addEventListener('click', newGame);
pauseBtn.addEventListener('click', togglePause);

resizeCanvas(); updateHud(); drawScene(0);
