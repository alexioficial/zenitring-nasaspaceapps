export type Gesture = 'double-tap' | 'swipe';
type Point = { x: number; y: number; time: number };
export class GestureRecognizer {
  private start: Point | null = null;
  private first: Point | null = null;
  private moved = 0;
  private cooldown = -Infinity;
  down(x: number, y: number, time: number) {
    this.start = { x, y, time };
    this.moved = 0;
  }
  move(x: number, y: number) {
    if (this.start)
      this.moved = Math.max(this.moved, Math.hypot(x - this.start.x, y - this.start.y));
  }
  cancel() {
    this.start = null;
    this.first = null;
    this.moved = 0;
  }
  up(x: number, y: number, time: number): Gesture | null {
    const start = this.start;
    this.start = null;
    if (!start || time < this.cooldown) {
      this.first = null;
      return null;
    }
    const dx = Math.abs(x - start.x),
      dy = Math.abs(y - start.y),
      duration = time - start.time;
    const moved = Math.max(this.moved, Math.hypot(dx, dy));
    if (dx >= 110 && dx >= dy * 2 && duration >= 250 && duration <= 1600) {
      this.first = null;
      this.cooldown = time + 1200;
      return 'swipe';
    }
    if (duration > 250 || duration < 0 || moved > 14) {
      this.first = null;
      return null;
    }
    if (
      this.first &&
      time - this.first.time <= 350 &&
      Math.hypot(x - this.first.x, y - this.first.y) <= 36
    ) {
      this.first = null;
      this.cooldown = time + 1200;
      return 'double-tap';
    }
    this.first = { x, y, time };
    return null;
  }
}
