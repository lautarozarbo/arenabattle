# Multiplayer Implementation Context
## Arena Battle — feat/multiplayer

---

## Stack existente

- **Frontend:** Vanilla JS + Canvas (sin frameworks)
- **Backend:** Supabase (PostgreSQL + Auth) — solo async persistencia, sin WebSocket
- **Auth:** Email/password via `supabase.auth`, sesión en localStorage `'arena-auth'`
- **Tablas Supabase:** `profiles`, `user_stats`, `user_rewards`, `friendships`
- **Friends system:** Ya existe — amigos por código de 8 chars, solicitudes, estado

**No hay WebSocket. Toda la simulación es client-side.**

---

## Arquitectura elegida: Servidor Autoritativo

El servidor Node.js corre la física. Los clientes mandan eventos de habilidad y renderizan el estado que reciben.

```
Cliente A ──► {type:'ability', a:'speed'} ──► Servidor Node.js
Cliente B ──► {type:'relay'}              ──►   (corre Game._update())
                                                    │
                                          broadcast estado cada ~50ms
                                                    │
              Cliente A ◄─────────────────────────┤
              Cliente B ◄──────────────────────────┘
```

### Por qué esto funciona bien para este juego
Los círculos se mueven solos — el jugador NO controla el movimiento.
Los únicos inputs son los 3 botones de habilidades (speed/heal/damage) + relay (2v2).
Son eventos discretos, fáciles de sincronizar.

---

## Modos multiplayer a implementar

1. **1v1** con habilidades activas
2. **2v2 Relevos** con habilidades activas

**Flujo:** crear sala → invitar amigo (via sistema existente) → lobby → jugar

---

## Fases de implementación

### Fase 1 — Servidor WebSocket + Sala
- Servidor Node.js con `ws` o `socket.io`
- Crear sala → código único (ej. 6 chars)
- Invitar amigo → via sistema de amigos existente en Supabase
- Lobby screen: slots de jugadores, elección de personaje/arena/habilidades
- Ready check → el servidor arranca el juego

### Fase 2 — Game.js en Node.js
- Copiar/adaptar `Game`, `Circle`, `Arena`, `BasePower` y todos los powers a Node
- Servidor corre `game.start()` → loop a 20 Hz (setInterval cada 50ms)
- Cada tick: broadcast del estado serializado a ambos clientes

### Fase 3 — Cliente recibe estado
- Cliente deja de llamar `game.start()` localmente
- Recibe estado por WebSocket → actualiza posiciones/HP → renderiza
- Interpolación entre ticks para suavizar el movimiento (lerp de posición)

### Fase 4 — Inputs de habilidades
- Botón habilidad → evento `{type:'ability', ability:'speed'}` al servidor
- Servidor llama `game.applyActiveBuff(type)` y lo refleja en siguiente tick
- Cooldown se maneja en servidor (cliente puede mostrar estimado local)

### Fase 5 — Relay 2v2
- Botón relay → evento `{type:'relay'}` al servidor
- Servidor llama `game.swapFighter(idx, newCfg)` → estado actualizado en siguiente tick
- TagTeamMatch.js ya existe y maneja toda la lógica de relevos

### Fase 6 — Robustez
- Timeout si jugador no responde (30s)
- Reconexión: snapshot del estado en servidor, cliente re-sincroniza
- Abandono: derrota automática

---

## Estado que se sincroniza por tick (~50ms)

```js
// Por cada circle en game.circles:
{
  x, y, vx, vy,
  hp, maxHp, isAlive,
  _speedBuffTimer,
  _dmgBuffTimer, _dmgBuffMult,
  _healHot,
  _poisonTimer, _bleedTimer, _slowTimer,
  _silenced, _invulnerable,
  _hitCooldown,
  // Power-specific state varía por personaje
}
```

Los campos de cosmética (color, label, skinId, charId) se mandan solo al inicio.

---

## APIs clave del motor (lo que el servidor necesita llamar)

```js
// game.js
game.start(cfgs, arenaOpts)     // Inicia partida
game._update(dt)                // Tick de física (llamar manualmente en servidor)
game.applyActiveBuff(type)      // 'speed' | 'heal' | 'damage'
game.swapFighter(idx, newCfg)   // Relay 2v2
game.state                      // 'idle' | 'playing' | 'gameover'
game.circles[]                  // Array de Circle (leer para serializar)
game.onGameOver(winner, idx)    // Callback al terminar

// circle.js
circle.x, circle.y, circle.vx, circle.vy
circle.hp, circle.maxHp, circle.isAlive
circle.applySpeedBuff(duration, mult)
circle.applyDamageBuff(duration, mult)
circle.applyHeal(hpPerSec, duration)
circle.takeDamage(amount)

// arena.js
arena.bounceCircle(circle)
arena.bounceCircleOffObstacles(circle)
```

---

## Formato de config de pelea

