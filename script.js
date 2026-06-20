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
const GAME_VERSION = "attack45-bossboost-bigshot-explosion-v15";

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
  { id: "summoner", name: "마녀 소환 보스", color: "#a855f7" },
  { id: "bigShot", name: "거대 포탄 보스", color: "#ef4444" },
  { id: "drain", name: "흡혈 결계 보스", color: "#14b8a6" },
  { id: "fire", name: "화염 지배자 보스", color: "#f97316" },
  { id: "armor", name: "철갑 요새 보스", color: "#64748b" },
  { id: "bounce", name: "도탄 폭풍 보스", color: "#38bdf8" },
  { id: "homing", name: "유도탄 보스", color: "#22c55e" },
  { id: "laser", name: "회전 레이저 보스", color: "#e879f9" },
  { id: "splitter", name: "분열탄 보스", color: "#facc15" },
  { id: "rush", name: "광폭 돌진 보스", color: "#fb7185" },
  { id: "sniper", name: "저격 보스", color: "#60a5fa" },
  { id: "mine", name: "지뢰 장판 보스", color: "#a3e635" },
  { id: "vortex", name: "소용돌이 보스", color: "#818cf8" },
  { id: "mirror", name: "거울 분신 보스", color: "#f472b6" },
  { id: "wall", name: "탄막 장벽 보스", color: "#fb923c" },
  { id: "curse", name: "저주 보스", color: "#a78bfa" },
  { id: "charger", name: "파괴 돌진 보스", color: "#dc2626" },
  { id: "slime", name: "슬라임 분열 보스", color: "#84cc16" }
];

const BULLET_TIERS = [
  { name: "노랑포탄", color: "#facc15" },
  { name: "빨강포탄", color: "#ef4444" },
  { name: "파랑포탄", color: "#3b82f6" },
  { name: "초록포탄", color: "#22c55e" },
  { name: "보라포탄", color: "#a855f7" },
  { name: "주황포탄", color: "#f97316" },
  { name: "하늘포탄", color: "#06b6d4" },
  { name: "분홍포탄", color: "#ec4899" },
  { name: "흰색포탄", color: "#f8fafc" },
  { name: "검정포탄", color: "#111827" }
];

const MAX_WAVE = 100;
const PLAYER_ATTACK_MULTIPLIER = 3;
const BOSS_POWER_MULTIPLIER = 10;

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
    hp: 300,
    shells: 0,
    power: 1,
    speed: 0,
    fireRate: 0,
    dualCannon: 0
  };

  player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 22,
    speed: 250,
    hp: 300,
    maxHp: 300,
    shellCount: 1,
    power: 3,
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
  return Math.max(0, wave - 6);
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
    enemiesToSpawn = 4 + Math.floor(wave * 3.6) + Math.floor(getDifficultyBonus() * 1.4);
  }

  updateHud();
}

function updateHud() {
  waveText.textContent = wave;
  nameText.textContent = playerName;
  hpText.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
  shellText.textContent = updateShellHudText();
  powerText.textContent = `${player.power} x${((player.attackMultiplier || 1) * PLAYER_ATTACK_MULTIPLIER).toFixed(1)}`;
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
    hp: Math.ceil((8 + Math.floor(wave * 2.8) + Math.floor(getDifficultyBonus() * 1.4)) * 1.5),
    speed: Math.min(180, 54 + wave * 9 + getDifficultyBonus() * 4.4),
    shootCooldown: 0.8 + Math.random() * 1.4,
    type: Math.random() > 0.5 ? "triangle" : "square"
  });
}

function spawnMinion(x, y) {
  enemies.push({
    x: x + Math.random() * 120 - 60,
    y: y + Math.random() * 120 - 60,
    radius: 16,
    hp: Math.ceil((6 + Math.floor(wave * 1.8)) * 1.5),
    speed: Math.min(200, 70 + wave * 6),
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
    hp: (260 + bossLevel * 90) * getBossScaling() * (isArmorBoss ? 2.2 : 1),
    maxHp: (260 + bossLevel * 90) * getBossScaling() * (isArmorBoss ? 2.2 : 1),
    speed: Math.min(150, 55 + bossLevel * 10),
    shootCooldown: 0.85,
    specialCooldown: 2.0,
    type: "boss",
    kind: "boss",
    bossId: bossType.id,
    bossName: bossType.name,
    color: bossType.color
  });
}


