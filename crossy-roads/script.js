const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');

const GRID_SIZE = 9;
const ROAD_ROWS = [2, 3, 5, 6];
const INITIAL_PLAYER = { x: 4, y: 8 };
const CAR_COLORS = ['red', 'blue', 'yellow', 'green'];

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem('crossy-best') || 0),
  player: { ...INITIAL_PLAYER },
  obstacles: [],
  animationId: null,
  lastTime: 0,
  speed: 1,
  invulnerableUntil: 0,
};

bestEl.textContent = state.best;

function createBoard() {
  board.innerHTML = '';

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      board.appendChild(cell);
    }
  }
}

function buildObstacles() {
  const obstacleGroup = [];

  ROAD_ROWS.forEach((row, laneIndex) => {
    const direction = laneIndex % 2 === 0 ? 1 : -1;
    const length = Math.random() < 0.75 ? 1.4 : 1.8;
    const gap = 1.5 + Math.random() * 2.4;
    const x = direction === 1 ? -length - laneIndex * gap : GRID_SIZE + laneIndex * gap;
    const speed = 0.28 + Math.random() * 0.3 + state.speed * 0.06;

    obstacleGroup.push({
      row,
      x,
      length,
      direction,
      speed,
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      type: Math.random() < 0.72 ? 'car' : 'truck',
    });
  });

  state.obstacles = obstacleGroup;
}

function resetGame() {
  state.score = 0;
  state.speed = 1;
  state.player = { ...INITIAL_PLAYER };
  buildObstacles();
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
  const cells = [...board.children];

  cells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    cell.classList.remove('grass', 'road', 'player', 'obstacle', ...CAR_COLORS, 'car', 'truck');

    if (ROAD_ROWS.includes(row)) {
      cell.classList.add('road');
    } else {
      cell.classList.add('grass');
    }

    if (state.player.x === col && state.player.y === row) {
      cell.classList.add('player');
    }

    const obstacleHere = state.obstacles.find(
      (obstacle) => obstacle.row === row && col >= obstacle.x && col < obstacle.x + obstacle.length
    );

    if (obstacleHere) {
      cell.classList.add('obstacle', obstacleHere.color, obstacleHere.type);
      cell.innerHTML = '<span class="car-light car-light-front"></span><span class="car-window"></span><span class="car-light car-light-back"></span>';
    } else {
      cell.innerHTML = '';
    }
  });
}

function movePlayer(dx, dy) {
  if (!state.running) {
    return;
  }

  const nextX = state.player.x + dx;
  const nextY = state.player.y + dy;

  if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
    return;
  }

  state.player.x = nextX;
  state.player.y = nextY;

  if (state.player.y === 0) {
    state.score += 1;
    state.speed += 0.04;
    scoreEl.textContent = String(state.score);
    updateBest();
    messageEl.textContent = 'Nice! Keep going!';
    state.player = { ...INITIAL_PLAYER };
    state.invulnerableUntil = performance.now() + 650;
  }

  checkCollision();
  render();
}

function checkCollision() {
  const playerIsOnRoad = ROAD_ROWS.includes(state.player.y);

  if (!playerIsOnRoad) {
    return;
  }

  const hit = state.obstacles.some((obstacle) => {
    if (obstacle.row !== state.player.y) {
      return false;
    }

    const obstacleRange = [obstacle.x, obstacle.x + obstacle.length - 1];
    return state.player.x >= obstacleRange[0] && state.player.x <= obstacleRange[1];
  });

  if (!hit || performance.now() < state.invulnerableUntil) {
    return;
  }

  endGame();
}

function endGame() {
  state.running = false;
  messageEl.textContent = `Crash! Final score: ${state.score}. Press Start to try again.`;
  cancelAnimationFrame(state.animationId);
}

function updateObstacles(delta) {
  state.obstacles.forEach((obstacle) => {
    obstacle.x += obstacle.direction * obstacle.speed * delta * 0.035;

    const offLeft = obstacle.direction === -1 && obstacle.x + obstacle.length <= 0;
    const offRight = obstacle.direction === 1 && obstacle.x >= GRID_SIZE;

    if (offLeft || offRight) {
      const gap = Math.random() * 2.4 + 1.5;
      obstacle.length = Math.random() < 0.75 ? 1.4 : 1.8;
      obstacle.x = obstacle.direction === 1 ? -obstacle.length - gap : GRID_SIZE + gap;
      obstacle.speed = 0.28 + Math.random() * 0.3 + state.speed * 0.06;
      obstacle.color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
      obstacle.type = Math.random() < 0.72 ? 'car' : 'truck';
    }
  });

  checkCollision();
  render();
}

function gameLoop(timestamp) {
  if (!state.running) {
    return;
  }

  const delta = timestamp - state.lastTime || 16;
  state.lastTime = timestamp;
  updateObstacles(delta);
  state.animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  state.running = true;
  state.lastTime = 0;
  state.player = { ...INITIAL_PLAYER };
  state.score = 0;
  scoreEl.textContent = '0';
  state.speed = 1;
  state.invulnerableUntil = performance.now() + 900;
  buildObstacles();
  messageEl.textContent = 'Cross the road!';
  render();
  cancelAnimationFrame(state.animationId);
  state.animationId = requestAnimationFrame(gameLoop);
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();

  if (key === 'arrowup' || key === 'w') {
    movePlayer(0, -1);
  } else if (key === 'arrowdown' || key === 's') {
    movePlayer(0, 1);
  } else if (key === 'arrowleft' || key === 'a') {
    movePlayer(-1, 0);
  } else if (key === 'arrowright' || key === 'd') {
    movePlayer(1, 0);
  }
}

window.addEventListener('keydown', handleKeydown);
startBtn.addEventListener('click', () => {
  startGame();
});

createBoard();
resetGame();
