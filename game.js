const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const moneyText = document.getElementById('moneyText');
const livesText = document.getElementById('livesText');
const waveText = document.getElementById('waveText');
const stageText = document.getElementById('stageText');
const startWaveBtn = document.getElementById('startWaveBtn');
const pauseBtn = document.getElementById('pauseBtn');
const towerButtons = document.querySelectorAll('.tower-card');
const selectedTowerName = document.getElementById('selectedTowerName');
const selectedTowerDamage = document.getElementById('selectedTowerDamage');
const selectedTowerRange = document.getElementById('selectedTowerRange');
const selectedTowerLevel = document.getElementById('selectedTowerLevel');
const selectedTowerNext = document.getElementById('selectedTowerNext');
const enemyCountText = document.getElementById('enemyCountText');
const waveStatusText = document.getElementById('waveStatusText');
const upgradeTowerBtn = document.getElementById('upgradeTowerBtn');
const sellTowerBtn = document.getElementById('sellTowerBtn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayBtn = document.getElementById('overlayBtn');
const pokerHandEl = document.getElementById('pokerHand');
const pokerSummaryEl = document.getElementById('pokerSummary');
const drawHandBtn = document.getElementById('drawHandBtn');

const cardSuits = ['♠', '♥', '♦', '♣'];
const cardRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const towerTypes = {
  guard: { name: 'Guard Tower', cost: 80, damage: 14, range: 120, fireRate: 0.8, color: '#f7c969', sprite: 'tower_guard.png', projectile: 'projectile_guard.png' },
  flame: { name: 'Flame Turret', cost: 120, damage: 25, range: 90, fireRate: 1.3, color: '#ff7b54', sprite: 'tower_flame.png', projectile: 'projectile_flame.png' },
  frost: { name: 'Frost Tower', cost: 100, damage: 12, range: 140, fireRate: 1.0, color: '#7fe0ff', sprite: 'tower_frost.png', projectile: 'projectile_frost.png' }
};

const sprites = {
  base: loadSprite('images/base.png'),
  enemy: loadSprite('images/enemy.png'),
  guard: loadSprite('images/tower_guard.png'),
  flame: loadSprite('images/tower_flame.png'),
  frost: loadSprite('images/tower_frost.png'),
  projectile_guard: loadSprite('images/projectile_guard.png'),
  projectile_flame: loadSprite('images/projectile_flame.png'),
  projectile_frost: loadSprite('images/projectile_frost.png')
};

function loadSprite(src) {
  const image = new Image();
  image.src = src;
  return image;
}

const game = {
  money: 240,
  lives: 20,
  wave: 0,
  currentTowerType: 'guard',
  currentTowerCard: null,
  paused: false,
  started: false,
  gameOver: false,
  inWave: false,
  spawnQueue: 0,
  spawnTimer: 0,
  lastTime: 0,
  enemies: [],
  towers: [],
  projectiles: [],
  particles: [],
  path: [
    { x: 30, y: 260 },
    { x: 370, y: 260 },
    { x: 370, y: 420 },
    { x: 760, y: 420 },
    { x: 760, y: 210 },
    { x: 840, y: 210 }
  ],
  gridSize: 40,
  nextTowerId: 1,
  selectedTowerId: null,
  deck: [],
  pokerHand: [],
  pokerBuffs: {
    damage: 1,
    range: 1,
    fireRate: 1,
    money: 1
  },
  pokerLabel: 'No towers drawn'
};

function getTowerCardIcon(type) {
  return {
    guard: '🛡️',
    flame: '🔥',
    frost: '❄️'
  }[type] || '🏰';
}

function createDeck() {
  const deck = [];
  for (const type of Object.keys(towerTypes)) {
    for (const suit of cardSuits) {
      for (const rank of cardRanks) {
        deck.push({
          type,
          suit,
          rank,
          value: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(rank) + 1,
          color: (suit === '♥' || suit === '♦') ? 'red' : 'black',
          label: `${getTowerCardIcon(type)} ${rank}${suit}`
        });
      }
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCardModifier(card) {
  const suitBonus = {
    '♠': { damage: 1.18, range: 1.0, fireRate: 1.08, money: 1.0 },
    '♥': { damage: 1.0, range: 1.0, fireRate: 1.0, money: 1.2 },
    '♦': { damage: 1.08, range: 1.18, fireRate: 1.0, money: 1.0 },
    '♣': { damage: 1.0, range: 1.0, fireRate: 1.18, money: 1.0 }
  };

  const rankValue = card.value;
  const rankBonus = 1 + (rankValue - 1) * 0.04;
  const suitMult = suitBonus[card.suit] || { damage: 1, range: 1, fireRate: 1, money: 1 };

  return {
    damage: suitMult.damage * rankBonus,
    range: suitMult.range * (1 + (rankValue - 1) * 0.015),
    fireRate: suitMult.fireRate * (1.12 - (rankValue - 1) * 0.01),
    money: suitMult.money * (1 + (rankValue - 1) * 0.025)
  };
}

function renderPokerHand() {
  if (!pokerHandEl) return;
  pokerHandEl.innerHTML = '';

  if (game.pokerHand.length === 0) {
    for (let i = 0; i < 5; i++) {
      const card = document.createElement('div');
      card.className = 'poker-card empty';
      card.textContent = '?';
      pokerHandEl.appendChild(card);
    }
    pokerSummaryEl.textContent = 'No towers drawn';
    return;
  }

  game.pokerHand.forEach(card => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `poker-card ${card.color} ${game.currentTowerCard && game.currentTowerCard.rank === card.rank && game.currentTowerCard.suit === card.suit && game.currentTowerCard.type === card.type ? 'selected' : ''}`;
    el.textContent = `${getTowerCardIcon(card.type)} ${card.rank}${card.suit}`;
    el.title = `${towerTypes[card.type].name} • ${card.rank}${card.suit}`;
    el.addEventListener('click', () => {
      game.currentTowerType = card.type;
      game.currentTowerCard = card;
      towerButtons.forEach(btn => btn.classList.toggle('selected', btn.dataset.type === card.type));
      updateHud();
      renderPokerHand();
    });
    pokerHandEl.appendChild(el);
  });

  const selectedCard = game.currentTowerCard || game.pokerHand[0];
  const mods = getCardModifier(selectedCard);
  const summary = `${selectedCard ? towerTypes[selectedCard.type].name : 'Tower'} • ${selectedCard ? `${selectedCard.rank}${selectedCard.suit}` : ''} (${mods.damage.toFixed(2)}x dmg, ${mods.range.toFixed(2)}x range)`;
  pokerSummaryEl.textContent = summary;
}

function drawPokerHand() {
  if (!game.deck.length) {
    game.deck = shuffleDeck(createDeck());
  }

  const hand = [];
  for (let i = 0; i < 5; i++) {
    const next = game.deck.pop();
    if (next) hand.push(next);
  }

  game.pokerHand = hand;
  game.currentTowerCard = hand[0];
  game.currentTowerType = hand[0].type;
  towerButtons.forEach(btn => btn.classList.toggle('selected', btn.dataset.type === hand[0].type));
  renderPokerHand();
}

function getTowerAttackRange(tower) {
  let multiplier = 1;
  if (game.currentTowerCard && game.currentTowerCard.type === tower.type) {
    multiplier = getCardModifier(game.currentTowerCard).range;
  }
  return tower.range * multiplier;
}

function getTowerDamage(tower) {
  let multiplier = 1;
  if (game.currentTowerCard && game.currentTowerCard.type === tower.type) {
    multiplier = getCardModifier(game.currentTowerCard).damage;
  }
  return tower.damage * multiplier;
}

function getTowerFireRate(tower) {
  let multiplier = 1;
  if (game.currentTowerCard && game.currentTowerCard.type === tower.type) {
    multiplier = getCardModifier(game.currentTowerCard).fireRate;
  }
  return Math.max(0.35, tower.fireRate / multiplier);
}

function getRewardMultiplier() {
  if (game.currentTowerCard) {
    return getCardModifier(game.currentTowerCard).money;
  }
  return 1;
}

function getTowerUpgradeCost(tower) {
  const baseCost = towerTypes[tower.type].cost;
  return Math.round(baseCost * (0.7 + tower.level * 0.45));
}

function getTowerAtPosition(x, y) {
  for (let i = game.towers.length - 1; i >= 0; i--) {
    const tower = game.towers[i];
    if (Math.hypot(x - tower.x, y - tower.y) <= 22) {
      return tower;
    }
  }
  return null;
}

function updateSelectedTowerPanel() {
  const tower = game.towers.find(item => item.id === game.selectedTowerId) || null;

  if (!tower) {
    selectedTowerName.textContent = 'No Tower Selected';
    selectedTowerDamage.textContent = 'DMG: --';
    selectedTowerRange.textContent = 'RNG: --';
    selectedTowerLevel.textContent = 'LVL: --';
    selectedTowerNext.textContent = 'UPG: --';
    upgradeTowerBtn.disabled = true;
    sellTowerBtn.disabled = true;
    return;
  }

  const stats = towerTypes[tower.type];
  selectedTowerName.textContent = stats.name;
  selectedTowerDamage.textContent = `DMG: ${Math.round(tower.damage)}`;
  selectedTowerRange.textContent = `RNG: ${Math.round(tower.range)}`;
  selectedTowerLevel.textContent = `LVL: ${tower.level}`;
  const upgradeCost = tower.level >= 4 ? 'MAX' : `$${getTowerUpgradeCost(tower)}`;
  selectedTowerNext.textContent = `UPG: ${upgradeCost}`;
  upgradeTowerBtn.disabled = tower.level >= 4;
  sellTowerBtn.disabled = false;
}

function updateHud() {
  moneyText.textContent = `🪙 ${game.money}`;
  livesText.textContent = `❤️ ${game.lives}`;
  waveText.textContent = `Wave ${game.wave}`;

  if (!game.started && !game.gameOver) {
    stageText.textContent = 'Prep';
    waveStatusText.textContent = 'Prep';
  } else if (game.gameOver) {
    stageText.textContent = 'Defeat';
    waveStatusText.textContent = 'Game Over';
  } else if (game.inWave) {
    stageText.textContent = 'Active';
    waveStatusText.textContent = `Wave ${game.wave}`;
  } else {
    stageText.textContent = 'Ready';
    waveStatusText.textContent = 'Awaiting';
  }

  enemyCountText.textContent = `Enemies: ${game.enemies.length}`;

  const tower = towerTypes[game.currentTowerType];
  if (game.selectedTowerId) {
    updateSelectedTowerPanel();
  } else {
    selectedTowerName.textContent = tower.name;
    selectedTowerDamage.textContent = `DMG: ${tower.damage}`;
    selectedTowerRange.textContent = `RNG: ${tower.range}`;
    selectedTowerLevel.textContent = 'LVL: 1';
    selectedTowerNext.textContent = `UPG: $${Math.round(tower.cost * 0.7)}`;
    upgradeTowerBtn.disabled = true;
    sellTowerBtn.disabled = true;
  }
}

function beginGame() {
  if (game.started && !game.gameOver) return;
  game.started = true;
  game.gameOver = false;
  game.paused = false;
  pauseBtn.textContent = 'Pause';
  hideOverlay();
  startWaveBtn.textContent = 'Start Wave';
  updateHud();
}

function resetPokerState() {
  game.deck = shuffleDeck(createDeck());
  game.pokerHand = [];
  game.pokerBuffs = { damage: 1, range: 1, fireRate: 1, money: 1 };
  game.pokerLabel = 'No hand drawn';
  renderPokerHand();
}

function resetGame() {
  game.money = 240;
  game.lives = 20;
  game.wave = 0;
  game.inWave = false;
  game.spawnQueue = 0;
  game.spawnTimer = 0;
  game.enemies = [];
  game.towers = [];
  game.projectiles = [];
  game.particles = [];
  game.selectedTowerId = null;
  game.nextTowerId = 1;
  game.started = false;
  game.gameOver = false;
  startWaveBtn.textContent = 'Start Wave';
  resetPokerState();
  updateHud();
  showOverlay('Ready the Defenses', 'Build your towers, hold the gate, and survive every wave.', 'Start Mission');
}

function showOverlay(title, text, buttonLabel) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayBtn.textContent = buttonLabel;
  overlay.classList.add('visible');
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function createEnemy() {
  const enemy = {
    x: game.path[0].x,
    y: game.path[0].y,
    radius: 10,
    speed: 0.9 + game.wave * 0.08,
    hp: 30 + game.wave * 12,
    maxHp: 30 + game.wave * 12,
    pathIndex: 0,
    reward: 12 + game.wave * 2
  };

  game.enemies.push(enemy);
}

function startWave() {
  if (!game.started || game.gameOver) {
    beginGame();
    return;
  }

  if (game.inWave) return;

  if (game.pokerHand.length === 0) {
    drawPokerHand();
  }

  game.wave += 1;
  game.inWave = true;
  game.spawnQueue = 4 + game.wave * 2;
  game.spawnTimer = 0.15;
  startWaveBtn.textContent = 'Wave in Progress';
  updateHud();
}

function shootTower(tower, target) {
  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const distance = Math.hypot(dx, dy);
  const effectiveRange = getTowerAttackRange(tower);

  if (distance > effectiveRange) return;

  const projectileDamage = getTowerDamage(tower);

  game.projectiles.push({
    x: tower.x,
    y: tower.y,
    target,
    speed: 4.2,
    radius: 4,
    damage: projectileDamage,
    color: tower.color,
    sprite: towerTypes[tower.type].projectile
  });
}

function handleTowers() {
  for (const tower of game.towers) {
    let target = null;
    let closest = Infinity;

    const effectiveRange = getTowerAttackRange(tower);

    for (const enemy of game.enemies) {
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      const distance = Math.hypot(dx, dy);

      if (distance < effectiveRange && distance < closest) {
        closest = distance;
        target = enemy;
      }
    }

    if (target) {
      if (!tower.cooldown || tower.cooldown <= 0) {
        shootTower(tower, target);
        tower.cooldown = getTowerFireRate(tower);
      }
    }

    if (tower.cooldown) {
      tower.cooldown -= 1 / 60;
    }
  }
}

function updateProjectiles() {
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const projectile = game.projectiles[i];
    const target = projectile.target;
    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= projectile.speed) {
      target.hp -= projectile.damage;
      createBurst(projectile.x, projectile.y, projectile.color, 8);
      game.projectiles.splice(i, 1);

      if (target.hp <= 0) {
        game.money += Math.round(target.reward * getRewardMultiplier());
        game.enemies = game.enemies.filter(enemy => enemy !== target);
      }
      continue;
    }

    projectile.x += (dx / dist) * projectile.speed;
    projectile.y += (dy / dist) * projectile.speed;
  }
}

function createBurst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    game.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: (Math.random() - 0.5) * 2.5,
      radius: 2 + Math.random() * 2,
      color,
      life: 20 + Math.random() * 12
    });
  }
}

