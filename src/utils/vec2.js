export const vec2 = {
  add:  (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub:  (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  scale:(v, s) => ({ x: v.x * s,   y: v.y * s   }),
  dot:  (a, b) => a.x * b.x + a.y * b.y,
  len:  (v)    => Math.sqrt(v.x * v.x + v.y * v.y),
  norm: (v)    => { const l = Math.sqrt(v.x*v.x + v.y*v.y) || 1; return { x: v.x/l, y: v.y/l }; },
  dist: (a, b) => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2),
};