function randomMapPoint(margin = 70) {
  return {
    x: margin + Math.random() * Math.max(1, canvas.width - margin * 2),
    y: margin + Math.random() * Math.max(1, canvas.height - margin * 2)
  };
}

function spawnMinionAtRandom(kind = "normal") {
  const p = randomMapPoint(80);
  const elite = kind === "elite";
  enemies.push({
    x: p.x,
    y: p.y,
    radius: elite ? 19 : 16,
    hp: elite ? Math.ceil((18 + Math.floor(wave * 3.2)) * 1.5) : Math.ceil((8 + Math.floor(wave * 1.8)) * 1.5),
    speed: Math.min(elite ? 215 : 200, elite ? 88 + wave * 6.8 : 70 + wave * 6),
    shootCooldown: elite ? 0.7 + Math.random() * 0.6 : 1.0 + Math.random(),
    type: elite ? "square" : "triangle",
    kind: "minion"
  });
  addParticles(p.x, p.y, elite ? "#c084fc" : "#a855f7");
}

function shootRadial(enemy, count, speed, radius, damage, color, angleOffset = 0) {
  for (let i = 0; i < count; i += 1) {
    const angle = angleOffset + (Math.PI * 2 / count) * i;
    shootEnemyBullet(enemy, { angle, speed, radius, damage, color });
  }
}

function shootSpiral(enemy, count, baseAngle, spread, speed, radius, damage, color) {
  for (let i = 0; i < count; i += 1) {
    shootEnemyBullet(enemy, {
      angle: baseAngle + (i - (count - 1) / 2) * spread,
      speed,
      radius,
      damage,
      color
    });
  }
}



function bossProjectile(enemy, options = {}) {
  options.unbreakable = options.unbreakable ?? false;
  if (options.bulletHp == null) {
    options.bulletHp = ((options.radius ?? 8) >= 12 || options.homing || options.splitOnExpire || options.mine || options.fireTrail || options.bounces) ? 4 : 1;
  }
  return shootEnemyBullet(enemy, options);
}

function teleportBoss(boss) {
  const p = randomMapPoint(100);
  addParticles(boss.x, boss.y, boss.color || "#ffffff");
  boss.x = p.x;
  boss.y = p.y;
  addParticles(boss.x, boss.y, boss.color || "#ffffff");
}

function createWarningZone(x, y, radius, delay, damage, color) {
  fireZones.push({
    x,
    y,
    radius,
    damage,
    life: delay + 1.1,
    warning: delay,
    color: color || "#fb923c"
  });
}


