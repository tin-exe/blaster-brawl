import { CONFIG } from '../config';
import type { Fighter, Platform } from '../types';

export function platformAtFoot(x: number, footY: number, tolerance = 8): Platform | undefined {
  return CONFIG.world.platforms.find((platform) =>
    x >= platform.x && x <= platform.x + platform.width && Math.abs(footY - platform.y) <= tolerance,
  );
}

export function landingPlatform(previousBottom: number, nextBottom: number, left: number, right: number): Platform | undefined {
  if (nextBottom < previousBottom) return undefined;
  return CONFIG.world.platforms.find((platform) =>
    previousBottom <= platform.y && nextBottom >= platform.y && right > platform.x + 2 && left < platform.x + platform.width - 2,
  );
}

export function distanceToPlatformEdge(fighter: Fighter, direction: -1 | 1 = fighter.facing): number {
  const foot = fighter.y + fighter.height;
  const platform = platformAtFoot(fighter.x, foot, 15);
  if (!platform) return 0;
  return direction > 0 ? platform.x + platform.width - fighter.x : fighter.x - platform.x;
}
