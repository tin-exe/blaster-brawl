import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputController } from './input';

function makeInput(): { controller: InputController; canvas: HTMLCanvasElement; windowListeners: Map<string, (...args: any[]) => void>; canvasListeners: Map<string, (...args: any[]) => void> } {
  const windowListeners = new Map<string, (...args: any[]) => void>();
  const canvasListeners = new Map<string, (...args: any[]) => void>();
  const fakeWindow = {
    addEventListener: vi.fn((type: string, listener: (...args: any[]) => void) => windowListeners.set(type, listener)),
    removeEventListener: vi.fn(),
  };
  const canvas = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 480, height: 270 }),
    addEventListener: vi.fn((type: string, listener: (...args: any[]) => void) => canvasListeners.set(type, listener)),
    removeEventListener: vi.fn(),
    setPointerCapture: vi.fn(),
  } as unknown as HTMLCanvasElement;
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('navigator', { getGamepads: () => null });
  return { controller: new InputController(canvas), canvas, windowListeners, canvasListeners };
}

afterEach(() => vi.unstubAllGlobals());

describe('keyboard and canvas pointer input', () => {
  it('keeps keyboard movement held and sends jump as a single press edge', () => {
    const { controller, windowListeners } = makeInput();
    const preventDefault = vi.fn();
    windowListeners.get('keydown')?.({ code: 'KeyW', preventDefault } as unknown as KeyboardEvent);

    expect(controller.frame()).toMatchObject({ jumpPressed: true, jumpHeld: true });
    expect(controller.frame()).toMatchObject({ jumpPressed: false, jumpHeld: true });
    expect(preventDefault).toHaveBeenCalledOnce();

    windowListeners.get('keyup')?.({ code: 'KeyW' } as KeyboardEvent);
    expect(controller.frame().jumpHeld).toBe(false);
    controller.destroy();
  });

  it('tracks hover for one frame and preserves pointer-down activation coordinates', () => {
    const { controller, windowListeners, canvasListeners } = makeInput();
    canvasListeners.get('pointermove')?.({ clientX: 250, clientY: 100 } as PointerEvent);
    expect(controller.frame()).toMatchObject({ pointerX: 480, pointerY: 160, pointerMoved: true });
    expect(controller.frame().pointerMoved).toBe(false);

    canvasListeners.get('pointerdown')?.({ button: 0, pointerId: 3, clientX: 250, clientY: 100 } as PointerEvent);
    expect(controller.frame()).toMatchObject({ pointerPressed: true, pointerDown: true, pointerMoved: true });
    windowListeners.get('pointerup')?.({} as PointerEvent);
    expect(controller.frame().pointerDown).toBe(false);
    controller.destroy();
  });

  it('treats pointer capture rejection as a recoverable touch interruption', () => {
    const { controller, canvas, canvasListeners } = makeInput();
    vi.spyOn(canvas, 'setPointerCapture').mockImplementation(() => { throw new Error('no active pointer'); });

    expect(() => canvasListeners.get('pointerdown')?.({ button: 0, pointerId: 7, clientX: 250, clientY: 100 } as PointerEvent)).not.toThrow();
    expect(controller.frame()).toMatchObject({ pointerPressed: true, pointerDown: true });
    controller.destroy();
  });
});