function shootBossPattern(boss) {
  const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
  const bossLevel = Math.max(1, Math.floor(wave / 5));
  const t = performance.now() / 1000;

  if (boss.bossId === "summoner") {
    const summonCount = Math.min(9, 4 + Math.floor(bossLevel / 2));
    for (let i = 0; i < summonCount; i += 1) {
      spawnMinionAtRandom(i % 3 === 0 ? "elite" : "normal");
    }
    shootRadial(boss, 10, 160 + wave * 4.4, 8, 10 + wave * 0.56, "#c084fc", t);
    if (bossLevel % 2 === 0) teleportBoss(boss);
    return;
  }

  if (boss.bossId === "bigShot") {
    bossProjectile(boss, {
      radius: 26,
      damage: 52 + wave * 2.8,
      speed: 180 + wave * 11,
      color: "#7f1d1d",
      unbreakable: true,
      bulletHp: 999999,
      explodeOnWall: true,
      explosionRadius: 170,
      explosionDamage: 95 + wave * 3
    });
    shootSpiral(boss, 6, aim, 0.27, 195 + wave * 4.6, 8, 12 + wave * 0.45, "#fca5a5");
    return;
  }

  if (boss.bossId === "drain") {
    const distance = getDistance(boss, player);
    if (distance < 330) {
      player.hp -= 36;
      boss.hp = Math.min(boss.maxHp, boss.hp + 85);
      addParticles(player.x, player.y, "#14b8a6");
      addParticles(boss.x, boss.y, "#14b8a6");
    }
    for (let i = 0; i < 3; i += 1) {
      const p = randomMapPoint(90);
      createWarningZone(p.x, p.y, 48, 0.8, 18 + wave * 0.35, "#14b8a6");
    }
    shootRadial(boss, 8, 150 + wave * 4.4, 8, 11 + wave * 0.5, "#2dd4bf", t * 0.7);
    return;
  }

  if (boss.bossId === "fire") {
    shootSpiral(boss, 9, aim, 0.16, 205 + wave * 9.6, 10, 16 + wave * 1.0, "#fb923c");
    for (let i = 0; i < 4; i += 1) {
      const p = randomMapPoint(90);
      addFireZone(p.x, p.y);
    }
    return;
  }

  if (boss.bossId === "armor") {
    boss.hp = Math.min(boss.maxHp, boss.hp + 28 + bossLevel * 4);
    shootRadial(boss, 14, 170 + wave * 5.6, 9, 13 + wave * 0.64, "#94a3b8", t * 0.9);
    bossProjectile(boss, { angle: aim, radius: 15, damage: 28 + wave * 0.9, speed: 210 + wave * 5, color: "#475569" });
    return;
  }

  if (boss.bossId === "bounce") {
    shootSpiral(boss, 9, aim, 0.14, 240 + wave * 9.6, 9, 18 + wave * 1.1, "#38bdf8");
    const before = enemyBullets.length;
    shootRadial(boss, 8, 200 + wave * 6, 7, 12 + wave * 0.48, "#7dd3fc", t);
    enemyBullets.slice(before).forEach(function (b) { b.bounces = Math.max(b.bounces, 5); b.unbreakable = true; });
    return;
  }

  if (boss.bossId === "homing") {
    for (let i = 0; i < 5; i += 1) {
      bossProjectile(boss, {
        angle: aim + (i - 2) * 0.36,
        radius: 11,
        damage: 18 + wave * 1.16,
        speed: 140 + wave * 6.8,
        color: "#22c55e",
        homing: true,
        turnRate: 3.2,
        life: 7
      });
    }
    return;
  }

  if (boss.bossId === "laser") {
    shootRadial(boss, 16, 285 + wave * 6.4, 7, 13 + wave * 0.68, "#e879f9", t * 1.8);
    shootSpiral(boss, 5, aim, 0.07, 380 + wave * 7.6, 6, 22 + wave * 1.1, "#f0abfc");
    return;
  }

  if (boss.bossId === "splitter") {
    for (let i = 0; i < 5; i += 1) {
      bossProjectile(boss, {
        angle: aim + (i - 2) * 0.22,
        radius: 14,
        damage: 17 + wave * 0.9,
        speed: 175 + wave * 7.6,
        color: "#facc15",
        splitOnExpire: true,
        life: 2.0
      });
    }
    return;
  }

  if (boss.bossId === "rush") {
    const dashDistance = Math.min(260, boss.speed * 3.0);
    boss.x += Math.cos(aim) * dashDistance;
    boss.y += Math.sin(aim) * dashDistance;
    boss.x = clamp(boss.x, boss.radius, canvas.width - boss.radius);
    boss.y = clamp(boss.y, boss.radius + 70, canvas.height - boss.radius);
    shootRadial(boss, 12, 205 + wave * 6.4, 8, 15 + wave * 0.8, "#fb7185", aim);
    return;
  }

  if (boss.bossId === "sniper") {
    bossProjectile(boss, {
      radius: 11,
      damage: 48 + wave * 2.1,
      speed: 460 + wave * 8.4,
      color: "#60a5fa",
      life: 3.3
    });
    for (let i = 0; i < 2; i += 1) {
      const p = randomMapPoint(90);
      createWarningZone(p.x, p.y, 35, 0.55, 30 + wave * 0.7, "#60a5fa");
    }
    return;
  }

  if (boss.bossId === "mine") {
    for (let i = 0; i < 8; i += 1) {
      bossProjectile(boss, {
        angle: Math.random() * Math.PI * 2,
        radius: 12,
        damage: 20 + wave * 1.0,
        speed: 80 + Math.random() * 75,
        color: "#a3e635",
        mine: true,
        life: 6.2
      });
    }
    shootRadial(boss, 7, 165 + wave * 4.6, 7, 11 + wave * 0.44, "#d9f99d", t);
    return;
  }

  if (boss.bossId === "vortex") {
    for (let i = 0; i < 18; i += 1) {
      bossProjectile(boss, {
        angle: t + i * 0.55,
        radius: 7,
        damage: 13 + wave * 0.65,
        speed: 150 + i * 9 + wave * 3,
        color: "#818cf8",
        homing: i % 3 === 0,
        turnRate: 1.4,
        life: 5.2
      });
    }
    return;
  }

  if (boss.bossId === "mirror") {
    const mirrorPoints = [
      { x: canvas.width - boss.x, y: boss.y },
      { x: boss.x, y: canvas.height - boss.y }
    ];
    mirrorPoints.forEach(function (p) {
      const fakeBoss = { x: p.x, y: p.y, kind: "boss" };
      addParticles(p.x, p.y, "#f472b6");
      bossProjectile(fakeBoss, {
        angle: Math.atan2(player.y - p.y, player.x - p.x),
        radius: 9,
        damage: 16 + wave * 0.75,
        speed: 220 + wave * 5,
        color: "#f472b6"
      });
    });
    shootSpiral(boss, 5, aim, 0.18, 205 + wave * 5, 8, 15 + wave * 0.65, "#f9a8d4");
    return;
  }

  if (boss.bossId === "wall") {
    for (let i = -5; i <= 5; i += 1) {
      bossProjectile(boss, {
        angle: aim + i * 0.055,
        radius: 9,
        damage: 14 + wave * 0.62,
        speed: 210 + Math.abs(i) * 12 + wave * 4.6,
        color: "#fb923c",
        life: 5
      });
    }
    return;
  }

  if (boss.bossId === "curse") {
    player.hp -= 10;
    for (let i = 0; i < 4; i += 1) {
      const p = randomMapPoint(80);
      createWarningZone(p.x, p.y, 56, 0.7, 24 + wave * 0.75, "#a78bfa");
    }
    bossProjectile(boss, {
      angle: aim,
      radius: 12,
      damage: 24 + wave * 0.9,
      speed: 165 + wave * 5,
      color: "#a78bfa",
      homing: true,
      turnRate: 2.0,
      life: 6
    });
    return;
  }


  if (boss.bossId === "charger") {
    const dashDistance = Math.min(320, boss.speed * 3.8);
    boss.x += Math.cos(aim) * dashDistance;
    boss.y += Math.sin(aim) * dashDistance;
    boss.x = clamp(boss.x, boss.radius, canvas.width - boss.radius);
    boss.y = clamp(boss.y, boss.radius + 70, canvas.height - boss.radius);
    shootRadial(boss, 14, 230 + wave * 6, 10, 28 + wave * 1.4, "#dc2626", aim);
    createWarningZone(player.x, player.y, 70, 0.45, 45 + wave * 2.0, "#dc2626");
    return;
  }

  if (boss.bossId === "slime") {
    for (let i = 0; i < 4; i += 1) {
      spawnMinionAtRandom("elite");
    }
    shootRadial(boss, 16, 145 + wave * 4.2, 12, 20 + wave * 1.0, "#84cc16", t);
    for (let i = 0; i < 3; i += 1) {
      const p = randomMapPoint(80);
      createWarningZone(p.x, p.y, 62, 0.75, 25 + wave * 1.1, "#84cc16");
    }
    return;
  }

  bossProjectile(boss, { radius: 12, damage: 24 + wave * 1.6, speed: 190 + wave * 11, color: "#94a3b8" });
}


