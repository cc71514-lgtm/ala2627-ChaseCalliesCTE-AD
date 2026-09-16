const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');

const GRID_SIZE = 9;
const VISIBLE_ROWS = 11;
const INITIAL_PLAYER = { x: 4, y: 9 };
const CAR_COLORS = ['red', 'blue', 'yellow', 'green'];

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem('crossy-best') || 0),
  player: { ...INITIAL_PLAYER },
  terrain: [],
  obstacles: [],
  animationId: null,
  lastTime: 0,
  speed: 1,
  invulnerableUntil: 0,
};

bestEl.textContent = state.best;

function createBoard() {
  board.innerHTML = '';
  for (let row = 0; row < VISIBLE_ROWS; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      board.appendChild(cell);
    }
  }

  const trafficLayer = document.createElement('div');
  trafficLayer.className = 'traffic-layer';
  trafficLayer.setAttribute('aria-hidden', 'true');
  board.appendChild(trafficLayer);
}

function createTerrainRow(row, forceGrass = false) {
  const previous = state.terrain[0];
  return { row, road: !forceGrass && (Math.random() < 0.48 || previous?.road === false) };
}

function createCarsForRow(row) {
  const direction = Math.random() < 0.5 ? 1 : -1;
  const carCount = Math.random() < 0.35 ? 2 : 1;
  const cars = [];

  for (let index = 0; index < carCount; index += 1) {
    const length = Math.random() < 0.8 ? 1.35 : 1.85;
    const gap = 3.2 + Math.random() * 2.5;
    cars.push({
      row,
      x: direction === 1 ? -length - index * gap : GRID_SIZE + index * gap,
      length,
      direction,
      speed: 0.24 + Math.random() * 0.22 + state.speed * 0.04,
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      type: Math.random() < 0.75 ? 'car' : 'truck',
    });
  }

  return cars;
}

function buildWorld() {
  state.terrain = [];
  state.obstacles = [];
  for (let row = 0; row < VISIBLE_ROWS; row += 1) {
    const terrainRow = { row, road: row === 0 ? false : Math.random() < 0.45 };
    state.terrain.push(terrainRow);
    if (terrainRow.road && row < VISIBLE_ROWS - 2) state.obstacles.push(...createCarsForRow(row));
  }
  state.terrain[VISIBLE_ROWS - 1] = { row: VISIBLE_ROWS - 1, road: false };
}

function resetGame() {
  state.score = 0;
  state.speed = 1;
  state.player = { ...INITIAL_PLAYER };
  buildWorld();
  scoreEl.textContent = '0';
  messageEl.textContent = 'Use arrow keys or WASD to move.';
  render();
}

function updateBest() {
  state.best = Math.max(state.best, state.score);
  localStorage.setItem('crossy-best', String(state.best));
  bestEl.textContent = state.best;
}

function render() {
  [...board.querySelectorAll('.cell')].forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const terrainRow = state.terrain[row];

    cell.className = 'cell';
    cell.classList.add(terrainRow?.road ? 'road' : 'grass');
    cell.innerHTML = '';

    if (state.player.x === col && state.player.y === row) {
      cell.classList.add('player');
      cell.innerHTML = '<span class="chicken-body"></span><span class="chicken-eye"></span><span class="chicken-beak"></span><span class="chicken-comb"></span>';
    }
  });

  renderTraffic();
}

function renderTraffic() {
  const trafficLayer = board.querySelector('.traffic-layer');
  trafficLayer.innerHTML = '';

  state.obstacles.forEach((obstacle) => {
    const vehicle = document.createElement('div');
    vehicle.className = `vehicle ${obstacle.color} ${obstacle.type}`;
    vehicle.style.left = `${(obstacle.x / GRID_SIZE) * 100}%`;
    vehicle.style.top = `${(obstacle.row / VISIBLE_ROWS) * 100}%`;
    vehicle.style.width = `${(obstacle.length / GRID_SIZE) * 100}%`;
    vehicle.style.height = `${(1 / VISIBLE_ROWS) * 100}%`;
    vehicle.style.setProperty('--direction', obstacle.direction === -1 ? '-1' : '1');
    vehicle.innerHTML = '<span class="vehicle-window"></span><span class="vehicle-light vehicle-light-front"></span><span class="vehicle-light vehicle-light-back"></span><span class="vehicle-wheel vehicle-wheel-front"></span><span class="vehicle-wheel vehicle-wheel-back"></span>';
    trafficLayer.appendChild(vehicle);
  });
}

