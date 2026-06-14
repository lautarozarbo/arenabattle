import { randomBytes } from 'node:crypto';

function genCode() {
  return randomBytes(3).toString('hex').toUpperCase(); // 6 chars A-F0-9
}

export class Room {
  constructor(code, mode, hostId) {
    this.code       = code;
    this.mode       = mode;        // '1v1' | '2v2relay'
    this.hostId     = hostId;
    this.players    = [];          // [{ws, userId, username, slot, powerId, skinId, ready}]
    this.state      = 'waiting';   // waiting | starting | playing | finished
    this.config     = { arenaSkin: 'default', abilitiesEnabled: false };
    this.maxPlayers = mode === '2v2relay' ? 4 : 2;
    this.createdAt  = Date.now();
  }

  addPlayer(ws, userId, username) {
    if (this.players.length >= this.maxPlayers) return false;
    if (this.players.find(p => p.userId === userId)) return false;
    this.players.push({
      ws, userId, username,
      slot: this.players.length,
      powerId: null, skinId: 'default', ready: false,
    });
    return true;
  }

  removePlayer(userId) {
    this.players = this.players.filter(p => p.userId !== userId);
    if (this.players.length > 0 && this.hostId === userId) {
      this.hostId = this.players[0].userId;
    }
    // Re-assign slots
    this.players.forEach((p, i) => { p.slot = i; });
  }

  getPlayer(userId) {
    return this.players.find(p => p.userId === userId);
  }

  setPlayerChar(userId, powerId, skinId) {
    const p = this.getPlayer(userId);
    if (p) { p.powerId = powerId; p.skinId = skinId ?? 'default'; }
  }

  setReady(userId, ready) {
    const p = this.getPlayer(userId);
    if (p) p.ready = ready;
  }

  allReady() {
    return (
      this.players.length >= 2 &&
      this.players.every(p => p.ready && p.powerId)
    );
  }

  broadcast(msg, excludeUserId = null) {
    const data = JSON.stringify(msg);
    for (const p of this.players) {
      if (p.userId === excludeUserId) continue;
      if (p.ws.readyState === 1) p.ws.send(data);
    }
  }

  sendTo(userId, msg) {
    const p = this.getPlayer(userId);
    if (p && p.ws.readyState === 1) p.ws.send(JSON.stringify(msg));
  }

  serialize() {
    return {
      code:    this.code,
      mode:    this.mode,
      hostId:  this.hostId,
      state:   this.state,
      config:  this.config,
      players: this.players.map(p => ({
        userId:   p.userId,
        username: p.username,
        slot:     p.slot,
        powerId:  p.powerId,
        skinId:   p.skinId,
        ready:    p.ready,
      })),
    };
  }
}

export class RoomManager {
  constructor() {
    this._rooms = new Map(); // code → Room
  }

  create(mode, hostId) {
    let code;
    do { code = genCode(); } while (this._rooms.has(code));
    const room = new Room(code, mode, hostId);
    this._rooms.set(code, room);
    return room;
  }

  get(code) {
    return this._rooms.get(String(code).toUpperCase());
  }

  delete(code) {
    this._rooms.delete(String(code).toUpperCase());
  }

  cleanup() {
    const now = Date.now();
    for (const [code, room] of this._rooms) {
      if (room.players.length === 0 && now - room.createdAt > 10 * 60 * 1000) {
        this._rooms.delete(code);
      }
    }
  }
}