function getBulletTierInfo() {
  const rawCount = Math.max(1, player.shellCount);
  const tierIndex = Math.min(BULLET_TIERS.length - 1, Math.floor(Math.log10(rawCount)));
  const tierBase = Math.pow(10, tierIndex);
  const tierBulletCount = Math.max(1, Math.floor(rawCount / tierBase));
  const tier = BULLET_TIERS[tierIndex] || BULLET_TIERS[BULLET_TIERS.length - 1];

  return {
    tierIndex,
    tierName: tier.name,
    color: tier.color,
    bulletCount: tierBulletCount,
    damageMultiplier: Math.pow(10, tierIndex)
  };
}

function getBossScaling() {
  const bossLevel = Math.max(1, Math.floor(wave / 5));
  return Math.pow(BOSS_POWER_MULTIPLIER, bossLevel - 1);
}

function updateShellHudText() {
  if (!player) return "-";
  const info = getBulletTierInfo();
  return `${info.tierName} × ${info.bulletCount}`;
}

function shootPlayerBullet() {
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  const spread = 0.12;
  const info = getBulletTierInfo();

  // 보조 대포는 원래 대포 한쪽 옆에 붙고 같은 방향으로 발사합니다.
  const cannonOffsets = player.dualCannon ? [0, 13] : [0];

  cannonOffsets.forEach(function (sideOffset) {
    const sideX = Math.cos(angle + Math.PI / 2) * sideOffset;
    const sideY = Math.sin(angle + Math.PI / 2) * sideOffset;

    for (let i = 0; i < info.bulletCount; i += 1) {
      const offset = (i - (info.bulletCount - 1) / 2) * spread;
      const shotAngle = angle + offset;

      playerBullets.push({
        x: player.x + sideX + Math.cos(shotAngle) * 28,
        y: player.y + sideY + Math.sin(shotAngle) * 28,
        vx: Math.cos(shotAngle) * 620,
        vy: Math.sin(shotAngle) * 620,
        radius: 6 + info.tierIndex * 1.2,
        damage: player.power * info.damageMultiplier * PLAYER_ATTACK_MULTIPLIER * (player.attackMultiplier || 1),
        life: 1.4,
        color: info.color,
        tierIndex: info.tierIndex
      });
    }
  });
}

