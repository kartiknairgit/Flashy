// Game state and configuration
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    lastTime: 0,
    gameRunning: false,
    score: 0,
    crystals: 0,
    health: 100,
    level: 1,
    energy: 100,
    deathTimer: 0,
    maxDeathTime: 120, // 2 seconds at 60fps before death
    highScore: localStorage.getItem('cosmicExplorerHighScore') || 0
};

// Player object
const player = {
    x: 0,
    y: 0,
    width: 30,
    height: 30,
    speed: 5,
    vx: 0,
    vy: 0,
    angle: 0,
    trail: []
};

// Game arrays
const stars = [];
const asteroids = [];
const crystals = [];
const particles = [];
const bullets = [];
const enemies = [];
const enemyBullets = [];

// Input handling
const keys = {};
const mouse = { x: 0, y: 0 };

// Initialize the game
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners
    document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
    document.addEventListener('mousemove', (e) => {
        const rect = game.canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    document.addEventListener('click', shoot);
    
    // Start loading sequence
    showLoadingScreen();
    
    // Initialize game objects
    createStars();
    
    // Start the game loop
    gameLoop();
}

function showLoadingScreen() {
    // Show loading screen for 2 seconds
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        showInstructionsScreen();
    }, 2000);
}

function showInstructionsScreen() {
    document.getElementById('instructionsScreen').style.display = 'flex';
    document.getElementById('highScore').textContent = game.highScore;
    
    // Auto-hide after 5 seconds or wait for button click
    const autoHideTimer = setTimeout(() => {
        startGame();
    }, 5000);
    
    // Start button event listener
    document.getElementById('startBtn').addEventListener('click', () => {
        clearTimeout(autoHideTimer);
        startGame();
    });
}

function resizeCanvas() {
    game.width = window.innerWidth;
    game.height = window.innerHeight;
    game.canvas.width = game.width;
    game.canvas.height = game.height;
    
    // Reset player position
    player.x = game.width / 2;
    player.y = game.height / 2;
}

function startGame() {
    document.getElementById('instructionsScreen').style.display = 'none';
    document.getElementById('gameInstructions').style.display = 'block';
    game.gameRunning = true;
    game.deathTimer = 0;
    updateStatus("Keep moving or die! Destroy enemies and collect health crystals!");
    
    // Spawn initial game objects
    spawnAsteroids();
    spawnCrystals();
    spawnEnemies();
}

function createStars() {
    stars.length = 0;
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * game.width,
            y: Math.random() * game.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.1,
            opacity: Math.random() * 0.8 + 0.2
        });
    }
}

function spawnAsteroids() {
    for (let i = 0; i < 3 + game.level; i++) {
        asteroids.push({
            x: Math.random() * game.width,
            y: Math.random() * game.height,
            width: 20 + Math.random() * 30,
            height: 20 + Math.random() * 30,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        });
    }
}

function spawnCrystals() {
    for (let i = 0; i < 4; i++) {
        crystals.push({
            x: Math.random() * game.width,
            y: Math.random() * game.height,
            width: 15,
            height: 15,
            rotation: 0,
            rotationSpeed: 0.05,
            pulse: 0
        });
    }
}

function spawnEnemies() {
    for (let i = 0; i < 2 + Math.floor(game.level / 2); i++) {
        enemies.push({
            x: Math.random() * game.width,
            y: Math.random() * game.height,
            width: 25,
            height: 25,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            angle: 0,
            shootTimer: 0,
            shootDelay: 60 + Math.random() * 60,
            health: 2
        });
    }
}

function shoot() {
    if (!game.gameRunning) return;
    
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        bullets.push({
            x: player.x,
            y: player.y,
            vx: (dx / distance) * 8,
            vy: (dy / distance) * 8,
            life: 60,
            width: 4,
            height: 4
        });
    }
}

