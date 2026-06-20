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
const GAME_VERSION = "final-boss-5wave-speedcap-v5";

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
  { id: "bounce", name: "도탄 보스", color: "#38bdf8" },
  { id: "homing", name: "유도탄 보스", color: "#22c55e" },
  { id: "laser", name: "레이저 보스", color: "#e879f9" },
  { id: "splitter", name: "분열탄 보스", color: "#facc15" },
  { id: "rush", name: "돌진 보스", color: "#fb7185" },
  { id: "sniper", name: "저격 보스", color: "#60a5fa" },
  { id: "mine", name: "지뢰 보스", color: "#a3e635" }
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
  return Math.max(0, wave - 12);
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
    enemiesToSpawn = 4 + Math.floor(wave * 1.8) + Math.floor(getDifficultyBonus() * 0.7);
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
  return wave % 5 === 0;
}

function getBossType() {
  const bossIndex = Math.floor(wave / 5 - 1) % bossTypes.length;
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
    hp: 2 + Math.floor(wave * 0.28) + Math.floor(getDifficultyBonus() * 0.12),
    speed: Math.min(180, 54 + wave * 4.5 + getDifficultyBonus() * 2.2),
    shootCooldown: 0.8 + Math.random() * 1.4,
    type: Math.random() > 0.5 ? "triangle" : "square"
  });
}

function spawnMinion(x, y) {
  enemies.push({
    x: x + Math.random() * 120 - 60,
    y: y + Math.random() * 120 - 60,
    radius: 16,
    hp: 2 + Math.floor(wave * 0.18),
    speed: Math.min(200, 70 + wave * 3),
    shootCooldown: 1.0 + Math.random(),
    type: "triangle",
    kind: "minion"
  });
}

function spawnBoss() {
  const bossType = getBossType();
  const bossLevel = Math.floor(wave / 5);
  const isArmorBoss = bossType.id === "armor";

  enemies.push({
    x: canvas.width / 2,
    y: 90,
    radius: isArmorBoss ? 48 : 42,
    hp: (220 + bossLevel * 120) * (isArmorBoss ? 2.2 : 1),
    maxHp: (220 + bossLevel * 120) * (isArmorBoss ? 2.2 : 1),
    speed: Math.min(150, 55 + bossLevel * 5),
    shootCooldown: 0.85,
    specialCooldown: 2.0,
    type: "boss",
    kind: "boss",
    bossId: bossType.id,
    bossName: bossType.name,
    color: bossType.color
  });
}

