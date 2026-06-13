import { sfx } from '../audio/index.js';
import { drawArenaBg, drawArenaObstacle } from '../skins/arenaSkins.js';

export class Arena {
  constructor({ x, y, width, height, obstacles = [], skinId = 'default' }) {
    this.x = x;
    this.y = y;
    this.width  = width;
    this.height = height;
    this.obstacles = obstacles; // [{ cx, cy, r }] absolute px
    this.skinId = skinId;
  }

  get left()   { return this.x; }
  get right()  { return this.x + this.width; }
  get top()    { return this.y; }
  get bottom() { return this.y + this.height; }

  // Returns the wall normal if a wall bounce happened, null otherwise.
  bounceCircle(circle) {
    const n = { x: 0, y: 0 };
    let hit = false;

    if (circle.x - circle.radius < this.left) {
      circle.x  = this.left + circle.radius;
      circle.vx = Math.abs(circle.vx);
      n.x = 1; hit = true;
    } else if (circle.x + circle.radius > this.right) {
      circle.x  = this.right - circle.radius;
      circle.vx = -Math.abs(circle.vx);
      n.x = -1; hit = true;
    }

    if (circle.y - circle.radius < this.top) {
      circle.y  = this.top + circle.radius;
      circle.vy = Math.abs(circle.vy);
      n.y = 1; hit = true;
    } else if (circle.y + circle.radius > this.bottom) {
      circle.y  = this.bottom - circle.radius;
      circle.vy = -Math.abs(circle.vy);
      n.y = -1; hit = true;
    }

    if (hit) {
      circle.power.onWallBounce(n);
      sfx.wallBounce();
      return n;
    }
    return null;
  }

  // Bounce circle off all circular obstacles. Skipped if circle._passesObstacles.
  bounceCircleOffObstacles(circle) {
    if (circle._passesObstacles || this.obstacles.length === 0) return;
    for (const obs of this.obstacles) {
      const dx = circle.x - obs.cx;
      const dy = circle.y - obs.cy;
      const distSq = dx * dx + dy * dy;
      const minDist = circle.radius + obs.r;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist < 0.001) {
          // Exactly on center — push in +x direction
          circle.x += minDist;
          continue;
        }
        const nx = dx / dist, ny = dy / dist;
        // Push circle out of obstacle
        circle.x = obs.cx + nx * minDist;
        circle.y = obs.cy + ny * minDist;
        // Reflect velocity along normal
        const dot = circle.vx * nx + circle.vy * ny;
        if (dot < 0) { // only if moving into obstacle
          circle.vx -= 2 * dot * nx;
          circle.vy -= 2 * dot * ny;
        }
        circle.power.onObstacleBounce({ x: nx, y: ny });
        sfx.wallBounce();
      }
    }
  }

  // Push circle out of any obstacle it overlaps (no bounce, just reposition).
  // Used after a relay swap where the spawned circle may land inside an obstacle.
  pushOutOfObstacles(circle) {
    for (const obs of this.obstacles) {
      const dx = circle.x - obs.cx;
      const dy = circle.y - obs.cy;
      const distSq = dx * dx + dy * dy;
      const minDist = circle.radius + obs.r;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist < 0.001) {
          circle.x = obs.cx + minDist;
        } else {
          circle.x = obs.cx + (dx / dist) * minDist;
          circle.y = obs.cy + (dy / dist) * minDist;
        }
      }
    }
  }

  render(ctx) {
    drawArenaBg(ctx, this.x, this.y, this.width, this.height, this.skinId);
    for (const obs of this.obstacles) {
      drawArenaObstacle(ctx, obs.cx, obs.cy, obs.r, this.skinId);
    }
  }
}
