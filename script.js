const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("scoreDisplay");
const bestScoreDisplay = document.getElementById("bestScoreDisplay");
const finalScore = document.getElementById("finalScore");
const startBestScore = document.getElementById("startBestScore");
const gameOverBestScore = document.getElementById("gameOverBestScore");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const GAME_STATE = {
  START: "start",
  PLAYING: "playing",
  GAME_OVER: "game-over",
};

const config = {
  width: canvas.width,
  height: canvas.height,
  gravity: 0.42,
  flapStrength: -7.2,
  fishX: 120,
  fishRadius: 20,
  obstacleWidth: 78,
  obstacleGap: 170,
  obstacleSpeed: 2.6,
  obstacleSpawnTime: 1450,
  seabedHeight: 92,
};

const BEST_SCORE_KEY = "bubble-drift-best-score";

let gameState = GAME_STATE.START;
let lastFrameTime = 0;
let obstacleSpawnTimer = 0;
let score = 0;
let bestScore = loadBestScore();
let currentAnimationTime = 0;

const fish = {
  x: config.fishX,
  y: config.height / 2,
  velocity: 0,
  radius: config.fishRadius,
};

let obstacles = [];
let bubbles = [];
let audioContext = null;
const soundCooldowns = {
  swim: 0,
  score: 0,
  crash: 0,
};