function shootBossPattern(boss) {
  if (boss.bossId === "summoner") {
    for (let i = 0; i < 4; i += 1) {
      spawnMinion(boss.x, boss.y);
    }
    return;
  }

  if (boss.bossId === "bigShot") {
    shootEnemyBullet(boss, {
      radius: 22,
      damage: 45 + wave * 1.4,
      speed: 170 + wave * 6,
      color: "#7f1d1d",
      unbreakable: true
    });
    return;
  }

  if (boss.bossId === "drain") {
    const distance = getDistance(boss, player);
    if (distance < 290) {
      player.hp -= 22;
      boss.hp = Math.min(boss.maxHp, boss.hp + 42);
      addParticles(player.x, player.y, "#14b8a6");
      addParticles(boss.x, boss.y, "#14b8a6");
    }
    return;
  }

  if (boss.bossId === "fire") {
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (i - 2) * 0.24;
      shootEnemyBullet(boss, {
        angle,
        radius: 10,
        damage: 16 + wave * 0.55,
        speed: 195 + wave * 5.5,
        color: "#fb923c",
        fireTrail: true
      });
    }
    return;
  }

  if (boss.bossId === "bounce") {
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (i - 2.5) * 0.17;
      shootEnemyBullet(boss, {
        angle,
        radius: 9,
        damage: 18 + wave * 0.62,
        speed: 235 + wave * 5.5,
        color: "#38bdf8",
        bounces: 4
      });
    }
    return;
  }

  if (boss.bossId === "homing") {
    for (let i = 0; i < 3; i += 1) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (i - 1) * 0.35;
      shootEnemyBullet(boss, {
        angle,
        radius: 11,
        damage: 18 + wave * 0.65,
        speed: 135 + wave * 3.8,
        color: "#22c55e",
        homing: true,
        turnRate: 2.6,
        life: 7
      });
    }
    return;
  }

  if (boss.bossId === "laser") {
    for (let i = 0; i < 9; i += 1) {
      const angle = (Math.PI * 2 / 9) * i + performance.now() / 900;
      shootEnemyBullet(boss, {
        angle,
        radius: 7,
        damage: 13 + wave * 0.42,
        speed: 255 + wave * 3.5,
        color: "#e879f9",
        life: 4.8
      });
    }
    return;
  }

  if (boss.bossId === "splitter") {
    for (let i = 0; i < 3; i += 1) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (i - 1) * 0.28;
      shootEnemyBullet(boss, {
        angle,
        radius: 13,
        damage: 17 + wave * 0.5,
        speed: 155 + wave * 4,
        color: "#facc15",
        splitOnExpire: true,
        life: 2.2
      });
    }
    return;
  }

  if (boss.bossId === "rush") {
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
    boss.x += Math.cos(angle) * boss.speed * 1.6;
    boss.y += Math.sin(angle) * boss.speed * 1.6;
    boss.x = clamp(boss.x, boss.radius, canvas.width - boss.radius);
    boss.y = clamp(boss.y, boss.radius + 70, canvas.height - boss.radius);
    for (let i = 0; i < 6; i += 1) {
      shootEnemyBullet(boss, {
        angle: angle + (i - 2.5) * 0.32,
        radius: 8,
        damage: 14 + wave * 0.42,
        speed: 185 + wave * 4,
        color: "#fb7185"
      });
    }
    return;
  }

  if (boss.bossId === "sniper") {
    shootEnemyBullet(boss, {
      radius: 10,
      damage: 38 + wave * 1.1,
      speed: 390 + wave * 5,
      color: "#60a5fa",
      unbreakable: true,
      life: 3.5
    });
    return;
  }

  if (boss.bossId === "mine") {
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      shootEnemyBullet(boss, {
        angle,
        radius: 12,
        damage: 20 + wave * 0.55,
        speed: 65 + Math.random() * 55,
        color: "#a3e635",
        mine: true,
        life: 5.5
      });
    }
    return;
  }

  shootEnemyBullet(boss, { radius: 12, damage: 24 + wave * 0.8, speed: 190 + wave * 5.5, color: "#94a3b8" });
}

