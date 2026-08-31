const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const moneyText = document.getElementById('moneyText');
const livesText = document.getElementById('livesText');
const waveText = document.getElementById('waveText');
const startWaveBtn = document.getElementById('startWaveBtn');
const pauseBtn = document.getElementById('pauseBtn');
const towerButtons = document.querySelectorAll('.tower-card');
const selectedTowerName = document.getElementById('selectedTowerName');
const selectedTowerDamage = document.getElementById('selectedTowerDamage');
const selectedTowerRange = document.getElementById('selectedTowerRange');

const towerTypes = {
  guard: { name: 'Guard Tower', cost: 80, damage: 14, range: 120, fireRate: 0.8, color: '#f7c969' },
  flame: { name: 'Flame Turret', cost: 120, damage: 25, range: 90, fireRate: 1.3, color: '#ff7b54' },
  frost: { name: 'Frost Tower', cost: 100, damage: 12, range: 140, fireRate: 1.0, color: '#7fe0ff' }
};

const game = {
  money: 240,
  lives: 20,
  wave: 0,
  currentTowerType: 'guard',
  paused: false,
  enemies: [],
  towers: [],
  projectiles: [],
  particles: [],
  lastTime: 0,
  spawnTimer: 0,
  waveCooldown: 0,
  path: [
    { x: 30, y: 260 },
    { x: 370, y: 260 },
    { x: 370, y: 420 },
    { x: 760, y: 420 },
    { x: 760, y: 210 },
    { x: 840, y: 210 }
  ],
  gridSize: 40
};

function updateHud() {
  moneyText.textContent = `🪙 ${game.money}`;
  livesText.textContent = `❤️ ${game.lives}`;
  waveText.textContent = `Wave ${game.wave}`;

  const tower = towerTypes[game.currentTowerType];
  selectedTowerName.textContent = tower.name;
  selectedTowerDamage.textContent = `DMG: ${tower.damage}`;
  selectedTowerRange.textContent = `RNG: ${tower.range}`;
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
  if (game.waveCooldown > 0) return;

  game.wave += 1;
  game.waveCooldown = 2.5;
  game.spawnTimer = 0;
  updateHud();
}

function shootTower(tower, target) {
  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const distance = Math.hypot(dx, dy);

  if (distance > tower.range) return;

  game.projectiles.push({
    x: tower.x,
    y: tower.y,
    target,
    speed: 3.6,
    radius: 4,
    damage: tower.damage,
    color: tower.color
  });
}

function handleTowers() {
  for (const tower of game.towers) {
    let target = null;
    let closest = Infinity;

    for (const enemy of game.enemies) {
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      const distance = Math.hypot(dx, dy);

      if (distance < tower.range && distance < closest) {
        closest = distance;
        target = enemy;
      }
    }

    if (target) {
      if (!tower.cooldown || tower.cooldown <= 0) {
        shootTower(tower, target);
        tower.cooldown = tower.fireRate;
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
        game.money += target.reward;
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
    game.lives = 20;
    game.money = 240;
    game.wave = 0;
    game.enemies = [];
    game.towers = [];
    game.projectiles = [];
    game.particles = [];
    alert('Game over! A new run has started.');
  }

  updateHud();
}

function spawnEnemies(delta) {
  if (game.wave <= 0) return;

  game.spawnTimer -= delta;

  const enemiesPerWave = 4 + game.wave * 2;
  const spawnDelay = Math.max(0.55, 1.2 - game.wave * 0.08);

  if (game.spawnTimer <= 0 && game.enemies.length < enemiesPerWave) {
    createEnemy();
    game.spawnTimer = spawnDelay;
  }

  if (game.wave > 0 && game.enemies.length === 0 && game.spawnTimer <= 0) {
    game.waveCooldown = 0;
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
  const towerConfig = towerTypes[game.currentTowerType];

  if (game.money < towerConfig.cost) return;

  if (isCellOccupied(x, y)) return;

  if (x < 35 || x > canvas.width - 35 || y < 35 || y > canvas.height - 35) return;

  game.towers.push({
    x,
    y,
    range: towerConfig.range,
    damage: towerConfig.damage,
    fireRate: towerConfig.fireRate,
    color: towerConfig.color,
    cooldown: 0
  });

  game.money -= towerConfig.cost;
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
  placeTower(Math.round(pos.x / 20) * 20, Math.round(pos.y / 20) * 20);
});

startWaveBtn.addEventListener('click', startWave);
pauseBtn.addEventListener('click', function () {
  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? 'Resume' : 'Pause';
});

towerButtons.forEach(button => {
  button.addEventListener('click', () => {
    towerButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    game.currentTowerType = button.dataset.type;
    updateHud();
  });
});

function drawPath() {
  ctx.fillStyle = '#7a5e3e';
  ctx.fillRect(0, 230, 380, 60);
  ctx.fillRect(340, 230, 60, 220);
  ctx.fillRect(340, 390, 440, 60);
  ctx.fillRect(710, 150, 60, 300);
}

function drawBase() {
  const baseX = 840;
  const baseY = 210;

  ctx.fillStyle = '#4ecf7b';
  ctx.beginPath();
  ctx.arc(baseX, baseY, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dfeff6';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BASE', baseX, baseY + 4);
}

function drawTower(tower) {
  ctx.fillStyle = tower.color;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEnemy(enemy) {
  ctx.fillStyle = '#ff5d6c';
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1d1d1d';
  ctx.fillRect(enemy.x - 14, enemy.y - 18, 28, 5);
  ctx.fillStyle = '#7fe0a2';
  ctx.fillRect(enemy.x - 14, enemy.y - 18, (enemy.hp / enemy.maxHp) * 28, 5);
}

function drawProjectile(projectile) {
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

  if (!game.paused) {
    spawnEnemies(delta);
    handleTowers();
    updateProjectiles();
    updateEnemies(delta);
    updateParticles();
  }

  draw();
  requestAnimationFrame(gameLoop);
}

updateHud();
requestAnimationFrame(gameLoop);
