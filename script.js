const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const waveText = document.querySelector("#waveText");
const nameText = document.querySelector("#nameText");
const hpText = document.querySelector("#hpText");
const shellText = document.querySelector("#shellText");
const powerText = document.querySelector("#powerText");
const restartButton = document.querySelector("#restartButton");
const startButton = document.querySelector("#startButton");
const gameOverRestartButton = document.querySelector("#gameOverRestartButton");
const clearRankingButton = document.querySelector("#clearRankingButton");
const playerNameInput = document.querySelector("#playerNameInput");
const startOverlay = document.querySelector("#startOverlay");
const upgradeOverlay = document.querySelector("#upgradeOverlay");
const gameOverOverlay = document.querySelector("#gameOverOverlay");
const upgradeList = document.querySelector("#upgradeList");
const rankingList = document.querySelector("#rankingList");
const gameOverRankingList = document.querySelector("#gameOverRankingList");
const resultTitle = document.querySelector("#resultTitle");
const resultText = document.querySelector("#resultText");

const keys = {};
const mouse = { x: 0, y: 0, down: false };
const tankImage = new Image();
tankImage.src = "tank.png";

const RANKING_KEY = "tankSurvivalRanking";

let player;
let playerBullets;
let enemyBullets;
let enemies;
let fireZones;
let particles;
let wave;
let enemiesToSpawn;
let spawnTimer;
let fireTimer;
let gameState;
let playerName = "Player";
let upgradeCounts;
let scoreSaved = false;
let lastTime = 0;

const bossTypes = [
  { id: "summoner", name: "소환 보스", color: "#a855f7" },
  { id: "bigShot", name: "거대 포탄 보스", color: "#ef4444" },
  { id: "drain", name: "흡혈 보스", color: "#14b8a6" },
  { id: "fire", name: "화염 보스", color: "#f97316" },
  { id: "armor", name: "방어력 보스", color: "#64748b" },
  { id: "bounce", name: "도탄 보스", color: "#38bdf8" }
];

