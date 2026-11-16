import { CONFIG, SCENE } from '../config';
import type { ArenaDefinition, Fighter, HatStyle, Particle, Pickup, Platform, Projectile } from '../types';
import type { MatchScene } from '../scenes/match';
import type { GameSettings } from '../storage/settings';
import { matchModeLabel } from '../game/match-config';
import type { MatchConfig, MarkerShape } from '../types';
import { isHazardActiveAtTick } from '../game/content';
import type { BestOfThreeSnapshot } from '../game/best-of-three';
import { t } from '../i18n';

export type ScreenMode = (typeof SCENE)[keyof typeof SCENE];

export interface RenderState {
  screen: ScreenMode;
  match: MatchScene | null;
  settings: GameSettings;
  menuIndex: number;
  optionsIndex: number;
  gameOverIndex: number;
  pauseIndex: number;
  paused: boolean;
  elapsed: number;
  toast: string;
  toastTimer: number;
  customIndex: number;
  customConfig: MatchConfig;
  series: BestOfThreeSnapshot | null;
  lowQuality: boolean;
  touchMode: boolean;
  touchCapable: boolean;
  pointerDown: boolean;
  tutorialActive: boolean;
}

const INK = '#172137';
const PAPER = '#fff8df';
const DISPLAY = 'ui-rounded, system-ui, "Segoe UI", sans-serif';

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, fill = PAPER, align: CanvasTextAlign = 'left', stroke = 5, weight = 1000): void {
  ctx.save();
  ctx.font = `${weight} ${size}px ${DISPLAY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke;
  ctx.strokeStyle = INK;
  ctx.fillStyle = fill;
  ctx.strokeText(value, x, y);
  ctx.fillText(value, x, y);
  ctx.restore();
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill = 'rgba(22,31,50,0.96)'): void {
  roundedRectPath(ctx, x, y, width, height, 15);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#f5d58e';
  const rivets: readonly (readonly [number, number])[] = [[13, 12], [width - 13, 12], [13, height - 12], [width - 13, height - 12]];
  for (const [dx, dy] of rivets) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function polygon(ctx: CanvasRenderingContext2D, points: readonly [number, number][], fill: string): void {
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (point) ctx.lineTo(point[0], point[1]);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, cameraX: number, elapsed: number, lowQuality = false, arena: ArenaDefinition = CONFIG.world.arenas[0]): void {
  const parallaxX = lowQuality ? 0 : cameraX;
  const sky = ctx.createLinearGradient(0, 0, 0, CONFIG.canvas.height);
  sky.addColorStop(0, arena.skyTop);
  sky.addColorStop(0.62, '#c7f1f5');
  sky.addColorStop(1, arena.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

  ctx.fillStyle = '#fff6c7';
  ctx.beginPath();
  ctx.arc(770, 100, 43, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 4;
  ctx.stroke();

  if (!lowQuality) {
    const cloudOffset = (cameraX * CONFIG.world.parallax.far + elapsed * 9) % 560;
    for (let i = -1; i < 4; i += 1) {
      const x = i * 560 - cloudOffset + 80;
      const y = 88 + (i % 2) * 44;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(x, y, 49, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 19, y - 6, 17, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 5, y - 10, 21, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = -1; i < 5; i += 1) {
    const x = i * 360 - ((parallaxX * CONFIG.world.parallax.far) % 360);
    polygon(ctx, [[x - 190, 380], [x - 38, 205], [x + 27, 300], [x + 108, 225], [x + 258, 380]], '#9bc7ba');
    polygon(ctx, [[x - 145, 382], [x + 4, 255], [x + 100, 326], [x + 210, 245], [x + 325, 382]], '#80b6ad');
    polygon(ctx, [[x - 28, 215], [x - 4, 255], [x + 15, 238]], '#f7f0d5');
  }

  ctx.fillStyle = '#75a995';
  ctx.fillRect(0, 382, CONFIG.canvas.width, 158);
  ctx.fillStyle = '#5c987c';
  for (let x = -40; x < CONFIG.canvas.width + 120; x += 120) {
    const localX = x - ((parallaxX * CONFIG.world.parallax.near) % 120);
    ctx.beginPath();
    ctx.ellipse(localX, 383, 88, 22, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, ground: number, scale: number): void {
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(scale, scale);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(3, -78);
  ctx.moveTo(3, -56);
  ctx.lineTo(-25, -84);
  ctx.moveTo(3, -67);
  ctx.lineTo(33, -94);
  ctx.stroke();
  ctx.fillStyle = '#507e53';
  ctx.beginPath();
  ctx.ellipse(0, -84, 49, 14, 0, 0, Math.PI * 2);
  ctx.ellipse(-25, -91, 22, 9, -0.15, 0, Math.PI * 2);
  ctx.ellipse(31, -99, 25, 10, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHut(ctx: CanvasRenderingContext2D, x: number, ground: number): void {
  ctx.save();
  ctx.translate(x, ground);
  ctx.fillStyle = '#c98455';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.fillRect(-28, -40, 56, 40);
  ctx.strokeRect(-28, -40, 56, 40);
  polygon(ctx, [[-39, -38], [0, -72], [39, -38]], '#8b583f');
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#453c38';
  ctx.fillRect(-7, -22, 14, 22);
  ctx.restore();
}

function drawWorld(ctx: CanvasRenderingContext2D, cameraX: number, platforms: readonly Platform[], arena: ArenaDefinition): void {
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const x of [125, 625, 1015, 1430]) drawTree(ctx, x, 410, x > 1200 ? 0.86 : 1);
  for (const x of [370, 890, 1295]) drawHut(ctx, x, 415);

  for (const platform of platforms) {
    roundedRectPath(ctx, platform.x, platform.y, platform.width, platform.height, 10);
    ctx.fillStyle = arena.trim;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.stroke();
    roundedRectPath(ctx, platform.x - 2, platform.y - 9, platform.width + 4, 19, 9);
    ctx.fillStyle = arena.surface;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = arena.id === 'foundry' ? '#77768a' : arena.id === 'skyline' ? '#67829b' : '#a97952';
    for (let rock = 0; rock < Math.floor(platform.width / 48); rock += 1) {
      const rx = platform.x + 18 + rock * 47;
      ctx.beginPath();
      ctx.ellipse(rx, platform.y + 25 + (rock % 2) * 6, 14 + (rock % 3) * 2, 8, (rock % 2) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = arena.id === 'meadow' ? '#3f7b49' : arena.surface;
    ctx.lineWidth = 3;
    for (let tuft = 0; tuft < Math.floor(platform.width / 41); tuft += 1) {
      const tx = platform.x + 17 + tuft * 40;
      ctx.beginPath();
      ctx.moveTo(tx, platform.y - 7);
      ctx.lineTo(tx - 3, platform.y - 15 - (tuft % 3));
      ctx.moveTo(tx, platform.y - 7);
      ctx.lineTo(tx + 5, platform.y - 13);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHat(ctx: CanvasRenderingContext2D, hat: HatStyle): void {
  ctx.fillStyle = '#f4c764';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  if (hat === 'crown') {
    polygon(ctx, [[-12, -5], [-10, -17], [-5, -10], [0, -19], [5, -10], [10, -17], [12, -5]], '#ffe16b');
    ctx.stroke();
  } else if (hat === 'cowboy') {
    ctx.beginPath();
    ctx.ellipse(0, -7, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-10, -17, 20, 10);
    ctx.strokeRect(-10, -17, 20, 10);
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -7, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    roundedRectPath(ctx, -10, -17, 20, 10, 5);
    ctx.fill();
    ctx.stroke();
  }
}

function drawMarkerShape(ctx: CanvasRenderingContext2D, x: number, y: number, shape: MarkerShape, color: string, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(0, 0, size, 0, Math.PI * 2);
  else if (shape === 'square') ctx.rect(-size, -size, size * 2, size * 2);
  else if (shape === 'triangle') { ctx.moveTo(0, -size); ctx.lineTo(size, size); ctx.lineTo(-size, size); }
  else if (shape === 'diamond') { ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); }
  else {
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? size : size * 0.43;
      const angle = -Math.PI * 0.5 + point * Math.PI / 5;
      if (point === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function interpolate(previous: number | undefined, current: number, alpha: number): number {
  return previous === undefined ? current : previous + (current - previous) * alpha;
}

function drawFighter(ctx: CanvasRenderingContext2D, fighter: Fighter, alpha = 1): void {
  if (fighter.dead) return;
  const x = interpolate(fighter.previousX, fighter.x, alpha);
  const y = interpolate(fighter.previousY, fighter.y, alpha);
  const run = fighter.grounded && Math.abs(fighter.vx) > 30;
  const bob = run ? Math.sin(fighter.animationTime * 18) * 2.5 : fighter.grounded ? Math.sin(fighter.animationTime * 3) * 1.2 : 0;
  const fallTilt = !fighter.grounded && fighter.vy > 180 ? Math.min(0.42, fighter.vy / 2100) : 0;
  const jumpStretch = clampNumber(-fighter.vy / CONFIG.fighters.jumpVelocity, 0, 1) * 0.08;
  const fallSquash = clampNumber(fighter.vy / CONFIG.fighters.maxFallSpeed, 0, 1) * 0.045;
  const landingSquash = clampNumber(fighter.landingTimer / CONFIG.feedback.landSquashSeconds, 0, 1) * 0.13;
  const hitPulse = fighter.hitTimer > 0 ? Math.sin(fighter.animationTime * 48) * 0.035 : 0;
  const bodyScaleY = clampNumber(1 + jumpStretch - fallSquash - landingSquash + hitPulse, 0.82, 1.16);
  const bodyScaleX = 2 - bodyScaleY;
  const blink = fighter.invulnerable > 0 && Math.floor(fighter.animationTime * 17) % 2 === 0;
  ctx.save();
  ctx.translate(x, y + bob + fighter.height * 0.5);
  ctx.rotate((fighter.facing < 0 ? -1 : 1) * fallTilt + (fighter.shootTimer > 0 ? -0.06 : 0));
  ctx.scale(fighter.facing * bodyScaleX, bodyScaleY);
  ctx.globalAlpha = blink ? 0.62 : 1;

  if (fighter.shieldTime > 0 || fighter.overdriveTime > 0 || fighter.springTime > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = fighter.shieldTime > 0 ? CONFIG.powerups.shield.color : fighter.overdriveTime > 0 ? CONFIG.powerups.overdrive.color : CONFIG.powerups.spring.color;
    ctx.globalAlpha = 0.72 + Math.sin(fighter.animationTime * 8) * 0.16;
    ctx.stroke();
    ctx.globalAlpha = blink ? 0.62 : 1;
  }

  const outline = fighter.hitTimer > 0 ? '#fff8df' : INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = outline;
  ctx.fillStyle = fighter.color;

  const stride = run ? Math.sin(fighter.animationTime * 18) * 5 : !fighter.grounded ? 5 : 0;
  ctx.beginPath();
  ctx.moveTo(-6, 17);
  ctx.lineTo(-8 - stride * 0.5, 27);
  ctx.lineTo(-12 - stride, 31);
  ctx.moveTo(6, 17);
  ctx.lineTo(8 + stride * 0.5, 27);
  ctx.lineTo(12 + stride, 31);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8 - stride * 0.5, 27);
  ctx.lineTo(-15 - stride * 0.5, 27);
  ctx.moveTo(8 + stride * 0.5, 27);
  ctx.lineTo(15 + stride * 0.5, 27);
  ctx.stroke();

  roundedRectPath(ctx, -14, -7, 28, 29, 11);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, 1);
  ctx.lineTo(-20, 11 + (fighter.shootTimer > 0 ? -5 : 3));
  ctx.moveTo(12, 1);
  ctx.lineTo(19, 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -17, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd7ae';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(5, -18, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(8, -11, 4, 0.1, 1.75);
  ctx.stroke();
  drawHat(ctx, fighter.hat);

  ctx.translate(16, 5);
  ctx.fillStyle = '#48566b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  roundedRectPath(ctx, -1, -4, 17, 8, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CONFIG.weapons[fighter.weapon].color;
  ctx.fillRect(10, -2, 7, 4);
  ctx.restore();
  const labelWidth = Math.max(70, fighter.displayName.length * 7 + 31);
  roundedRectPath(ctx, x - labelWidth * 0.5, y - 30, labelWidth, 21, 7);
  ctx.fillStyle = 'rgba(23,33,55,0.92)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  drawMarkerShape(ctx, x - labelWidth * 0.5 + 12, y - 19, fighter.markerShape, fighter.color, 5.5);
  text(ctx, `${fighter.markerNumber} ${fighter.displayName}`, x + 6, y - 19, 10, PAPER, 'center', 2, 950);
  const gaugeWidth = 74;
  const gaugeHeight = 11;
  const gaugeX = x - gaugeWidth * 0.5;
  const gaugeY = y + fighter.height + 7;
  const damage = clampNumber(fighter.damagePercent, 0, CONFIG.combat.maximumDamage);
  const ratio = damage / CONFIG.combat.maximumDamage;
  const gaugeColor = ratio < 0.34 ? '#72e39a' : ratio < 0.67 ? '#ffd05b' : '#ff625c';
  roundedRectPath(ctx, gaugeX - 2, gaugeY - 2, gaugeWidth + 4, gaugeHeight + 4, 6);
  ctx.fillStyle = '#172137';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PAPER;
  ctx.stroke();
  if (ratio > 0) {
    roundedRectPath(ctx, gaugeX, gaugeY, Math.max(4, gaugeWidth * ratio), gaugeHeight, 4);
    ctx.fillStyle = gaugeColor;
    ctx.fill();
  }
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, alpha = 1): void {
  const config = CONFIG.weapons[pickup.weapon as keyof typeof CONFIG.weapons];
  const powerConfig = pickup.powerUp ? CONFIG.powerups[pickup.powerUp] : null;
  if (!config || (pickup.powerUp && !powerConfig)) return;
  const x = interpolate(pickup.previousX, pickup.x, alpha);
  const y = interpolate(pickup.previousY, pickup.y, alpha);
  const phase = interpolate(pickup.previousPhase, pickup.phase, alpha);
  const float = Math.sin(phase) * CONFIG.combat.pickupBobPixels;
  ctx.save();
  ctx.translate(x, y + float);
  ctx.rotate(Math.sin(phase * 0.45) * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fillStyle = '#fff7db';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fillStyle = powerConfig?.color ?? config.color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  const mark = pickup.powerUp === 'shield' ? '◆' : pickup.powerUp === 'overdrive' ? 'O' : pickup.weapon === 'pistol' ? 'P' : pickup.weapon === 'shotgun' ? 'S' : pickup.weapon === 'rocket' ? 'R' : 'L';
  text(ctx, mark, 0, 1, 13, INK, 'center', 0, 1000);
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile, alpha = 1): void {
  ctx.save();
  ctx.translate(interpolate(projectile.previousX, projectile.x, alpha), interpolate(projectile.previousY, projectile.y, alpha));
  ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
  const color = CONFIG.weapons[projectile.weapon].color;
  if (projectile.weapon === 'railgun') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-projectile.radius * 5, 0);
    ctx.lineTo(projectile.radius * 1.4, 0);
    ctx.stroke();
    ctx.fillStyle = '#eaffff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius * 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (projectile.weapon === 'rocket') {
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundedRectPath(ctx, -12, -6, 26, 12, 5);
    ctx.fill();
    ctx.stroke();
    polygon(ctx, [[-11, -5], [-18, -10], [-17, 0]], '#ffd86b');
    polygon(ctx, [[-11, 5], [-18, 10], [-17, 0]], '#ff6b5c');
  } else {
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    roundedRectPath(ctx, -projectile.radius * 1.6, -projectile.radius * 0.7, projectile.radius * 3.2, projectile.radius * 1.4, projectile.radius);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: readonly Particle[], interpolationAlpha = 1): void {
  for (const particle of particles) {
    if (!particle.active) continue;
    const x = interpolate(particle.previousX, particle.x, interpolationAlpha);
    const y = interpolate(particle.previousY, particle.y, interpolationAlpha);
    const opacity = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = particle.color;
    if (particle.ring) {
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = 1.5 + opacity * 3.5;
      ctx.beginPath();
      ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (particle.square) ctx.fillRect(x - particle.radius * 0.5, y - particle.radius * 0.5, particle.radius, particle.radius);
    else {
      ctx.beginPath();
      ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawFighterCard(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number, width: number, maxStocks: number, weaponsEnabled: boolean): void {
  const height = CONFIG.hud.fighterCardHeight;
  panel(ctx, x, y, width, height, 'rgba(25,37,58,0.9)');
  drawMarkerShape(ctx, x + 15, y + 15, fighter.markerShape, fighter.color, 6);
  text(ctx, fighter.displayName.toUpperCase(), x + 27, y + 15, Math.min(12, width / 12), PAPER, 'left', 3, 950);
  for (let stock = 0; stock < maxStocks; stock += 1) {
    const dotX = x + 12 + stock * Math.min(17, (width - 24) / Math.max(maxStocks, 1));
    ctx.beginPath();
    ctx.arc(dotX, y + 38, 5.2, 0, Math.PI * 2);
    ctx.fillStyle = stock < fighter.stocks ? fighter.color : '#545d6b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  const weapon = CONFIG.weapons[fighter.weapon];
  const weaponText = !fighter.stocks ? 'OUT' : !weaponsEnabled ? 'UNARMED' : fighter.dead ? 'RESPAWNING' : `${weapon.label} · ${fighter.ammo[fighter.weapon]}`;
  text(ctx, weaponText, x + 9, y + 55, Math.min(10, width / 15), fighter.dead ? '#c4cad3' : weaponsEnabled ? weapon.color : '#fff', 'left', 2, 900);
  const buffTime = Math.max(fighter.shieldTime, fighter.overdriveTime, fighter.springTime);
  if (buffTime > 0) {
    const color = fighter.shieldTime > 0 ? CONFIG.powerups.shield.color : fighter.overdriveTime > 0 ? CONFIG.powerups.overdrive.color : CONFIG.powerups.spring.color;
    const meterWidth = width - 18;
    roundedRectPath(ctx, x + 9, y + 60, meterWidth, 3, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();
    roundedRectPath(ctx, x + 9, y + 60, meterWidth * clampNumber(buffTime / CONFIG.powerups.durationSeconds, 0, 1), 3, 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawOffscreenIndicators(ctx: CanvasRenderingContext2D, match: MatchScene, alpha: number, cameraX: number): void {
  for (const fighter of match.fighters) {
    if (fighter.dead || fighter.stocks <= 0) continue;
    const fighterX = interpolate(fighter.previousX, fighter.x, alpha);
    const fighterY = interpolate(fighter.previousY, fighter.y, alpha);
    const screenX = fighterX - cameraX;
    const outsideX = screenX < 10 || screenX > CONFIG.canvas.width - 10;
    const outsideY = fighterY < -34 || fighterY > CONFIG.canvas.height - 40;
    if (!outsideX && !outsideY) continue;
    const x = clampNumber(screenX, CONFIG.hud.offscreenMargin, CONFIG.canvas.width - CONFIG.hud.offscreenMargin);
    const y = clampNumber(fighterY + fighter.height * 0.5, 112, CONFIG.canvas.height - 72);
    const angle = outsideX ? (screenX < CONFIG.canvas.width * 0.5 ? Math.PI : 0) : fighterY < 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    polygon(ctx, [[-10, -8], [10, 0], [-10, 8]], fighter.color);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    text(ctx, String(fighter.markerNumber), x, y - 18, 10, PAPER, 'center', 3, 950);
  }
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function drawArenaHazards(ctx: CanvasRenderingContext2D, match: MatchScene): void {
  for (const hazard of match.arena.hazards) {
    const active = isHazardActiveAtTick(hazard, match.simulationTick);
    roundedRectPath(ctx, hazard.x, hazard.y, hazard.width, hazard.height, 7);
    ctx.fillStyle = active ? 'rgba(255,92,92,0.9)' : 'rgba(255,225,107,0.58)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = active ? '#fff8df' : '#fff1b2';
    ctx.lineWidth = 2;
    ctx.strokeRect(hazard.x + 5, hazard.y + 5, hazard.width - 10, hazard.height - 10);
    ctx.restore();
    text(ctx, t(active ? 'hazard.active' : 'hazard.signalPulse'), hazard.x + hazard.width * 0.5, hazard.y - 12, 8, active ? '#ff806c' : '#ffe16b', 'center', 2, 900);
  }
}

function drawHud(ctx: CanvasRenderingContext2D, match: MatchScene, touchMode: boolean, alpha: number, series: BestOfThreeSnapshot | null): void {
  const count = match.fighters.length;
  const margin = CONFIG.hud.margin;
  const gap = 6;
  const width = (CONFIG.canvas.width - margin * 2 - gap * Math.max(0, count - 1)) / Math.max(1, count);
  for (let index = 0; index < count; index += 1) {
    const fighter = match.fighters[index];
    if (fighter) drawFighterCard(ctx, fighter, margin + index * (width + gap), margin, width, match.config.stocks, match.config.weaponsEnabled);
  }
  const centerWidth = match.config.mode === 'bestOf3' ? 310 : match.config.mode === 'daily' ? 230 : 194;
  panel(ctx, CONFIG.canvas.width * 0.5 - centerWidth * 0.5, 88, centerWidth, 35, 'rgba(25,37,58,0.9)');
  const centerLabel = match.config.mode === 'survival'
    ? `WAVE ${String(match.wave).padStart(2, '0')} · ${match.arena.label}`
    : match.config.mode === 'daily'
      ? t('daily.hud', { date: match.challengeDate ?? 'UTC' })
      : match.config.mode === 'bestOf3' && series
        ? t('series.score', { round: Math.min(3, series.roundsPlayed + 1), player1: series.player1Wins, player2: series.player2Wins })
    : `${Math.floor(match.elapsed / 60).toString().padStart(2, '0')}:${Math.floor(match.elapsed % 60).toString().padStart(2, '0')}`;
  text(ctx, centerLabel, CONFIG.canvas.width * 0.5, 105, match.config.mode === 'bestOf3' ? 11 : match.config.mode === 'daily' ? 12 : match.config.mode === 'survival' ? 13 : 16, PAPER, 'center', 3, 900);
  text(ctx, touchMode ? 'MOVE · JUMP · SHOOT · SWAP · PAUSE' : CONFIG.copy.controls, CONFIG.canvas.width * 0.5, CONFIG.canvas.height - 16, 9, '#fff8df', 'center', 3, 850);

  ctx.save();
  const cameraX = interpolate(match.previousCameraX, match.cameraX, alpha);
  ctx.translate(-cameraX, 0);
  drawArenaHazards(ctx, match);
  for (const pickup of match.pickups.items) if (pickup.active) drawPickup(ctx, pickup, alpha);
  for (const projectile of match.projectiles.pool.items) if (projectile.active) drawProjectile(ctx, projectile, alpha);
  drawParticles(ctx, match.effects.pool.items, alpha);
  for (const fighter of match.fighters) drawFighter(ctx, fighter, alpha);
  ctx.restore();
  drawOffscreenIndicators(ctx, match, alpha, cameraX);
  if (match.screenFlash > 0) {
    ctx.save();
    ctx.globalAlpha = match.screenFlash;
    ctx.fillStyle = match.screenFlashColor;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    ctx.restore();
  }
  if (match.toastTimer > 0) {
    panel(ctx, CONFIG.canvas.width * 0.5 - 200, 128, 400, 42, 'rgba(255,225,107,0.92)');
    text(ctx, match.toast, CONFIG.canvas.width * 0.5, 149, 14, INK, 'center', 2, 950);
  }
}

function drawMascot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, facing: number, hat: HatStyle, elapsed: number): void {
  ctx.save();
  ctx.translate(x, y + Math.sin(elapsed * 2.4 + x) * 4);
  ctx.scale(facing, 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-9, 20);
  ctx.lineTo(-14, 41);
  ctx.moveTo(9, 20);
  ctx.lineTo(14, 41);
  ctx.stroke();
  roundedRectPath(ctx, -18, -8, 36, 35, 13);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -25, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd7ae';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(7, -27, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(11, -18, 5, 0.1, 1.8);
  ctx.stroke();
  drawHat(ctx, hat);
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, elapsed: number): void {
  ctx.save();
  ctx.translate(66, 92);
  ctx.rotate(-0.04 + Math.sin(elapsed * 1.6) * 0.012);
  panel(ctx, 0, 0, 420, 125, 'rgba(22,31,50,0.88)');
  text(ctx, 'BLASTER', 24, 47, 52, '#ff806c', 'left', 9, 1000);
  text(ctx, 'BRAWL', 28, 94, 54, '#5dd7f2', 'left', 9, 1000);
  ctx.save();
  ctx.translate(360, 65);
  ctx.rotate(elapsed * 0.8);
  polygon(ctx, [[0, -21], [6, -6], [22, 0], [6, 6], [0, 22], [-6, 6], [-22, 0], [-6, -6]], '#ffe16b');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  text(ctx, CONFIG.copy.tagline, 5, 157, 15, PAPER, 'left', 4, 900);
  ctx.restore();
}

function drawMenu(ctx: CanvasRenderingContext2D, state: RenderState): void {
  drawLogo(ctx, state.elapsed);
  drawMascot(ctx, 260, 366, CONFIG.fighters.colorways[state.settings.colorIndex] ?? '#ff6b5c', 1, CONFIG.fighters.hatStyles[state.settings.hatIndex] ?? 'cap', state.elapsed);
  drawMascot(ctx, 432, 366, CONFIG.fighters.botColor, -1, 'cowboy', state.elapsed + 1);
  const width = CONFIG.menu.panelWidth;
  const x = CONFIG.canvas.width - CONFIG.menu.rightMargin - width;
  const rowHeight = CONFIG.menu.rowHeight;
  const height = 28 + rowHeight * CONFIG.menu.items.length + 16;
  const y = 180;
  const hints: Record<string, string> = {
    play: 'QUICK 1V1 · STARTS NOW',
    practice: t('menu.practiceHint'),
    daily: t('menu.dailyHint'),
    campaign: 'A STORY RUN IS COMING SOON',
    custom: 'CHOOSE THE RULES OF THE BRAWL',
    library: 'MEET THE WEAPONS',
    options: 'TUNE SOUND, CONTROLS & FEEL',
    credits: 'THE CREW BEHIND THE BRAWL',
  };
  panel(ctx, x, y, width, height);
  for (let i = 0; i < CONFIG.menu.items.length; i += 1) {
    const item = CONFIG.menu.items[i];
    if (!item) continue;
    const centerY = y + 28 + i * rowHeight + 3;
    if (i === state.menuIndex) {
      roundedRectPath(ctx, x + 14, centerY - 17 + (state.pointerDown ? 2 : 0), width - 28, 34, 8);
      ctx.fillStyle = state.pointerDown ? 'rgba(255,107,92,0.52)' : 'rgba(255,107,92,0.28)';
      ctx.fill();
      text(ctx, '▶', x + width - 23, centerY, 16, '#ff806c', 'center', 2, 1000);
    }
    if (i === state.menuIndex) {
      text(ctx, item.label, x + width - 42, centerY - 5, 17, '#fff8df', 'right', 4, 1000);
      text(ctx, hints[item.id] ?? 'SELECT TO CONTINUE', x + width - 42, centerY + 11, 8, '#ffe16b', 'right', 2, 850);
    } else {
      text(ctx, item.label, x + width - 42, centerY, 20, '#fff', 'right', 4, 1000);
    }
    if (!item.available) text(ctx, 'COMING SOON', x + 20, centerY + 12, 8, '#c7d3df', 'left', 2, 800);
  }
  text(ctx, '↑ / ↓ SELECT     ENTER CONFIRM', CONFIG.canvas.width - CONFIG.menu.rightMargin - 10, y + height + 24, 10, PAPER, 'right', 3, 850);
  text(ctx, 'PLAY NOW. RING OUT. RUN IT BACK.', 66, CONFIG.canvas.height - 42, 16, '#fff8df', 'left', 4, 950);
}

function drawCustomGame(ctx: CanvasRenderingContext2D, state: RenderState): void {
  panel(ctx, 192, 70, 576, 405, 'rgba(22,31,50,0.97)');
  text(ctx, 'CUSTOM GAME', CONFIG.canvas.width * 0.5, 112, 30, '#ffe16b', 'center', 6, 1000);
  const config = state.customConfig;
  const rows = [
    `MODE          ${matchModeLabel(config.mode)}${state.touchCapable && config.humanPlayers === 2 ? ' · KEYBOARD ONLY' : ''}`,
    `BOTS          ${config.botCount === 0 ? 'OFF' : config.botCount}`,
    `DIFFICULTY    ${config.difficulty.toUpperCase()}`,
    `STOCKS        ${config.stocks}`,
    `WEAPONS       ${config.weaponsEnabled ? 'ON' : 'OFF'}`,
    'START MATCH',
    'BACK',
  ];
  for (let index = 0; index < rows.length; index += 1) {
    const y = 178 + index * 37;
    if (index === state.customIndex) {
      roundedRectPath(ctx, 234, y - 16 + (state.pointerDown ? 2 : 0), 492, 33, 8);
      ctx.fillStyle = state.pointerDown ? 'rgba(255,107,92,0.52)' : 'rgba(255,107,92,0.28)';
      ctx.fill();
      text(ctx, '▶', 700, y, 15, '#ff806c', 'center', 2, 1000);
    }
    text(ctx, rows[index] ?? '', 262, y, index >= 5 ? 17 : 15, index >= 5 ? '#fff8df' : '#fff', 'left', 3, 950);
  }
  text(ctx, '↑ / ↓ SELECT    ← / → CHANGE    ENTER CONFIRM', CONFIG.canvas.width * 0.5, 446, 11, '#dce6ec', 'center', 3, 850);
}

function drawOptions(ctx: CanvasRenderingContext2D, state: RenderState): void {
  panel(ctx, 130, 48, 700, 448, 'rgba(22,31,50,0.96)');
  text(ctx, 'OPTIONS', CONFIG.canvas.width * 0.5, 84, 29, '#ffe16b', 'center', 6, 1000);
  const rows = [
    `SOUND  ·  ${state.settings.muted ? 'MUTED' : 'ON'}`,
    `SCREEN SHAKE  ·  ${Math.round(state.settings.shake * 100)}%`,
    `FIGHTER COLOR  ·  ${state.settings.colorIndex + 1}`,
    `HAT  ·  ${String(CONFIG.fighters.hatStyles[state.settings.hatIndex] ?? 'cap').toUpperCase()}`,
    `TOUCH CONTROLS  ·  ${state.settings.touchControlsEnabled ? 'ENABLED' : 'AUTO / TOUCH DEVICES'}`,
    `CONTROL SIZE  ·  ${Math.round(state.settings.touchControlSize * 100)}%`,
    `CONTROL OPACITY  ·  ${Math.round(state.settings.touchOpacity * 100)}%`,
    `LEFT-HANDED LAYOUT  ·  ${state.settings.leftHanded ? 'ON' : 'OFF'}`,
    `HAPTIC FEEDBACK  ·  ${state.settings.haptics ? 'ON' : 'OFF'}`,
    `GRAPHICS QUALITY  ·  ${state.settings.qualityMode.toUpperCase()}`,
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const y = 158 + i * 29;
    if (state.optionsIndex === i) {
      roundedRectPath(ctx, 150, y - 13 + (state.pointerDown ? 2 : 0), 660, 27, 7);
      ctx.fillStyle = state.pointerDown ? 'rgba(255,107,92,0.5)' : 'rgba(255,107,92,0.26)';
      ctx.fill();
      text(ctx, '▶', 790, y, 13, '#ff806c', 'center', 2, 1000);
    }
    text(ctx, rows[i] ?? '', 170, y, 13, '#fff', 'left', 3, 950);
  }
  text(ctx, '← / → CHANGE     ENTER / TAP SELECT     ESC BACK', CONFIG.canvas.width * 0.5, 464, 10, '#dce6ec', 'center', 3, 850);
}

function drawPause(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.fillStyle = 'rgba(10,16,29,0.58)';
  ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
  panel(ctx, 302, 151, 356, 252, 'rgba(22,31,50,0.97)');
  text(ctx, CONFIG.copy.paused, CONFIG.canvas.width * 0.5, 197, 34, '#ffe16b', 'center', 6, 1000);
  const match = state.match;
  if (match) text(ctx, `${match.arena.label} · ${match.config.mode === 'survival' ? `WAVE ${match.wave}` : matchModeLabel(match.config.mode)}`, CONFIG.canvas.width * 0.5, 226, 10, '#dce6ec', 'center', 2, 850);
  const items = CONFIG.scene.pauseActions;
  for (let i = 0; i < items.length; i += 1) {
    const y = 260 + i * 42;
    if (i === state.pauseIndex) {
      roundedRectPath(ctx, 326, y - 17 + (state.pointerDown ? 2 : 0), 308, 34, 8);
      ctx.fillStyle = state.pointerDown ? 'rgba(255,107,92,0.52)' : 'rgba(255,107,92,0.28)';
      ctx.fill();
      text(ctx, '▶', 367, y + (state.pointerDown ? 2 : 0), 15, '#ff806c', 'center', 2, 1000);
    }
    text(ctx, items[i] ?? '', 394, y + (i === state.pauseIndex && state.pointerDown ? 2 : 0), 20, '#fff', 'left', 4, 950);
  }
  text(ctx, 'ESC RESUMES', CONFIG.canvas.width * 0.5, 379, 11, '#c7d3df', 'center', 3, 800);
}

function drawTutorial(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(10,16,29,0.7)';
  ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
  panel(ctx, 178, 102, 604, 328, 'rgba(22,31,50,0.98)');
  text(ctx, t('tutorial.title'), CONFIG.canvas.width * 0.5, 149, 30, '#ffe16b', 'center', 6, 1000);
  text(ctx, t('tutorial.objective'), CONFIG.canvas.width * 0.5, 198, 18, '#fff8df', 'center', 4, 950);
  text(ctx, t('tutorial.controls'), CONFIG.canvas.width * 0.5, 242, 13, '#dce6ec', 'center', 3, 850);
  text(ctx, t('tutorial.secondary'), CONFIG.canvas.width * 0.5, 272, 13, '#dce6ec', 'center', 3, 850);
  text(ctx, t('tutorial.tip'), CONFIG.canvas.width * 0.5, 316, 12, '#ffe16b', 'center', 3, 850);
  text(ctx, t('tutorial.start'), CONFIG.canvas.width * 0.5, 376, 17, '#ff806c', 'center', 4, 1000);
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const winner = state.match?.winnerFighter ?? null;
  const won = winner?.playerSlot === 1;
  const inSeries = state.match?.config.mode === 'bestOf3' && state.series !== null;
  const winnerName = state.match?.config.mode === 'survival'
    ? `RUN ENDED AT WAVE ${state.match.wave}`
    : inSeries && state.series?.complete
      ? state.series.champion === 1 ? t('series.playerOne') : t('series.cpu')
      : winner?.displayName.toUpperCase() ?? 'NO WINNER';
  ctx.fillStyle = 'rgba(12,18,32,0.56)';
  ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
  panel(ctx, 265, 112, 430, 324, 'rgba(22,31,50,0.96)');
  for (let i = 0; i < 7; i += 1) {
    const x = 302 + i * 59;
    const y = 164 + Math.sin(state.elapsed * 3 + i) * 6;
    ctx.fillStyle = i % 2 === 0 ? '#ffe16b' : '#ff806c';
    polygon(ctx, [[x, y - 9], [x + 4, y - 2], [x + 12, y], [x + 4, y + 3], [x, y + 11], [x - 4, y + 3], [x - 12, y], [x - 4, y - 2]], ctx.fillStyle);
  }
  text(ctx, won ? CONFIG.copy.resultWin : CONFIG.copy.resultLose, CONFIG.canvas.width * 0.5, 219, 43, won ? '#ffe16b' : '#ff806c', 'center', 8, 1000);
  const winnerLabel = inSeries && state.series?.complete
    ? t('series.champion', { name: winnerName })
    : inSeries
      ? t('series.roundWinner', { name: winnerName })
      : state.match?.config.mode === 'survival' ? winnerName : `WINNER: ${winnerName}`;
  text(ctx, winnerLabel, CONFIG.canvas.width * 0.5, 263, 14, PAPER, 'center', 3, 900);
  const order = state.match?.eliminationOrder.map((id, index) => {
    const fighter = state.match?.fighters.find((candidate) => candidate.id === id);
    return `${index + 1}. ${fighter?.displayName.toUpperCase() ?? 'FIGHTER'}`;
  }).join('  ·  ');
  if (inSeries && state.series) {
    text(ctx, t('series.score', { round: state.series.roundsPlayed, player1: state.series.player1Wins, player2: state.series.player2Wins }), CONFIG.canvas.width * 0.5, 289, 10, '#dce6ec', 'center', 2, 850);
  } else if (state.match?.config.mode === 'daily') {
    text(ctx, t('daily.result', { date: state.match.challengeDate ?? 'UTC' }), CONFIG.canvas.width * 0.5, 289, 10, '#dce6ec', 'center', 2, 850);
  } else if (order) text(ctx, `OUT ORDER: ${order}`, CONFIG.canvas.width * 0.5, 289, 10, '#dce6ec', 'center', 2, 850);
  const items = CONFIG.scene.gameOverActions;
  for (let i = 0; i < items.length; i += 1) {
    const y = 333 + i * 42;
    if (i === state.gameOverIndex) {
      roundedRectPath(ctx, 319, y - 17 + (state.pointerDown ? 2 : 0), 322, 34, 8);
      ctx.fillStyle = state.pointerDown ? 'rgba(255,107,92,0.52)' : 'rgba(255,107,92,0.28)';
      ctx.fill();
      text(ctx, '▶', 361, y + (state.pointerDown ? 2 : 0), 15, '#ff806c', 'center', 2, 1000);
    }
    const label = i === CONFIG.scene.gameOverActionIndex.replay && inSeries
      ? state.series?.complete ? t('series.newSeries') : t('series.nextRound')
      : i === CONFIG.scene.gameOverActionIndex.menu && inSeries ? t('series.backToMenu') : items[i] ?? '';
    text(ctx, label, 388, y + (i === state.gameOverIndex && state.pointerDown ? 2 : 0), 20, '#fff', 'left', 4, 950);
  }
  text(ctx, 'S  SHARE LOCAL REPLAY CLIP', CONFIG.canvas.width * 0.5, 425, 10, '#c7d3df', 'center', 2, 800);
}

export function renderGame(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.save();
  const inMatchView = state.screen === SCENE.GAME;
  const renderAlpha = state.match?.renderAlpha ?? 1;
  const shake = inMatchView && !state.paused ? state.match?.shake ?? 0 : 0;
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const cameraZoom = inMatchView && !state.paused ? state.match?.cameraZoom ?? 0 : 0;
  if (cameraZoom > 0) {
    ctx.translate(CONFIG.canvas.width * 0.5, CONFIG.canvas.height * 0.5);
    ctx.scale(1 + cameraZoom, 1 + cameraZoom);
    ctx.translate(-CONFIG.canvas.width * 0.5, -CONFIG.canvas.height * 0.5);
  }
  const cameraX = state.match ? interpolate(state.match.previousCameraX, state.match.cameraX, renderAlpha) : 0;
  const arena = state.match?.arena ?? CONFIG.world.arenas[0];
  const platforms = state.match?.platforms ?? arena.platforms;
  drawBackdrop(ctx, cameraX, state.elapsed, state.lowQuality, arena);
  drawWorld(ctx, cameraX, platforms, arena);
  if (state.match && (state.screen === SCENE.GAME || state.screen === SCENE.GAME_OVER)) {
    drawHud(ctx, state.match, state.touchMode, renderAlpha, state.series);
  } else {
    const match = state.match;
    if (match) {
      ctx.save();
      ctx.translate(-match.cameraX, 0);
      for (const fighter of match.fighters) drawFighter(ctx, fighter, renderAlpha);
      ctx.restore();
    }
  }
  if (state.screen === SCENE.MENU) drawMenu(ctx, state);
  else if (state.screen === SCENE.OPTIONS) drawOptions(ctx, state);
  else if (state.screen === SCENE.CUSTOM) drawCustomGame(ctx, state);
  else if (state.screen === SCENE.GAME && state.paused) drawPause(ctx, state);
  else if (state.screen === SCENE.GAME_OVER) drawGameOver(ctx, state);
  if (state.screen === SCENE.GAME && state.tutorialActive) drawTutorial(ctx);
  if (state.toastTimer > 0 && state.toast && state.screen !== SCENE.GAME) {
    panel(ctx, CONFIG.canvas.width * 0.5 - 190, 29, 380, 45, 'rgba(255,225,107,0.92)');
    text(ctx, state.toast, CONFIG.canvas.width * 0.5, 52, 14, INK, 'center', 2, 950);
  }
  ctx.restore();
}
