// Game configuration
const CONFIG = {
    SNAKE_SPEED: 3,
    BOOST_SPEED: 6,
    FOOD_COUNT: 100,
    BOT_COUNT: 8,
    INITIAL_LENGTH: 5,
    SEGMENT_SIZE: 8,
    WORLD_SIZE: 3000,
    POWERUP_COUNT: 5
};

// Game state
let canvas, ctx;
let player;
let foods = [];
let bots = [];
let powerups = [];
let particles = [];
let floatingTexts = [];
let camera = { x: 0, y: 0 };
let mouseX = 0, mouseY = 0;
let gameRunning = false;
let animationId;
let isBoosting = false;
let zoomLevel = 1;

// Helper function to create floating text
function createFloatingText(x, y, text, color) {
    floatingTexts.push(new FloatingText(x, y, text, color));
}

// Color palette
const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

// Skin patterns
const SKINS = [
    {
        name: 'Classic',
        type: 'solid',
        colors: ['#FF6B6B']
    },
    {
        name: 'Ocean',
        type: 'solid',
        colors: ['#4ECDC4']
    },
    {
        name: 'Rainbow',
        type: 'gradient',
        colors: ['#FF6B6B', '#F7DC6F', '#4ECDC4', '#BB8FCE']
    },
    {
        name: 'Fire',
        type: 'gradient',
        colors: ['#FF4500', '#FFD700']
    },
    {
        name: 'Ice',
        type: 'gradient',
        colors: ['#00CED1', '#E0FFFF']
    },
    {
        name: 'Toxic',
        type: 'gradient',
        colors: ['#00FF00', '#32CD32']
    },
    {
        name: 'Galaxy',
        type: 'gradient',
        colors: ['#4B0082', '#9370DB', '#FF1493']
    },
    {
        name: 'Gold',
        type: 'solid',
        colors: ['#FFD700']
    },
    {
        name: 'Zebra',
        type: 'striped',
        colors: ['#000000', '#FFFFFF']
    },
    {
        name: 'Tiger',
        type: 'striped',
        colors: ['#FF8C00', '#000000']
    },
    {
        name: 'Neon',
        type: 'gradient',
        colors: ['#FF00FF', '#00FFFF']
    },
    {
        name: 'Sunset',
        type: 'gradient',
        colors: ['#FF6B6B', '#FFA07A', '#FFD700']
    }
];

let selectedSkin = SKINS[0];

// Power-up types
const POWERUP_TYPES = [
    {
        type: 'shield',
        color: '#3498db',
        icon: '🛡️',
        duration: 5000,
        effect: 'Miễn nhiễm va chạm'
    },
    {
        type: 'magnet',
        color: '#e74c3c',
        icon: '🧲',
        duration: 7000,
        effect: 'Thu hút thức ăn'
    },
    {
        type: 'speed',
        color: '#f39c12',
        icon: '⚡',
        duration: 5000,
        effect: 'Tăng tốc độ'
    },
    {
        type: 'ghost',
        color: '#9b59b6',
        icon: '👻',
        duration: 4000,
        effect: 'Xuyên qua rắn khác'
    }
];

// Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
        this.vy += 0.1; // gravity
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(
            this.x - camera.x,
            this.y - camera.y,
            this.size,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// FloatingText class
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.vy = -2;
    }

    update() {
        this.y += this.vy;
        this.life -= 0.015;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, this.x - camera.x, this.y - camera.y);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x - camera.x, this.y - camera.y);
        ctx.globalAlpha = 1;
    }
}

// PowerUp class
class PowerUp {
    constructor() {
        this.x = Math.random() * CONFIG.WORLD_SIZE;
        this.y = Math.random() * CONFIG.WORLD_SIZE;
        this.type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        this.size = 12;
        this.rotation = 0;
        this.pulse = 0;
    }

    update() {
        this.rotation += 0.05;
        this.pulse = Math.sin(Date.now() * 0.005) * 2;
    }

    draw() {
        const size = this.size + this.pulse;
        
        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.type.color;
        
        ctx.beginPath();
        ctx.arc(
            this.x - camera.x,
            this.y - camera.y,
            size,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = this.type.color;
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Icon
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.type.icon,
            this.x - camera.x,
            this.y - camera.y
        );
    }
}

