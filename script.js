const COLS = 10;
const ROWS = 20;
const PREVIEW_SIZE = 4;
const LINE_POINTS = [0, 100, 300, 500, 800];

const TETROMINOES = {
  I: {
    shape: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [2, 0],
    ],
  },
  J: {
    shape: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
    ],
  },
  L: {
    shape: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [1, 1],
    ],
  },
  O: {
    shape: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  S: {
    shape: [
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
    ],
  },
  T: {
    shape: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  },
  Z: {
    shape: [
      [-1, 0],
      [0, 0],
      [0, 1],
      [1, 1],
    ],
  },
};

const TYPES = Object.keys(TETROMINOES);

const playfieldEl = document.getElementById("playfield");
const previewEl = document.getElementById("preview");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

const playfieldCells = [];
const previewCells = [];

let board = [];
let currentPiece = null;
let nextType = null;
let bag = [];
let isRunning = false;
let isPaused = false;
let dropInterval = 1000;
let dropTimer = null;
let score = 0;
let clearedLines = 0;
let level = 1;

function init() {
  buildPlayfield();
  buildPreview();
  resetBoard();
  attachEvents();
  resetStats();
  draw();
}

function buildPlayfield() {
  playfieldEl.innerHTML = "";
  playfieldCells.length = 0;
  for (let i = 0; i < COLS * ROWS; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    playfieldCells.push(cell);
    playfieldEl.appendChild(cell);
  }
}

function buildPreview() {
  previewEl.innerHTML = "";
  previewCells.length = 0;
  for (let i = 0; i < PREVIEW_SIZE * PREVIEW_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    previewCells.push(cell);
    previewEl.appendChild(cell);
  }
}

function attachEvents() {
  startBtn.addEventListener("click", startGame);
  document.addEventListener("keydown", handleKeyDown);
}

function startGame() {
  clearDropTimer();
  resetBoard();
  resetStats();
  isRunning = true;
  isPaused = false;
  message("");
  nextType = drawFromBag();
  spawnPiece();
  draw();
  restartDropTimer();
  startBtn.textContent = "다시 시작";
}

function resetBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function resetStats() {
  score = 0;
  clearedLines = 0;
  level = 1;
  dropInterval = 1000;
  nextType = null;
  updateStats();
  updatePreview();
}

function message(text) {
  messageEl.textContent = text;
}

function handleKeyDown(event) {
  if (event.key === "p" || event.key === "P") {
    togglePause();
    return;
  }

  if (!isRunning || isPaused) {
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
      event.preventDefault();
      moveHorizontal(-1);
      break;
    case "ArrowRight":
      event.preventDefault();
      moveHorizontal(1);
      break;
    case "ArrowDown":
      event.preventDefault();
      softDrop();
      break;
    case "ArrowUp":
      event.preventDefault();
      rotate();
      break;
    case " ":
    case "Spacebar":
      event.preventDefault();
      hardDrop();
      break;
    default:
      break;
  }
}

function togglePause() {
  if (!isRunning) {
    return;
  }
  isPaused = !isPaused;
  message(isPaused ? "일시정지" : "");
}

function restartDropTimer() {
  clearDropTimer();
  dropTimer = setInterval(() => {
    if (!isPaused && isRunning) {
      moveDown();
      draw();
    }
  }, dropInterval);
}

function clearDropTimer() {
  if (dropTimer) {
    clearInterval(dropTimer);
    dropTimer = null;
  }
}

