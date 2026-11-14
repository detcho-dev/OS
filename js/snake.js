const GRID = 20;
const CELL = 20;
const SPEED_MS = 110;

export function createSnake(container, win) {
  container.innerHTML = `
    <div class="snake-app">
      <div class="snake-header">
        <div class="snake-score"><span>Score:</span> 0</div>
        <div class="snake-best"><span>Best:</span> 0</div>
      </div>
      <div class="snake-canvas-wrap">
        <canvas id="snakeCanvas" width="${GRID * CELL}" height="${
    GRID * CELL
  }"></canvas>
        <div class="snake-overlay">
          <h2>Snake</h2>
          <p>Press arrow keys or WASD to move</p>
          <button class="snake-start-btn">Start Game</button>
        </div>
      </div>
      <div class="snake-hint">↑↓←→ or WASD · Space to pause</div>
    </div>
  `;

  const canvas = container.querySelector("#snakeCanvas");
  const ctx = canvas.getContext("2d");
  const $score = container.querySelector(".snake-score");
  const $best = container.querySelector(".snake-best");
  const $overlay = container.querySelector(".snake-overlay");
  const $start = container.querySelector(".snake-start-btn");

  let snake,
    food,
    direction,
    nextDirection,
    score,
    best,
    running,
    paused,
    gameOver,
    loopId;

  best = Number(localStorage.getItem("webos.snake.best") || 0);
  updateHud();

  function updateHud() {
    $score.innerHTML = `<span>Score:</span> ${score || 0}`;
    $best.innerHTML = `<span>Best:</span> ${best}`;
  }

  function init() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    paused = false;
    gameOver = false;
    running = true;
    placeFood();
    updateHud();
    $overlay.classList.add("hidden");
    if (loopId) clearInterval(loopId);
    loopId = setInterval(step, SPEED_MS);
  }

  function placeFood() {
    const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
    const free = [];
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    if (free.length === 0) {
      endGame();
      return;
    }
    food = free[Math.floor(Math.random() * free.length)];
  }

  function step() {
    if (!running || paused || gameOver) return;

    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      endGame();
      return;
    }
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      if (score > best) {
        best = score;
        localStorage.setItem("webos.snake.best", best);
      }
      updateHud();
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    ctx.fillStyle = "#14200f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = "rgba(74,222,128,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(canvas.width, i * CELL);
      ctx.stroke();
    }

    // food
    ctx.fillStyle = "#f87171";
    roundRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4, 4);

    // snake
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#4ade80" : `rgba(74,222,128,${1 - i * 0.02})`;
      roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 3);
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function endGame() {
    gameOver = true;
    running = false;
    if (loopId) clearInterval(loopId);
    $overlay.innerHTML = `
      <h2>Game Over</h2>
      <p class="snake-overlay-score">Score: ${score}</p>
      <p>Best: ${best}</p>
      <button class="snake-start-btn">Play Again</button>
    `;
    $overlay.classList.remove("hidden");
    $overlay.querySelector(".snake-start-btn").addEventListener("click", init);
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    if (paused) {
      $overlay.innerHTML = `<h2>Paused</h2><p>Press Space to resume</p>`;
      $overlay.classList.remove("hidden");
    } else {
      $overlay.classList.add("hidden");
    }
  }

  function onKey(e) {
    if (!win || !document.body.contains(container)) {
      document.removeEventListener("keydown", onKey);
      return;
    }
    // ignore if typing in an input
    const focused = document.activeElement;
    if (focused && focused.tagName === "INPUT") return;

    const k = e.key;
    const kLower = k.toLowerCase();

    if (k === " " || k === "Spacebar") {
      e.preventDefault();
      togglePause();
      return;
    }

    if (!running || paused) return;

    if ((k === "ArrowUp" || kLower === "w") && direction.y === 0) {
      e.preventDefault();
      nextDirection = { x: 0, y: -1 };
    } else if ((k === "ArrowDown" || kLower === "s") && direction.y === 0) {
      e.preventDefault();
      nextDirection = { x: 0, y: 1 };
    } else if ((k === "ArrowLeft" || kLower === "a") && direction.x === 0) {
      e.preventDefault();
      nextDirection = { x: -1, y: 0 };
    } else if ((k === "ArrowRight" || kLower === "d") && direction.x === 0) {
      e.preventDefault();
      nextDirection = { x: 1, y: 0 };
    }
  }

  document.addEventListener("keydown", onKey);

  $start.addEventListener("click", init);

  // initial draw
  snake = [{ x: 10, y: 10 }];
  food = { x: 5, y: 5 };
  score = 0;
  draw();

  if (win) {
    win.onClose = () => {
      if (loopId) clearInterval(loopId);
      document.removeEventListener("keydown", onKey);
    };
  }
}