function update(deltaTime) {
    if (!game.gameRunning) return;
    
    // Update player
    updatePlayer();
    
    // Check if player is moving (Tron rule - must keep moving!)
    checkMovement();
    
    // Update stars
    updateStars();
    
    // Update asteroids
    updateAsteroids();
    
    // Update crystals
    updateCrystals();
    
    // Update enemies
    updateEnemies();
    
    // Update bullets
    updateBullets();
    
    // Update enemy bullets
    updateEnemyBullets();
    
    // Update particles
    updateParticles();
    
    // Check collisions
    checkCollisions();
    
    // Update UI
    updateUI();
    
    // Spawn new objects
    if (asteroids.length < 3 + game.level) {
        spawnAsteroids();
    }
    
    if (crystals.length < 3) {
        spawnCrystals();
    }
    
    if (enemies.length < 1 + Math.floor(game.level / 2)) {
        spawnEnemies();
    }
}

function checkMovement() {
    // Tron rule: if player stops moving, death timer starts
    const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    
    if (speed < 0.5) {
        game.deathTimer++;
        if (game.deathTimer > game.maxDeathTime) {
            game.health = 0;
            gameOver();
            return;
        }
        // Visual warning
        if (game.deathTimer > 60) {
            updateStatus(`DANGER: KEEP MOVING! ${Math.ceil((game.maxDeathTime - game.deathTimer) / 60)}s`);
        }
    } else {
        game.deathTimer = 0;
    }
}

function updatePlayer() {
    // Handle input
    if (keys['w'] || keys['arrowup']) player.vy -= 0.5;
    if (keys['s'] || keys['arrowdown']) player.vy += 0.5;
    if (keys['a'] || keys['arrowleft']) player.vx -= 0.5;
    if (keys['d'] || keys['arrowright']) player.vx += 0.5;
    
    // Apply friction
    player.vx *= 0.95;
    player.vy *= 0.95;
    
    // Limit speed
    const maxSpeed = player.speed;
    const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    if (speed > maxSpeed) {
        player.vx = (player.vx / speed) * maxSpeed;
        player.vy = (player.vy / speed) * maxSpeed;
    }
    
    // Update position
    player.x += player.vx;
    player.y += player.vy;
    
    // Wrap around screen
    if (player.x < -player.width) player.x = game.width;
    if (player.x > game.width + player.width) player.x = -player.width;
    if (player.y < -player.height) player.y = game.height;
    if (player.y > game.height + player.height) player.y = -player.height;
    
    // Update angle to face mouse
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    player.angle = Math.atan2(dy, dx);
    
    // Update trail
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 10) {
        player.trail.shift();
    }
}

function updateStars() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > game.height) {
            star.y = -star.size;
            star.x = Math.random() * game.width;
        }
    });
}

function updateAsteroids() {
    asteroids.forEach((asteroid, index) => {
        asteroid.x += asteroid.vx;
        asteroid.y += asteroid.vy;
        asteroid.rotation += asteroid.rotationSpeed;
        
        // Wrap around screen
        if (asteroid.x < -asteroid.width) asteroid.x = game.width;
        if (asteroid.x > game.width + asteroid.width) asteroid.x = -asteroid.width;
        if (asteroid.y < -asteroid.height) asteroid.y = game.height;
        if (asteroid.y > game.height + asteroid.height) asteroid.y = -asteroid.height;
    });
}

function updateCrystals() {
    crystals.forEach(crystal => {
        crystal.rotation += crystal.rotationSpeed;
        crystal.pulse += 0.1;
    });
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        // Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            enemy.vx += (dx / distance) * 0.1;
            enemy.vy += (dy / distance) * 0.1;
        }
        
        // Limit speed
        const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
        if (speed > 2) {
            enemy.vx = (enemy.vx / speed) * 2;
            enemy.vy = (enemy.vy / speed) * 2;
        }
        
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        
        // Calculate angle to player
        enemy.angle = Math.atan2(dy, dx);
        
        // Wrap around screen
        if (enemy.x < -enemy.width) enemy.x = game.width;
        if (enemy.x > game.width + enemy.width) enemy.x = -enemy.width;
        if (enemy.y < -enemy.height) enemy.y = game.height;
        if (enemy.y > game.height + enemy.height) enemy.y = -enemy.height;
        
        // Shooting
        enemy.shootTimer++;
        if (enemy.shootTimer >= enemy.shootDelay && distance < 300) {
            enemyShoot(enemy);
            enemy.shootTimer = 0;
            enemy.shootDelay = 60 + Math.random() * 60;
        }
    });
}