function updateParticles() {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;

    if (p.life <= 0) {
      game.particles.splice(i, 1);
    }
  }
}

function updateEnemies(delta) {
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i];
    const targetPoint = game.path[enemy.pathIndex + 1];

    if (!targetPoint) {
      game.lives -= 1;
      game.enemies.splice(i, 1);
      continue;
    }

    const dx = targetPoint.x - enemy.x;
    const dy = targetPoint.y - enemy.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1) {
      enemy.pathIndex += 1;
      continue;
    }

    const moveX = (dx / distance) * enemy.speed * delta * 60;
    const moveY = (dy / distance) * enemy.speed * delta * 60;
    enemy.x += moveX;
    enemy.y += moveY;
  }

  if (game.lives <= 0) {
    game.lives = 0;
    game.gameOver = true;
    game.started = false;
    game.inWave = false;
    game.spawnQueue = 0;
    startWaveBtn.textContent = 'Restart';
    showOverlay('The Gate Fell', 'Your defenses were overrun. Reset the run and try a new strategy.', 'Restart Run');
  }

  updateHud();
}

function spawnEnemies(delta) {
  if (!game.inWave || game.gameOver) return;

  game.spawnTimer -= delta;

  if (game.spawnQueue > 0 && game.spawnTimer <= 0) {
    createEnemy();
    game.spawnQueue -= 1;
    const spawnDelay = Math.max(0.55, 1.2 - game.wave * 0.08);
    game.spawnTimer = spawnDelay;
  }

  if (game.spawnQueue <= 0 && game.enemies.length === 0) {
    game.inWave = false;
    startWaveBtn.textContent = 'Start Wave';
  }
}

