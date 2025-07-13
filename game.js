// Game state
let gameState = "menu"; // "menu", "playing", "gameOver"
let canvas, ctx;
let wizard1, wizard2;
let spells = [];
let keys = new Set();
let lastSpellTime1 = 0;
let lastSpellTime2 = 0;
const spellCooldown = 300;
const maxSpellsPerPlayer = 5;
let isMuted = false;

// Wizard class
class Wizard {
    constructor(id, x, y, color, emoji) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.health = 100;
        this.maxHealth = 100;
        this.color = color;
        this.emoji = emoji;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }

    render(ctx) {
        // Draw human-like wizard figure
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        
        // Head
        ctx.beginPath();
        ctx.arc(this.x, this.y - 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Body (torso)
        ctx.fillRect(this.x - 6, this.y - 2, 12, 20);
        ctx.strokeRect(this.x - 6, this.y - 2, 12, 20);
        
        // Arms
        ctx.beginPath();
        // Left arm
        ctx.moveTo(this.x - 6, this.y + 3);
        ctx.lineTo(this.x - 12, this.y + 8);
        ctx.lineTo(this.x - 10, this.y + 15);
        // Right arm
        ctx.moveTo(this.x + 6, this.y + 3);
        ctx.lineTo(this.x + 12, this.y + 8);
        ctx.lineTo(this.x + 10, this.y + 15);
        ctx.stroke();
        
        // Legs
        ctx.beginPath();
        // Left leg
        ctx.moveTo(this.x - 3, this.y + 18);
        ctx.lineTo(this.x - 8, this.y + 30);
        // Right leg  
        ctx.moveTo(this.x + 3, this.y + 18);
        ctx.lineTo(this.x + 8, this.y + 30);
        ctx.stroke();
        
        // Wizard hat/cape effect
        ctx.fillStyle = this.color + "AA";
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 5, 15, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw emoji on head
        ctx.font = "16px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(this.emoji, this.x, this.y - 10);
        
        // Draw health bar above wizard
        const barWidth = 50;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 15;
        
        // Background
        ctx.fillStyle = "#333333";
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.6 ? "#10B981" : healthPercent > 0.3 ? "#F59E0B" : "#EF4444";
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

// Spell class
class Spell {
    constructor(x, y, vx, vy, color, caster) {
        this.x = x;
        this.y = y;
        this.vx = vx + (Math.random() - 0.5) * 2; // Add random deviation
        this.vy = vy + (Math.random() - 0.5) * 2;
        this.radius = 8;
        this.color = color;
        this.caster = caster;
        this.trail = [];
        this.wobbleTime = Math.random() * Math.PI * 2; // For unpredictable movement
    }

    update() {
        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
        
        // Limit trail length
        if (this.trail.length > 10) {
            this.trail.shift();
        }
        
        // Update trail alpha
        this.trail.forEach((point, index) => {
            point.alpha = index / this.trail.length;
        });
        
        // Add wobble for unpredictable movement
        this.wobbleTime += 0.2;
        const wobbleX = Math.sin(this.wobbleTime) * 0.5;
        const wobbleY = Math.cos(this.wobbleTime * 0.7) * 0.3;
        
        // Small chance for sudden direction change
        if (Math.random() < 0.02) {
            this.vx += (Math.random() - 0.5) * 3;
            this.vy += (Math.random() - 0.5) * 3;
        }
        
        this.x += this.vx + wobbleX;
        this.y += this.vy + wobbleY;
    }

    render(ctx) {
        // Draw trail
        this.trail.forEach((point, index) => {
            const alpha = point.alpha * 0.5;
            const size = this.radius * point.alpha;
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalAlpha = 1.0;
        
        // Draw main spell
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw glow effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, this.color + "AA");
        gradient.addColorStop(1, this.color + "00");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw core
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Game functions
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Force initial canvas size before resizing
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    
    resizeCanvas();
    
    // Initialize wizards
    wizard1 = new Wizard(1, 100, canvas.height / 2, "#8B5CF6", "⚡");
    wizard2 = new Wizard(2, canvas.width - 100, canvas.height / 2, "#10B981", "🐍");
    
    // Event listeners
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // UI event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('muteBtn').addEventListener('click', toggleMute);
    
    // Start rendering loop immediately to fix blue screen
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    // Get viewport dimensions for full screen canvas
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Set canvas resolution to match display size
    canvas.width = width;
    canvas.height = height;
    
    // Also set CSS size to ensure proper display
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    if (wizard1 && wizard2) {
        wizard1.x = 100;
        wizard1.y = canvas.height / 2;
        wizard2.x = canvas.width - 100;
        wizard2.y = canvas.height / 2;
    }
}

function startGame() {
    gameState = "playing";
    wizard1.health = 100;
    wizard2.health = 100;
    spells = [];
    
    updateHealthBars();
    updateSpellCounts();
    showScreen('gameScreen');
    
    gameLoop();
}

function endGame(winner) {
    gameState = "gameOver";
    
    const winnerName = winner === 1 ? "Harry Potter" : "Voldemort";
    const winnerEmoji = winner === 1 ? "⚡" : "🐍";
    const winnerMessage = winner === 1 ? 
        "The Boy Who Lived proves his magical prowess once again!" :
        "The Dark Lord's power cannot be denied!";
    
    document.getElementById('winnerName').textContent = winnerName + " Wins!";
    document.getElementById('winnerEmoji').textContent = winnerEmoji;
    document.getElementById('winnerMessage').textContent = winnerMessage;
    
    if (winner === 1) {
        document.getElementById('winnerName').style.color = "#c084fc";
    } else {
        document.getElementById('winnerName').style.color = "#6ee7b7";
    }
    
    showScreen('gameOverScreen');
    
    // Play victory sound effect (simple beep)
    if (!isMuted) {
        playVictorySound();
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function handleKeyDown(event) {
    const key = event.code;
    keys.add(key);
    
    // Global controls
    if (key === "Space" && gameState === "menu") {
        event.preventDefault();
        startGame();
        return;
    }
    
    if (key === "KeyR" && gameState === "gameOver") {
        event.preventDefault();
        startGame();
        return;
    }
    
    if (gameState !== "playing") return;
    
    event.preventDefault();
    
    // Handle spell casting
    const now = Date.now();
    if (key === "Space" && now - lastSpellTime1 > spellCooldown) {
        castSpell(1);
        lastSpellTime1 = now;
    }
    if (key === "Enter" && now - lastSpellTime2 > spellCooldown) {
        castSpell(2);
        lastSpellTime2 = now;
    }
}

function handleKeyUp(event) {
    keys.delete(event.code);
}

function castSpell(player) {
    // Check spell limit
    const playerSpells = spells.filter(spell => spell.caster === player);
    if (playerSpells.length >= maxSpellsPerPlayer) {
        return; // Can't cast more spells
    }
    
    const wizard = player === 1 ? wizard1 : wizard2;
    const direction = player === 1 ? 1 : -1;
    const color = player === 1 ? "#8B5CF6" : "#10B981";
    
    const spell = new Spell(
        wizard.x + direction * 30,
        wizard.y,
        direction * 8,
        0,
        color,
        player
    );
    
    spells.push(spell);
    updateSpellCounts();
    
    // Play casting sound
    if (!isMuted) {
        playCastSound();
    }
}

function updateWizards() {
    const speed = 5;
    
    // Player 1 controls (WASD)
    if (keys.has("KeyW")) {
        wizard1.y = Math.max(wizard1.radius, wizard1.y - speed);
    }
    if (keys.has("KeyS")) {
        wizard1.y = Math.min(canvas.height - wizard1.radius, wizard1.y + speed);
    }
    if (keys.has("KeyA")) {
        wizard1.x = Math.max(wizard1.radius, wizard1.x - speed);
    }
    if (keys.has("KeyD")) {
        wizard1.x = Math.min(canvas.width / 2 - wizard1.radius, wizard1.x + speed);
    }
    
    // Player 2 controls (Arrow keys)
    if (keys.has("ArrowUp")) {
        wizard2.y = Math.max(wizard2.radius, wizard2.y - speed);
    }
    if (keys.has("ArrowDown")) {
        wizard2.y = Math.min(canvas.height - wizard2.radius, wizard2.y + speed);
    }
    if (keys.has("ArrowLeft")) {
        wizard2.x = Math.max(canvas.width / 2 + wizard2.radius, wizard2.x - speed);
    }
    if (keys.has("ArrowRight")) {
        wizard2.x = Math.min(canvas.width - wizard2.radius, wizard2.x + speed);
    }
}

function updateSpells() {
    spells = spells.filter(spell => {
        spell.update();
        return spell.x > -50 && spell.x < canvas.width + 50;
    });
    updateSpellCounts();
}

function checkCollisions() {
    // Check spell-to-spell collisions first
    for (let i = spells.length - 1; i >= 0; i--) {
        for (let j = i - 1; j >= 0; j--) {
            const spell1 = spells[i];
            const spell2 = spells[j];
            
            // Only check spells from different players
            if (spell1.caster !== spell2.caster) {
                if (distance(spell1.x, spell1.y, spell2.x, spell2.y) < spell1.radius + spell2.radius) {
                    // Spells neutralize each other
                    spells.splice(i, 1);
                    spells.splice(j, 1);
                    if (!isMuted) playNeutralizationSound();
                    updateSpellCounts();
                    return; // Exit to avoid index issues
                }
            }
        }
    }
    
    // Check spell-to-wizard collisions
    for (let i = spells.length - 1; i >= 0; i--) {
        const spell = spells[i];
        let hit = false;
        
        // Check collision with wizards
        if (spell.caster === 1) {
            // Player 1's spell hitting Player 2
            if (distance(spell.x, spell.y, wizard2.x, wizard2.y) < spell.radius + wizard2.radius) {
                wizard2.takeDamage(20);
                hit = true;
                if (!isMuted) playHitSound();
            }
        } else {
            // Player 2's spell hitting Player 1
            if (distance(spell.x, spell.y, wizard1.x, wizard1.y) < spell.radius + wizard1.radius) {
                wizard1.takeDamage(20);
                hit = true;
                if (!isMuted) playHitSound();
            }
        }
        
        if (hit) {
            spells.splice(i, 1);
            updateHealthBars();
            updateSpellCounts();
            
            // Check for game over
            if (wizard1.health <= 0) {
                endGame(2);
                return;
            } else if (wizard2.health <= 0) {
                endGame(1);
                return;
            }
        }
    }
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function updateHealthBars() {
    document.getElementById('health1').style.width = wizard1.health + '%';
    document.getElementById('health2').style.width = wizard2.health + '%';
    document.getElementById('healthText1').textContent = wizard1.health + '/100';
    document.getElementById('healthText2').textContent = wizard2.health + '/100';
}

function updateSpellCounts() {
    const player1Spells = spells.filter(spell => spell.caster === 1).length;
    const player2Spells = spells.filter(spell => spell.caster === 2).length;
    
    document.getElementById('spellCount1').textContent = `Spells: ${player1Spells}/5`;
    document.getElementById('spellCount2').textContent = `Spells: ${player2Spells}/5`;
}

function render() {
    // Clear canvas
    ctx.fillStyle = "#000011";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw magical background effects
    drawBackground();
    
    // Only draw game elements if wizards are initialized
    if (wizard1 && wizard2) {
        // Draw center divider
        ctx.strokeStyle = "#4B5563";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw spells
        spells.forEach(spell => spell.render(ctx));
        
        // Draw wizards
        wizard1.render(ctx);
        wizard2.render(ctx);
    }
}

function drawBackground() {
    // Draw some magical sparkles
    const time = Date.now() * 0.001;
    ctx.fillStyle = "#8B5CF622";
    
    for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time + i) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.7 + i * 0.5) * 0.5 + 0.5) * canvas.height;
        const size = Math.sin(time * 2 + i) * 2 + 3;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function gameLoop() {
    // Always render, even when not playing to avoid blue screen
    if (gameState === "playing") {
        updateWizards();
        updateSpells();
        checkCollisions();
    }
    
    // Always render to prevent blue screen
    if (canvas && ctx) {
        render();
    }
    
    requestAnimationFrame(gameLoop);
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('muteBtn').textContent = isMuted ? "🔇" : "🔊";
}

// Simple sound effects using Web Audio API
function playCastSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playHitSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 200;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playVictorySound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Play a sequence of notes
        const notes = [523, 659, 784, 1047]; // C, E, G, C
        
        notes.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = audioContext.currentTime + index * 0.2;
            gainNode.gain.setValueAtTime(0.1, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playNeutralizationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 300;
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Initialize the game when page loads
window.addEventListener('load', function() {
    // Add small delay to ensure DOM is fully ready
    setTimeout(initGame, 100);
});

// Backup initialization if load event doesn't fire
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (!canvas) {
            initGame();
        }
    }, 200);
});