function focusGame() {
  canvas.focus({ preventScroll: true });
  document.body.focus({ preventScroll: true });
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function getRankings() {
  try {
    return JSON.parse(localStorage.getItem(RANKING_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRankings(rankings) {
  localStorage.setItem(RANKING_KEY, JSON.stringify(rankings));
}

function addRanking(name, reachedWave) {
  const rankings = getRankings();
  rankings.push({
    name,
    wave: reachedWave,
    date: new Date().toLocaleDateString("ko-KR")
  });

  rankings.sort(function (a, b) {
    return b.wave - a.wave;
  });

  saveRankings(rankings.slice(0, 10));
  renderRanking();
}

function renderRanking() {
  const rankings = getRankings();
  const html = rankings.length === 0
    ? '<li class="empty-rank">아직 기록이 없습니다.</li>'
    : rankings.map(function (rank) {
      return `<li><span>${escapeHTML(rank.name)}</span><strong>Wave ${rank.wave}</strong></li>`;
    }).join("");

  rankingList.innerHTML = html;
  gameOverRankingList.innerHTML = html;
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetGame() {
  const typedName = playerNameInput.value.trim();
  playerName = typedName || "Player";
  scoreSaved = false;
  upgradeCounts = {
    hp: 0,
    shells: 0,
    power: 0,
    speed: 0,
    fireRate: 0,
    dualCannon: 0
  };

  player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 22,
    speed: 250,
    hp: 100,
    maxHp: 100,
    shellCount: 1,
    power: 1,
    reload: 0.22,
    dualCannon: false
  };

  playerBullets = [];
  enemyBullets = [];
  enemies = [];
  fireZones = [];
  particles = [];
  wave = 1;
  enemiesToSpawn = 0;
  spawnTimer = 0;
  fireTimer = 0;
  gameState = "playing";
  gameOverOverlay.classList.add("hidden");
  upgradeOverlay.classList.add("hidden");
  startOverlay.classList.add("hidden");
  focusGame();
  startWave();
}

function getDifficultyBonus() {
  return Math.max(0, wave - 8);
}

function startWave() {
  enemies = [];
  enemyBullets = [];
  fireZones = [];
  enemiesToSpawn = 0;
  spawnTimer = 0;
  gameState = "playing";

  if (isBossWave()) {
    spawnBoss();
  } else {
    enemiesToSpawn = 5 + Math.floor(wave * 2.4) + Math.floor(getDifficultyBonus() * 1.1);
  }

  updateHud();
}

function updateHud() {
  waveText.textContent = wave;
  nameText.textContent = playerName;
  hpText.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
  shellText.textContent = player.shellCount;
  powerText.textContent = player.power;
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isBossWave() {
  return wave % 10 === 0;
}

function getBossType() {
  const bossIndex = Math.floor(wave / 10 - 1) % bossTypes.length;
  return bossTypes[bossIndex];
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = Math.random() * canvas.width;
    y = -40;
  } else if (edge === 1) {
    x = canvas.width + 40;
    y = Math.random() * canvas.height;
  } else if (edge === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + 40;
  } else {
    x = -40;
    y = Math.random() * canvas.height;
  }

  enemies.push({
    x,
    y,
    radius: 20,
    hp: 2 + Math.floor(wave * 0.38) + Math.floor(getDifficultyBonus() * 0.22),
    speed: 58 + wave * 6 + getDifficultyBonus() * 3.5,
    shootCooldown: 0.8 + Math.random() * 1.4,
    type: Math.random() > 0.5 ? "triangle" : "square"
  });
}

function spawnMinion(x, y) {
  enemies.push({
    x: x + Math.random() * 120 - 60,
    y: y + Math.random() * 120 - 60,
    radius: 16,
    hp: 2 + Math.floor(wave * 0.25),
    speed: 76 + wave * 4,
    shootCooldown: 1.0 + Math.random(),
    type: "triangle",
    kind: "minion"
  });
}

function spawnBoss() {
  const bossType = getBossType();
  const bossLevel = Math.floor(wave / 10);
  const isArmorBoss = bossType.id === "armor";

  enemies.push({
    x: canvas.width / 2,
    y: 90,
    radius: isArmorBoss ? 48 : 42,
    hp: (120 + bossLevel * 70) * (isArmorBoss ? 1.9 : 1),
    maxHp: (120 + bossLevel * 70) * (isArmorBoss ? 1.9 : 1),
    speed: 45 + bossLevel * 4,
    shootCooldown: 1.1,
    specialCooldown: 2.6,
    type: "boss",
    kind: "boss",
    bossId: bossType.id,
    bossName: bossType.name,
    color: bossType.color
  });
}

function shootBossPattern(boss) {
  if (boss.bossId === "summoner") {
    for (let i = 0; i < 3; i += 1) {
      spawnMinion(boss.x, boss.y);
    }
    return;
  }

  if (boss.bossId === "bigShot") {
    shootEnemyBullet(boss, { radius: 18, damage: 22 + wave, speed: 130 + wave * 7, color: "#b91c1c" });
    return;
  }

  if (boss.bossId === "drain") {
    const distance = getDistance(boss, player);
    if (distance < 260) {
      player.hp -= 14;
      boss.hp = Math.min(boss.maxHp, boss.hp + 22);
      addParticles(player.x, player.y, "#14b8a6");
      addParticles(boss.x, boss.y, "#14b8a6");
    }
    return;
  }

  if (boss.bossId === "fire") {
    for (let i = 0; i < 4; i += 1) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (i - 1.5) * 0.28;
      shootEnemyBullet(boss, {
        angle,
        radius: 10,
        damage: 10 + wave * 0.4,
        speed: 170 + wave * 5,
        color: "#fb923c",
        fireTrail: true
      });
    }
    return;
  }

  if (boss.bossId === "bounce") {
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (i - 2) * 0.18;
      shootEnemyBullet(boss, {
        angle,
        radius: 9,
        damage: 12 + wave * 0.45,
        speed: 210 + wave * 5,
        color: "#38bdf8",
        bounces: 3
      });
    }
    return;
  }

  shootEnemyBullet(boss, { radius: 12, damage: 16 + wave * 0.5, speed: 170 + wave * 5, color: "#94a3b8" });
}

function shootPlayerBullet() {
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  const spread = 0.12;
  const cannonOffsets = player.dualCannon ? [-12, 12] : [0];

  cannonOffsets.forEach(function (sideOffset) {
    const sideX = Math.cos(angle + Math.PI / 2) * sideOffset;
    const sideY = Math.sin(angle + Math.PI / 2) * sideOffset;

    for (let i = 0; i < player.shellCount; i += 1) {
      const offset = (i - (player.shellCount - 1) / 2) * spread;
      playerBullets.push({
        x: player.x + sideX + Math.cos(angle + offset) * 28,
        y: player.y + sideY + Math.sin(angle + offset) * 28,
        vx: Math.cos(angle + offset) * 620,
        vy: Math.sin(angle + offset) * 620,
        radius: 6,
        damage: player.power,
        life: 1.4
      });
    }
  });
}

function shootEnemyBullet(enemy, options = {}) {
  const angle = options.angle ?? Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const bonus = getDifficultyBonus();
  const speed = options.speed ?? (145 + wave * 9 + bonus * 7);

  enemyBullets.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: options.radius ?? 8,
    damage: options.damage ?? (8 + wave * 0.75 + Math.floor(bonus * 0.45)),
    life: options.life ?? 6,
    bounces: options.bounces ?? 0,
    fireTrail: options.fireTrail ?? false,
    fireTimer: 0,
    color: options.color ?? "#f06455"
  });
}

function addFireZone(x, y) {
  fireZones.push({
    x,
    y,
    radius: 42,
    damage: 18 + wave * 0.25,
    life: 3.4
  });
}

function addParticles(x, y, color) {
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 140;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      color,
      life: 0.45
    });
  }
}