function loadBestScore() {
  const savedValue = window.localStorage.getItem(BEST_SCORE_KEY);
  const parsedValue = Number.parseInt(savedValue ?? "0", 10);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function saveBestScore() {
  window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
}

function updateBestScoreDisplay() {
  bestScoreDisplay.textContent = bestScore;
  startBestScore.textContent = bestScore;
  gameOverBestScore.textContent = bestScore;
}

function resetGame() {
  fish.y = config.height / 2;
  fish.velocity = 0;
  obstacles = [];
  bubbles = createBubbles();
  obstacleSpawnTimer = 0;
  score = 0;
  updateScore();
}

function startGame() {
  resetGame();
  gameState = GAME_STATE.PLAYING;
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

function endGame() {
  if (gameState !== GAME_STATE.PLAYING) {
    return;
  }

  gameState = GAME_STATE.GAME_OVER;
  playSound("crash");
  finalScore.textContent = score;
  updateBestScoreIfNeeded();
  gameOverScreen.classList.remove("hidden");
}

function updateScore() {
  scoreDisplay.textContent = score;
}

// Only write to localStorage when the player actually sets a new record.
function updateBestScoreIfNeeded() {
  if (score <= bestScore) {
    updateBestScoreDisplay();
    return;
  }

  bestScore = score;
  saveBestScore();
  updateBestScoreDisplay();
}

function flap() {
  if (gameState === GAME_STATE.START) {
    startGame();
  }

  if (gameState !== GAME_STATE.PLAYING) {
    return;
  }

  fish.velocity = config.flapStrength;
  playSound("swim");
}

function createObstacle() {
  const topMargin = 70;
  const safeArea = config.height - config.seabedHeight - topMargin * 2;
  const gapTop = topMargin + Math.random() * (safeArea - config.obstacleGap);

  obstacles.push({
    x: config.width + config.obstacleWidth,
    width: config.obstacleWidth,
    gapTop,
    gapBottom: gapTop + config.obstacleGap,
    scored: false,
  });
}

function createBubbles() {
  const bubbleCount = 12;
  const created = [];

  for (let index = 0; index < bubbleCount; index += 1) {
    created.push({
      x: Math.random() * config.width,
      y: Math.random() * config.height,
      radius: 3 + Math.random() * 8,
      speed: 0.2 + Math.random() * 0.6,
    });
  }

  return created;
}

function update(deltaMs) {
  if (gameState !== GAME_STATE.PLAYING) {
    updateBubbles(deltaMs, false);
    return;
  }

  const timeScale = deltaMs / 16.67;

  fish.velocity += config.gravity * timeScale;
  fish.y += fish.velocity * timeScale;

  obstacleSpawnTimer += deltaMs;
  if (obstacleSpawnTimer >= config.obstacleSpawnTime) {
    obstacleSpawnTimer = 0;
    createObstacle();
  }

  for (const obstacle of obstacles) {
    obstacle.x -= config.obstacleSpeed * timeScale;

    if (!obstacle.scored && obstacle.x + obstacle.width < fish.x) {
      obstacle.scored = true;
      score += 1;
      updateScore();
      updateBestScoreIfNeeded();
      playSound("score");
    }
  }

  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);

  updateBubbles(deltaMs, true);
  checkCollisions();
}

function updateBubbles(deltaMs, driftLeft) {
  const timeScale = deltaMs / 16.67;

  for (const bubble of bubbles) {
    bubble.y -= bubble.speed * timeScale;

    if (driftLeft) {
      bubble.x -= 0.15 * timeScale;
    }

    if (bubble.y < -10) {
      bubble.y = config.height + 10;
      bubble.x = Math.random() * config.width;
    }

    if (bubble.x < -10) {
      bubble.x = config.width + 10;
    }
  }
}

function checkCollisions() {
  if (fish.y - fish.radius <= 0) {
    endGame();
    return;
  }

  if (fish.y + fish.radius >= config.height - config.seabedHeight) {
    endGame();
    return;
  }

  for (const obstacle of obstacles) {
    const overlapsHorizontally =
      fish.x + fish.radius > obstacle.x &&
      fish.x - fish.radius < obstacle.x + obstacle.width;

    if (!overlapsHorizontally) {
      continue;
    }

    const hitsTopObstacle = fish.y - fish.radius < obstacle.gapTop;
    const hitsBottomObstacle = fish.y + fish.radius > obstacle.gapBottom;

    if (hitsTopObstacle || hitsBottomObstacle) {
      endGame();
      return;
    }
  }
}

function draw() {
  drawBackground();
  drawBubbles();
  drawObstacles();
  drawFish();

  if (gameState === GAME_STATE.START) {
    drawPrompt("Tap, click, or press Space to swim");
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, config.width, config.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
  gradient.addColorStop(0, "#9be8ff");
  gradient.addColorStop(0.55, "#39afcd");
  gradient.addColorStop(1, "#0c6882");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, config.width, config.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.moveTo(50 + index * 85, 0);
    ctx.lineTo(95 + index * 80, config.height * 0.45);
    ctx.lineTo(15 + index * 80, config.height * 0.45);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#d1b07a";
  ctx.fillRect(0, config.height - config.seabedHeight, config.width, config.seabedHeight);

  ctx.fillStyle = "#b8905d";
  for (let x = 0; x < config.width; x += 24) {
    ctx.fillRect(x, config.height - config.seabedHeight + 46, 16, 6);
  }

  drawSeaweed();
}

function drawSeaweed() {
  const baseY = config.height - config.seabedHeight;
  ctx.strokeStyle = "rgba(26, 122, 82, 0.75)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";

  for (let x = 20; x < config.width; x += 46) {
    const sway = Math.sin(currentAnimationTime * 0.0015 + x * 0.08) * 5;
    const midSway = Math.sin(currentAnimationTime * 0.0012 + x * 0.05) * 8;

    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x - 10 + sway, baseY - 20, x + 6 + midSway, baseY - 54);
    ctx.quadraticCurveTo(x + 14 + midSway, baseY - 84, x + 4 + sway, baseY - 118);
    ctx.stroke();
  }
}

function drawBubbles() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 2;

  for (const bubble of bubbles) {
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    drawCoralColumn(obstacle.x, 0, obstacle.width, obstacle.gapTop, true);

    const bottomHeight = config.height - config.seabedHeight - obstacle.gapBottom;
    drawCoralColumn(obstacle.x, obstacle.gapBottom, obstacle.width, bottomHeight, false);
  }
}