function advanceWorld() {
  state.terrain.forEach((terrainRow) => { terrainRow.row += 1; });
  state.terrain.pop();
  const newRow = createTerrainRow(0);
  state.terrain.unshift(newRow);

  state.obstacles.forEach((obstacle) => { obstacle.row += 1; });
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.row < VISIBLE_ROWS);
  if (newRow.road) state.obstacles.push(...createCarsForRow(0));
}

function movePlayer(dx, dy) {
  if (!state.running) return;
  const nextX = state.player.x + dx;
  const nextY = state.player.y + dy;
  if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= VISIBLE_ROWS) return;

  state.player.x = nextX;
  state.player.y = nextY;

  if (dy < 0 && state.player.y <= 3) {
    state.score += 1;
    state.speed += 0.025;
    state.player.y += 1;
    advanceWorld();
    scoreEl.textContent = String(state.score);
    updateBest();
    state.invulnerableUntil = performance.now() + 450;
    messageEl.textContent = 'Keep crossing!';
  }

  checkCollision();
  render();
}

function checkCollision() {
  if (performance.now() < state.invulnerableUntil || !state.terrain[state.player.y]?.road) return;
  const hit = state.obstacles.some((obstacle) => (
    obstacle.row === state.player.y
    && state.player.x + 0.25 >= obstacle.x
    && state.player.x + 0.75 <= obstacle.x + obstacle.length
  ));
  if (hit) endGame();
}

function endGame() {
  state.running = false;
  messageEl.textContent = `Crash! Final score: ${state.score}. Press Start to try again.`;
  cancelAnimationFrame(state.animationId);
}

function updateObstacles(delta) {
  state.obstacles.forEach((obstacle) => {
    obstacle.x += obstacle.direction * obstacle.speed * delta * 0.034;
    const offLeft = obstacle.direction === -1 && obstacle.x + obstacle.length <= 0;
    const offRight = obstacle.direction === 1 && obstacle.x >= GRID_SIZE;
    if (offLeft || offRight) {
      const gap = Math.random() * 2.6 + 2;
      obstacle.x = obstacle.direction === 1 ? -obstacle.length - gap : GRID_SIZE + gap;
      obstacle.speed = 0.24 + Math.random() * 0.22 + state.speed * 0.04;
      obstacle.color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
      obstacle.type = Math.random() < 0.75 ? 'car' : 'truck';
    }
  });
  checkCollision();
  render();
}

function gameLoop(timestamp) {
  if (!state.running) return;
  const delta = timestamp - state.lastTime || 16;
  state.lastTime = timestamp;
  updateObstacles(delta);
  state.animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  cancelAnimationFrame(state.animationId);
  state.running = true;
  state.lastTime = 0;
  state.player = { ...INITIAL_PLAYER };
  state.score = 0;
  state.speed = 1;
  state.invulnerableUntil = performance.now() + 900;
  buildWorld();
  scoreEl.textContent = '0';
  messageEl.textContent = 'Cross the road!';
  render();
  state.animationId = requestAnimationFrame(gameLoop);
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') movePlayer(0, -1);
  if (key === 'arrowdown' || key === 's') movePlayer(0, 1);
  if (key === 'arrowleft' || key === 'a') movePlayer(-1, 0);
  if (key === 'arrowright' || key === 'd') movePlayer(1, 0);
}

window.addEventListener('keydown', handleKeydown);
startBtn.addEventListener('click', startGame);
createBoard();
resetGame();
