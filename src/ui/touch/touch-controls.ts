import type { GameSettings } from '../../storage/settings';
import { shouldShowTouchControls, type InputSource } from './input-source';
import { TouchInputState, type TouchAction } from './touch-input';

const SCALE_CLASSES = ['size-small', 'size-medium', 'size-large'] as const;
const OPACITY_CLASSES = ['opacity-low', 'opacity-medium', 'opacity-high'] as const;

export class TouchControls {
  readonly input = new TouchInputState();
  readonly isTouchDevice: boolean;
  private readonly root: HTMLElement;
  private readonly joystick: HTMLElement;
  private settings: GameSettings;
  private source: InputSource;
  private gameActive = false;
  private readonly pressedTargets = new Map<number, HTMLElement>();
  private joystickPointerId: number | null = null;
  private joystickOriginX = 0;
  private joystickOriginY = 0;

  constructor(root: HTMLElement, joystick: HTMLElement, settings: GameSettings) {
    this.root = root;
    this.joystick = joystick;
    this.settings = settings;
    this.isTouchDevice = (navigator.maxTouchPoints ?? 0) > 0 || window.matchMedia('(pointer: coarse)').matches;
    this.source = this.isTouchDevice ? 'touch' : 'keyboard';
    this.root.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    this.root.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerEnd, { passive: false });
    window.addEventListener('pointercancel', this.onPointerEnd, { passive: false });
    window.addEventListener('blur', this.onWindowBlur);
    this.applySettings();
  }

  setInputSource(source: InputSource): void {
    this.source = source;
    this.refreshVisibility();
  }

  useTouchInput(): void { this.setInputSource('touch'); }
  get activeForPlayer(): boolean { return this.gameActive && !this.root.hidden; }

  setGameActive(active: boolean): void {
    this.gameActive = active;
    this.refreshVisibility();
  }

  updateSettings(settings: GameSettings): void {
    this.settings = settings;
    this.applySettings();
  }

  applySettings(): void {
    this.root.classList.remove(...SCALE_CLASSES, ...OPACITY_CLASSES, 'left-handed');
    const scale = this.settings.touchControlSize < 0.9 ? SCALE_CLASSES[0] : this.settings.touchControlSize > 1.1 ? SCALE_CLASSES[2] : SCALE_CLASSES[1];
    const opacity = this.settings.touchOpacity < 0.5 ? OPACITY_CLASSES[0] : this.settings.touchOpacity < 0.75 ? OPACITY_CLASSES[1] : OPACITY_CLASSES[2];
    this.root.classList.add(scale, opacity);
    this.root.classList.toggle('left-handed', this.settings.leftHanded);
    if (this.settings.touchControlsEnabled && !this.isTouchDevice && this.source === 'keyboard') this.source = 'touch';
    this.refreshVisibility();
  }

  destroy(): void {
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerEnd);
    window.removeEventListener('pointercancel', this.onPointerEnd);
    window.removeEventListener('blur', this.onWindowBlur);
    this.input.clear();
    this.clearPressedTargets();
    this.resetJoystickVisual();
  }

  private refreshVisibility(): void {
    const visible = this.gameActive && shouldShowTouchControls(this.isTouchDevice, this.settings.touchControlsEnabled, this.source);
    this.root.hidden = !visible;
    if (!visible) {
      this.input.clear();
      this.clearPressedTargets();
      this.resetJoystickVisual();
    }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const element = event.target instanceof Element ? event.target : null;
    const actionTarget = element?.closest<HTMLElement>('[data-touch-action]') ?? null;
    const leftZone = element?.closest<HTMLElement>('#touch-left') ?? null;
    const target = actionTarget ?? (leftZone ? this.joystick : null);
    if (!target || !this.root.contains(target)) return;
    event.preventDefault();
    this.source = 'touch';
    this.root.hidden = false;
    const action = (actionTarget?.dataset.touchAction as TouchAction | undefined) ?? (leftZone ? 'joystick' : undefined);
    if (!action) return;
    if (action === 'joystick' && this.joystickPointerId !== null) return;
    this.input.pointerDown(event.pointerId, action);
    this.pressedTargets.set(event.pointerId, target);
    target.classList.add('is-pressed');
    if (action === 'joystick') this.anchorJoystick(event);
    try { target.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional in embedded browsers. */ }
    if (action === 'joystick') this.updateJoystick(event);
    if (this.settings.haptics && action !== 'joystick' && 'vibrate' in navigator) navigator.vibrate(10);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.input.getAction(event.pointerId) !== 'joystick') return;
    event.preventDefault();
    this.updateJoystick(event);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    const action = this.input.getAction(event.pointerId);
    if (action) event.preventDefault();
    this.input.pointerUp(event.pointerId);
    if (action === 'joystick') this.resetJoystickVisual();
    const target = this.pressedTargets.get(event.pointerId);
    this.pressedTargets.delete(event.pointerId);
    if (target && ![...this.pressedTargets.values()].includes(target)) target.classList.remove('is-pressed');
  };

  private readonly onWindowBlur = (): void => {
    this.input.clear();
    this.clearPressedTargets();
    this.resetJoystickVisual();
  };

  private clearPressedTargets(): void {
    for (const target of this.pressedTargets.values()) target.classList.remove('is-pressed');
    this.pressedTargets.clear();
  }

  private updateJoystick(event: PointerEvent): void {
    const bounds = this.joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.5);
    const dx = event.clientX - this.joystickOriginX;
    const dy = event.clientY - this.joystickOriginY;
    this.input.setJoystick(
      event.pointerId,
      dx,
      dy,
      radius * 0.58,
    );
    const travel = Math.hypot(dx, dy);
    const scale = travel > radius * 0.52 ? radius * 0.52 / travel : 1;
    this.joystick.style.setProperty('--joystick-x', `${dx * scale}px`);
    this.joystick.style.setProperty('--joystick-y', `${dy * scale}px`);
  }

  private anchorJoystick(event: PointerEvent): void {
    const bounds = this.joystick.getBoundingClientRect();
    const halfWidth = bounds.width * 0.5;
    const halfHeight = bounds.height * 0.5;
    this.joystickPointerId = event.pointerId;
    this.joystickOriginX = event.clientX;
    this.joystickOriginY = event.clientY;
    this.joystick.style.position = 'fixed';
    this.joystick.style.left = `${Math.max(halfWidth, Math.min(window.innerWidth - halfWidth, event.clientX))}px`;
    this.joystick.style.top = `${Math.max(halfHeight, Math.min(window.innerHeight - halfHeight, event.clientY))}px`;
    this.joystick.style.bottom = 'auto';
    this.joystick.style.transform = 'translate(-50%, -50%)';
    this.joystick.style.zIndex = '4';
    this.joystick.style.setProperty('--joystick-x', '0px');
    this.joystick.style.setProperty('--joystick-y', '0px');
  }

  private resetJoystickVisual(): void {
    this.joystickPointerId = null;
    this.joystick.style.position = '';
    this.joystick.style.left = '';
    this.joystick.style.top = '';
    this.joystick.style.bottom = '';
    this.joystick.style.transform = '';
    this.joystick.style.zIndex = '';
    this.joystick.style.removeProperty('--joystick-x');
    this.joystick.style.removeProperty('--joystick-y');
  }
}
