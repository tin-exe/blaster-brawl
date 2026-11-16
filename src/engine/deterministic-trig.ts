const FULL_TURN = 0x1_0000_0000;
const HALF_TURN = 0x8000_0000;
const QUARTER_TURN = 0x4000_0000;
const TWO_PI = Math.PI * 2;
const ROTATION_SCALE = 1 << 29;
const CORDIC_GAIN = 326_016_437;
const VECTOR_SCALE = 1 << 19;
const ATAN_TURNS = [
  0x20000000, 0x12e4051d, 0x09fb385b, 0x051111d4, 0x028b0d43,
  0x0145d7e1, 0x00a2f61e, 0x00517c55, 0x0028be53, 0x00145f2e,
  0x000a2f98, 0x000517cc, 0x00028be6, 0x000145f3, 0x0000a2fa,
  0x0000517d, 0x000028be, 0x0000145f, 0x00000a30, 0x00000518,
  0x0000028c, 0x00000146, 0x000000a3, 0x00000051, 0x00000029,
  0x00000014, 0x0000000a, 0x00000005, 0x00000003, 0x00000001,
] as const;

function toSignedTurns(radians: number): number {
  if (!Number.isFinite(radians)) return 0;
  let turns = Math.round((radians / TWO_PI) * FULL_TURN);
  turns = ((turns + HALF_TURN) % FULL_TURN + FULL_TURN) % FULL_TURN - HALF_TURN;
  return turns;
}

export interface UnitDirection { x: number; y: number }

export function directionForAngle(radians: number): UnitDirection {
  let angle = toSignedTurns(radians);
  let sign = 1;
  if (angle > QUARTER_TURN) { angle -= HALF_TURN; sign = -1; }
  else if (angle < -QUARTER_TURN) { angle += HALF_TURN; sign = -1; }

  let x = CORDIC_GAIN;
  let y = 0;
  let residual = angle;
  for (let index = 0; index < ATAN_TURNS.length; index += 1) {
    const oldX = x;
    const oldY = y;
    if (residual >= 0) {
      x = oldX - (oldY >> index);
      y = oldY + (oldX >> index);
      residual -= ATAN_TURNS[index] ?? 0;
    } else {
      x = oldX + (oldY >> index);
      y = oldY - (oldX >> index);
      residual += ATAN_TURNS[index] ?? 0;
    }
  }
  return { x: (x * sign) / ROTATION_SCALE, y: (y * sign) / ROTATION_SCALE };
}

export function angleForVector(x: number, y: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return 0;
  let vx = Math.round(x * VECTOR_SCALE);
  let vy = Math.round(y * VECTOR_SCALE);
  let base = 0;
  if (vx < 0) {
    base = vy >= 0 ? HALF_TURN : -HALF_TURN;
    vx = -vx;
    vy = -vy;
  }

  let angle = 0;
  for (let index = 0; index < ATAN_TURNS.length; index += 1) {
    const oldX = vx;
    const oldY = vy;
    if (oldY > 0) {
      vx = oldX + (oldY >> index);
      vy = oldY - (oldX >> index);
      angle += ATAN_TURNS[index] ?? 0;
    } else if (oldY < 0) {
      vx = oldX - (oldY >> index);
      vy = oldY + (oldX >> index);
      angle -= ATAN_TURNS[index] ?? 0;
    }
  }
  const signedTurns = base + angle;
  return signedTurns * TWO_PI / FULL_TURN;
}
