import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { RoomManager } from "./room.js";

const PORT = process.env.PORT ?? 3001;
const rooms = new RoomManager();

// ws → { userId, username, roomCode }
const connMeta = new Map();

// ── HTTP server (health check + WS upgrade) ───────────────────────────────────
const http = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Arena Battle Multiplayer Server\n");
});

const wss = new WebSocketServer({ server: http });

wss.on("connection", (ws, req) => {
  const ip = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress;
  console.log(`[WS] Conectado desde ${ip}`);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    _handle(ws, msg);
  });

  ws.on("close", () => {
    _onDisconnect(ws);
  });

  ws.on("error", (err) => console.error("[WS] Error:", err.message));

  // Heartbeat ping every 30s to detect stale connections
  ws._pingTimer = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.ping();
  }, 30_000);
});

// ── Disconnect handler ────────────────────────────────────────────────────────
function _onDisconnect(ws) {
  clearInterval(ws._pingTimer);
  const meta = connMeta.get(ws);
  if (!meta) return;
  const room = rooms.get(meta.roomCode);
  if (room) {
    room.removePlayer(meta.userId);
    if (room.players.length === 0) {
      rooms.delete(room.code);
      console.log(`[Room] Sala ${room.code} eliminada (vacía)`);
    } else {
      room.broadcast({ type: "player_left", room: room.serialize() });
    }
  }
  connMeta.delete(ws);
  console.log(`[WS] Desconectado: ${meta.username}`);
}

// ── Message router ────────────────────────────────────────────────────────────
function _handle(ws, msg) {
  const meta = connMeta.get(ws);

  switch (msg.type) {
    // ── Create room ──────────────────────────────────────────────────────────
    case "create_room": {
      const { userId, username, mode = "1v1" } = msg;
      if (!userId || !username) return _err(ws, "userId y username requeridos");
      if (!["1v1", "2v2relay"].includes(mode)) return _err(ws, "Modo inválido");

      // Leave previous room if any
      if (meta) _leaveRoom(ws, meta);

      const room = rooms.create(mode, userId);
      room.addPlayer(ws, userId, username);
      connMeta.set(ws, { userId, username, roomCode: room.code });
      _send(ws, { type: "room_created", room: room.serialize() });
      console.log(`[Room] ${username} creó sala ${room.code} (${mode})`);
      break;
    }

    // ── Join room ────────────────────────────────────────────────────────────
    case "join_room": {
      const { userId, username, code } = msg;
      if (!userId || !username || !code) return _err(ws, "Faltan datos");
      const room = rooms.get(code);
      if (!room) return _err(ws, "Sala no encontrada");
      if (room.state !== "waiting") return _err(ws, "La partida ya empezó");
      if (!room.addPlayer(ws, userId, username)) return _err(ws, "Sala llena");

      if (meta) _leaveRoom(ws, meta);
      connMeta.set(ws, { userId, username, roomCode: room.code });
      _send(ws, { type: "room_joined", room: room.serialize() });
      room.broadcast({ type: "player_joined", room: room.serialize() }, userId);
      console.log(`[Room] ${username} se unió a sala ${room.code}`);
      break;
    }

    // ── Select character ─────────────────────────────────────────────────────
    case "select_char": {
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      room.setPlayerChar(meta.userId, msg.powerId, msg.skinId);
      // Auto-unready when char changes
      room.setReady(meta.userId, false);
      room.broadcast({ type: "room_updated", room: room.serialize() });
      break;
    }

    // ── Update arena config (host only) ─────────────────────────────────────
    case "update_config": {
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room || room.hostId !== meta.userId) return;
      if (msg.arenaSkin !== undefined) room.config.arenaSkin = msg.arenaSkin;
      if (msg.abilitiesEnabled !== undefined)
        room.config.abilitiesEnabled = msg.abilitiesEnabled;
      room.broadcast({ type: "room_updated", room: room.serialize() });
      break;
    }

    // ── Toggle ready ─────────────────────────────────────────────────────────
    case "set_ready": {
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      if (!room.getPlayer(meta.userId)?.powerId)
        return _err(ws, "Elegí un personaje primero");
      room.setReady(meta.userId, msg.ready ?? true);
      room.broadcast({ type: "room_updated", room: room.serialize() });
      // Host + all ready → start
      if (room.allReady()) {
        room.state = "playing";
        const config = _buildGameConfig(room);
        // Send personalized game_start so each client knows their own slot
        for (const p of room.players) {
          if (p.ws.readyState === 1) {
            p.ws.send(
              JSON.stringify({
                type: "game_start",
                config: { ...config, mySlot: p.slot },
              }),
            );
          }
        }
        console.log(`[Room] Sala ${room.code} iniciando partida`);
      }
      break;
    }

    // ── Leave room ───────────────────────────────────────────────────────────
    case "leave_room": {
      if (!meta) return;
      _leaveRoom(ws, meta);
      connMeta.delete(ws);
      break;
    }

    // ── In-game: game state broadcast (host → clients) ───────────────────────
    case "game_state": {
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room || room.state !== "playing") return;
      // Only host (slot 0) should send state
      const sender = room.getPlayer(meta.userId);
      if (!sender || sender.slot !== 0) return;
      room.broadcast({ type: "game_state", state: msg.state }, meta.userId);
      break;
    }

    // ── In-game: ability from non-host → forward to host ─────────────────────
    case "ability": {
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room || room.state !== "playing") return;
      const host = room.players.find((p) => p.slot === 0);
      if (host && host.ws.readyState === 1) {
        host.ws.send(
          JSON.stringify({
            type: "apply_ability",
            ability: msg.ability,
            fromSlot: msg.fromSlot ?? 1,
          }),
        );
      }
      break;
    }

    // ── In-game: game over (host signals end) ────────────────────────────────
    case "game_over": {
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      room.state = "finished";
      room.broadcast(
        { type: "net_game_over", winnerSlot: msg.winnerSlot },
        meta.userId,
      );
      console.log(
        `[Room] Sala ${room.code} terminó. Ganador slot ${msg.winnerSlot}`,
      );
      break;
    }

    // ── In-game: relay (2v2) ─────────────────────────────────────────────────
    case "relay": {
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room || room.state !== "playing") return;
      const host = room.players.find((p) => p.slot === 0);
      if (host && host.ws.readyState === 1) {
        host.ws.send(
          JSON.stringify({ type: "apply_relay", fromSlot: msg.fromSlot ?? 1 }),
        );
      }
      break;
    }

    default:
      console.log("[WS] Tipo desconocido:", msg.type);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function _err(ws, message) {
  _send(ws, { type: "error", message });
}

function _leaveRoom(ws, meta) {
  const room = rooms.get(meta.roomCode);
  if (!room) return;
  room.removePlayer(meta.userId);
  if (room.players.length === 0) {
    rooms.delete(room.code);
  } else {
    room.broadcast({ type: "player_left", room: room.serialize() });
  }
}

function _buildGameConfig(room) {
  return {
    mode: room.mode,
    arenaSkin: room.config.arenaSkin,
    abilitiesEnabled: room.config.abilitiesEnabled,
    players: room.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      slot: p.slot,
      powerId: p.powerId,
      skinId: p.skinId,
    })),
  };
}

// ── Cleanup stale rooms every 5 min ──────────────────────────────────────────
setInterval(() => rooms.cleanup(), 5 * 60 * 1000);

http.listen(PORT, () => {
  console.log(`Arena Battle Server en puerto ${PORT}`);
});
