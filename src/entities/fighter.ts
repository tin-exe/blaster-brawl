import { CONFIG } from '../config';
import type { Fighter, FighterController, FighterId, HatStyle, MarkerShape } from '../types';
import type { GameSettings } from '../storage/settings';

export interface SpawnPoint { x: number; y: number }
export interface FighterOptions {
  controller?: FighterController;
  playerSlot?: 1 | 2 | null;
  displayName?: string;
  markerNumber?: number;
  markerShape?: MarkerShape;
  color?: string;
  hat?: HatStyle;
  stocks?: number;
}

export function createFighter(id: FighterId, spawn: SpawnPoint, settings: GameSettings, options: FighterOptions = {}): Fighter {
  const defaultPlayerSlot: 1 | 2 | null = id === 'human' ? 1 : id === 'player2' ? 2 : null;
  const playerSlot = options.playerSlot === undefined ? defaultPlayerSlot : options.playerSlot;
  const controller = options.controller ?? (playerSlot === null ? 'bot' : 'human');
  const fallbackName = playerSlot === 1 ? 'Player 1' : playerSlot === 2 ? 'Player 2' : `Bot ${id === 'bot' ? 1 : id === 'bot2' ? 2 : 3}`;
  const markerNumber = options.markerNumber ?? (playerSlot ?? (id === 'bot' ? 3 : id === 'bot2' ? 4 : 5));
  const markerShape = options.markerShape ?? CONFIG.fighters.markerShapes[Math.min(markerNumber - 1, CONFIG.fighters.markerShapes.length - 1)] ?? 'circle';
  const defaultColor = playerSlot === 1
    ? CONFIG.fighters.colorways[settings.colorIndex]
    : CONFIG.fighters.colorways[Math.min(markerNumber - 1, CONFIG.fighters.colorways.length - 1)];
  const hat = options.hat ?? (playerSlot === 1 ? CONFIG.fighters.hatStyles[settings.hatIndex] : controller === 'bot' ? 'cowboy' : 'cap');
  return {
    id,
    controller,
    playerSlot,
    displayName: options.displayName ?? fallbackName,
    markerNumber,
    markerShape,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    width: CONFIG.fighters.width,
    height: CONFIG.fighters.height,
    facing: spawn.x < CONFIG.world.width * 0.5 ? 1 : -1,
    grounded: false,
    jumpsUsed: 0,
    stocks: options.stocks ?? CONFIG.fighters.stocks,
    weapon: 'pistol',
    ammo: {
      pistol: CONFIG.weapons.pistol.ammo,
      shotgun: CONFIG.weapons.shotgun.ammo,
      rocket: CONFIG.weapons.rocket.ammo,
      railgun: CONFIG.weapons.railgun.ammo,
    },
    fireCooldown: 0,
    shootTimer: 0,
    hitTimer: 0,
    invulnerable: 0,
    respawnTimer: 0,
    dead: false,
    hat: hat ?? 'cap',
    color: options.color ?? defaultColor ?? CONFIG.fighters.colorways[0],
    botThinkTimer: 0,
    botJumpCooldown: 0,
    botAimOffset: 0,
    animationTime: 0,
    contactCooldown: 0,
    shieldTime: 0,
    overdriveTime: 0,
  };
}

export function respawnFighter(fighter: Fighter, spawn: SpawnPoint): void {
  fighter.x = spawn.x;
  fighter.y = spawn.y;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.facing = fighter.x < CONFIG.world.width * 0.5 ? 1 : -1;
  fighter.grounded = false;
  fighter.jumpsUsed = 0;
  fighter.weapon = 'pistol';
  fighter.ammo = {
    pistol: CONFIG.weapons.pistol.ammo,
    shotgun: CONFIG.weapons.shotgun.ammo,
    rocket: CONFIG.weapons.rocket.ammo,
    railgun: CONFIG.weapons.railgun.ammo,
  };
  fighter.fireCooldown = 0;
  fighter.shootTimer = 0;
  fighter.hitTimer = 0;
  fighter.invulnerable = CONFIG.fighters.invulnerabilitySeconds;
  fighter.respawnTimer = 0;
  fighter.dead = false;
  fighter.contactCooldown = 0;
  fighter.shieldTime = 0;
  fighter.overdriveTime = 0;
}