```js
// cfgs: array de fighter configs
const cfg = {
  x, y, vx, vy,
  powerId: 'saw',         // ID del personaje
  hp: 100,
  radius: 28,
  color: '#ff4444',
  label: 'Jugador',
  skinId: 'default',
  teamId: 0,              // 0 = equipo jugador, 1 = enemigo, null = FFA
}

// arenaOpts
const arenaOpts = {
  obstacles: [{x, y, r}],  // normalizados 0-1
  skinId: 'default',
  activeAbilities: true,
  hideDeadCircles: false,
}
```

---

## Sistema de habilidades activas

```js
// main.js (constantes)
const _ABILITY_CD     = { speed: 18, heal: 20, damage: 18 }  // cooldown en seg
const _BUFF_DURATION  = { speed: 5,  heal: 4,  damage: 5  }  // duración en seg

// Efectos
applySpeedBuff(5, 1.7)   // 5 seg, 1.7x velocidad
applyDamageBuff(5, 2.5)  // 5 seg, 2.5x daño
applyHeal(5, 4)          // +5 HP/seg por 4 seg = +20 HP máx

// Cooldown empieza DESPUÉS de que termina el buff
```

---

## Sistema de relevos (TagTeam)

```js
// src/modes/TagTeam.js
new TagTeamMatch(team0Metas, team1Metas)

match.doTag(team, currentHp)     // Hacer relevo
match.canTag(team)               // Si pasó el cooldown (8 seg)
match.shouldAiTag()              // Decisión de IA (HP < 30%: 85%, else: 60%)
match.isOver()                   // Si terminó
match.winnerTeam()               // 0 | 1 | -1

// El servidor usa TagTeamMatch para la lógica de relay
// Game.swapFighter(idx, newCfg) para cambiar el luchador activo en la arena
```

---

## Lobby UI — qué hay que crear

### Screens nuevas en index.html
- `#screen-online-menu` — entrada al modo online (crear sala / unirse)
- `#screen-online-lobby` — sala esperando jugadores, slots, config
- `#screen-online-char-select` — selección de personaje en modo online
- `#screen-online-result` — resultado de partida online

### Datos de sala (servidor)
```js
{
  roomCode: '4A7B2C',
  mode: '1v1' | '2v2relay',
  players: [
    { userId, username, friendCode, ready, powerId, skinId },
    ...
  ],
  arenaLayout: 'open',
  arenaSkin: 'default',
  abilitiesEnabled: true,
  state: 'waiting' | 'starting' | 'playing' | 'finished',
}
```

---

## Sistema de amigos existente (para invitar)

```js
// src/social/friends.js
// Amigos por código de 8 chars (profiles.friend_code)
// Tabla friendships: requester_id, addressee_id, status ('pending'|'accepted')

// Para invitar a partida online:
// Opción A: mandar notificación via Supabase realtime subscription
// Opción B: el amigo entra con el código de sala manualmente
// Opción C: agregar campo 'pending_invite' en tabla profiles
```

---

## Powers — consideraciones para servidor

Cada power tiene estado interno (proyectiles, zonas, timers). Para el servidor autoritativo:
- El servidor crea las instancias de power igual que el cliente
- Corre `power.update(dt)`, `power.onCollide()`, `power.onEnemyFrame()` en servidor
- El estado de los proyectiles/efectos se serializa y manda al cliente para renderizar

Powers con más estado interno a sincronizar:
- `RocketPower` — proyectil en vuelo (posición, velocidad)
- `LaserPower` — rayo activo (ángulo, duración)
- `SpiderPower` — telarañas en arena (posiciones)
- `TurretPower` — torreta en arena (posición, ángulo, HP)
- `PortalPower` — portales en arena (posiciones)
- `HotPotatoPower` — quién tiene la bomba, timer
- `ClusterBombPower` — bombas en vuelo

---

## Lo que NO hay que cambiar en el cliente

La clase `Game`, `Circle`, `Arena`, `BasePower` y todos los powers quedan igual.
El cliente los sigue usando para RENDERIZAR (no para simular).
Solo se agrega una capa de WebSocket que reemplaza el `game.start()` local.

---

## Estructura de archivos nueva (a crear)

```
src/
  multiplayer/
    socket.js          -- Cliente WebSocket, envía/recibe mensajes
    roomUI.js          -- UI de sala (crear, unirse, lobby)
    onlineGame.js      -- Overrides el loop local para recibir estado del servidor
    serializer.js      -- Serializa/deserializa estado de circles y powers

server/               -- (repo separado o carpeta del proyecto)
  index.js            -- Entry point Node.js + WebSocket
  room.js             -- Gestión de salas
  gameRunner.js       -- Corre Game._update() en servidor
  serializer.js       -- Misma lógica de serialización
```

---

## Próximos pasos concretos

1. **Crear servidor Node.js** con ws/socket.io + sistema de salas en memoria
2. **Crear pantalla de lobby** en index.html con crear sala y unirse por código
3. **Serializar estado** de Game en servidor y deserializarlo en cliente
4. **Conectar inputs** de habilidades: botón → WebSocket → servidor → aplica
5. **Conectar relay** para 2v2: botón relay → WebSocket → servidor → swapFighter
6. **Integrar con amigos**: poder invitar desde panel de amigos a una sala

---

_Rama: feat/multiplayer | Creado: 2026-06-14_