function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp || keys.arrowup || keys.w) dy -= 1;
  if (keys.ArrowDown || keys.arrowdown || keys.s) dy += 1;
  if (keys.ArrowLeft || keys.arrowleft || keys.a) dx -= 1;
  if (keys.ArrowRight || keys.arrowright || keys.d) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    player.x += (dx / length) * player.speed * dt;
    player.y += (dy / length) * player.speed * dt;
  }

  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);

  fireTimer -= dt;
  if (mouse.down && fireTimer <= 0) {
    shootPlayerBullet();
    fireTimer = player.reload;
  }
}

function updateEnemies(dt) {
  spawnTimer -= dt;

  if (enemiesToSpawn > 0 && spawnTimer <= 0) {
    spawnEnemy();
    enemiesToSpawn -= 1;
    spawnTimer = Math.max(0.22, 1.05 - wave * 0.028 - getDifficultyBonus() * 0.014);
  }

  enemies.forEach(function (enemy) {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

    if (enemy.kind === "boss") {
      const distance = getDistance(enemy, player);
      const targetDistance = 300;
      const direction = distance > targetDistance ? 1 : -0.45;
      enemy.x += Math.cos(angle) * enemy.speed * direction * dt;
      enemy.y += Math.sin(angle) * enemy.speed * direction * dt;
      enemy.x = clamp(enemy.x, enemy.radius, canvas.width - enemy.radius);
      enemy.y = clamp(enemy.y, enemy.radius + 70, canvas.height - enemy.radius);
    } else {
      enemy.x += Math.cos(angle) * enemy.speed * dt;
      enemy.y += Math.sin(angle) * enemy.speed * dt;
    }

    enemy.shootCooldown -= dt;
    enemy.specialCooldown -= dt;

    if (enemy.shootCooldown <= 0) {
      shootEnemyBullet(enemy);
      enemy.shootCooldown = enemy.kind === "boss"
        ? Math.max(0.42, 1.25 - wave * 0.012)
        : Math.max(0.36, 1.75 - wave * 0.042 - getDifficultyBonus() * 0.018);
    }

    if (enemy.kind === "boss" && enemy.specialCooldown <= 0) {
      shootBossPattern(enemy);
      enemy.specialCooldown = Math.max(1.25, 3.15 - Math.floor(wave / 10) * 0.055);
    }

    if (getDistance(enemy, player) < enemy.radius + player.radius) {
      player.hp -= enemy.kind === "boss" ? 40 * dt : 18 * dt;
    }
  });
}

