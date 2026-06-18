// ─── POWER REGISTRY ───────────────────────────────────────────────────────────
// To add a new power:
//   1. Create MyPower.js extending BasePower
//   2. Import it below and add it to POWERS
//   Nothing else needs to change.
// ──────────────────────────────────────────────────────────────────────────────

import { NoPower        } from './NoPower.js';
import { SawPower       } from './SawPower.js';
import { SpiderPower    } from './SpiderPower.js';
import { TerritoryPower } from './TerritoryPower.js';
import { SpikePower     } from './SpikePower.js';
import { LaserPower     } from './LaserPower.js';
import { RocketPower    } from './RocketPower.js';
import { ChessPower     } from './ChessPower.js';
import { ElectricPower  } from './ElectricPower.js';
import { VenomPower     } from './VenomPower.js';
import { GridPower      } from './GridPower.js';
import { DuoPower       } from './DuoPower.js';
import { VampirePower   } from './VampirePower.js';
import { GlassPower     } from './GlassPower.js';
import { TrampPower     } from './BombPower.js';
import { AssassinPower  } from './AssassinPower.js';
import { MagePower      } from './MagePower.js';
import { PulsarPower    } from './PulsarPower.js';
import { VolcanoPower      } from './VolcanoPower.js';
import { ToxicTrailPower  } from './ToxicTrailPower.js';
import { CactusPower      } from './CactusPower.js';
import { BloodShardPower  } from './BloodShardPower.js';
import { ChromaticPower   } from './ChromaticPower.js';
import { ClockPower       } from './ClockPower.js';
import { AuraPower        } from './AuraPower.js';
import { AngelPower       } from './AngelPower.js';
import { ParasitePower    } from './ParasitePower.js';
import { TerremotoPower   } from './TerremotoPower.js';
import { WallCursePower   } from './WallCursePower.js';
import { MomentumPower    } from './MomentumPower.js';
import { CrystalBeamPower } from './CrystalBeamPower.js';
import { TurretPower      } from './TurretPower.js';
import { HotPotatoPower   } from './HotPotatoPower.js';
import { ClusterBombPower } from './ClusterBombPower.js';
import { TortugaPower         } from './TortugaPower.js';
import { ReflectShieldPower  } from './ReflectShieldPower.js';
import { ApostadorPower      } from './ApostadorPower.js';
import { AlienPower          } from './AlienPower.js';
import { NinjaPower          } from './NinjaPower.js';
import { FenixPower          } from './FenixPower.js';
import { ArcherPower         } from './ArcherPower.js';
import { BoomerangPower      } from './BoomerangPower.js';
import { PortalPower         } from './PortalPower.js';
import { KarmaPower          } from './KarmaPower.js';
import { DiminutoPower         } from './DiminutoPower.js';
import { DomainExpansionPower } from './DomainExpansionPower.js';

const POWERS = [
  NoPower,
  SawPower,
  SpiderPower,
  TerritoryPower,
  SpikePower,
  LaserPower,
  RocketPower,
  ChessPower,
  ElectricPower,
  VenomPower,
  GridPower,
  DuoPower,
  VampirePower,
  GlassPower,
  TrampPower,
  AssassinPower,
  MagePower,
  PulsarPower,
  VolcanoPower,
  ToxicTrailPower,
  CactusPower,
  BloodShardPower,
  ChromaticPower,
  ClockPower,
  AuraPower,
  AngelPower,
  ParasitePower,
  TerremotoPower,
  WallCursePower,
  MomentumPower,
  CrystalBeamPower,
  TurretPower,
  HotPotatoPower,
  ClusterBombPower,
  TortugaPower,
  ReflectShieldPower,
  ApostadorPower,
  AlienPower,
  NinjaPower,
  FenixPower,
  ArcherPower,
  BoomerangPower,
  PortalPower,
  KarmaPower,
  DiminutoPower,
  DomainExpansionPower,
];

export const PowerRegistry = Object.fromEntries(POWERS.map(P => [P.meta.id, P]));

export function createPower(id, owner) {
  const Cls = PowerRegistry[id] ?? NoPower;
  return new Cls(owner);
}

const CATEGORIES = {
  "Cuerpo a cuerpo": ["none", "saw", "assassin", "momentum", "electric", "vampire", "venom", "parasite", "hotpotato", "tortuga", "reflectshield", "karma", "diminuto"],
  "Proyectiles":     ["rocket", "bloodshard", "clusterbomb", "fenix", "crystalbeam", "volcano", "ninja", "angel", "archer", "boomerang"],
  "Control de zona": ["spider", "territory", "spike", "grid", "chromatic", "toxictrail", "glass", "aura", "earthquake", "cursedwall", "portal", "domainexpansion", "laser"],
  "Invocación":      ["cactus", "duo", "chess", "turret", "alien", "bomb", "mage", "pulsar", "apostador", "clock"],
};

const _idToCategory = Object.fromEntries(
  Object.entries(CATEGORIES).flatMap(([cat, ids]) => ids.map(id => [id, cat]))
);

export const POWER_CATEGORIES = Object.keys(CATEGORIES);

export function getAllPowerMetas() {
  return POWERS.map(P => ({ ...P.meta, category: _idToCategory[P.meta.id] ?? "Cuerpo a cuerpo" }));
}