function drawCoralColumn(x, y, width, height, upsideDown) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = upsideDown ? "#ff8a78" : "#ff9f80";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = upsideDown ? "#ffb39b" : "#ffd0ab";
  const edgePadding = 4;
  const spikeSpacing = 26;
  const spikeWidth = Math.max(10, Math.min(22, width - edgePadding * 2));
  const spikeHeight = 14;

  for (let spikeY = edgePadding; spikeY <= height - edgePadding - spikeHeight; spikeY += spikeSpacing) {
    const useLeftSide = Math.floor((spikeY - edgePadding) / spikeSpacing) % 2 === 0;
    const spikeX = useLeftSide ? edgePadding : width - spikeWidth - edgePadding;
    const tipX = spikeX + spikeWidth / 2;
    const topY = spikeY;
    const bottomY = spikeY + spikeHeight;

    ctx.beginPath();
    if (upsideDown) {
      ctx.moveTo(spikeX, bottomY);
      ctx.lineTo(tipX, topY);
      ctx.lineTo(spikeX + spikeWidth, bottomY);
    } else {
      ctx.moveTo(spikeX, topY);
      ctx.lineTo(tipX, bottomY);
      ctx.lineTo(spikeX + spikeWidth, topY);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(124, 54, 66, 0.18)";
  ctx.fillRect(width - 10, 0, 10, height);
  ctx.restore();
}

function drawFish() {
  const swimPhase = currentAnimationTime * 0.012;
  const tailSway = Math.sin(swimPhase) * 7;
  const finSway = Math.sin(swimPhase + 0.9) * 5;
  const bodyLift = Math.sin(swimPhase * 0.5) * 1.5;
  const velocityTilt = Math.max(-0.45, Math.min(0.6, fish.velocity * 0.05));
  const jumpTilt = Math.max(-0.16, Math.min(0.12, -fish.velocity * 0.015));
  const bodyTilt = velocityTilt + jumpTilt;

  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.rotate(bodyTilt);

  ctx.fillStyle = "#ffb347";
  ctx.beginPath();
  ctx.ellipse(0, bodyLift, fish.radius + 8, fish.radius - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff8c42";
  ctx.beginPath();
  ctx.moveTo(-fish.radius - 8, bodyLift);
  ctx.quadraticCurveTo(
    -fish.radius - 20,
    bodyLift - 12 - tailSway,
    -fish.radius - 30,
    bodyLift - 16 - tailSway * 0.8
  );
  ctx.quadraticCurveTo(
    -fish.radius - 20,
    bodyLift - 2,
    -fish.radius - 8,
    bodyLift
  );
  ctx.quadraticCurveTo(
    -fish.radius - 20,
    bodyLift + 12 - tailSway,
    -fish.radius - 30,
    bodyLift + 16 - tailSway * 0.8
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffd26f";
  ctx.beginPath();
  ctx.moveTo(-1, bodyLift - 4);
  ctx.quadraticCurveTo(8, bodyLift - 16 - finSway, 18, bodyLift - 5);
  ctx.quadraticCurveTo(10, bodyLift - 2, -1, bodyLift - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffc85c";
  ctx.beginPath();
  ctx.moveTo(0, bodyLift + 5);
  ctx.quadraticCurveTo(10, bodyLift + 15 + finSway * 0.5, 17, bodyLift + 4);
  ctx.quadraticCurveTo(8, bodyLift + 4, 0, bodyLift + 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(13, bodyLift - 5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#17344b";
  ctx.beginPath();
  ctx.arc(15, bodyLift - 5, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(173, 91, 44, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, bodyLift + 6);
  ctx.quadraticCurveTo(10, bodyLift + 12, 18, bodyLift + 6);
  ctx.stroke();

  ctx.restore();
}

function drawPrompt(message) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "600 20px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(message, config.width / 2, config.height - 130);
}

function gameLoop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const deltaMs = Math.min(timestamp - lastFrameTime, 34);
  lastFrameTime = timestamp;
  currentAnimationTime = timestamp;

  update(deltaMs);
  draw();

  requestAnimationFrame(gameLoop);
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function createTone({
  type,
  frequency,
  endFrequency = frequency,
  duration,
  volume,
}) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.linearRampToValueAtTime(endFrequency, now + duration);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playSound(name) {
  const now = performance.now();

  if (now < soundCooldowns[name]) {
    return;
  }

  // Small cooldowns keep repeated inputs from turning into a wall of sound.
  if (name === "swim") {
    soundCooldowns.swim = now + 110;
    createTone({
      type: "sine",
      frequency: 540,
      endFrequency: 720,
      duration: 0.09,
      volume: 0.03,
    });
    return;
  }

  if (name === "score") {
    soundCooldowns.score = now + 180;
    createTone({
      type: "triangle",
      frequency: 660,
      endFrequency: 900,
      duration: 0.14,
      volume: 0.04,
    });
    return;
  }

  if (name === "crash") {
    soundCooldowns.crash = now + 300;
    createTone({
      type: "sawtooth",
      frequency: 220,
      endFrequency: 90,
      duration: 0.22,
      volume: 0.045,
    });
  }
}

function handlePointerInput(event) {
  event.preventDefault();
  flap();
}

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") {
    return;
  }

  event.preventDefault();

  if (gameState === GAME_STATE.GAME_OVER) {
    startGame();
    return;
  }

  flap();
});

canvas.addEventListener("pointerdown", handlePointerInput);
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

resetGame();
updateBestScoreDisplay();
requestAnimationFrame(gameLoop);