function isCellOccupied(x, y) {
  const size = 26;
  for (const tower of game.towers) {
    if (Math.abs(tower.x - x) < size && Math.abs(tower.y - y) < size) {
      return true;
    }
  }
  return false;
}

function placeTower(x, y) {
  if (!game.started || game.gameOver) return;

  const towerConfig = towerTypes[game.currentTowerType];
  if (game.money < towerConfig.cost) return;
  if (isCellOccupied(x, y)) return;
  if (x < 35 || x > canvas.width - 35 || y < 35 || y > canvas.height - 35) return;

  game.towers.push({
    id: game.nextTowerId++,
    x,
    y,
    range: towerConfig.range,
    damage: towerConfig.damage,
    fireRate: towerConfig.fireRate,
    color: towerConfig.color,
    type: game.currentTowerType,
    level: 1,
    cooldown: 0
  });

  game.money -= towerConfig.cost;
  updateHud();
}

function upgradeSelectedTower() {
  const tower = game.towers.find(item => item.id === game.selectedTowerId);
  if (!tower) return;

  if (tower.level >= 4) return;

  const cost = getTowerUpgradeCost(tower);
  if (game.money < cost) return;

  game.money -= cost;
  tower.level += 1;
  tower.damage *= 1.42;
  tower.range *= 1.08;
  tower.fireRate = Math.max(0.38, tower.fireRate * 0.9);
  updateHud();
}

