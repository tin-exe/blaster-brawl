export type InputSource = 'touch' | 'keyboard' | 'gamepad';

export function shouldShowTouchControls(
  touchDevice: boolean,
  enabledInOptions: boolean,
  source: InputSource,
): boolean {
  return source === 'touch' && (touchDevice || enabledInOptions);
}
