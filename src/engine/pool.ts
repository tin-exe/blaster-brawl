export interface Poolable { active: boolean }

export class ObjectPool<T extends Poolable> {
  readonly items: T[];
  private cursor = 0;

  constructor(size: number, factory: () => T) {
    this.items = Array.from({ length: size }, factory);
  }

  acquire(): T | undefined {
    for (let offset = 0; offset < this.items.length; offset += 1) {
      const index = (this.cursor + offset) % this.items.length;
      const item = this.items[index];
      if (item && !item.active) {
        item.active = true;
        this.cursor = (index + 1) % this.items.length;
        return item;
      }
    }
    return undefined;
  }

  deactivateAll(): void {
    for (const item of this.items) item.active = false;
  }
}
