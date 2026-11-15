import { CONFIG } from '../config';
import type { Fighter, Platform } from '../types';

export function platformAtFoot(x: number, footY: number, tolerance = 8): Platform | undefined {
  return CONFIG.world.platforms.find((platform) =>
    x >= platform.x && x <= platform.x + platform.width && Math.abs(footY - platform.y) <= tolerance,
  );
}

export function landingPlatform(previousBottom: number, nextBottom: number, left: number, right: number, platforms: readonly Platform[] = CONFIG.world.platforms): Platform | undefined {
  if (nextBottom < previousBottom) return undefined;
  return platforms.find((platform) =>
    previousBottom <= platform.y && nextBottom >= platform.y && right > platform.x + 2 && left < platform.x + platform.width - 2,
  );
}

export function distanceToPlatformEdge(fighter: Fighter, direction: -1 | 1 = fighter.facing, platforms: readonly Platform[] = CONFIG.world.platforms): number {
  const foot = fighter.y + fighter.height;
  const platform = platforms.find((item) => fighter.x >= item.x && fighter.x <= item.x + item.width && Math.abs(foot - item.y) <= 15);
  if (!platform) return 0;
  return direction > 0 ? platform.x + platform.width - fighter.x : fighter.x - platform.x;
}
