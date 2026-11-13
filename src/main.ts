import { AudioManager } from './audio/audio';
import { CONFIG } from './config';
import { InputController } from './engine/input';
import { adjustMatchConfig, DEFAULT_MATCH_CONFIG } from './game/match-config';
import { MatchScene } from './scenes/match';
import { renderGame, type RenderState, type ScreenMode } from './render/renderer';
import { loadSettings, saveSettings, type GameSettings } from './storage/settings';
import { TouchControls } from './ui/touch/touch-controls';
import { mergeTouchInput } from './ui/touch/touch-input';
import { shouldLowerQuality } from './game/quality';
import type { InputFrame, MatchConfig } from './types';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing game element: ${id}`);
  return element as T;
}

const canvas = requiredElement<HTMLCanvasElement>('game');
const app = requiredElement<HTMLElement>('app');
const loading = requiredElement<HTMLElement>('loading');
const progress = requiredElement<HTMLProgressElement>('loading-progress');
const loadingLabel = requiredElement<HTMLElement>('loading-label');
const errorScreen = requiredElement<HTMLElement>('error-screen');
const errorMessage = requiredElement<HTMLElement>('error-message');
const muteButton = requiredElement<HTMLButtonElement>('mute-toggle');
const fullscreenButton = requiredElement<HTMLButtonElement>('fullscreen-toggle');
const reloadButton = requiredElement<HTMLButtonElement>('reload-game');
const touchRoot = requiredElement<HTMLElement>('touch-controls');
const joystickPad = requiredElement<HTMLElement>('joystick-pad');
const rotateOverlay = requiredElement<HTMLElement>('rotate-overlay');
const maybeContext = canvas.getContext('2d', { alpha: false });
if (!maybeContext) throw new Error('Canvas rendering is not available in this browser.');
const context: CanvasRenderingContext2D = maybeContext;

const input = new InputController(canvas);
let settings: GameSettings = loadSettings();
const audio = new AudioManager(settings.muted);
const touchControls = new TouchControls(touchRoot, joystickPad, settings);
let screen: ScreenMode = 'menu';
let match: MatchScene | null = null;
let paused = false;
let menuIndex = 0;
let customIndex = 0;
let customConfig: MatchConfig = DEFAULT_MATCH_CONFIG;
let lastMatchConfig: MatchConfig = DEFAULT_MATCH_CONFIG;
let optionsIndex = 0;
let resultIndex = 0;
let pauseIndex = 0;
let elapsed = 0;
let menuToast = '';
let menuToastTimer = 0;
let lastFrame = performance.now();
let accumulator = 0;
let queuedJump = false;
let queuedSwitch = false;
let queuedPlayer2Jump = false;
let queuedPlayer2Switch = false;
let slowFrameSamples = 0;
let healthyFrameSamples = 0;
let reducedParticleQuality = false;
let lowQualityActive = false;
let pausedForOrientation = false;
const qualitySamples: number[] = [];
let stopped = false;
let booted = false;
let nextGamepadCheck = 0;
const stepSeconds = 1 / CONFIG.canvas.targetFps;
const bootStarted = performance.now();

function persist(): void {
  saveSettings(settings);
  audio.setMuted(settings.muted);
  touchControls.updateSettings(settings);
  muteButton.textContent = settings.muted ? 'SOUND OFF' : 'SOUND ON';
  muteButton.setAttribute('aria-pressed', String(settings.muted));
  muteButton.setAttribute('aria-label', settings.muted ? 'Unmute sound' : 'Mute sound');
}

persist();

function resizeCanvas(): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(CONFIG.canvas.width * ratio);
  canvas.height = Math.round(CONFIG.canvas.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.visualViewport?.addEventListener('resize', resizeCanvas);

function updateOrientationState(): void {
  const portrait = window.innerHeight > window.innerWidth;
  rotateOverlay.hidden = !portrait;
  if (screen !== 'match') return;
  if (portrait && !paused) {
    paused = true;
    pausedForOrientation = true;
    accumulator = 0;
    clearQueuedGameInput();
  } else if (!portrait && pausedForOrientation) {
    paused = false;
    pausedForOrientation = false;
    accumulator = 0;
  }
}

updateOrientationState();
window.addEventListener('resize', updateOrientationState);
window.addEventListener('orientationchange', updateOrientationState);

function showError(message: string): void {
  stopped = true;
  errorMessage.textContent = message;
  errorScreen.hidden = false;
  loading.hidden = true;
}

window.addEventListener('error', (event) => showError(event.message || 'An unexpected game error occurred.'));
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  showError(reason instanceof Error ? reason.message : 'An unexpected game error occurred.');
});
reloadButton.addEventListener('click', () => window.location.reload());
document.addEventListener('pointerdown', () => { void audio.unlock(); }, { once: true, passive: true });
document.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch') touchControls.useTouchInput();
}, { passive: true });
window.addEventListener('keydown', () => touchControls.setInputSource('keyboard'), { passive: true });
window.addEventListener('gamepadconnected', () => touchControls.setInputSource('gamepad'));

function pauseForInterruption(): void {
  if (screen === 'match' && !paused) paused = true;
  accumulator = 0;
  clearQueuedGameInput();
  void audio.suspend();
}

window.addEventListener('blur', pauseForInterruption);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseForInterruption();
  else {
    lastFrame = performance.now();
    void audio.resume();
  }
});

muteButton.addEventListener('click', () => {
  void audio.unlock();
  settings = { ...settings, muted: !settings.muted };
  persist();
});

fullscreenButton.addEventListener('click', () => {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => setMenuToast('FULLSCREEN COULD NOT CLOSE.'));
  } else if (app.requestFullscreen) {
    void app.requestFullscreen().catch(() => setMenuToast('FULLSCREEN IS NOT AVAILABLE HERE.'));
  } else {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setMenuToast(isIOS ? 'IPHONE TIP: SHARE → ADD TO HOME SCREEN FOR A FULL-SCREEN GAME.' : 'FULLSCREEN IS NOT AVAILABLE HERE.');
  }
});

document.addEventListener('fullscreenchange', () => {
  fullscreenButton.textContent = document.fullscreenElement ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  fullscreenButton.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  resizeCanvas();
});

function setMenuToast(message: string): void {
  menuToast = message;
  menuToastTimer = CONFIG.hud.toastSeconds;
}

function startMatch(config: MatchConfig = lastMatchConfig): void {
  lastMatchConfig = config;
  match = new MatchScene(settings, audio, config);
  screen = 'match';
  paused = false;
  resultIndex = 0;
  pauseIndex = 0;
  accumulator = 0;
  queuedJump = false;
  queuedSwitch = false;
  queuedPlayer2Jump = false;
  queuedPlayer2Switch = false;
  slowFrameSamples = 0;
  healthyFrameSamples = 0;
  reducedParticleQuality = false;
  qualitySamples.length = 0;
  lowQualityActive = settings.qualityMode === 'low';
  reducedParticleQuality = lowQualityActive;
  const particleLimit = settings.qualityMode === 'high'
    ? CONFIG.particles.poolSize
    : settings.qualityMode === 'low' || touchControls.isTouchDevice
      ? CONFIG.performance.mobileParticleLimit
      : CONFIG.particles.poolSize;
  match.setParticleLimit(particleLimit);
  match.setParticleQuality(lowQualityActive ? CONFIG.performance.particleQualityReduced : 1);
  match.shakeIntensity = settings.shake * (lowQualityActive ? 0.35 : 1);
  if (settings.qualityMode === 'high') match.setParticleQuality(1);
  updateOrientationState();
  canvas.focus({ preventScroll: true });
}

function setMute(): void {
  settings = { ...settings, muted: !settings.muted };
  persist();
}

function setMenuSelectionFromPointer(x: number, y: number): void {
  const panelWidth = CONFIG.menu.panelWidth;
  const panelX = CONFIG.canvas.width - CONFIG.menu.rightMargin - panelWidth;
  const top = 180 + 28;
  if (x < panelX || x > panelX + panelWidth) return;
  const index = Math.floor((y - top + CONFIG.menu.rowHeight * 0.5) / CONFIG.menu.rowHeight);
  if (index >= 0 && index < CONFIG.menu.items.length) menuIndex = index;
}

function updateMenu(frame: InputFrame): void {
  if (frame.menuUp) menuIndex = (menuIndex + CONFIG.menu.items.length - 1) % CONFIG.menu.items.length;
  if (frame.menuDown) menuIndex = (menuIndex + 1) % CONFIG.menu.items.length;
  if (frame.pointerDown || frame.pointerPressed) setMenuSelectionFromPointer(frame.pointerX, frame.pointerY);
  if (!(frame.menuAccept || frame.pointerPressed)) return;
  const selected = CONFIG.menu.items[menuIndex];
  if (!selected) return;
  audio.play('menu');
  if (selected.id === 'play') startMatch(DEFAULT_MATCH_CONFIG);
  else if (selected.id === 'options') screen = 'options';
  else if (selected.id === 'custom') {
    customConfig = DEFAULT_MATCH_CONFIG;
    customIndex = 0;
    screen = 'custom';
  } else setMenuToast(CONFIG.copy.comingSoon);
}

function updateCustomGame(frame: InputFrame): void {
  const rowCount = 7;
  if (frame.menuUp) customIndex = (customIndex + rowCount - 1) % rowCount;
  if (frame.menuDown) customIndex = (customIndex + 1) % rowCount;
  if (frame.menuBack) { screen = 'menu'; return; }

  let pointerSelected = false;
  if (frame.pointerPressed && frame.pointerX > 196 && frame.pointerX < 764 && frame.pointerY > 157 && frame.pointerY < 438) {
    customIndex = Math.max(0, Math.min(rowCount - 1, Math.floor((frame.pointerY - 171) / 37)));
    pointerSelected = true;
  }
  if (customIndex === 5 && (frame.menuAccept || pointerSelected)) { audio.play('menu'); startMatch(customConfig); return; }
  if (customIndex === 6 && (frame.menuAccept || pointerSelected)) { screen = 'menu'; return; }

  const direction = frame.rightPressed ? 1 : frame.leftPressed ? -1 : (frame.menuAccept || pointerSelected) ? 1 : 0;
  if (direction === 0 || customIndex > 4) return;
  const fields = ['mode', 'bots', 'difficulty', 'stocks', 'weapons'] as const;
  const field = fields[customIndex];
  if (field) {
    audio.play('menu');
    const next = adjustMatchConfig(customConfig, field, direction);
    if (field === 'mode' && (touchControls.isTouchDevice || settings.touchControlsEnabled) && next.humanPlayers === 2) {
      setMenuToast('LOCAL 2 PLAYER REQUIRES A KEYBOARD.');
      return;
    }
    customConfig = next;
  }
}

function updateOptions(frame: InputFrame): void {
  const optionCount = 10;
  if (frame.menuUp) optionsIndex = (optionsIndex + optionCount - 1) % optionCount;
  if (frame.menuDown) optionsIndex = (optionsIndex + 1) % optionCount;
  if (frame.menuBack || (frame.pointerPressed && frame.pointerY > CONFIG.canvas.height - 80)) {
    screen = 'menu';
    return;
  }
  if (frame.pointerPressed && frame.pointerX > 130 && frame.pointerX < 830 && frame.pointerY > 145 && frame.pointerY < 450) {
    optionsIndex = Math.max(0, Math.min(optionCount - 1, Math.floor((frame.pointerY - 158) / 29)));
    applyOptionChange(1);
    return;
  } else if (frame.pointerDown && frame.pointerX > 130 && frame.pointerX < 830 && frame.pointerY > 145 && frame.pointerY < 450) {
    optionsIndex = Math.max(0, Math.min(optionCount - 1, Math.floor((frame.pointerY - 158) / 29)));
  }
  if (frame.menuAccept) applyOptionChange(1);
  if (frame.leftPressed) applyOptionChange(-1);
  if (frame.rightPressed) applyOptionChange(1);
}

function applyOptionChange(direction: number): void {
  if (optionsIndex === 0) setMute();
  else if (optionsIndex === 1) {
    const next = Math.min(CONFIG.settings.maxShake, Math.max(CONFIG.settings.minShake, settings.shake + direction * CONFIG.feedback.shakeStep));
    settings = { ...settings, shake: Number(next.toFixed(2)) };
    persist();
  } else if (optionsIndex === 2) {
    const size = CONFIG.fighters.colorways.length;
    settings = { ...settings, colorIndex: (settings.colorIndex + direction + size) % size };
    persist();
  } else if (optionsIndex === 3) {
    const size = CONFIG.fighters.hatStyles.length;
    settings = { ...settings, hatIndex: (settings.hatIndex + direction + size) % size };
    persist();
  } else if (optionsIndex === 4) {
    settings = { ...settings, touchControlsEnabled: !settings.touchControlsEnabled };
    persist();
  } else if (optionsIndex === 5) {
    const values = [0.8, 1, 1.2];
    const index = values.indexOf(settings.touchControlSize);
    settings = { ...settings, touchControlSize: values[(index + direction + values.length) % values.length] ?? 1 };
    persist();
  } else if (optionsIndex === 6) {
    const values = [0.42, 0.62, 0.82];
    const index = values.indexOf(settings.touchOpacity);
    settings = { ...settings, touchOpacity: values[(index + direction + values.length) % values.length] ?? 0.62 };
    persist();
  } else if (optionsIndex === 7) {
    settings = { ...settings, leftHanded: !settings.leftHanded };
    persist();
  } else if (optionsIndex === 8) {
    settings = { ...settings, haptics: !settings.haptics };
    persist();
  } else {
    const values = ['auto', 'low', 'high'] as const;
    const index = values.indexOf(settings.qualityMode);
    settings = { ...settings, qualityMode: values[(index + direction + values.length) % values.length] ?? 'auto' };
    persist();
    if (match) {
      lowQualityActive = settings.qualityMode === 'low';
      reducedParticleQuality = lowQualityActive;
      match.setParticleLimit(settings.qualityMode === 'low' ? CONFIG.performance.mobileParticleLimit : touchControls.isTouchDevice ? CONFIG.performance.mobileParticleLimit : CONFIG.particles.poolSize);
      match.setParticleQuality(lowQualityActive ? CONFIG.performance.particleQualityReduced : 1);
      match.shakeIntensity = settings.shake * (lowQualityActive ? 0.35 : 1);
      if (settings.qualityMode === 'auto') qualitySamples.length = 0;
    }
  }
}

function updatePause(frame: InputFrame): void {
  if (frame.pausePressed || frame.menuBack) {
    paused = false;
    return;
  }
  if (frame.menuUp) pauseIndex = (pauseIndex + 2) % 3;
  if (frame.menuDown) pauseIndex = (pauseIndex + 1) % 3;
  if (frame.pointerDown && frame.pointerX > 300 && frame.pointerX < 660 && frame.pointerY > 230 && frame.pointerY < 360) {
    pauseIndex = Math.max(0, Math.min(2, Math.floor((frame.pointerY - 239) / 42)));
  }
  if (!(frame.menuAccept || frame.pointerPressed)) return;
  if (pauseIndex === 0) paused = false;
  else if (pauseIndex === 1) startMatch(lastMatchConfig);
  else {
    screen = 'menu';
    paused = false;
    match = null;
  }
}

function updateResult(frame: InputFrame): void {
  if (frame.menuUp || frame.menuDown) resultIndex = (resultIndex + 1) % 2;
  if (frame.pointerDown && frame.pointerY > 295 && frame.pointerY < 385) resultIndex = frame.pointerY < 344 ? 0 : 1;
  if (!(frame.menuAccept || frame.pointerPressed)) return;
  if (resultIndex === 0) startMatch(lastMatchConfig);
  else {
    screen = 'menu';
    match = null;
  }
}

function mergeGameInput(frame: InputFrame): InputFrame {
  queuedJump ||= frame.jumpPressed;
  queuedSwitch ||= frame.switchPressed;
  queuedPlayer2Jump ||= frame.player2.jumpPressed;
  queuedPlayer2Switch ||= frame.player2.switchPressed;
  return {
    ...frame,
    jumpPressed: queuedJump,
    switchPressed: queuedSwitch,
    player2: { ...frame.player2, jumpPressed: queuedPlayer2Jump, switchPressed: queuedPlayer2Switch },
  };
}

function clearQueuedGameInput(): void {
  queuedJump = false;
  queuedSwitch = false;
  queuedPlayer2Jump = false;
  queuedPlayer2Switch = false;
}

function monitorParticleQuality(frameMilliseconds: number): void {
  if (!match || screen !== 'match') return;
  if (settings.qualityMode !== 'auto') {
    const low = settings.qualityMode === 'low';
    match.setParticleLimit(low ? CONFIG.performance.mobileParticleLimit : CONFIG.particles.poolSize);
    match.setParticleQuality(low ? CONFIG.performance.particleQualityReduced : 1);
    match.shakeIntensity = settings.shake * (low ? 0.35 : 1);
    lowQualityActive = low;
    reducedParticleQuality = low;
    return;
  }
  if (qualitySamples.length < CONFIG.performance.mobileSampleFrames) {
    qualitySamples.push(frameMilliseconds);
    if (qualitySamples.length === CONFIG.performance.mobileSampleFrames && shouldLowerQuality(qualitySamples, CONFIG.performance.mobileTargetFps, CONFIG.performance.mobileSampleFrames)) {
      match.setParticleLimit(CONFIG.performance.mobileParticleLimit);
      match.setParticleQuality(CONFIG.performance.particleQualityReduced);
      match.shakeIntensity = settings.shake * 0.35;
      lowQualityActive = true;
      reducedParticleQuality = true;
    }
  }
  if (frameMilliseconds > CONFIG.performance.slowFrameMs) {
    slowFrameSamples += 1;
    healthyFrameSamples = 0;
  } else if (frameMilliseconds < CONFIG.performance.slowFrameMs * 0.72) {
    healthyFrameSamples += 1;
    slowFrameSamples = Math.max(0, slowFrameSamples - 1);
  }
  if (!reducedParticleQuality && slowFrameSamples >= CONFIG.performance.slowFrameSamples) {
    match.setParticleLimit(CONFIG.performance.mobileParticleLimit);
    match.setParticleQuality(CONFIG.performance.particleQualityReduced);
    match.shakeIntensity = settings.shake * 0.35;
    lowQualityActive = true;
    reducedParticleQuality = true;
    slowFrameSamples = 0;
  } else if (reducedParticleQuality && healthyFrameSamples >= CONFIG.performance.particleRecoverySamples) {
    match.setParticleLimit(touchControls.isTouchDevice ? CONFIG.performance.mobileParticleLimit : CONFIG.particles.poolSize);
    match.setParticleQuality(1);
    match.shakeIntensity = settings.shake;
    lowQualityActive = false;
    reducedParticleQuality = false;
    healthyFrameSamples = 0;
  }
}

function loop(now: number): void {
  if (stopped) return;
  if (now >= nextGamepadCheck) {
    nextGamepadCheck = now + 1000;
    try {
      if (navigator.getGamepads?.().some((gamepad) => gamepad !== null)) touchControls.setInputSource('gamepad');
    } catch { /* Gamepad access is optional and may be blocked by browser policy. */ }
  }
  const delta = Math.min((now - lastFrame) / 1000, 0.12);
  lastFrame = now;
  elapsed += delta;
  menuToastTimer = Math.max(0, menuToastTimer - delta);

  if (!booted) {
    const percent = Math.min(100, ((now - bootStarted) / CONFIG.loading.durationMs) * 100);
    progress.value = percent;
    loadingLabel.textContent = CONFIG.copy.loading[Math.min(CONFIG.copy.loading.length - 1, Math.floor(percent / 34))] ?? 'GETTING READY...';
    if (percent >= 100) {
      booted = true;
      loading.hidden = true;
      canvas.focus({ preventScroll: true });
    }
    requestAnimationFrame(loop);
    return;
  }

  if (screen === 'match') updateOrientationState();
  const frame = mergeTouchInput(input.frame(match?.config.humanPlayers ?? 1), touchControls.input.frame());
  if (screen === 'menu') updateMenu(frame);
  else if (screen === 'options') updateOptions(frame);
  else if (screen === 'custom') updateCustomGame(frame);
  else if (screen === 'result') updateResult(frame);
  else if (screen === 'match') {
    if (!paused && frame.pausePressed) paused = true;
    else if (paused) updatePause(frame);
    if (!paused && screen === 'match' && match) {
      accumulator = Math.min(accumulator + delta, stepSeconds * CONFIG.canvas.maxCatchUpSteps);
      let steps = 0;
      while (accumulator >= stepSeconds && steps < CONFIG.canvas.maxCatchUpSteps) {
        match.update(stepSeconds, mergeGameInput(frame));
        clearQueuedGameInput();
        accumulator -= stepSeconds;
        steps += 1;
        if (match.finished) {
          screen = 'result';
          paused = false;
          resultIndex = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
      clearQueuedGameInput();
    }
  }

  const state: RenderState = {
    screen,
    match,
    settings,
    menuIndex,
    optionsIndex,
    resultIndex,
    pauseIndex,
    paused,
    elapsed,
    toast: menuToast,
    toastTimer: menuToastTimer,
    customIndex,
    customConfig,
    lowQuality: lowQualityActive,
    touchMode: touchControls.activeForPlayer,
    touchCapable: touchControls.isTouchDevice || settings.touchControlsEnabled,
  };
  touchControls.setGameActive(screen === 'match');
  renderGame(context, state);
  monitorParticleQuality(delta * 1000);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