function updateBullets(dt) {
  playerBullets.forEach(function (bullet) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  });

  enemyBullets.forEach(function (bullet) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (bullet.bounces > 0) {
      if (bullet.x < bullet.radius || bullet.x > canvas.width - bullet.radius) {
        bullet.vx *= -1;
        bullet.bounces -= 1;
      }

      if (bullet.y < bullet.radius || bullet.y > canvas.height - bullet.radius) {
        bullet.vy *= -1;
        bullet.bounces -= 1;
      }
    }

    if (bullet.fireTrail) {
      bullet.fireTimer -= dt;

      if (bullet.fireTimer <= 0) {
        addFireZone(bullet.x, bullet.y);
        bullet.fireTimer = 0.35;
      }
    }

    if (getDistance(bullet, player) < bullet.radius + player.radius) {
      player.hp -= bullet.damage;
      bullet.life = 0;
      if (bullet.fireTrail) {
        addFireZone(bullet.x, bullet.y);
      }
      addParticles(player.x, player.y, "#ef4444");
    }
  });

  playerBullets.forEach(function (playerBullet) {
    enemyBullets.forEach(function (enemyBullet) {
      const crashDistance = playerBullet.radius + enemyBullet.radius;
      if (playerBullet.life > 0 && enemyBullet.life > 0 && getDistance(playerBullet, enemyBullet) < crashDistance) {
        playerBullet.life = 0;
        enemyBullet.life = 0;
        addParticles(enemyBullet.x, enemyBullet.y, "#facc15");
      }
    });
  });

  playerBullets.forEach(function (bullet) {
    enemies.forEach(function (enemy) {
      if (bullet.life > 0 && enemy.hp > 0 && getDistance(bullet, enemy) < bullet.radius + enemy.radius) {
        const armorReduction = enemy.bossId === "armor" ? 0.45 : 1;
        enemy.hp -= Math.max(0.5, bullet.damage * armorReduction);
        bullet.life = 0;
        addParticles(enemy.x, enemy.y, "#f59e0b");
      }
    });
  });

  enemies = enemies.filter(function (enemy) {
    return enemy.hp > 0;
  });

  playerBullets = playerBullets.filter(function (bullet) {
    return bullet.life > 0 && bullet.x > -60 && bullet.x < canvas.width + 60 && bullet.y > -60 && bullet.y < canvas.height + 60;
  });

  enemyBullets = enemyBullets.filter(function (bullet) {
    return bullet.life > 0 && bullet.x > -80 && bullet.x < canvas.width + 80 && bullet.y > -80 && bullet.y < canvas.height + 80;
  });
}

function updateFireZones(dt) {
  fireZones.forEach(function (zone) {
    zone.life -= dt;

    if (getDistance(zone, player) < zone.radius + player.radius) {
      player.hp -= zone.damage * dt;
    }
  });

  fireZones = fireZones.filter(function (zone) {
    return zone.life > 0;
  });
}

function updateParticles(dt) {
  particles.forEach(function (particle) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  });

  particles = particles.filter(function (particle) {
    return particle.life > 0;
  });
}

function checkWaveClear() {
  if (gameState === "playing" && enemiesToSpawn === 0 && enemies.length === 0) {
    if (wave >= 200) {
      endVictory();
      return;
    }

    gameState = "upgrade";
    showUpgradeOptions();
  }
}

function getUpgradeSummaryHTML() {
  if (!upgradeCounts) {
    return "";
  }

  return [
    `HP 증가: ${upgradeCounts.hp}회`,
    `포탄 개수: ${upgradeCounts.shells}회`,
    `포탄 위력: ${upgradeCounts.power}회`,
    `이동속도: ${upgradeCounts.speed}/1회`,
    `공격속도: ${upgradeCounts.fireRate}/2회`,
    `보조 대포: ${upgradeCounts.dualCannon}/1회`
  ].map(function (text) {
    return `<li>${text}</li>`;
  }).join("");
}

function renderUpgradeSummary() {
  let summary = document.querySelector("#upgradeSummary");
  if (!summary) {
    summary = document.createElement("div");
    summary.id = "upgradeSummary";
    summary.className = "upgrade-summary";
    upgradeOverlay.appendChild(summary);
  }

  summary.innerHTML = `<strong>선택한 능력</strong><ul>${getUpgradeSummaryHTML()}</ul>`;
}

