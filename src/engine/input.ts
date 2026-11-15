import { CONFIG } from '../config';
import type { InputFrame, PlayerInput } from '../types';

type PlayerKeyMapping = {
  readonly moveLeft: readonly string[];
  readonly moveRight: readonly string[];
  readonly jump: readonly string[];
  readonly shoot: readonly string[];
  readonly switchWeapon: readonly string[];
};
type ArrowAliases = { moveLeft?: readonly string[]; moveRight?: readonly string[]; jump?: readonly string[] };
const EMPTY_CODES: readonly string[] = [];
const EMPTY_ALIASES: ArrowAliases = {};

export class InputController {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private pointerX = 0;
  private pointerY = 0;
  private pointerPressed = false;
  private pointerDown = false;
  private pointerMoved = false;
  private padLeft = false;
  private padRight = false;
  private padJump = false;
  private padSwitch = false;
  private padPause = false;
  private padUp = false;
  private padDown = false;
  private padAccept = false;
  private padBack = false;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const code = event.code;
    const knownCodes: readonly string[] = [
      ...Object.values(CONFIG.input.player1).flat(),
      ...Object.values(CONFIG.input.player2).flat(),
      ...Object.values(CONFIG.input.singlePlayerAliases).flat(),
      CONFIG.input.pause,
      ...CONFIG.input.menuUp,
      ...CONFIG.input.menuDown,
      ...CONFIG.input.menuAccept,
      ...CONFIG.input.menuBack,
    ];
    if (knownCodes.includes(code)) event.preventDefault();
    if (!this.held.has(code)) this.pressed.add(code);
    this.held.add(code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => { this.held.delete(event.code); };
  private readonly onBlur = (): void => { this.held.clear(); this.pressed.clear(); this.pointerDown = false; };

  private updatePointer(event: PointerEvent): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointerX = (event.clientX - bounds.left) / Math.max(1, bounds.width) * CONFIG.canvas.width;
    this.pointerY = (event.clientY - bounds.top) / Math.max(1, bounds.height) * CONFIG.canvas.height;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.updatePointer(event);
    this.pointerMoved = true;
  };
  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.updatePointer(event);
    this.pointerPressed = true;
    this.pointerDown = true;
    this.pointerMoved = true;
    this.canvas.setPointerCapture?.(event.pointerId);
  };
  private readonly onPointerUp = (): void => { this.pointerDown = false; };
  private readonly onContextMenu = (event: MouseEvent): void => { event.preventDefault(); };

  private heldAny(codes: readonly string[]): boolean { return codes.some((code) => this.held.has(code)); }
  private pressedAny(codes: readonly string[]): boolean { return codes.some((code) => this.pressed.has(code)); }

  private playerInput(mapping: PlayerKeyMapping, aliases: ArrowAliases = EMPTY_ALIASES): PlayerInput {
    const aliasLeft = aliases.moveLeft ?? EMPTY_CODES;
    const aliasRight = aliases.moveRight ?? EMPTY_CODES;
    const aliasJump = aliases.jump ?? EMPTY_CODES;
    return {
      left: this.heldAny(mapping.moveLeft) || this.heldAny(aliasLeft),
      right: this.heldAny(mapping.moveRight) || this.heldAny(aliasRight),
      leftPressed: this.pressedAny(mapping.moveLeft) || this.pressedAny(aliasLeft),
      rightPressed: this.pressedAny(mapping.moveRight) || this.pressedAny(aliasRight),
      jumpPressed: this.pressedAny(mapping.jump) || this.pressedAny(aliasJump),
      jumpHeld: this.heldAny(mapping.jump) || this.heldAny(aliasJump),
      shoot: this.heldAny(mapping.shoot),
      switchPressed: this.pressedAny(mapping.switchWeapon),
    };
  }

  frame(humanPlayers: 1 | 2 = 1): InputFrame {
    const player1 = this.playerInput(CONFIG.input.player1, humanPlayers === 1 ? CONFIG.input.singlePlayerAliases : {});
    const player2 = this.playerInput(CONFIG.input.player2);
    let gamepad: Gamepad | null = null;
    try {
      const pads = navigator.getGamepads?.();
      if (pads) for (let index = 0; index < pads.length; index += 1) {
        const candidate = pads[index];
        if (candidate?.connected) { gamepad = candidate; break; }
      }
    } catch { /* Gamepad access can be unavailable in embedded or privacy-restricted browsers. */ }
    const axisX = gamepad?.axes[0] ?? 0;
    const axisY = gamepad?.axes[1] ?? 0;
    const gamepadLeft = axisX < -0.25 || (gamepad?.buttons[14]?.pressed ?? false);
    const gamepadRight = axisX > 0.25 || (gamepad?.buttons[15]?.pressed ?? false);
    const gamepadJump = gamepad?.buttons[0]?.pressed ?? false;
    const gamepadSwitch = gamepad?.buttons[3]?.pressed ?? false;
    const gamepadPause = gamepad?.buttons[9]?.pressed ?? false;
    const gamepadUp = axisY < -0.55 || (gamepad?.buttons[12]?.pressed ?? false);
    const gamepadDown = axisY > 0.55 || (gamepad?.buttons[13]?.pressed ?? false);
    const gamepadAccept = gamepadJump;
    const gamepadBack = gamepad?.buttons[1]?.pressed ?? false;
    player1.left ||= gamepadLeft;
    player1.right ||= gamepadRight;
    player1.leftPressed ||= gamepadLeft && !this.padLeft;
    player1.rightPressed ||= gamepadRight && !this.padRight;
    player1.jumpPressed ||= gamepadJump && !this.padJump;
    player1.jumpHeld ||= gamepadJump;
    player1.shoot ||= (gamepad?.buttons[7]?.pressed ?? false) || (gamepad?.buttons[2]?.pressed ?? false);
    player1.switchPressed ||= gamepadSwitch && !this.padSwitch;
    const gamepadPausePressed = gamepadPause && !this.padPause;
    const gamepadMenuUp = gamepadUp && !this.padUp;
    const gamepadMenuDown = gamepadDown && !this.padDown;
    const gamepadMenuAccept = gamepadAccept && !this.padAccept;
    const gamepadMenuBack = gamepadBack && !this.padBack;
    this.padLeft = gamepadLeft;
    this.padRight = gamepadRight;
    this.padJump = gamepadJump;
    this.padSwitch = gamepadSwitch;
    this.padPause = gamepadPause;
    this.padUp = gamepadUp;
    this.padDown = gamepadDown;
    this.padAccept = gamepadAccept;
    this.padBack = gamepadBack;
    const frame: InputFrame = {
      ...player1,
      player2,
      pausePressed: this.pressed.has(CONFIG.input.pause) || gamepadPausePressed,
      menuUp: this.pressedAny(CONFIG.input.menuUp) || gamepadMenuUp,
      menuDown: this.pressedAny(CONFIG.input.menuDown) || gamepadMenuDown,
      menuAccept: this.pressedAny(CONFIG.input.menuAccept) || gamepadMenuAccept,
      menuBack: this.pressedAny(CONFIG.input.menuBack) || gamepadMenuBack,
      pointerX: this.pointerX,
      pointerY: this.pointerY,
      pointerPressed: this.pointerPressed,
      pointerDown: this.pointerDown,
      pointerMoved: this.pointerMoved,
    };
    this.pressed.clear();
    this.pointerPressed = false;
    this.pointerMoved = false;
    return frame;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}
