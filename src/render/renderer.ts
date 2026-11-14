import { CONFIG, SCENE } from '../config';
import type { Fighter, HatStyle, Particle, Projectile } from '../types';
import type { MatchScene } from '../scenes/match';
import type { GameSettings } from '../storage/settings';
import { matchModeLabel } from '../game/match-config';
import type { MatchConfig, MarkerShape } from '../types';

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
  lowQuality: boolean;
  touchMode: boolean;
  touchCapable: boolean;
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

function drawBackdrop(ctx: CanvasRenderingContext2D, cameraX: number, elapsed: number, lowQuality = false): void {
  const parallaxX = lowQuality ? 0 : cameraX;
  const sky = ctx.createLinearGradient(0, 0, 0, CONFIG.canvas.height);
  sky.addColorStop(0, '#7bdcf4');
  sky.addColorStop(0.62, '#c7f1f5');
  sky.addColorStop(1, '#ffe8a9');
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

function drawWorld(ctx: CanvasRenderingContext2D, cameraX: number): void {
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const x of [125, 625, 1015, 1430]) drawTree(ctx, x, 410, x > 1200 ? 0.86 : 1);
  for (const x of [370, 890, 1295]) drawHut(ctx, x, 415);

  for (const platform of CONFIG.world.platforms) {
    roundedRectPath(ctx, platform.x, platform.y, platform.width, platform.height, 10);
    ctx.fillStyle = '#855b43';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.stroke();
    roundedRectPath(ctx, platform.x - 2, platform.y - 9, platform.width + 4, 19, 9);
    ctx.fillStyle = '#70b84e';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#a97952';
    for (let rock = 0; rock < Math.floor(platform.width / 48); rock += 1) {
      const rx = platform.x + 18 + rock * 47;
      ctx.beginPath();
      ctx.ellipse(rx, platform.y + 25 + (rock % 2) * 6, 14 + (rock % 3) * 2, 8, (rock % 2) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3f7b49';
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

function drawFighter(ctx: CanvasRenderingContext2D, fighter: Fighter): void {
  if (fighter.dead) return;
  const run = fighter.grounded && Math.abs(fighter.vx) > 30;
  const bob = run ? Math.sin(fighter.animationTime * 18) * 2.5 : fighter.grounded ? Math.sin(fighter.animationTime * 3) * 1.2 : 0;
  const fallTilt = !fighter.grounded && fighter.vy > 180 ? Math.min(0.42, fighter.vy / 2100) : 0;
  const blink = fighter.invulnerable > 0 && Math.floor(fighter.animationTime * 17) % 2 === 0;
  ctx.save();
  ctx.translate(fighter.x, fighter.y + bob + fighter.height * 0.5);
  ctx.rotate((fighter.facing < 0 ? -1 : 1) * fallTilt);
  ctx.scale(fighter.facing, 1);
  ctx.globalAlpha = blink ? 0.62 : 1;

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
  ctx.fillStyle = fighter.weapon === 'rocket' ? '#ff8a4e' : fighter.weapon === 'shotgun' ? '#74f0aa' : '#ffe16b';
  ctx.fillRect(10, -2, 7, 4);
  ctx.restore();
  const labelWidth = Math.max(70, fighter.displayName.length * 7 + 31);
  roundedRectPath(ctx, fighter.x - labelWidth * 0.5, fighter.y - 30, labelWidth, 21, 7);
  ctx.fillStyle = 'rgba(23,33,55,0.92)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  drawMarkerShape(ctx, fighter.x - labelWidth * 0.5 + 12, fighter.y - 19, fighter.markerShape, fighter.color, 5.5);
  text(ctx, `${fighter.markerNumber} ${fighter.displayName}`, fighter.x + 6, fighter.y - 19, 10, PAPER, 'center', 2, 950);
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: { x: number; y: number; weapon: string; phase: number }): void {
  const config = CONFIG.weapons[pickup.weapon as keyof typeof CONFIG.weapons];
  if (!config) return;
  const float = Math.sin(pickup.phase) * CONFIG.combat.pickupBobPixels;
  ctx.save();
  ctx.translate(pickup.x, pickup.y + float);
  ctx.rotate(Math.sin(pickup.phase * 0.45) * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fillStyle = '#fff7db';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fillStyle = config.color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, pickup.weapon === 'pistol' ? 'P' : pickup.weapon === 'shotgun' ? 'S' : 'R', 0, 1, 13, INK, 'center', 0, 1000);
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile): void {
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
  const color = CONFIG.weapons[projectile.weapon].color;
  if (projectile.weapon === 'rocket') {
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

function drawParticles(ctx: CanvasRenderingContext2D, particles: readonly Particle[]): void {
  for (const particle of particles) {
    if (!particle.active) continue;
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    if (particle.square) ctx.fillRect(particle.x - particle.radius * 0.5, particle.y - particle.radius * 0.5, particle.radius, particle.radius);
    else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
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
}

function drawOffscreenIndicators(ctx: CanvasRenderingContext2D, match: MatchScene): void {
  for (const fighter of match.fighters) {
    if (fighter.dead || fighter.stocks <= 0) continue;
    const screenX = fighter.x - match.cameraX;
    const outsideX = screenX < 10 || screenX > CONFIG.canvas.width - 10;
    const outsideY = fighter.y < -34 || fighter.y > CONFIG.canvas.height - 40;
    if (!outsideX && !outsideY) continue;
    const x = clampNumber(screenX, CONFIG.hud.offscreenMargin, CONFIG.canvas.width - CONFIG.hud.offscreenMargin);
    const y = clampNumber(fighter.y + fighter.height * 0.5, 112, CONFIG.canvas.height - 72);
    const angle = outsideX ? (screenX < CONFIG.canvas.width * 0.5 ? Math.PI : 0) : fighter.y < 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
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

function drawHud(ctx: CanvasRenderingContext2D, match: MatchScene, touchMode: boolean): void {
  const count = match.fighters.length;
  const margin = CONFIG.hud.margin;
  const gap = 6;
  const width = (CONFIG.canvas.width - margin * 2 - gap * Math.max(0, count - 1)) / Math.max(1, count);
  for (let index = 0; index < count; index += 1) {
    const fighter = match.fighters[index];
    if (fighter) drawFighterCard(ctx, fighter, margin + index * (width + gap), margin, width, match.config.stocks, match.config.weaponsEnabled);
  }
  panel(ctx, CONFIG.canvas.width * 0.5 - 47, 88, 94, 35, 'rgba(25,37,58,0.9)');
  text(ctx, `${Math.floor(match.elapsed / 60).toString().padStart(2, '0')}:${Math.floor(match.elapsed % 60).toString().padStart(2, '0')}`, CONFIG.canvas.width * 0.5, 105, 16, PAPER, 'center', 3, 900);
  text(ctx, touchMode ? 'MOVE · JUMP · SHOOT · SWAP · PAUSE' : CONFIG.copy.controls, CONFIG.canvas.width * 0.5, CONFIG.canvas.height - 16, 9, '#fff8df', 'center', 3, 850);

  ctx.save();
  ctx.translate(-match.cameraX, 0);
  for (const pickup of match.pickups.items) if (pickup.active) drawPickup(ctx, pickup);
  for (const projectile of match.projectiles.pool.items) if (projectile.active) drawProjectile(ctx, projectile);
  drawParticles(ctx, match.effects.pool.items);
  for (const fighter of match.fighters) drawFighter(ctx, fighter);
  ctx.restore();
  drawOffscreenIndicators(ctx, match);
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
  panel(ctx, x, y, width, height);
  for (let i = 0; i < CONFIG.menu.items.length; i += 1) {
    const item = CONFIG.menu.items[i];
    if (!item) continue;
    const centerY = y + 28 + i * rowHeight + 3;
    if (i === state.menuIndex) {
      roundedRectPath(ctx, x + 14, centerY - 17, width - 28, 34, 8);
      ctx.fillStyle = 'rgba(255,107,92,0.28)';
      ctx.fill();
      text(ctx, '▶', x + width - 23, centerY, 16, '#ff806c', 'center', 2, 1000);
    }
    text(ctx, item.label, x + width - 42, centerY, 20, i === state.menuIndex ? '#fff8df' : '#fff', 'right', 4, 1000);
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
      roundedRectPath(ctx, 234, y - 16, 492, 33, 8);
      ctx.fillStyle = 'rgba(255,107,92,0.28)';
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
      roundedRectPath(ctx, 150, y - 13, 660, 27, 7);
      ctx.fillStyle = 'rgba(255,107,92,0.26)';
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
  const items = CONFIG.scene.pauseActions;
  for (let i = 0; i < items.length; i += 1) {
    const y = 260 + i * 42;
    if (i === state.pauseIndex) text(ctx, '▶', 367, y, 15, '#ff806c', 'center', 2, 1000);
    text(ctx, items[i] ?? '', 394, y, 20, '#fff', 'left', 4, 950);
  }
  text(ctx, 'ESC RESUMES', CONFIG.canvas.width * 0.5, 379, 11, '#c7d3df', 'center', 3, 800);
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const winner = state.match?.winnerFighter ?? null;
  const won = winner?.playerSlot === 1;
  const winnerName = winner?.displayName.toUpperCase() ?? 'NO WINNER';
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
  text(ctx, `WINNER: ${winnerName}`, CONFIG.canvas.width * 0.5, 263, 14, PAPER, 'center', 3, 900);
  const order = state.match?.eliminationOrder.map((id, index) => {
    const fighter = state.match?.fighters.find((candidate) => candidate.id === id);
    return `${index + 1}. ${fighter?.displayName.toUpperCase() ?? 'FIGHTER'}`;
  }).join('  ·  ');
  if (order) text(ctx, `OUT ORDER: ${order}`, CONFIG.canvas.width * 0.5, 289, 10, '#dce6ec', 'center', 2, 850);
  const items = CONFIG.scene.gameOverActions;
  for (let i = 0; i < items.length; i += 1) {
    const y = 333 + i * 42;
    if (i === state.gameOverIndex) text(ctx, '▶', 361, y, 15, '#ff806c', 'center', 2, 1000);
    text(ctx, items[i] ?? '', 388, y, 20, '#fff', 'left', 4, 950);
  }
}

export function renderGame(ctx: CanvasRenderingContext2D, state: RenderState): void {
  ctx.save();
  const shake = state.screen === SCENE.GAME && !state.paused ? state.match?.shake ?? 0 : 0;
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const cameraX = state.match?.cameraX ?? 0;
  drawBackdrop(ctx, cameraX, state.elapsed, state.lowQuality);
  drawWorld(ctx, cameraX);
  if (state.match && (state.screen === SCENE.GAME || state.screen === SCENE.GAME_OVER)) {
    drawHud(ctx, state.match, state.touchMode);
  } else {
    const match = state.match;
    if (match) {
      ctx.save();
      ctx.translate(-match.cameraX, 0);
      for (const fighter of match.fighters) drawFighter(ctx, fighter);
      ctx.restore();
    }
  }
  if (state.screen === SCENE.MENU) drawMenu(ctx, state);
  else if (state.screen === SCENE.OPTIONS) drawOptions(ctx, state);
  else if (state.screen === SCENE.CUSTOM) drawCustomGame(ctx, state);
  else if (state.screen === SCENE.GAME && state.paused) drawPause(ctx, state);
  else if (state.screen === SCENE.GAME_OVER) drawGameOver(ctx, state);
  if (state.toastTimer > 0 && state.toast && state.screen !== SCENE.GAME) {
    panel(ctx, CONFIG.canvas.width * 0.5 - 190, 29, 380, 45, 'rgba(255,225,107,0.92)');
    text(ctx, state.toast, CONFIG.canvas.width * 0.5, 52, 14, INK, 'center', 2, 950);
  }
  ctx.restore();
}
