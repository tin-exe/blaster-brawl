import type { WeaponId } from './config';

export type FighterId = 'human' | 'player2' | 'bot' | 'bot2' | 'bot3';
export type FighterController = 'human' | 'bot';
export type DifficultyLevel = 'easy' | 'normal' | 'hard';
export type MatchMode = 'versus' | 'ffa' | 'local' | 'duoBots' | 'survival';
export type PowerUpId = 'shield' | 'overdrive';
export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
export type HatStyle = 'cap' | 'cowboy' | 'crown';

export interface MatchConfig {
  mode: MatchMode;
  humanPlayers: 1 | 2;
  botCount: 0 | 1 | 2 | 3;
  difficulty: DifficultyLevel;
  stocks: number;
  weaponsEnabled: boolean;
}

export interface Fighter {
  id: FighterId;
  controller: FighterController;
  playerSlot: 1 | 2 | null;
  displayName: string;
  markerNumber: number;
  markerShape: MarkerShape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: -1 | 1;
  grounded: boolean;
  jumpsUsed: number;
  stocks: number;
  weapon: WeaponId;
  ammo: Record<WeaponId, number>;
  fireCooldown: number;
  shootTimer: number;
  hitTimer: number;
  invulnerable: number;
  respawnTimer: number;
  dead: boolean;
  hat: HatStyle;
  color: string;
  botThinkTimer: number;
  botJumpCooldown: number;
  botAimOffset: number;
  animationTime: number;
  contactCooldown: number;
  shieldTime: number;
  overdriveTime: number;
}

export interface Projectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  owner: FighterId;
  weapon: WeaponId;
  life: number;
  trailTimer: number;
  hitFighters?: FighterId[];
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  gravity: number;
  square: boolean;
}

export interface Pickup {
  active: boolean;
  x: number;
  y: number;
  weapon: WeaponId;
  powerUp: PowerUpId | null;
  phase: number;
  respawnTimer: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  shoot: boolean;
  switchPressed: boolean;
}

export interface InputFrame extends PlayerInput {
  player2: PlayerInput;
  pausePressed: boolean;
  menuUp: boolean;
  menuDown: boolean;
  menuAccept: boolean;
  menuBack: boolean;
  pointerX: number;
  pointerY: number;
  pointerPressed: boolean;
  pointerDown: boolean;
  pointerMoved?: boolean;
}

export interface BotObservation {
  selfX: number;
  selfY: number;
  targetX: number;
  targetY: number;
  selfGrounded: boolean;
  selfFacing: number;
  selfCanJump: boolean;
  distanceToEdge: number;
  edgeLookAhead: number;
  shootRange: number;
  preferredDistance: number;
  closeDistance: number;
  jumpTargetHeight: number;
  aggression: number;
}

export interface BotAction {
  move: -1 | 0 | 1;
  jump: boolean;
  shoot: boolean;
  aimAngle: number;
  targetId?: FighterId | null;
}