function getUpgradePool() {
  const pool = [
    {
      title: "HP 증가",
      text: "최대 체력 +25, 체력 100 회복",
      apply: function () {
        player.maxHp += 25;
        player.hp = Math.min(player.maxHp, player.hp + 100);
        upgradeCounts.hp += 1;
      }
    },
    {
      title: "포탄 개수 증가",
      text: "한 번에 발사하는 포탄 +1",
      apply: function () {
        player.shellCount += 1;
        upgradeCounts.shells += 1;
      }
    },
    {
      title: "포탄 위력 강화",
      text: "포탄 공격력 +1",
      apply: function () {
        player.power += 1;
        upgradeCounts.power += 1;
      }
    }
  ];

  if (upgradeCounts.speed < 1) {
    pool.push({
      title: "이동속도 증가",
      text: "이동속도 +45 (한 판에 1번만 선택 가능)",
      apply: function () {
        player.speed += 45;
        upgradeCounts.speed += 1;
      }
    });
  }

  if (upgradeCounts.fireRate < 2) {
    pool.push({
      title: "공격속도 증가",
      text: "재장전 시간 15% 감소 (한 판에 2번까지 선택 가능)",
      apply: function () {
        player.reload = Math.max(0.11, player.reload * 0.85);
        upgradeCounts.fireRate += 1;
      }
    });
  }


  if (upgradeCounts.dualCannon < 1) {
    pool.push({
      title: "보조 대포 추가",
      text: "대포가 하나 더 생겨 양쪽에서 같은 포탄을 발사합니다 (한 판에 1번만 선택 가능)",
      apply: function () {
        player.dualCannon = true;
        upgradeCounts.dualCannon += 1;
      }
    });
  }

  return pool;
}

function showUpgradeOptions() {
  const pool = getUpgradePool().sort(function () {
    return Math.random() - 0.5;
  });

  renderUpgradeSummary();
  upgradeList.innerHTML = "";
  pool.forEach(function (upgrade) {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    button.innerHTML = `<strong>${upgrade.title}</strong><span>${upgrade.text}</span>`;
    button.addEventListener("click", function () {
      upgrade.apply();
      wave += 1;
      upgradeOverlay.classList.add("hidden");
      focusGame();
      startWave();
    });
    upgradeList.appendChild(button);
  });

  upgradeOverlay.classList.remove("hidden");
}

function endGame() {
  gameState = "over";

  if (!scoreSaved) {
    addRanking(playerName, wave);
    scoreSaved = true;
  }

  resultTitle.textContent = "탱크가 파괴되었습니다";
  resultText.textContent = `${playerName}님은 Wave ${wave}까지 도달했습니다.`;
  gameOverOverlay.classList.remove("hidden");
}

function endVictory() {
  gameState = "over";
  wave = 200;

  if (!scoreSaved) {
    addRanking(playerName, 200);
    scoreSaved = true;
  }

  resultTitle.textContent = "200웨이브 클리어";
  resultText.textContent = `${playerName}님이 200웨이브를 클리어했습니다!`;
  gameOverOverlay.classList.remove("hidden");
}

function drawGrid() {
  ctx.fillStyle = "#d7dcd5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(96, 112, 101, 0.16)";
  ctx.lineWidth = 1;

  for (let x = 0; x < canvas.width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

  if (tankImage.complete && tankImage.naturalWidth > 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.drawImage(tankImage, -32, -32, 64, 64);
    if (player.dualCannon) {
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#6b737c";
      ctx.strokeStyle = "#47515b";
      ctx.lineWidth = 3;
      ctx.fillRect(-6, 3, 38, 12);
      ctx.strokeRect(-6, 3, 38, 12);
    }
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(angle);
  ctx.fillStyle = "#6b737c";
  ctx.strokeStyle = "#47515b";
  ctx.lineWidth = 3;
  ctx.fillRect(-6, -9, 38, 18);
  ctx.strokeRect(-6, -9, 38, 18);
  if (player.dualCannon) {
    ctx.fillRect(-6, 7, 38, 12);
    ctx.strokeRect(-6, 7, 38, 12);
  }
  ctx.rotate(Math.PI / 4);

  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = "#8a929a";
    ctx.fillRect(-10, -34, 20, 18);
    ctx.rotate(Math.PI / 2);
  }

  ctx.restore();
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#0ea5d7";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#17617a";
  ctx.stroke();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(Math.atan2(player.y - enemy.y, player.x - enemy.x));
  ctx.fillStyle = enemy.kind === "boss" ? enemy.color : enemy.type === "triangle" ? "#f87171" : "#f7d95b";
  ctx.strokeStyle = "#67717b";
  ctx.lineWidth = enemy.kind === "boss" ? 5 : 3;

  if (enemy.kind === "boss") {
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#263241";
    ctx.fillRect(0, -8, enemy.radius + 24, 16);
    ctx.strokeRect(0, -8, enemy.radius + 24, 16);
  } else if (enemy.type === "triangle") {
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-15, -17);
    ctx.lineTo(-15, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeRect(-16, -16, 32, 32);
  }

  ctx.restore();

  if (enemy.kind === "boss") {
    const barWidth = 120;
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = "rgba(23, 32, 51, 0.8)";
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y + enemy.radius + 12, barWidth, 8);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y + enemy.radius + 12, barWidth * hpRatio, 8);
    ctx.fillStyle = "#172033";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(enemy.bossName, enemy.x, enemy.y - enemy.radius - 12);
  } else {
    ctx.fillStyle = "#4b5b52";
    ctx.fillRect(enemy.x - 17, enemy.y + 27, 34, 5);
  }
}

