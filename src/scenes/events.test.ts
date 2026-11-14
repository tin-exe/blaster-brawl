import { describe, expect, it, vi } from 'vitest';
import { SCENE_EVENTS } from '../config';
import { createMatchConfig } from '../game/match-config';
import { SceneEventEmitter } from './events';

describe('scene event communication', () => {
  it('emits start-game payloads and removes one-shot listeners after dispatch', () => {
    const events = new SceneEventEmitter();
    const start = vi.fn();
    events.once(SCENE_EVENTS.START_GAME, start);

    const config = createMatchConfig('versus');
    events.emit(SCENE_EVENTS.START_GAME, config);
    events.emit(SCENE_EVENTS.START_GAME, config);

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(config);
  });

  it('notifies shutdown listeners and clears all listeners', () => {
    const events = new SceneEventEmitter();
    const onShutdown = vi.fn();
    const onGameOver = vi.fn();
    events.on(SCENE_EVENTS.SHUTDOWN, onShutdown);
    events.on(SCENE_EVENTS.GAME_OVER, onGameOver);

    events.shutdown();
    events.emit(SCENE_EVENTS.GAME_OVER, 'human');
    events.on(SCENE_EVENTS.GAME_OVER, onGameOver);

    expect(onShutdown).toHaveBeenCalledOnce();
    expect(onGameOver).not.toHaveBeenCalled();
  });
});