function enemyShoot(enemy) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: (dx / distance) * 6,
            vy: (dy / distance) * 6,
            life: 90,
            width: 6,
            height: 6
        });
    }
}

function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.life--;
        
        if (bullet.life <= 0 || bullet.x < 0 || bullet.x > game.width || bullet.y < 0 || bullet.y > game.height) {
            bullets.splice(index, 1);
        }
    });
}

function updateEnemyBullets() {
    enemyBullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.life--;
        
        if (bullet.life <= 0 || bullet.x < 0 || bullet.x > game.width || bullet.y < 0 || bullet.y > game.height) {
            enemyBullets.splice(index, 1);
        }
    });
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

function checkCollisions() {
    // Player vs asteroids - INSTANT DEATH
    asteroids.forEach((asteroid, index) => {
        if (collision(player, asteroid)) {
            game.health = 0;
            createExplosion(player.x, player.y, '#ff4444');
            gameOver();
        }
    });
    
    // Player vs enemies - INSTANT DEATH
    enemies.forEach((enemy, index) => {
        if (collision(player, enemy)) {
            game.health = 0;
            createExplosion(player.x, player.y, '#ff4444');
            gameOver();
        }
    });
    
    // Player vs enemy bullets - INSTANT DEATH
    enemyBullets.forEach((bullet, index) => {
        if (collision(player, bullet)) {
            game.health = 0;
            createExplosion(player.x, player.y, '#ff4444');
            enemyBullets.splice(index, 1);
            gameOver();
        }
    });
    
    // Player vs crystals - HEALTH RESTORATION
    crystals.forEach((crystal, index) => {
        if (collision(player, crystal)) {
            game.crystals++;
            game.score += 100;
            game.health = Math.min(100, game.health + 25);
            createExplosion(crystal.x, crystal.y, '#00ffff');
            crystals.splice(index, 1);
            updateStatus("Health restored!");
        }
    });
    
    // Player bullets vs asteroids
    bullets.forEach((bullet, bulletIndex) => {
        asteroids.forEach((asteroid, asteroidIndex) => {
            if (collision(bullet, asteroid)) {
                game.score += 50;
                createExplosion(asteroid.x, asteroid.y, '#ffaa00');
                bullets.splice(bulletIndex, 1);
                asteroids.splice(asteroidIndex, 1);
            }
        });
    });
    
    // Player bullets vs enemies
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (collision(bullet, enemy)) {
                enemy.health--;
                createExplosion(bullet.x, bullet.y, '#ff6600');
                bullets.splice(bulletIndex, 1);
                
                if (enemy.health <= 0) {
                    game.score += 200;
                    createExplosion(enemy.x, enemy.y, '#ff0066');
                    enemies.splice(enemyIndex, 1);
                }
            }
        });
    });
}

function collision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            maxLife: 30,
            color: color,
            alpha: 1
        });
    }
}

