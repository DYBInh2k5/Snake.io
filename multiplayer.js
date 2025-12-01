// Multiplayer Manager using PeerJS
class MultiplayerManager {
    constructor() {
        this.peer = null;
        this.connections = new Map(); // peerId -> connection
        this.isHost = false;
        this.roomCode = null;
        this.remotePlayers = new Map(); // peerId -> player data
        this.updateInterval = null;
    }

    // Initialize PeerJS
    init() {
        return new Promise((resolve, reject) => {
            // Use public PeerJS server
            this.peer = new Peer({
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                console.log('My peer ID:', id);
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                reject(err);
            });

            // Listen for incoming connections
            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });
        });
    }

    // Host creates a room
    async createRoom() {
        try {
            const peerId = await this.init();
            this.isHost = true;
            this.roomCode = this.generateRoomCode(peerId);
            
            console.log('Room created:', this.roomCode);
            return this.roomCode;
        } catch (err) {
            throw new Error('Không thể tạo phòng: ' + err.message);
        }
    }

    // Join existing room
    async joinRoom(roomCode) {
        try {
            await this.init();
            this.isHost = false;
            this.roomCode = roomCode;
            
            const hostPeerId = this.decodePeerId(roomCode);
            const conn = this.peer.connect(hostPeerId, {
                reliable: true
            });

            return new Promise((resolve, reject) => {
                conn.on('open', () => {
                    this.handleConnection(conn);
                    
                    // Send join request
                    conn.send({
                        type: 'join',
                        playerName: player.name,
                        skin: selectedSkin
                    });
                    
                    resolve();
                });

                conn.on('error', (err) => {
                    reject(new Error('Không thể kết nối: ' + err.message));
                });

                setTimeout(() => {
                    if (!conn.open) {
                        reject(new Error('Timeout: Không thể kết nối đến phòng'));
                    }
                }, 10000);
            });
        } catch (err) {
            throw new Error('Không thể tham gia phòng: ' + err.message);
        }
    }

    // Handle new connection
    handleConnection(conn) {
        console.log('New connection:', conn.peer);
        
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            
            // Send welcome message
            if (this.isHost) {
                conn.send({
                    type: 'welcome',
                    hostName: player.name,
                    gameState: this.getGameState()
                });
            }
        });

        conn.on('data', (data) => {
            this.handleMessage(conn.peer, data);
        });

        conn.on('close', () => {
            console.log('Connection closed:', conn.peer);
            this.connections.delete(conn.peer);
            this.remotePlayers.delete(conn.peer);
            this.updatePlayerList();
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
        });
    }

    // Handle incoming messages
    handleMessage(peerId, data) {
        switch (data.type) {
            case 'join':
                if (this.isHost) {
                    // Add new player
                    this.remotePlayers.set(peerId, {
                        name: data.playerName,
                        skin: data.skin,
                        x: Math.random() * CONFIG.WORLD_SIZE,
                        y: Math.random() * CONFIG.WORLD_SIZE,
                        segments: [],
                        score: 0,
                        kills: 0
                    });
                    
                    // Broadcast to all players
                    this.broadcast({
                        type: 'playerJoined',
                        peerId: peerId,
                        playerData: this.remotePlayers.get(peerId)
                    });
                    
                    this.updatePlayerList();
                }
                break;

            case 'playerUpdate':
                // Update remote player position
                if (this.remotePlayers.has(peerId)) {
                    const remotePlayer = this.remotePlayers.get(peerId);
                    Object.assign(remotePlayer, data.playerData);
                }
                break;

            case 'playerJoined':
                // Another player joined
                this.remotePlayers.set(data.peerId, data.playerData);
                this.updatePlayerList();
                break;

            case 'gameState':
                // Sync game state from host
                if (!this.isHost) {
                    this.syncGameState(data.state);
                }
                break;

            case 'welcome':
                console.log('Welcomed by host:', data.hostName);
                if (data.gameState) {
                    this.syncGameState(data.gameState);
                }
                break;
        }
    }

    // Broadcast message to all connected peers
    broadcast(data, excludePeer = null) {
        this.connections.forEach((conn, peerId) => {
            if (peerId !== excludePeer && conn.open) {
                conn.send(data);
            }
        });
    }

    // Send player update
    sendPlayerUpdate() {
        if (!player) return;

        const playerData = {
            x: player.x,
            y: player.y,
            angle: player.angle,
            segments: player.segments.slice(0, 50), // Limit segments to reduce bandwidth
            score: player.score,
            kills: player.kills,
            activePowerups: player.activePowerups
        };

        this.broadcast({
            type: 'playerUpdate',
            playerData: playerData
        });
    }

    // Get current game state
    getGameState() {
        return {
            foods: foods.map(f => ({ x: f.x, y: f.y, type: f.type.name, value: f.value })),
            powerups: powerups.map(p => ({ x: p.x, y: p.y, type: p.type.type }))
        };
    }

    // Sync game state from host
    syncGameState(state) {
        // Sync foods
        if (state.foods) {
            foods = state.foods.map(f => new Food(f.x, f.y, f.type));
        }

        // Sync powerups
        if (state.powerups) {
            powerups = state.powerups.map(p => {
                const powerup = new PowerUp();
                powerup.x = p.x;
                powerup.y = p.y;
                powerup.type = POWERUP_TYPES.find(t => t.type === p.type);
                return powerup;
            });
        }
    }

    // Start sending updates
    startUpdates() {
        this.updateInterval = setInterval(() => {
            this.sendPlayerUpdate();
        }, 50); // 20 updates per second
    }

    // Stop sending updates
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Generate room code from peer ID
    generateRoomCode(peerId) {
        // Take first 8 characters and make uppercase
        return peerId.substring(0, 8).toUpperCase();
    }

    // Decode peer ID from room code
    decodePeerId(roomCode) {
        // In real implementation, you'd need to store full peer IDs
        // For now, we'll use the room code as-is (lowercase)
        return roomCode.toLowerCase();
    }

    // Update player list UI
    updatePlayerList() {
        const playerListDiv = document.getElementById('onlinePlayers');
        if (!playerListDiv) return;

        let html = `<div>👤 ${player.name} (Bạn)</div>`;
        
        this.remotePlayers.forEach((playerData, peerId) => {
            html += `<div>👤 ${playerData.name}</div>`;
        });

        playerListDiv.innerHTML = html;
    }

    // Disconnect
    disconnect() {
        this.stopUpdates();
        
        this.connections.forEach(conn => {
            conn.close();
        });
        
        if (this.peer) {
            this.peer.destroy();
        }

        this.connections.clear();
        this.remotePlayers.clear();
        this.isHost = false;
        this.roomCode = null;
    }

    // Get all players (local + remote)
    getAllPlayers() {
        const players = [player];
        
        this.remotePlayers.forEach((playerData, peerId) => {
            // Create temporary snake object for rendering
            const remoteSnake = {
                x: playerData.x,
                y: playerData.y,
                segments: playerData.segments,
                name: playerData.name,
                score: playerData.score,
                kills: playerData.kills,
                skin: playerData.skin || SKINS[0],
                color: playerData.skin?.colors[0] || '#FF6B6B',
                isPlayer: false,
                activePowerups: playerData.activePowerups || [],
                trail: [],
                draw: Snake.prototype.draw,
                hasPowerup: Snake.prototype.hasPowerup
            };
            
            players.push(remoteSnake);
        });

        return players;
    }
}

// Global multiplayer instance
let multiplayerManager = null;
let isMultiplayerMode = false;
