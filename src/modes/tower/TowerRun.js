/**
 * TowerRun — immutable-ish state of a single infinite-tower run.
 * Everything that needs to persist across floors lives here.
 * No DOM or game references; pure data.
 */
export class TowerRun {
  /**
   * @param {object} powerMeta  — the full meta object of the chosen power
   * @param {string} category   — "Cuerpo a cuerpo" | "Proyectiles" | "Control de zona" | "Invocación"
   */
  constructor(powerMeta, category) {
    this.powerMeta  = powerMeta;
    this.category   = category;
    this.floor      = 0;          // incremented BEFORE each fight
    this.upgrades   = [];         // list of applied upgrade ids (for history/display)

    // Accumulated stat multipliers applied to the player circle each fight
    this.playerMods = {
      hpBonus:        0,   // flat HP added to base 100
      dmgAdd:         0,   // flat bonus added to all power ability damage
      speedMult:      1.0, // multiplier on base speed
      regenPerSec:    0,   // HP regen per second during fight
      contactDmgAdd:  0,   // added to body-collision hit damage
      bleedPerSec:    0,   // HP/s bleed applied to enemy on contact
      contactSlow:    0,   // fraction slow applied to enemy on contact (0.1 = 10%)
    };

    // Power-specific mods — read by powers that support them via this.owner
    this.powerMods  = {
      cdMult:           1.0,  // cooldown multiplier (<1 = faster)
      extraProjectile:  0,    // extra bullets/rays/things per activation
      extraPlacement:   0,    // extra map-placed items (webs, shards, lasers…)
      zoneDurationMult: 1.0,  // multiplier on zone/trail/element lifetime
    };
  }

  get isAlive() { return true; }

  /** Advance to the next floor. Returns the new floor number. */
  nextFloor() {
    this.floor++;
    return this.floor;
  }

  /** Record a chosen upgrade id for history. */
  applyUpgrade(upgradeId) {
    this.upgrades.push(upgradeId);
  }
}