class Snake {
    constructor(x, y, name, isPlayer = false, skin = null, aiLevel = null) {
        this.x = x;
        this.y = y;
        this.segments = [];
        this.name = name;
        this.isPlayer = isPlayer;
        this.skin = skin || SKINS[Math.floor(Math.random() * SKINS.length)];
        this.color = this.skin.colors[0];
        this.angle = Math.random() * Math.PI * 2;
        this.speed = CONFIG.SNAKE_SPEED;
        this.score = 0;
        this.kills = 0;
        this.activePowerups = [];
        this.trail = [];
        
        // AI difficulty level (1=Easy, 2=Medium, 3=Hard, 4=Expert)
        if (!isPlayer) {
            this.aiLevel = aiLevel || Math.floor(Math.random() * 4) + 1;
            this.reactionSpeed = 0.03 + (this.aiLevel * 0.02); // Faster reaction for higher levels
            this.visionRange = 200 + (this.aiLevel * 100); // Better vision for higher levels
            this.aggression = this.aiLevel * 0.2; // More aggressive at higher levels
        }
        
        // Initialize segments
        for (let i = 0; i < CONFIG.INITIAL_LENGTH; i++) {
            this.segments.push({
                x: x - i * CONFIG.SEGMENT_SIZE,
                y: y
            });
        }
    }

    update() {
        if (this.isPlayer) {
            // Player follows mouse
            const dx = mouseX + camera.x - this.x;
            const dy = mouseY + camera.y - this.y;
            this.angle = Math.atan2(dy, dx);
            
            // Apply boost
            let currentSpeed = this.speed;
            if (isBoosting && this.score > 0) {
                currentSpeed = CONFIG.BOOST_SPEED;
                // Lose score when boosting
                if (Math.random() < 0.1) {
                    this.score = Math.max(0, this.score - 1);
                }
                // Create trail particles
                if (Math.random() < 0.5) {
                    particles.push(new Particle(this.x, this.y, this.color));
                }
            }
            
            // Check for speed powerup
            if (this.hasPowerup('speed')) {
                currentSpeed *= 1.5;
            }
            
            this.x += Math.cos(this.angle) * currentSpeed;
            this.y += Math.sin(this.angle) * currentSpeed;
        } else {
            // Bot AI
            this.botAI();
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }

        // Keep in bounds
        this.x = Math.max(50, Math.min(CONFIG.WORLD_SIZE - 50, this.x));
        this.y = Math.max(50, Math.min(CONFIG.WORLD_SIZE - 50, this.y));

        // Update segments
        this.segments.unshift({ x: this.x, y: this.y });
        if (this.segments.length > CONFIG.INITIAL_LENGTH + this.score) {
            this.segments.pop();
        }
        
        // Update trail
        this.trail.push({ x: this.x, y: this.y, alpha: 0.5 });
        if (this.trail.length > 10) {
            this.trail.shift();
        }
        
        // Update powerups
        this.activePowerups = this.activePowerups.filter(p => p.endTime > Date.now());
    }
    
    hasPowerup(type) {
        return this.activePowerups.some(p => p.type === type);
    }
    
    addPowerup(powerup) {
        // Remove existing powerup of same type
        this.activePowerups = this.activePowerups.filter(p => p.type !== powerup.type);
        
        this.activePowerups.push({
            type: powerup.type,
            endTime: Date.now() + powerup.duration,
            icon: powerup.icon
        });
    }

