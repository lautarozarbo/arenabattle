import { BasePower } from "./BasePower.js";

const COOLDOWN = 2;
const ANIM_DUR = 2;
const RESULT_DUR = 1.5;
const CARD_INTERVAL = 0.5; // s between card reveals

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

// European roulette wheel pocket order
const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED_NUMS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

// ── Card helpers ─────────────────────────────────────────────────────────────

function shuffleDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function bjTotal(cards) {
  let sum = 0,
    aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces++;
      sum += 11;
    } else if (["J", "Q", "K"].includes(c.rank)) {
      sum += 10;
    } else {
      sum += parseInt(c.rank);
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

function evalPoker(hand) {
  const ri = hand.map((c) => RANKS.indexOf(c.rank));
  const suits = hand.map((c) => c.suit);
  const cnt = {};
  for (const r of ri) cnt[r] = (cnt[r] || 0) + 1;
  const counts = Object.values(cnt).sort((a, b) => b - a);
  const flush = suits.every((s) => s === suits[0]);
  const sr = [...ri].sort((a, b) => a - b);
  const straight =
    sr.every((r, i) => i === 0 || r === sr[i - 1] + 1) ||
    (sr[0] === 0 && sr[1] === 1 && sr[2] === 2 && sr[3] === 3 && sr[4] === 12);

  if (flush && sr.join() === "8,9,10,11,12")
    return { name: "Royal Flush!", dmg: 50 };
  if (flush && straight) return { name: "Straight Flush", dmg: 42 };
  if (counts[0] === 4) return { name: "Póker", dmg: 35 };
  if (counts[0] === 3 && counts[1] === 2)
    return { name: "Full House", dmg: 28 };
  if (flush) return { name: "Color", dmg: 22 };
  if (straight) return { name: "Escalera", dmg: 18 };
  if (counts[0] === 3) return { name: "Trío", dmg: 14 };
  if (counts[0] === 2 && counts[1] === 2)
    return { name: "Doble Pareja", dmg: 10 };
  if (counts[0] === 2) return { name: "Pareja", dmg: 6 };
  return { name: "Carta Alta", dmg: 3 };
}

function rouletteDmg(n) {
  if (n === 0) return 22;
  if (n <= 6) return 4;
  if (n <= 12) return 8;
  if (n <= 18) return 12;
  if (n <= 24) return 16;
  if (n <= 30) return 18;
  return 20;
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCard(ctx, x, y, w, h, card, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = "rgba(255, 252, 235, 0.97)";
  ctx.fill();
  ctx.strokeStyle = "rgba(60, 40, 0, 0.8)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const isRed = card.suit === "♥" || card.suit === "♦";
  ctx.fillStyle = isRed ? "#bb1111" : "#111111";

  ctx.font = `bold ${Math.max(7, h * 0.21)}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(card.rank, x + w * 0.1, y + h * 0.05);

  ctx.font = `${Math.max(10, h * 0.36)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(card.suit, x + w / 2, y + h * 0.52);

  ctx.font = `${Math.max(6, h * 0.17)}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(card.suit, x + w * 0.92, y + h * 0.97);

  ctx.restore();
}

// ── Power ─────────────────────────────────────────────────────────────────────

export class ApostadorPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._cooldown = COOLDOWN * 0.4;
    this._animTimer = 0;
    this._resultTimer = 0;
    this._mode = null; // null | 'roulette' | 'blackjack' | 'poker'
    this._dmgPending = false;
    this._dmg = 0;
    this._label = "";

    // Roulette
    this._landedSlot = 0;
    this._rouletteNum = 0;

    // Blackjack / Poker
    this._hand = [];
    this._revealIdx = 0;
    this._bjTotal = 0;
    this._bjBust = false;
    this._bjBJ = false;
    this._pokerResult = null;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    if (this._mode === null) {
      this._cooldown -= dt;
      if (this._cooldown <= 0) this._startGame();
      return;
    }

    if (this._animTimer > 0) {
      this._animTimer -= dt;

      if (this._mode === "blackjack" || this._mode === "poker") {
        const elapsed = ANIM_DUR - this._animTimer;
        this._revealIdx = Math.min(
          this._hand.length,
          Math.floor(elapsed / CARD_INTERVAL) + 1,
        );
      }

      if (this._animTimer <= 0) {
        this._animTimer = 0;
        this._revealIdx = this._hand.length;
        this._computeResult();
        this._resultTimer = RESULT_DUR;
        this._dmgPending = true;
      }
      return;
    }

    if (this._resultTimer > 0) {
      this._resultTimer -= dt;
      if (this._resultTimer <= 0) {
        this._mode = null;
        this._cooldown = COOLDOWN;
      }
    }
  }

  _startGame() {
    const modes = ["roulette", "blackjack", "poker"];
    this._mode = modes[Math.floor(Math.random() * 3)];
    this._animTimer = ANIM_DUR;
    this._resultTimer = 0;
    this._dmgPending = false;
    this._hand = [];
    this._revealIdx = 0;
    this._dmg = 0;
    this._label = "";
    this._bjBust = false;
    this._bjBJ = false;
    this._pokerResult = null;

    if (this._mode === "roulette") {
      this._landedSlot = Math.floor(Math.random() * 37);
      this._rouletteNum = WHEEL[this._landedSlot];
    } else {
      const deck = shuffleDeck();
      if (this._mode === "blackjack") {
        this._hand.push(deck.pop(), deck.pop());
        while (bjTotal(this._hand) < 17 && this._hand.length < 8)
          this._hand.push(deck.pop());
      } else {
        for (let i = 0; i < 5; i++) this._hand.push(deck.pop());
      }
    }
  }

  _computeResult() {
    if (this._mode === "roulette") {
      this._dmg = rouletteDmg(this._rouletteNum);
      const col =
        this._rouletteNum === 0
          ? "Verde"
          : RED_NUMS.has(this._rouletteNum)
            ? "Rojo"
            : "Negro";
      this._label = `${this._rouletteNum} ${col}  ·  ${this._dmg} dmg`;
    } else if (this._mode === "blackjack") {
      this._bjTotal = bjTotal(this._hand);
      this._bjBJ = this._hand.length === 2 && this._bjTotal === 21;
      this._bjBust = this._bjTotal > 21;
      if (this._bjBJ) {
        this._dmg = 28;
        this._label = `Blackjack!  ·  ${this._dmg} dmg`;
      } else if (this._bjBust) {
        this._dmg = 2;
        this._label = `Pasado (${this._bjTotal})  ·  ${this._dmg} dmg`;
      } else if (this._bjTotal === 21) {
        this._dmg = 21;
        this._label = `21  ·  ${this._dmg} dmg`;
      } else if (this._bjTotal >= 20) {
        this._dmg = 15;
        this._label = `${this._bjTotal}  ·  ${this._dmg} dmg`;
      } else if (this._bjTotal >= 18) {
        this._dmg = 10;
        this._label = `${this._bjTotal}  ·  ${this._dmg} dmg`;
      } else if (this._bjTotal >= 15) {
        this._dmg = 6;
        this._label = `${this._bjTotal}  ·  ${this._dmg} dmg`;
      } else {
        this._dmg = 3;
        this._label = `${this._bjTotal}  ·  ${this._dmg} dmg`;
      }
    } else {
      this._pokerResult = evalPoker(this._hand);
      this._dmg = this._pokerResult.dmg;
      this._label = `${this._pokerResult.name}  ·  ${this._dmg} dmg`;
    }
  }

  // ── Enemy interactions ───────────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive || !this._dmgPending) return;
    this._dmgPending = false;
    this._dealDmg(enemy, this._dmg);
  }

  clearState() {
    this._cooldown = COOLDOWN * 0.4;
    this._animTimer = 0;
    this._resultTimer = 0;
    this._mode = null;
    this._dmgPending = false;
    this._hand = [];
    this._revealIdx = 0;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (!this.arena || this._mode === null) return;

    const a = this.arena;
    const cx = (a.left + a.right) / 2;
    const cy = (a.top + a.bottom) / 2;
    const W = a.right - a.left;
    const H = a.bottom - a.top;

    // Fade in at start, fade out at end of result
    let baseAlpha = 1;
    if (this._animTimer > 0) {
      baseAlpha = Math.min(1, (ANIM_DUR - this._animTimer) / 0.35);
    } else if (this._resultTimer > 0) {
      baseAlpha = Math.min(1, this._resultTimer / 0.35);
    }

    // Dark arena overlay
    ctx.save();
    ctx.fillStyle = `rgba(5, 5, 20, ${0.4 * baseAlpha})`;
    ctx.fillRect(a.left, a.top, W, H);
    ctx.restore();

    // Mode title
    const titles = {
      roulette: "⊙ Ruleta",
      blackjack: "◈ Blackjack",
      poker: "♠ Poker",
    };
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.min(16, W * 0.038)}px monospace`;
    ctx.fillStyle = `rgba(255,215,0,${0.6 * baseAlpha})`;
    ctx.fillText(titles[this._mode], cx, a.top + 15);
    ctx.restore();

    if (this._mode === "roulette") {
      this._renderRoulette(ctx, cx, cy, W, H, baseAlpha);
    } else {
      this._renderCards(ctx, cx, cy, W, H, baseAlpha);
    }

    // Result label shown after animation ends
    if (this._resultTimer > 0 && this._label) {
      this._renderLabel(ctx, cx, cy, W, H, baseAlpha);
    }
  }

  _renderRoulette(ctx, cx, cy, W, H, baseAlpha) {
    const wR = Math.min(W, H) * 0.29;
    const sec = (Math.PI * 2) / 37;

    // Outer rim ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, wR + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200,175,80,${0.55 * baseAlpha})`;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Wheel sectors
    for (let i = 0; i < 37; i++) {
      const num = WHEEL[i];
      const start = -Math.PI / 2 + i * sec;
      const end = start + sec;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, wR, start, end);
      ctx.closePath();
      ctx.fillStyle =
        num === 0
          ? `rgba(0,140,0,${0.72 * baseAlpha})`
          : RED_NUMS.has(num)
            ? `rgba(160,20,20,${0.72 * baseAlpha})`
            : `rgba(12,12,12,${0.72 * baseAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(200,175,80,${0.3 * baseAlpha})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }

    // Number labels on sectors
    ctx.save();
    const fontSize = Math.max(6, wR * 0.09);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 37; i++) {
      const midA = -Math.PI / 2 + (i + 0.5) * sec;
      const lr = wR * 0.77;
      ctx.fillStyle = `rgba(255,255,255,${0.82 * baseAlpha})`;
      ctx.fillText(
        String(WHEEL[i]),
        cx + Math.cos(midA) * lr,
        cy + Math.sin(midA) * lr,
      );
    }
    ctx.restore();

    // Inner felt circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, wR * 0.27, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,85,0,${0.55 * baseAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(200,175,80,${0.45 * baseAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Winning sector highlight (result phase)
    if (this._resultTimer > 0) {
      ctx.save();
      const ra = -Math.PI / 2 + this._landedSlot * sec;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, wR, ra, ra + sec);
      ctx.closePath();
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 220));
      ctx.fillStyle = `rgba(255,215,0,${0.35 * pulse * baseAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,215,0,${0.9 * baseAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Ball — easeOut spiral from 6 full rotations behind target to landing
    const targetAngle = -Math.PI / 2 + (this._landedSlot + 0.5) * sec;
    let ballAngle;
    if (this._animTimer > 0) {
      const frac = 1 - this._animTimer / ANIM_DUR;
      const eased = 1 - Math.pow(1 - frac, 2.5);
      ballAngle = targetAngle - 6 * Math.PI * 2 + eased * 6 * Math.PI * 2;
    } else {
      ballAngle = targetAngle;
    }
    const bx = cx + Math.cos(ballAngle) * wR * 0.89;
    const by = cy + Math.sin(ballAngle) * wR * 0.89;

    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(3, wR * 0.038), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.95 * baseAlpha})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(255,255,255,0.8)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Damage legend — two vertical columns flanking the wheel
    const LEFT_ZONES = [
      { label: "0", color: "rgba(0,140,0,0.85)", dmg: 22 },
      { label: "1-6", color: "rgba(155,20,20,0.85)", dmg: 4 },
      { label: "7-12", color: "rgba(18,18,18,0.85)", dmg: 8 },
      { label: "13-18", color: "rgba(155,20,20,0.85)", dmg: 12 },
    ];
    const RIGHT_ZONES = [
      { label: "19-24", color: "rgba(18,18,18,0.85)", dmg: 16 },
      { label: "25-30", color: "rgba(155,20,20,0.85)", dmg: 18 },
      { label: "31-36", color: "rgba(18,18,18,0.85)", dmg: 20 },
    ];

    const chipH = Math.max(16, wR * 0.145);
    const chipFS = Math.max(9, wR * 0.105);
    const vGap = 4;
    const pad = 10; // horizontal distance from wheel rim

    const drawColumn = (zones, rightEdgeX, anchorCY) => {
      ctx.save();
      ctx.font = `bold ${chipFS}px monospace`;
      // Fixed chip width wide enough for the longest label
      const chipW = Math.max(
        ...zones.map((z) => ctx.measureText(`${z.label}  ${z.dmg}`).width + 16),
      );
      const totalH = zones.length * chipH + (zones.length - 1) * vGap;
      let ry = anchorCY - totalH / 2;
      ctx.globalAlpha = baseAlpha * 0.88;
      for (const z of zones) {
        const rx = rightEdgeX - chipW;
        roundRect(ctx, rx, ry, chipW, chipH, 3);
        ctx.fillStyle = z.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(200,175,80,0.40)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(z.label, rx + 7, ry + chipH / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,215,0,0.95)";
        ctx.fillText(String(z.dmg), rx + chipW - 7, ry + chipH / 2);
        ry += chipH + vGap;
      }
      ctx.restore();
    };

    drawColumn(LEFT_ZONES, cx - wR - pad, cy);
    // Right column: left-aligned so flip the logic — use leftEdgeX
    const drawRightColumn = (zones, leftEdgeX, anchorCY) => {
      ctx.save();
      ctx.font = `bold ${chipFS}px monospace`;
      const chipW = Math.max(
        ...zones.map((z) => ctx.measureText(`${z.label}  ${z.dmg}`).width + 16),
      );
      const totalH = zones.length * chipH + (zones.length - 1) * vGap;
      let ry = anchorCY - totalH / 2;
      ctx.globalAlpha = baseAlpha * 0.88;
      for (const z of zones) {
        roundRect(ctx, leftEdgeX, ry, chipW, chipH, 3);
        ctx.fillStyle = z.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(200,175,80,0.40)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(z.label, leftEdgeX + 7, ry + chipH / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,215,0,0.95)";
        ctx.fillText(String(z.dmg), leftEdgeX + chipW - 7, ry + chipH / 2);
        ry += chipH + vGap;
      }
      ctx.restore();
    };
    drawRightColumn(RIGHT_ZONES, cx + wR + pad, cy);
  }

  _renderCards(ctx, cx, cy, W, H, baseAlpha) {
    const total = this._hand.length;
    const cardW = Math.min(60, ((W - 40) / Math.max(total, 5)) * 0.88);
    const cardH = cardW * 1.52;
    const gap = cardW * 0.14;
    const totalW = total * cardW + (total - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = cy - cardH / 2;

    // Face-down placeholder slots
    for (let i = 0; i < total; i++) {
      const x = startX + i * (cardW + gap);
      ctx.save();
      ctx.globalAlpha = baseAlpha * 0.32;
      roundRect(ctx, x, startY, cardW, cardH, 4);
      ctx.fillStyle = "rgba(30,30,100,0.7)";
      ctx.fill();
      ctx.strokeStyle = "rgba(160,160,255,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Revealed cards
    for (let i = 0; i < this._revealIdx; i++) {
      const x = startX + i * (cardW + gap);
      // Bust tint for blackjack
      if (this._mode === "blackjack" && this._bjBust && this._resultTimer > 0) {
        ctx.save();
        ctx.globalAlpha = baseAlpha * 0.35;
        roundRect(ctx, x, startY, cardW, cardH, 4);
        ctx.fillStyle = "rgba(200,30,30,0.6)";
        ctx.fill();
        ctx.restore();
      }
      drawCard(ctx, x, startY, cardW, cardH, this._hand[i], baseAlpha);
    }

    // Running blackjack total below cards
    if (this._mode === "blackjack" && this._revealIdx > 0) {
      const running = bjTotal(this._hand.slice(0, this._revealIdx));
      const isBust = running > 21;
      ctx.save();
      ctx.globalAlpha = baseAlpha;
      ctx.font = `bold ${Math.max(12, cardH * 0.22)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isBust ? "rgba(255,80,80,0.95)" : "rgba(255,215,0,0.9)";
      ctx.fillText(String(running), cx, startY + cardH + 8);
      ctx.restore();
    }
  }

  _renderLabel(ctx, cx, cy, W, H, baseAlpha) {
    const wR = Math.min(W, H) * 0.29;
    const fy = this._mode === "roulette" ? cy + wR + 36 : cy + 90;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.min(17, W * 0.038)}px monospace`;
    const tw = ctx.measureText(this._label).width + 28;
    const th = 30;

    roundRect(ctx, cx - tw / 2, fy - th / 2, tw, th, 5);
    ctx.fillStyle = `rgba(0,0,0,${0.82 * baseAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,215,0,${0.88 * baseAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = `rgba(255,215,0,${baseAlpha})`;
    ctx.fillText(this._label, cx, fy);
    ctx.restore();
  }

  renderAbove(ctx) {
    if (this._mode !== null) return;
    const frac = Math.min(1, 1 - this._cooldown / COOLDOWN);
    if (frac <= 0.04) return;
    ctx.save();
    ctx.strokeStyle = `rgba(255,215,0,${0.3 + 0.6 * frac})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      this.owner.x,
      this.owner.y,
      this.owner.radius + 7,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * frac,
    );
    ctx.stroke();
    ctx.restore();
  }

  static meta = {
    id: "apostador",
    name: "Apostador",
    description:
      "Juega ruleta, blackjack o póker en la arena. El daño depende del resultado del juego.",
    color: "#D4AF37",
    icon: "◈",
    dmgRating: 2,
  };
}
