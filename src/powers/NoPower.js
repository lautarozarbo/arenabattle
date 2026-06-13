import { BasePower } from './BasePower.js';

export class NoPower extends BasePower {
  getHitDamage() { return 1; }

  static meta = {
    id: 'none',
    name: 'Básico',
    description: 'Combate directo. Sin habilidades especiales, daño puro por impacto.',
    color: '#4A90D9',
    icon: '●',
    dmgRating: 1,
  };
}