    botAI() {
        const allSnakes = [player, ...bots].filter(s => s !== this);
        const visionRange = this.visionRange || 300;
        const reactionSpeed = this.reactionSpeed || 0.05;
        const aiLevel = this.aiLevel || 1;
        
        // 1. DANGER DETECTION - Avoid other snakes' bodies
        let dangerAngle = null;
        let maxDanger = 0;
        const dangerRange = 80 + (aiLevel * 20); // Higher level = detect danger earlier
        
        allSnakes.forEach(snake => {
            // Check if we're close to their body
            for (let i = 3; i < snake.segments.length; i++) {
                const segment = snake.segments[i];
                const dist = Math.hypot(segment.x - this.x, segment.y - this.y);
                
                if (dist < dangerRange) {
                    const danger = 1 - (dist / dangerRange);
                    if (danger > maxDanger) {
                        maxDanger = danger;
                        dangerAngle = Math.atan2(segment.y - this.y, segment.x - this.x);
                    }
                }
            }
        });
        
        // 2. HUNTING - Attack smaller snakes (more aggressive at higher levels)
        let huntTarget = null;
        let huntDist = Infinity;
        const minSizeToHunt = 10 + (aiLevel * 5);
        const huntChance = 0.3 + (this.aggression || 0);
        
        if (this.segments.length > minSizeToHunt) {
            allSnakes.forEach(snake => {
                const sizeRatio = 0.8 - (aiLevel * 0.1); // Higher level = hunt bigger snakes
                if (snake.segments.length < this.segments.length * sizeRatio) {
                    const dist = Math.hypot(snake.x - this.x, snake.y - this.y);
                    if (dist < visionRange && dist < huntDist) {
                        huntDist = dist;
                        huntTarget = snake;
                    }
                }
            });
        }
        
        // 3. FOOD SEEKING - Prioritize special foods (smarter at higher levels)
        let bestFood = null;
        let bestFoodScore = -Infinity;
        
        foods.forEach(food => {
            const dist = Math.hypot(food.x - this.x, food.y - this.y);
            if (dist < visionRange) {
                // Higher level AI values special food more
                const valueMultiplier = 5 + (aiLevel * 5);
                const score = (food.value * valueMultiplier) - (dist / 10);
                if (score > bestFoodScore) {
                    bestFoodScore = score;
                    bestFood = food;
                }
            }
        });
        
        // 4. POWERUP SEEKING (higher level = more interested in powerups)
        let nearestPowerup = null;
        let powerupDist = Infinity;
        const powerupChance = 0.4 + (aiLevel * 0.15);
        
        if (Math.random() < powerupChance) {
            powerups.forEach(powerup => {
                const dist = Math.hypot(powerup.x - this.x, powerup.y - this.y);
                if (dist < visionRange && dist < powerupDist) {
                    powerupDist = dist;
                    nearestPowerup = powerup;
                }
            });
        }
        
        // 5. DECISION MAKING (priority based on AI level)
        let targetAngle = this.angle;
        let turnSpeed = reactionSpeed;
        
        if (maxDanger > 0.4) {
            // PRIORITY 1: Avoid danger
            targetAngle = dangerAngle + Math.PI;
            turnSpeed = reactionSpeed * 3; // Quick evasion
            
            // Expert AI: Try to dodge sideways instead of just backing up
            if (aiLevel >= 3) {
                const dodgeDirection = Math.random() < 0.5 ? 1 : -1;
                targetAngle += (Math.PI / 4) * dodgeDirection;
            }
        } else if (huntTarget && Math.random() < huntChance) {
            // PRIORITY 2: Hunt smaller snakes
            if (aiLevel >= 3) {
                // Advanced: Predict target movement and cut them off
                const predictDistance = 30 + (aiLevel * 20);
                const predictX = huntTarget.x + Math.cos(huntTarget.angle) * predictDistance;
                const predictY = huntTarget.y + Math.sin(huntTarget.angle) * predictDistance;
                targetAngle = Math.atan2(predictY - this.y, predictX - this.x);
            } else {
                // Basic: Just chase
                targetAngle = Math.atan2(huntTarget.y - this.y, huntTarget.x - this.x);
            }
            turnSpeed = reactionSpeed * 1.5;
        } else if (nearestPowerup && powerupDist < 200) {
            // PRIORITY 3: Get powerups
            targetAngle = Math.atan2(nearestPowerup.y - this.y, nearestPowerup.x - this.x);
            turnSpeed = reactionSpeed * 1.2;
        } else if (bestFood) {
            // PRIORITY 4: Seek food
            targetAngle = Math.atan2(bestFood.y - this.y, bestFood.x - this.x);
            turnSpeed = reactionSpeed;
        } else {
            // PRIORITY 5: Explore
            const exploreChance = 0.02 + (aiLevel * 0.005);
            if (Math.random() < exploreChance) {
                this.angle += (Math.random() - 0.5) * 0.8;
            }
        }
        
        // Apply turn
        if (targetAngle !== this.angle) {
            let angleDiff = targetAngle - this.angle;
            // Normalize angle difference
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.angle += angleDiff * turnSpeed;
        }
        
        // 6. BOUNDARY AVOIDANCE (smarter at higher levels)
        const margin = 150 + (aiLevel * 50);
        const boundaryTurn = 0.05 + (aiLevel * 0.02);
        
        if (this.x < margin) {
            this.angle += boundaryTurn;
        } else if (this.x > CONFIG.WORLD_SIZE - margin) {
            this.angle -= boundaryTurn;
        }
        if (this.y < margin) {
            this.angle += boundaryTurn;
        } else if (this.y > CONFIG.WORLD_SIZE - margin) {
            this.angle -= boundaryTurn;
        }
        
        // 7. ADVANCED TACTICS (Expert AI only)
        if (aiLevel >= 4 && huntTarget && huntDist < 150) {
            // Try to encircle the target
            const angleToTarget = Math.atan2(huntTarget.y - this.y, huntTarget.x - this.x);
            const perpendicular = angleToTarget + Math.PI / 2;
            this.angle += Math.sin(perpendicular) * 0.03;
        }
    }