function shootEnemyBullet(enemy, options = {}) {
  const angle = options.angle ?? Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const bonus = getDifficultyBonus();
  const speed = options.speed ?? (130 + wave * 13 + bonus * 9);
  const effectiveDamage = (options.damage ?? (12 + wave * 2.8 + Math.floor(bonus * 1.2))) * (enemy.kind === "boss" ? getBossScaling() : 1);

  enemyBullets.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: options.radius ?? 8,
    damage: options.damage ?? ((12 + wave * 2.8 + Math.floor(bonus * 1.2)) * 1.5),
    life: options.life ?? 6,
    bounces: options.bounces ?? 0,
    fireTrail: options.fireTrail ?? false,
    fireTimer: 0,
    color: options.color ?? "#f06455",
    unbreakable: options.unbreakable ?? false,
    homing: options.homing ?? false,
    turnRate: options.turnRate ?? 0,
    splitOnExpire: options.splitOnExpire ?? false,
    mine: options.mine ?? false,
    sourceKind: enemy.kind ?? "enemy",
    unbreakable: false,
    bulletHp: options.bulletHp ?? (enemy.kind === "boss" && ((options.radius ?? 8) >= 12 || options.homing || options.splitOnExpire || options.mine || options.fireTrail || options.bounces) ? 4 : 1)
  });
}

function createExplosion(x, y, radius, damage, color = "#ef4444") {
  const ex = clamp(x, 0, canvas.width);
  const ey = clamp(y, 0, canvas.height);
  const distance = Math.hypot(player.x - ex, player.y - ey);

  if (distance < radius + player.radius) {
    const ratio = Math.max(0, 1 - distance / radius);
    player.hp -= damage * ratio;
  }

  fireZones.push({
    x: ex,
    y: ey,
    radius,
    damage: 0,
    life: 0.65,
    explosion: true,
    color
  });

  addParticles(ex, ey, color);
}