function shootPlayerBullet() {
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  const spread = 0.12;
  const cannonAngles = player.dualCannon ? [angle, angle + Math.PI] : [angle];

  cannonAngles.forEach(function (cannonAngle) {
    for (let i = 0; i < player.shellCount; i += 1) {
      const offset = (i - (player.shellCount - 1) / 2) * spread;
      const shotAngle = cannonAngle + offset;

      playerBullets.push({
        x: player.x + Math.cos(shotAngle) * 28,
        y: player.y + Math.sin(shotAngle) * 28,
        vx: Math.cos(shotAngle) * 620,
        vy: Math.sin(shotAngle) * 620,
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
  const speed = options.speed ?? (130 + wave * 6.5 + bonus * 4.5);

  enemyBullets.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: options.radius ?? 8,
    damage: options.damage ?? (6 + wave * 0.55 + Math.floor(bonus * 0.25)),
    life: options.life ?? 6,
    bounces: options.bounces ?? 0,
    fireTrail: options.fireTrail ?? false,
    fireTimer: 0,
    color: options.color ?? "#f06455",
    unbreakable: options.unbreakable ?? false,
    homing: options.homing ?? false,
    turnRate: options.turnRate ?? 0,
    splitOnExpire: options.splitOnExpire ?? false,
    mine: options.mine ?? false
  });
}

function addFireZone(x, y) {
  fireZones.push({
    x,
    y,
    radius: 42,
    damage: 12 + wave * 0.18,
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
    spawnTimer = Math.max(0.34, 1.15 - wave * 0.02 - getDifficultyBonus() * 0.008);
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
        ? Math.max(0.28, 0.95 - wave * 0.012)
        : Math.max(0.52, 1.9 - wave * 0.03 - getDifficultyBonus() * 0.01);
    }

    if (enemy.kind === "boss" && enemy.specialCooldown <= 0) {
      shootBossPattern(enemy);
      enemy.specialCooldown = Math.max(0.85, 2.35 - Math.floor(wave / 10) * 0.06);
    }

    if (getDistance(enemy, player) < enemy.radius + player.radius) {
      player.hp -= enemy.kind === "boss" ? 55 * dt : 11 * dt;
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

    if (bullet.homing && bullet.life > 0) {
      const targetAngle = Math.atan2(player.y - bullet.y, player.x - bullet.x);
      const currentAngle = Math.atan2(bullet.vy, bullet.vx);
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const maxTurn = bullet.turnRate * dt;
      const nextAngle = currentAngle + clamp(diff, -maxTurn, maxTurn);
      const speed = Math.hypot(bullet.vx, bullet.vy);
      bullet.vx = Math.cos(nextAngle) * speed;
      bullet.vy = Math.sin(nextAngle) * speed;
    }

    if (bullet.mine) {
      bullet.vx *= Math.pow(0.35, dt);
      bullet.vy *= Math.pow(0.35, dt);
    }

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
        if (!enemyBullet.unbreakable) {
          enemyBullet.life = 0;
          addParticles(enemyBullet.x, enemyBullet.y, "#facc15");
        } else {
          addParticles(playerBullet.x, playerBullet.y, "#ef4444");
        }
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

  const splitBullets = [];
  enemyBullets.forEach(function (bullet) {
    if (bullet.splitOnExpire && bullet.life <= 0 && bullet.x > -80 && bullet.x < canvas.width + 80 && bullet.y > -80 && bullet.y < canvas.height + 80) {
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 / 8) * i;
        splitBullets.push({
          x: bullet.x,
          y: bullet.y,
          vx: Math.cos(angle) * (150 + wave * 2.5),
          vy: Math.sin(angle) * (150 + wave * 2.5),
          radius: 6,
          damage: 9 + wave * 0.25,
          life: 2.8,
          bounces: 0,
          fireTrail: false,
          fireTimer: 0,
          color: "#fde047",
          unbreakable: false,
          homing: false,
          turnRate: 0,
          splitOnExpire: false,
          mine: false
        });
      }
    }
  });

  enemyBullets = enemyBullets.filter(function (bullet) {
    return bullet.life > 0 && bullet.x > -80 && bullet.x < canvas.width + 80 && bullet.y > -80 && bullet.y < canvas.height + 80;
  }).concat(splitBullets);
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
    `포탄 개수: ${upgradeCounts.shells}/10회`,
    `포탄 위력: ${upgradeCounts.power}회`,
    `이동속도: ${upgradeCounts.speed}/1회`,
    `공격속도: ${upgradeCounts.fireRate}/1회`,
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
      text: "최대 체력 +25, 현재 체력 +100 회복",
      apply: function () {
        player.maxHp += 25;
        player.hp = Math.min(player.maxHp + 75, player.hp + 100);
        upgradeCounts.hp += 1;
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

  if (upgradeCounts.shells < 10) {
    pool.push({
      title: "포탄 개수 증가",
      text: "한 번에 발사하는 포탄 +1 (한 판에 10번까지 선택 가능)",
      apply: function () {
        player.shellCount += 1;
        upgradeCounts.shells += 1;
      }
    });
  }

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

  if (upgradeCounts.fireRate < 1) {
    pool.push({
      title: "공격속도 증가",
      text: "재장전 시간 15% 감소 (한 판에 1번만 선택 가능)",
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
      ctx.fillRect(-38, -7, 32, 14);
      ctx.strokeRect(-38, -7, 32, 14);
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
    ctx.fillRect(-38, -7, 32, 14);
    ctx.strokeRect(-38, -7, 32, 14);
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
    ctx.strokeStyle = bullet.unbreakable ? "#111827" : "#8f4039";
    ctx.lineWidth = bullet.unbreakable ? 4 : 2;
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

function isTypingTarget(target) {
  if (!target) return false;
  const tagName = String(target.tagName || "").toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}

window.addEventListener("keydown", function (event) {
  if (isTypingTarget(event.target)) {
    if (event.key === "Enter" && !startOverlay.classList.contains("hidden")) {
      resetGame();
    }
    return;
  }

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
  if (isTypingTarget(event.target)) {
    return;
  }

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
console.log("Tank Game Version:", GAME_VERSION);
