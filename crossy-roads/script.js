const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');

const GRID_SIZE = 9;
const ROAD_ROWS = [2, 3, 5, 6];
const INITIAL_PLAYER = { x: 4, y: 8 };

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem('crossy-best') || 0),
  player: { ...INITIAL_PLAYER },
  obstacles: [],
  animationId: null,
  lastTime: 0,
  speed: 1,
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
    const length = Math.random() < 0.5 ? 2 : 3;
    const x = direction === 1 ? -length : GRID_SIZE;
    const speed = 0.7 + Math.random() * 0.9 + state.speed * 0.18;

    obstacleGroup.push({
      row,
      x,
      length,
      direction,
      speed,
      color: laneIndex % 2 === 0 ? '#67e8f9' : '#fbbf24',
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
    cell.classList.remove('grass', 'road', 'player', 'obstacle');

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
      cell.classList.add('obstacle');
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
    state.speed += 0.14;
    scoreEl.textContent = String(state.score);
    updateBest();
    messageEl.textContent = 'Nice! Keep going!';
    state.player = { ...INITIAL_PLAYER };
    buildObstacles();
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

  if (!hit) {
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
    obstacle.x += obstacle.direction * obstacle.speed * delta * 0.06;

    const offLeft = obstacle.direction === -1 && obstacle.x + obstacle.length <= 0;
    const offRight = obstacle.direction === 1 && obstacle.x >= GRID_SIZE;

    if (offLeft || offRight) {
      const gap = Math.random() * 1.4 + 0.8;
      obstacle.length = Math.random() < 0.5 ? 2 : 3;
      obstacle.x = obstacle.direction === 1 ? -obstacle.length - gap : GRID_SIZE + gap;
      obstacle.speed = 0.7 + Math.random() * 0.9 + state.speed * 0.18;
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