function addFireZone(x, y) {
  fireZones.push({
    x,
    y,
    radius: 42,
    damage: 12 + wave * 0.36,
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
  if (fireTimer <= 0) {
    shootPlayerBullet();
    fireTimer = player.reload;
  }
}

function updateEnemies(dt) {
  spawnTimer -= dt;

  if (enemiesToSpawn > 0 && spawnTimer <= 0) {
    spawnEnemy();
    enemiesToSpawn -= 1;
    spawnTimer = Math.max(0.28, 1.15 - wave * 0.04 - getDifficultyBonus() * 0.016);
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
        ? Math.max(0.24, 0.95 - wave * 0.024)
        : Math.max(0.42, 1.9 - wave * 0.06 - getDifficultyBonus() * 0.02);
    }

    if (enemy.kind === "boss" && enemy.specialCooldown <= 0) {
      shootBossPattern(enemy);
      enemy.specialCooldown = Math.max(0.7, 2.35 - Math.floor(wave / 5) * 0.06);
    }

    if (getDistance(enemy, player) < enemy.radius + player.radius) {
      player.hp -= enemy.kind === "boss" ? (90 + wave * 3) * dt : ((24 + wave * 0.8) * 1.5) * dt;
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
        if (enemyBullet.unbreakable) {
          addParticles(playerBullet.x, playerBullet.y, "#ef4444");
        } else {
          enemyBullet.bulletHp = (enemyBullet.bulletHp ?? 1) - 1;
          if (enemyBullet.bulletHp <= 0) {
            enemyBullet.life = 0;
            addParticles(enemyBullet.x, enemyBullet.y, "#facc15");
          } else {
            addParticles(enemyBullet.x, enemyBullet.y, "#93c5fd");
          }
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
          vx: Math.cos(angle) * (150 + wave * 5),
          vy: Math.sin(angle) * (150 + wave * 5),
          radius: 6,
          damage: 9 + wave * 0.5,
          life: 2.8,
          bounces: 0,
          fireTrail: false,
          fireTimer: 0,
          color: "#fde047",
          unbreakable: false,
          bulletHp: 1,
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

    if (zone.warning) {
      zone.warning -= dt;
    } else if (getDistance(zone, player) < zone.radius + player.radius) {
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
    if (isBossWave()) {
      player.attackMultiplier = (player.attackMultiplier || 1) * 2;
      addParticles(player.x, player.y, "#22c55e");
    }

    if (wave >= MAX_WAVE) {
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
    `포탄 개수 강화: ${upgradeCounts.shells}회`,
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
      text: "최대 체력 +25, 현재 체력 +100 회복 (최대 체력 초과 불가)",
      apply: function () {
        player.maxHp += 25;
        player.hp = Math.min(player.maxHp, player.hp + 100);
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

  if (true) {
    pool.push({
      title: "포탄 개수/등급 강화",
      text: "포탄 단계 누적 +1 (10개마다 다음 색 포탄 1개로 강화)",
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
      text: "대포가 원래 대포 한쪽 옆에 하나 더 생겨 같은 방향으로 발사합니다 (한 판에 1번만 선택 가능)",
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
      if (isBossWaveNumber(wave + 1)) {
        player.attackMultiplier = (player.attackMultiplier || 1) * 2;
        addParticles(player.x, player.y, "#facc15");
      }
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
  wave = MAX_WAVE;

  if (!scoreSaved) {
    addRanking(playerName, MAX_WAVE);
    scoreSaved = true;
  }

  resultTitle.textContent = "100웨이브 클리어";
  resultText.textContent = `${playerName}님이 100웨이브를 클리어했습니다!`;
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
      // 이미지 탱크 위에 보조 포신을 한쪽으로 붙여 표시
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#6b737c";
      ctx.strokeStyle = "#47515b";
      ctx.lineWidth = 3;
      ctx.fillRect(-6, 7, 38, 12);
      ctx.strokeRect(-6, 7, 38, 12);
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

  // 원래 포신
  ctx.fillRect(-6, -9, 38, 18);
  ctx.strokeRect(-6, -9, 38, 18);

  // 보조 포신: 원래 포신 바로 한쪽 옆에 붙음
  if (player.dualCannon) {
    ctx.fillRect(-6, 9, 38, 12);
    ctx.strokeRect(-6, 9, 38, 12);
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
    const isWarning = zone.warning && zone.warning > 0;
    ctx.globalAlpha = isWarning ? 0.22 : Math.max(0.15, zone.life / 3.4) * 0.55;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = isWarning ? "#ef4444" : (zone.color || "#fb923c");
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawBullets() {
  playerBullets.forEach(function (bullet) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = bullet.color || "#facc15";
    ctx.fill();
    ctx.strokeStyle = bullet.tierIndex && bullet.tierIndex >= 1 ? "#111827" : "#7c6f19";
    ctx.stroke();
  });

  enemyBullets.forEach(function (bullet) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = bullet.color || "#f06455";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = (bullet.bulletHp ?? 1) > 1 ? "#111827" : "#8f4039";
    ctx.lineWidth = (bullet.bulletHp ?? 1) > 1 ? 4 : 2;
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