function sellSelectedTower() {
  const towerIndex = game.towers.findIndex(item => item.id === game.selectedTowerId);
  if (towerIndex === -1) return;

  const tower = game.towers[towerIndex];
  const sellValue = Math.round(towerTypes[tower.type].cost * (0.65 + (tower.level - 1) * 0.15));
  game.money += sellValue;
  game.towers.splice(towerIndex, 1);
  game.selectedTowerId = null;
  updateHud();
}

function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('click', function (event) {
  const pos = getMousePos(event);
  const tower = getTowerAtPosition(pos.x, pos.y);

  if (tower) {
    game.selectedTowerId = tower.id;
    updateHud();
    return;
  }

  if (!game.started || game.gameOver) return;
  placeTower(Math.round(pos.x / 20) * 20, Math.round(pos.y / 20) * 20);
});

startWaveBtn.addEventListener('click', function () {
  if (!game.started && !game.gameOver) {
    beginGame();
  }
  if (game.gameOver) {
    resetGame();
    beginGame();
    return;
  }
  startWave();
});

overlayBtn.addEventListener('click', function () {
  if (game.gameOver) {
    resetGame();
  }
  beginGame();
  if (!game.inWave && game.started) {
    startWave();
  }
});

pauseBtn.addEventListener('click', function () {
  if (!game.started || game.gameOver) return;
  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? 'Resume' : 'Pause';
});