function drawFromBag() {
  if (bag.length === 0) {
    bag = TYPES.slice();
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}

function createPiece(type) {
  return {
    type,
    shape: TETROMINOES[type].shape,
    rotation: 0,
    position: { x: 4, y: 0 },
  };
}

function spawnPiece() {
  const type = nextType || drawFromBag();
  currentPiece = createPiece(type);
  nextType = drawFromBag();
  updatePreview();

  if (!isValidPosition(currentPiece)) {
    endGame();
  }
}

function endGame() {
  isRunning = false;
  isPaused = false;
  clearDropTimer();
  message("게임 종료! 다시 시작 버튼을 누르세요.");
  startBtn.textContent = "다시 시작";
  nextType = null;
  updatePreview();
}

function moveHorizontal(offset) {
  if (!currentPiece) return;
  const newPosition = {
    x: currentPiece.position.x + offset,
    y: currentPiece.position.y,
  };
  if (isValidPosition(currentPiece, newPosition)) {
    currentPiece.position = newPosition;
    draw();
  }
}

function softDrop() {
  if (moveDown()) {
    score += 1;
    updateStats();
  }
  draw();
}

function hardDrop() {
  if (!currentPiece) return;
  let dropDistance = 0;
  while (moveDown()) {
    score += 2;
    dropDistance += 1;
  }
  if (dropDistance > 0) {
    updateStats();
  }
  draw();
}

function moveDown() {
  if (!currentPiece) return false;
  const newPosition = {
    x: currentPiece.position.x,
    y: currentPiece.position.y + 1,
  };

  if (isValidPosition(currentPiece, newPosition)) {
    currentPiece.position = newPosition;
    return true;
  }

  lockPiece();
  return false;
}

function rotate() {
  if (!currentPiece) return;

  const newRotation = (currentPiece.rotation + 1) % 4;
  const kicks = [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: -1 },
  ];

  for (const kick of kicks) {
    const testPosition = {
      x: currentPiece.position.x + kick.x,
      y: currentPiece.position.y + kick.y,
    };
    if (isValidPosition(currentPiece, testPosition, newRotation)) {
      currentPiece.rotation = newRotation;
      currentPiece.position = testPosition;
      draw();
      return;
    }
  }
}

function lockPiece() {
  const cells = getPieceCells(currentPiece);
  let outOfBounds = false;

  cells.forEach(({ x, y }) => {
    if (y < 0) {
      outOfBounds = true;
      return;
    }
    if (board[y] && board[y][x] === null) {
      board[y][x] = currentPiece.type;
    }
  });

  if (outOfBounds) {
    endGame();
    return;
  }

  clearLines();
  spawnPiece();
}

function clearLines() {
  let lines = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell !== null)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      lines += 1;
      y += 1; // recheck the same row after unshift
    }
  }

  if (lines > 0) {
    clearedLines += lines;
    const points = LINE_POINTS[lines] || 0;
    score += points * level;
    const newLevel = Math.floor(clearedLines / 10) + 1;
    if (newLevel !== level) {
      level = newLevel;
      dropInterval = Math.max(1000 - (level - 1) * 100, 150);
      if (isRunning) {
        restartDropTimer();
      }
    }
    updateStats();
  }
}

function isValidPosition(piece, position = piece.position, rotation = piece.rotation) {
  const cells = getPieceCells(piece, position, rotation);
  return cells.every(({ x, y }) => {
    if (x < 0 || x >= COLS || y >= ROWS) {
      return false;
    }
    if (y < 0) {
      return true;
    }
    return board[y][x] === null;
  });
}

function getPieceCells(piece, position = piece.position, rotation = piece.rotation) {
  const cells = [];
  for (const [x, y] of piece.shape) {
    let cellX = x;
    let cellY = y;
    if (piece.type !== "O") {
      for (let i = 0; i < rotation; i += 1) {
        const tempX = cellX;
        cellX = cellY;
        cellY = -tempX;
      }
    }
    cells.push({ x: position.x + cellX, y: position.y + cellY });
  }
  return cells;
}

function draw() {
  drawBoard();
}

function drawBoard() {
  for (let i = 0; i < playfieldCells.length; i += 1) {
    playfieldCells[i].className = "cell";
  }

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const type = board[y][x];
      if (type) {
        const cell = playfieldCells[y * COLS + x];
        cell.classList.add("filled", `cell--${type.toLowerCase()}`);
      }
    }
  }

  if (currentPiece) {
    const cells = getPieceCells(currentPiece);
    cells.forEach(({ x, y }) => {
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return;
      const cell = playfieldCells[y * COLS + x];
      cell.classList.add("active", `cell--${currentPiece.type.toLowerCase()}`);
    });
  }
}

function updatePreview() {
  previewCells.forEach((cell) => {
    cell.className = "cell";
  });

  if (!nextType) {
    return;
  }

  const shape = TETROMINOES[nextType].shape;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  shape.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const offsetX = Math.floor((PREVIEW_SIZE - width) / 2) - minX;
  const offsetY = Math.floor((PREVIEW_SIZE - height) / 2) - minY;

  shape.forEach(([x, y]) => {
    const px = x + offsetX;
    const py = y + offsetY;
    if (px >= 0 && px < PREVIEW_SIZE && py >= 0 && py < PREVIEW_SIZE) {
      const cell = previewCells[py * PREVIEW_SIZE + px];
      cell.classList.add("filled", `cell--${nextType.toLowerCase()}`);
    }
  });
}

function updateStats() {
  scoreEl.textContent = score;
  linesEl.textContent = clearedLines;
  levelEl.textContent = level;
}

init();
