import { SCENE_EVENTS } from '../config';
import type { FighterId, MatchConfig } from '../types';

export type SceneEventPayloads = {
  [SCENE_EVENTS.START_GAME]: MatchConfig;
  [SCENE_EVENTS.GAME_OVER]: FighterId;
  [SCENE_EVENTS.RESTART_GAME]: undefined;
  [SCENE_EVENTS.RETURN_TO_MENU]: undefined;
  [SCENE_EVENTS.SHUTDOWN]: undefined;
};
export type SceneEventName = keyof SceneEventPayloads;
type SceneEventListener = (payload: unknown) => void;

export class SceneEventEmitter {
  private readonly listeners = new Map<SceneEventName, Set<SceneEventListener>>();
  private isShutdown = false;

  on<K extends SceneEventName>(event: K, listener: (payload: SceneEventPayloads[K]) => void): () => void {
    if (this.isShutdown) return () => undefined;
    const listeners = this.listeners.get(event) ?? new Set<SceneEventListener>();
    const wrapped: SceneEventListener = (payload) => listener(payload as SceneEventPayloads[K]);
    listeners.add(wrapped);
    this.listeners.set(event, listeners);
    return () => this.off(event, wrapped);
  }

  once<K extends SceneEventName>(event: K, listener: (payload: SceneEventPayloads[K]) => void): () => void {
    let unsubscribe = (): void => undefined;
    const oneShot = (payload: SceneEventPayloads[K]): void => {
      unsubscribe();
      listener(payload);
    };
    unsubscribe = this.on(event, oneShot);
    return unsubscribe;
  }

  emit<K extends SceneEventName>(event: K, payload: SceneEventPayloads[K]): void {
    if (this.isShutdown) return;
    for (const listener of [...(this.listeners.get(event) ?? [])]) listener(payload);
  }

  off(event: SceneEventName, listener: SceneEventListener): void {
    const listeners = this.listeners.get(event);
    listeners?.delete(listener);
    if (listeners?.size === 0) this.listeners.delete(event);
  }

  removeAllListeners(event?: SceneEventName): void {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }

  shutdown(): void {
    if (this.isShutdown) return;
    this.isShutdown = true;
    for (const listener of [...(this.listeners.get(SCENE_EVENTS.SHUTDOWN) ?? [])]) listener(undefined);
    this.removeAllListeners();
  }
}