upgradeTowerBtn.addEventListener('click', upgradeSelectedTower);
sellTowerBtn.addEventListener('click', sellSelectedTower);
drawHandBtn.addEventListener('click', () => {
  drawPokerHand();
});

towerButtons.forEach(button => {
  button.addEventListener('click', () => {
    towerButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    game.currentTowerType = button.dataset.type;
    updateHud();
  });
});

function drawGround() {
  ctx.fillStyle = '#1a2d1f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < canvas.width; x += 40) {
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.fillStyle = (x + y) % 80 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)';
      ctx.fillRect(x, y, 40, 40);
    }
  }
}

function drawPath() {
  const roadStyle = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  roadStyle.addColorStop(0, '#7b5a3d');
  roadStyle.addColorStop(1, '#4f3525');

  ctx.fillStyle = roadStyle;
  ctx.fillRect(0, 230, 380, 60);
  ctx.fillRect(340, 230, 60, 220);
  ctx.fillRect(340, 390, 440, 60);
  ctx.fillRect(710, 150, 60, 300);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 16]);
  ctx.beginPath();
  ctx.moveTo(30, 260);
  ctx.lineTo(370, 260);
  ctx.lineTo(370, 420);
  ctx.lineTo(760, 420);
  ctx.lineTo(760, 210);
  ctx.lineTo(840, 210);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 12; i++) {
    const x = 28 + i * 30;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, 250, 12, 20);
  }
}