    draw() {
        // Draw trail
        this.trail.forEach((point, i) => {
            const alpha = (i / this.trail.length) * 0.3;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(
                point.x - camera.x,
                point.y - camera.y,
                3,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = this.color;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Draw segments with skin
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const segment = this.segments[i];
            const size = CONFIG.SEGMENT_SIZE - i * 0.1;
            
            // Shield effect
            if (this.hasPowerup('shield')) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#3498db';
            }
            
            // Ghost effect
            if (this.hasPowerup('ghost')) {
                ctx.globalAlpha = 0.5;
            }
            
            ctx.beginPath();
            ctx.arc(
                segment.x - camera.x,
                segment.y - camera.y,
                Math.max(size, 4),
                0,
                Math.PI * 2
            );
            
            // Apply skin
            if (this.skin.type === 'solid') {
                ctx.fillStyle = this.skin.colors[0];
            } else if (this.skin.type === 'gradient') {
                const gradient = ctx.createLinearGradient(
                    segment.x - camera.x - size,
                    segment.y - camera.y - size,
                    segment.x - camera.x + size,
                    segment.y - camera.y + size
                );
                this.skin.colors.forEach((color, idx) => {
                    gradient.addColorStop(idx / (this.skin.colors.length - 1), color);
                });
                ctx.fillStyle = gradient;
            } else if (this.skin.type === 'striped') {
                ctx.fillStyle = this.skin.colors[i % 2];
            }
            
            ctx.fill();
            
            // Outline
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // Draw eyes on head
        if (this.segments.length > 0) {
            const head = this.segments[0];
            const eyeDistance = 5;
            const eyeSize = 3;
            
            const leftEyeX = head.x + Math.cos(this.angle - 0.5) * eyeDistance;
            const leftEyeY = head.y + Math.sin(this.angle - 0.5) * eyeDistance;
            const rightEyeX = head.x + Math.cos(this.angle + 0.5) * eyeDistance;
            const rightEyeY = head.y + Math.sin(this.angle + 0.5) * eyeDistance;

            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(leftEyeX - camera.x, leftEyeY - camera.y, eyeSize, 0, Math.PI * 2);
            ctx.arc(rightEyeX - camera.x, rightEyeY - camera.y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw name and kills
        if (this.segments.length > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            const displayText = this.kills > 0 ? `${this.name} (${this.kills} 💀)` : this.name;
            ctx.fillText(
                displayText,
                this.x - camera.x,
                this.y - camera.y - 20
            );
            
            // Draw active powerups
            if (this.activePowerups.length > 0) {
                ctx.font = '16px Arial';
                const powerupText = this.activePowerups.map(p => p.icon).join(' ');
                ctx.fillText(
                    powerupText,
                    this.x - camera.x,
                    this.y - camera.y - 35
                );
            }
        }
    }

    checkFoodCollision() {
        const magnetRange = this.hasPowerup('magnet') ? 100 : 0;
        
        foods = foods.filter(food => {
            const dist = Math.hypot(food.x - this.x, food.y - this.y);
            
            // Magnet effect
            if (magnetRange > 0 && dist < magnetRange) {
                const angle = Math.atan2(this.y - food.y, this.x - food.x);
                food.x += Math.cos(angle) * 5;
                food.y += Math.sin(angle) * 5;
            }
            
            if (dist < CONFIG.SEGMENT_SIZE + food.size) {
                // Add score based on food value
                this.score += food.value;
                
                // Create more particles for special foods
                const particleCount = Math.min(food.value * 2, 30);
                for (let i = 0; i < particleCount; i++) {
                    particles.push(new Particle(food.x, food.y, food.color));
                }
                
                // Show floating text for big foods
                if (food.value > 1 && this.isPlayer) {
                    createFloatingText(food.x, food.y, `+${food.value}`, food.color);
                }
                
                return false;
            }
            return true;
        });
    }
    
    checkPowerupCollision() {
        powerups = powerups.filter(powerup => {
            const dist = Math.hypot(powerup.x - this.x, powerup.y - this.y);
            if (dist < CONFIG.SEGMENT_SIZE + powerup.size) {
                this.addPowerup(powerup.type);
                // Create particles
                for (let i = 0; i < 10; i++) {
                    particles.push(new Particle(powerup.x, powerup.y, powerup.type.color));
                }
                return false;
            }
            return true;
        });
    }

    checkHeadCollision(snakes) {
        // Shield or ghost powerup makes immune
        if (this.hasPowerup('shield') || this.hasPowerup('ghost')) {
            return null;
        }
        
        // Check if THIS snake's head hits another snake's body
        for (let snake of snakes) {
            if (snake === this) continue;
            
            // Skip if other snake has ghost powerup
            if (snake.hasPowerup('ghost')) continue;
            
            // Skip the head, check body segments only
            for (let i = 3; i < snake.segments.length; i++) {
                const segment = snake.segments[i];
                const dist = Math.hypot(segment.x - this.x, segment.y - this.y);
                if (dist < CONFIG.SEGMENT_SIZE * 1.5) {
                    return snake; // Return the snake we collided with
                }
            }
        }
        return null;
    }
    
    checkBodyCollision(snakes) {
        // Ghost powerup makes body intangible
        if (this.hasPowerup('ghost')) {
            return [];
        }
        
        // Check if another snake's head hits THIS snake's body
        const killedSnakes = [];
        
        for (let snake of snakes) {
            if (snake === this) continue;
            
            // Skip if they have shield or ghost
            if (snake.hasPowerup('shield') || snake.hasPowerup('ghost')) continue;
            
            // Check if their head hits our body (skip our head segments)
            for (let i = 3; i < this.segments.length; i++) {
                const segment = this.segments[i];
                const dist = Math.hypot(segment.x - snake.x, segment.y - snake.y);
                if (dist < CONFIG.SEGMENT_SIZE * 1.5) {
                    killedSnakes.push(snake);
                    break;
                }
            }
        }
        
        return killedSnakes;
    }
}

// Special food types
const FOOD_TYPES = [
    {
        name: 'normal',
        value: 1,
        size: 5,
        color: null, // Random from COLORS
        chance: 0.70, // 70%
        icon: null
    },
    {
        name: 'big',
        value: 5,
        size: 10,
        color: '#FFD700',
        chance: 0.15, // 15%
        icon: '⭐'
    },
    {
        name: 'mega',
        value: 10,
        size: 15,
        color: '#FF1493',
        chance: 0.08, // 8%
        icon: '💎'
    },
    {
        name: 'super',
        value: 20,
        size: 20,
        color: '#00FF00',
        chance: 0.05, // 5%
        icon: '👑'
    },
    {
        name: 'ultra',
        value: 50,
        size: 25,
        color: '#FF0000',
        chance: 0.02, // 2%
        icon: '🔥'
    }
];

class Food {
    constructor(x = null, y = null, forceType = null) {
        this.x = x !== null ? x : Math.random() * CONFIG.WORLD_SIZE;
        this.y = y !== null ? y : Math.random() * CONFIG.WORLD_SIZE;
        
        // Determine food type
        if (forceType) {
            this.type = FOOD_TYPES.find(t => t.name === forceType) || FOOD_TYPES[0];
        } else {
            const rand = Math.random();
            let cumulative = 0;
            this.type = FOOD_TYPES[0];
            
            for (let foodType of FOOD_TYPES) {
                cumulative += foodType.chance;
                if (rand <= cumulative) {
                    this.type = foodType;
                    break;
                }
            }
        }
        
        this.color = this.type.color || COLORS[Math.floor(Math.random() * COLORS.length)];
        this.size = this.type.size;
        this.value = this.type.value;
        this.rotation = 0;
        this.pulse = 0;
    }

    update() {
        this.rotation += 0.02;
        this.pulse = Math.sin(Date.now() * 0.003) * 1.5;
    }

    draw() {
        // Special glow for rare foods
        if (this.type.name !== 'normal') {
            ctx.shadowBlur = 10 + this.pulse;
            ctx.shadowColor = this.color;
        }
        
        ctx.beginPath();
        ctx.arc(
            this.x - camera.x,
            this.y - camera.y,
            this.size + this.pulse * 0.3,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Draw icon for special foods
        if (this.type.icon) {
            ctx.save();
            ctx.translate(this.x - camera.x, this.y - camera.y);
            ctx.rotate(this.rotation);
            ctx.font = `${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.type.icon, 0, 0);
            ctx.restore();
        }
        
        // Draw value indicator for big foods
        if (this.value > 1) {
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(
                `+${this.value}`,
                this.x - camera.x,
                this.y - camera.y + this.size + 12
            );
            ctx.fillText(
                `+${this.value}`,
                this.x - camera.x,
                this.y - camera.y + this.size + 12
            );
        }
    }
}

function initGame(playerName) {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create player with selected skin
    player = new Snake(
        CONFIG.WORLD_SIZE / 2,
        CONFIG.WORLD_SIZE / 2,
        playerName || 'Player',
        true,
        selectedSkin
    );

    // Create bots (only in offline mode)
    bots = [];
    if (!isMultiplayerMode) {
        const botConfigs = [
            { name: 'Bot Newbie', level: 1, emoji: '🐛' },
            { name: 'Bot Rookie', level: 1, emoji: '🐛' },
            { name: 'Bot Fighter', level: 2, emoji: '🐍' },
            { name: 'Bot Warrior', level: 2, emoji: '🐍' },
            { name: 'Bot Hunter', level: 3, emoji: '🐉' },
            { name: 'Bot Predator', level: 3, emoji: '🐉' },
            { name: 'Bot Master', level: 4, emoji: '👑' },
            { name: 'Bot Legend', level: 4, emoji: '👑' }
        ];
        
        for (let i = 0; i < CONFIG.BOT_COUNT; i++) {
            const config = botConfigs[i];
            const bot = new Snake(
                Math.random() * CONFIG.WORLD_SIZE,
                Math.random() * CONFIG.WORLD_SIZE,
                `${config.emoji} ${config.name}`,
                false,
                null,
                config.level
            );
            bots.push(bot);
        }
    }

    // Create food
    foods = [];
    for (let i = 0; i < CONFIG.FOOD_COUNT; i++) {
        foods.push(new Food());
    }
    
    // Add some guaranteed special foods at start
    foods.push(new Food(CONFIG.WORLD_SIZE / 2 + 200, CONFIG.WORLD_SIZE / 2, 'big'));
    foods.push(new Food(CONFIG.WORLD_SIZE / 2 - 200, CONFIG.WORLD_SIZE / 2, 'big'));
    foods.push(new Food(CONFIG.WORLD_SIZE / 2, CONFIG.WORLD_SIZE / 2 + 200, 'mega'));
    foods.push(new Food(CONFIG.WORLD_SIZE / 2, CONFIG.WORLD_SIZE / 2 - 200, 'mega'));
    foods.push(new Food(CONFIG.WORLD_SIZE / 2 + 300, CONFIG.WORLD_SIZE / 2 + 300, 'super'));
    
    // Create powerups
    powerups = [];
    for (let i = 0; i < CONFIG.POWERUP_COUNT; i++) {
        powerups.push(new PowerUp());
    }
    
    particles = [];
    floatingTexts = [];

    gameRunning = true;
    gameLoop();
}

function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom
    ctx.save();
    
    // Draw grid
    drawGrid();

    // Update camera with smooth follow
    const targetX = player.x - canvas.width / 2;
    const targetY = player.y - canvas.height / 2;
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;

    // Update and draw food
    foods.forEach(food => {
        food.update();
        food.draw();
    });

    // Maintain food count
    while (foods.length < CONFIG.FOOD_COUNT) {
        foods.push(new Food());
    }
    
    // Update and draw powerups
    powerups.forEach(powerup => {
        powerup.update();
        powerup.draw();
    });
    
    // Maintain powerup count
    while (powerups.length < CONFIG.POWERUP_COUNT) {
        powerups.push(new PowerUp());
    }
    
    // Update and draw particles
    particles = particles.filter(p => {
        p.update();
        p.draw();
        return p.life > 0;
    });
    
    // Update and draw floating texts
    floatingTexts = floatingTexts.filter(t => {
        t.update();
        t.draw();
        return t.life > 0;
    });

    // Update and draw all snakes
    let allSnakes;
    if (isMultiplayerMode && multiplayerManager) {
        // In multiplayer, include remote players instead of bots
        allSnakes = multiplayerManager.getAllPlayers();
    } else {
        // In offline mode, use bots
        allSnakes = [player, ...bots];
    }
    
    allSnakes.forEach(snake => {
        snake.update();
        snake.checkFoodCollision();
        // All snakes can get powerups now
        snake.checkPowerupCollision();
    });

    // Check collisions
    // 1. Check if player's head hits another snake's body (player dies)
    const otherSnakes = isMultiplayerMode ? 
        allSnakes.filter(s => s !== player) : 
        bots;
    
    const playerHitSnake = player.checkHeadCollision(otherSnakes);
    if (playerHitSnake) {
        endGame();
        return;
    }
    
    // 2. Check if any snake's head hits player's body (they die, player gets points)
    const killedByPlayer = player.checkBodyCollision(otherSnakes);
    killedByPlayer.forEach(deadSnake => {
        // Create food from dead snake
        deadSnake.segments.forEach((segment, idx) => {
            if (idx % 2 === 0) { // Create food every other segment
                foods.push(new Food(segment.x, segment.y));
            }
        });
        
        // Award points and kills
        player.score += Math.floor(deadSnake.segments.length / 2);
        player.kills++;
        
        // Respawn the bot with same AI level
        const index = bots.indexOf(deadSnake);
        if (index > -1) {
            bots[index] = new Snake(
                Math.random() * CONFIG.WORLD_SIZE,
                Math.random() * CONFIG.WORLD_SIZE,
                deadSnake.name,
                false,
                null,
                deadSnake.aiLevel
            );
        }
    });
    
    // 3. Check bot vs bot collisions (only in offline mode)
    if (!isMultiplayerMode) {
        bots.forEach(bot => {
            const hitSnake = bot.checkHeadCollision(bots.filter(b => b !== bot));
            if (hitSnake) {
                // Respawn the bot that died with same AI level
                const index = bots.indexOf(bot);
                if (index > -1) {
                    bots[index] = new Snake(
                        Math.random() * CONFIG.WORLD_SIZE,
                        Math.random() * CONFIG.WORLD_SIZE,
                        bot.name,
                        false,
                        null,
                        bot.aiLevel
                    );
                }
            }
        });
    }
    
    // Draw all snakes
    allSnakes.forEach(snake => {
        snake.draw();
    });

    // Draw all snakes
    allSnakes.forEach(snake => {
        snake.draw();
    });
    
    ctx.restore();
    
    // Draw minimap
    drawMinimap();
    
    // Draw boost indicator
    if (isBoosting && player.score > 0) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Update UI
    document.getElementById('score').innerHTML = `
        Điểm: ${player.score}<br>
        Giết: ${player.kills} 💀<br>
        ${isBoosting ? '🚀 BOOST!' : ''}
    `;
    updateLeaderboard(allSnakes);

    animationId = requestAnimationFrame(gameLoop);
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;

    const gridSize = 50;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;

    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
}

function updateLeaderboard(snakes) {
    const sorted = snakes.sort((a, b) => b.score - a.score).slice(0, 5);
    const list = document.getElementById('topPlayers');
    list.innerHTML = sorted.map(snake => 
        `<li>${snake.name}: ${snake.score} ${snake.kills > 0 ? '(💀' + snake.kills + ')' : ''}</li>`
    ).join('');
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    document.getElementById('finalScore').innerHTML = 
        `Điểm của bạn: ${player.score}<br>Số lần giết: ${player.kills} 💀`;
    document.getElementById('gameOver').style.display = 'block';
}

// Skin selector functions
function createSkinPreview(skin, index) {
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    
    // Draw preview snake
    const centerX = 30;
    const centerY = 30;
    const segments = 5;
    
    for (let i = 0; i < segments; i++) {
        const x = centerX - i * 8;
        const y = centerY;
        const size = 8 - i * 0.5;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        
        if (skin.type === 'solid') {
            ctx.fillStyle = skin.colors[0];
        } else if (skin.type === 'gradient') {
            const gradient = ctx.createLinearGradient(x - size, y - size, x + size, y + size);
            skin.colors.forEach((color, idx) => {
                gradient.addColorStop(idx / (skin.colors.length - 1), color);
            });
            ctx.fillStyle = gradient;
        } else if (skin.type === 'striped') {
            ctx.fillStyle = skin.colors[i % 2];
        }
        
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    return canvas;
}

function initSkinSelector() {
    const skinOptions = document.getElementById('skinOptions');
    
    SKINS.forEach((skin, index) => {
        const option = document.createElement('div');
        option.className = 'skin-option';
        if (index === 0) option.classList.add('selected');
        
        const preview = createSkinPreview(skin, index);
        option.appendChild(preview);
        option.title = skin.name;
        
        option.addEventListener('click', () => {
            document.querySelectorAll('.skin-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            selectedSkin = skin;
        });
        
        skinOptions.appendChild(option);
    });
}

// Initialize skin selector on page load
initSkinSelector();

// Mode selector
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const mode = btn.dataset.mode;
        document.getElementById('offlineMode').style.display = mode === 'offline' ? 'block' : 'none';
        document.getElementById('onlineMode').style.display = mode === 'online' ? 'block' : 'none';
    });
});

// Event listeners
document.getElementById('playBtn').addEventListener('click', () => {
    const playerName = document.getElementById('playerName').value.trim() || 'Player';
    isMultiplayerMode = false;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    initGame(playerName);
});

// Host game button
document.getElementById('hostBtn').addEventListener('click', async () => {
    const playerName = document.getElementById('playerName').value.trim() || 'Player';
    const statusDiv = document.getElementById('connectionStatus');
    
    try {
        statusDiv.className = 'connection-status connecting';
        statusDiv.textContent = '🔄 Đang tạo phòng...';
        
        multiplayerManager = new MultiplayerManager();
        const roomCode = await multiplayerManager.createRoom();
        
        statusDiv.className = 'connection-status connected';
        statusDiv.textContent = '✅ Phòng đã tạo! Chia sẻ mã phòng với bạn bè.';
        
        // Show room code
        document.getElementById('roomCodeDisplay').textContent = roomCode;
        document.getElementById('roomInfo').style.display = 'block';
        
        // Start game
        isMultiplayerMode = true;
        document.getElementById('menu').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        initGame(playerName);
        
        multiplayerManager.startUpdates();
        multiplayerManager.updatePlayerList();
        
    } catch (err) {
        statusDiv.className = 'connection-status error';
        statusDiv.textContent = '❌ ' + err.message;
    }
});

// Join game button
document.getElementById('joinBtn').addEventListener('click', async () => {
    const playerName = document.getElementById('playerName').value.trim() || 'Player';
    const roomCode = document.getElementById('roomCode').value.trim();
    const statusDiv = document.getElementById('connectionStatus');
    
    if (!roomCode) {
        statusDiv.className = 'connection-status error';
        statusDiv.textContent = '❌ Vui lòng nhập mã phòng';
        return;
    }
    
    try {
        statusDiv.className = 'connection-status connecting';
        statusDiv.textContent = '🔄 Đang kết nối...';
        
        multiplayerManager = new MultiplayerManager();
        await multiplayerManager.joinRoom(roomCode);
        
        statusDiv.className = 'connection-status connected';
        statusDiv.textContent = '✅ Đã kết nối!';
        
        // Show room info
        document.getElementById('roomCodeDisplay').textContent = roomCode;
        document.getElementById('roomInfo').style.display = 'block';
        
        // Start game
        isMultiplayerMode = true;
        document.getElementById('menu').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        initGame(playerName);
        
        multiplayerManager.startUpdates();
        multiplayerManager.updatePlayerList();
        
    } catch (err) {
        statusDiv.className = 'connection-status error';
        statusDiv.textContent = '❌ ' + err.message;
    }
});

document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOver').style.display = 'none';
    
    if (isMultiplayerMode && multiplayerManager) {
        multiplayerManager.disconnect();
        document.getElementById('roomInfo').style.display = 'none';
        isMultiplayerMode = false;
    }
    
    document.getElementById('menu').style.display = 'block';
    document.getElementById('gameContainer').style.display = 'none';
});

canvas = document.getElementById('gameCanvas');
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

window.addEventListener('resize', () => {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    document.getElementById('finalScore').innerHTML = 
        `Điểm của bạn: ${player.score}<br>Số lần giết: ${player.kills} 💀`;
    document.getElementById('gameOver').style.display = 'block';
}

function drawMinimap() {
    const minimapSize = 150;
    const minimapX = canvas.width - minimapSize - 20;
    const minimapY = 20;
    const scale = minimapSize / CONFIG.WORLD_SIZE;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(
        minimapX + player.x * scale,
        minimapY + player.y * scale,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Draw bots
    bots.forEach(bot => {
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(
            minimapX + bot.x * scale,
            minimapY + bot.y * scale,
            2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });
    
    // Draw powerups
    powerups.forEach(powerup => {
        ctx.fillStyle = powerup.type.color;
        ctx.beginPath();
        ctx.arc(
            minimapX + powerup.x * scale,
            minimapY + powerup.y * scale,
            2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });
}

// Boost controls
canvas.addEventListener('mousedown', () => {
    isBoosting = true;
});

canvas.addEventListener('mouseup', () => {
    isBoosting = false;
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameRunning) {
        e.preventDefault();
        isBoosting = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isBoosting = false;
    }
});