function drawFireZones() {
  fireZones.forEach(function (zone) {
    ctx.globalAlpha = Math.max(0.15, zone.life / 3.4) * 0.55;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#fb923c";
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawBullets() {
  playerBullets.forEach(function (bullet) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.strokeStyle = "#7c6f19";
    ctx.stroke();
  });

  enemyBullets.forEach(function (bullet) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = bullet.color || "#f06455";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#8f4039";
    ctx.stroke();
  });
}

function drawParticles() {
  particles.forEach(function (particle) {
    ctx.globalAlpha = Math.max(0, particle.life / 0.45);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function draw() {
  drawGrid();

  if (!player) {
    return;
  }

  drawBullets();
  drawFireZones();
  enemies.forEach(drawEnemy);
  drawPlayer();
  drawParticles();
}

function update(dt) {
  if (gameState !== "playing") {
    return;
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateFireZones(dt);
  updateParticles(dt);
  checkWaveClear();
  updateHud();

  if (player.hp <= 0) {
    endGame();
  }
}

function gameLoop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

function normalizeKey(event) {
  const key = String(event.key || "").toLowerCase();
  const code = String(event.code || "");

  if (code === "KeyW") return "w";
  if (code === "KeyA") return "a";
  if (code === "KeyS") return "s";
  if (code === "KeyD") return "d";
  if (code === "ArrowUp") return "arrowup";
  if (code === "ArrowDown") return "arrowdown";
  if (code === "ArrowLeft") return "arrowleft";
  if (code === "ArrowRight") return "arrowright";
  if (code === "Space") return " ";
  if (code === "Enter") return "enter";
  return key;
}

function setKey(key, value) {
  keys[key] = value;
  keys[String(key).toLowerCase()] = value;
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", function (event) {
  const key = normalizeKey(event);

  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
    focusGame();
  }

  setKey(key, true);

  if (key === "enter" && !startOverlay.classList.contains("hidden")) {
    resetGame();
  }
}, { passive: false });

window.addEventListener("keyup", function (event) {
  setKey(normalizeKey(event), false);
}, { passive: false });

canvas.addEventListener("mousemove", function (event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  focusGame();
}, { passive: true });

canvas.addEventListener("mousedown", function (event) {
  if (event.button !== 0) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  mouse.down = true;
  focusGame();
  event.preventDefault();
}, { passive: false });

window.addEventListener("mouseup", function () {
  mouse.down = false;
});

window.addEventListener("blur", function () {
  mouse.down = false;
  Object.keys(keys).forEach(function (key) {
    keys[key] = false;
  });
});

canvas.addEventListener("contextmenu", function (event) {
  event.preventDefault();
});

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);
gameOverRestartButton.addEventListener("click", function () {
  gameOverOverlay.classList.add("hidden");
  startOverlay.classList.remove("hidden");
  playerNameInput.focus();
});

clearRankingButton.addEventListener("click", function () {
  localStorage.removeItem(RANKING_KEY);
  renderRanking();
});

resizeCanvas();
renderRanking();
drawGrid();
requestAnimationFrame(gameLoop);