function render() {
    // Clear canvas
    game.ctx.fillStyle = 'rgba(15, 15, 35, 0.1)';
    game.ctx.fillRect(0, 0, game.width, game.height);
    
    // Draw stars
    game.ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        game.ctx.globalAlpha = star.opacity;
        game.ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    game.ctx.globalAlpha = 1;
    
    // Draw player trail
    game.ctx.strokeStyle = '#00ffff';
    game.ctx.lineWidth = 2;
    game.ctx.beginPath();
    player.trail.forEach((point, index) => {
        game.ctx.globalAlpha = index / player.trail.length * 0.5;
        if (index === 0) {
            game.ctx.moveTo(point.x, point.y);
        } else {
            game.ctx.lineTo(point.x, point.y);
        }
    });
    game.ctx.stroke();
    game.ctx.globalAlpha = 1;
    
    // Draw player
    game.ctx.save();
    game.ctx.translate(player.x, player.y);
    game.ctx.rotate(player.angle);
    game.ctx.fillStyle = '#00ffff';
    game.ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
    game.ctx.fillStyle = '#ffffff';
    game.ctx.fillRect(player.width/2 - 5, -3, 8, 6);
    game.ctx.restore();
    
    // Draw asteroids
    game.ctx.fillStyle = '#666666';
    asteroids.forEach(asteroid => {
        game.ctx.save();
        game.ctx.translate(asteroid.x, asteroid.y);
        game.ctx.rotate(asteroid.rotation);
        game.ctx.fillRect(-asteroid.width/2, -asteroid.height/2, asteroid.width, asteroid.height);
        game.ctx.restore();
    });
    
    // Draw crystals
    crystals.forEach(crystal => {
        game.ctx.save();
        game.ctx.translate(crystal.x, crystal.y);
        game.ctx.rotate(crystal.rotation);
        game.ctx.fillStyle = `rgba(0, 255, 255, ${0.8 + Math.sin(crystal.pulse) * 0.2})`;
        game.ctx.fillRect(-crystal.width/2, -crystal.height/2, crystal.width, crystal.height);
        game.ctx.restore();
    });
    
    // Draw player bullets
    game.ctx.fillStyle = '#ffff00';
    bullets.forEach(bullet => {
        game.ctx.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);
    });
    
    // Draw enemies
    enemies.forEach(enemy => {
        game.ctx.save();
        game.ctx.translate(enemy.x, enemy.y);
        game.ctx.rotate(enemy.angle);
        game.ctx.fillStyle = '#ff3333';
        game.ctx.fillRect(-enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
        game.ctx.fillStyle = '#ff6666';
        game.ctx.fillRect(enemy.width/2 - 8, -4, 10, 8);
        game.ctx.restore();
    });
    
    // Draw enemy bullets
    game.ctx.fillStyle = '#ff0000';
    enemyBullets.forEach(bullet => {
        game.ctx.fillRect(bullet.x - 3, bullet.y - 3, 6, 6);
    });
    
    // Draw particles
    particles.forEach(particle => {
        game.ctx.globalAlpha = particle.alpha;
        game.ctx.fillStyle = particle.color;
        game.ctx.fillRect(particle.x, particle.y, 3, 3);
    });
    game.ctx.globalAlpha = 1;
}

function updateUI() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('crystals').textContent = game.crystals;
    document.getElementById('health').textContent = game.health;
    document.getElementById('level').textContent = game.level;
    document.getElementById('energyFill').style.width = game.energy + '%';
    
    // Level up
    if (game.crystals >= game.level * 10) {
        game.level++;
        updateStatus(`Level ${game.level}! Difficulty increased!`);
    }
}

function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

function gameOver() {
    game.gameRunning = false;
    
    // Update high score
    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem('cosmicExplorerHighScore', game.highScore);
        updateStatus(`NEW HIGH SCORE! ${game.score} points!`);
    } else {
        updateStatus(`GAME OVER! Score: ${game.score} | High Score: ${game.highScore}`);
    }
    
    // Reset game state
    setTimeout(() => {
        game.health = 100;
        game.score = 0;
        game.crystals = 0;
        game.level = 1;
        game.energy = 100;
        game.deathTimer = 0;
        asteroids.length = 0;
        crystals.length = 0;
        enemies.length = 0;
        bullets.length = 0;
        enemyBullets.length = 0;
        particles.length = 0;
        player.vx = 0;
        player.vy = 0;
        document.getElementById('gameInstructions').style.display = 'none';
        showInstructionsScreen();
        updateStatus("Ready for launch...");
    }, 3000);
}

function gameLoop(currentTime) {
    const deltaTime = currentTime - game.lastTime;
    game.lastTime = currentTime;
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.addEventListener('load', init);