function drawBase() {
  const baseX = 840;
  const baseY = 210;

  ctx.beginPath();
  ctx.arc(baseX, baseY, 44, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(127, 224, 162, 0.25)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(baseX, baseY, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#3fbf73';
  ctx.fill();

  ctx.fillStyle = '#dfeff6';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GATE', baseX, baseY + 4);

  ctx.strokeStyle = 'rgba(247, 201, 105, 0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(baseX, baseY, 52, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTower(tower) {
  const sprite = sprites[tower.type];

  if (sprite && sprite.complete) {
    ctx.drawImage(sprite, tower.x - 22, tower.y - 22, 44, 44);
  } else {
    ctx.fillStyle = tower.color;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  if (game.selectedTowerId === tower.id) {
    ctx.strokeStyle = 'rgba(247, 201, 105, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.range + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemy(enemy) {
  if (sprites.enemy.complete) {
    ctx.drawImage(sprites.enemy, enemy.x - 16, enemy.y - 16, 32, 32);
  } else {
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
  ctx.fillRect(enemy.x - 18, enemy.y - 22, 36, 6);
  ctx.fillStyle = '#7fe0a2';
  ctx.fillRect(enemy.x - 18, enemy.y - 22, (enemy.hp / enemy.maxHp) * 36, 6);
}

function drawProjectile(projectile) {
  const sprite = sprites[projectile.sprite];

  if (sprite && sprite.complete) {
    ctx.drawImage(sprite, projectile.x - 8, projectile.y - 8, 16, 16);
    return;
  }

  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  drawPath();
  drawBase();

  for (const tower of game.towers) {
    drawTower(tower);
  }

  for (const enemy of game.enemies) {
    drawEnemy(enemy);
  }

  for (const projectile of game.projectiles) {
    drawProjectile(projectile);
  }

  drawParticles();
}

function gameLoop(timestamp) {
  const delta = (timestamp - game.lastTime) / 1000 || 0.016;
  game.lastTime = timestamp;

  if (!game.paused && game.started && !game.gameOver) {
    spawnEnemies(delta);
    handleTowers();
    updateProjectiles();
    updateEnemies(delta);
    updateParticles();
  }

  draw();
  requestAnimationFrame(gameLoop);
}

resetGame();
resetPokerState();
requestAnimationFrame(gameLoop);
