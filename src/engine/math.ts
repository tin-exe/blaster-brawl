export class InputController {
  // ... existing code ...
  private readonly canvas: HTMLCanvasElement;
  private readonly knownCodes: ReadonlySet<string> = new Set<string>([
    ...Object.values(CONFIG.input.player1).flat(),
    ...Object.values(CONFIG.input.player2).flat(),
    ...Object.values(CONFIG.input.singlePlayerAliases).flat(),
    CONFIG.input.pause,
    ...CONFIG.input.menuUp,
    ...CONFIG.input.menuDown,
    ...CONFIG.input.menuAccept,
    ...CONFIG.input.menuBack,
  ]);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const code = event.code;
    const browserShortcut = (event.ctrlKey || event.metaKey)
      && !code.startsWith('Control') && !code.startsWith('Meta');
    if (!browserShortcut && this.knownCodes.has(code)) event.preventDefault();
    if (!this.held.has(code)) this.pressed.add(code);
    this.held.add(code);
  };

  private readonly onBlur = (): void => {
    this.held.clear();
    this.pressed.clear();
    this.pointerDown = false;
    this.pointerPressed = false;
  };

  // ... existing code ...

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}
