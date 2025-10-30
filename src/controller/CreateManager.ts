import type { ShapeElement } from "../types";

export class CreateManager {
  private isCreating = false;
  private createStartX = 0;
  private createStartY = 0;
  private newElement: ShapeElement | null = null;

  constructor(
    private getCameraX: () => number,
    private getCameraY: () => number
  ) {}

  isActive(): boolean {
    return this.isCreating;
  }

  getNewElement(): ShapeElement | null {
    return this.newElement;
  }

  handleMouseDown(x: number, y: number): void {
    this.isCreating = true;
    this.createStartX = x;
    this.createStartY = y;
    this.newElement = {
      left: x - this.getCameraX(),
      top: y - this.getCameraY(),
      width: 0,
      height: 0,
    };
  }

  handleMouseMove(x: number, y: number): string {
    if (this.isCreating && this.newElement) {
      const dx = x - this.createStartX;
      const dy = y - this.createStartY;

      this.newElement.left = Math.min(this.createStartX, x) - this.getCameraX();
      this.newElement.top = Math.min(this.createStartY, y) - this.getCameraY();
      this.newElement.width = Math.abs(dx);
      this.newElement.height = Math.abs(dy);

      return "crosshair";
    }

    return "default";
  }

  handleMouseUp(): ShapeElement | null {
    if (this.isCreating && this.newElement) {
      if (this.newElement.width > 5 && this.newElement.height > 5) {
        const element = this.newElement;
        this.newElement = null;
        this.isCreating = false;
        return element;
      }
      this.newElement = null;
      this.isCreating = false;
    }

    return null;
  }

  cancel(): void {
    this.isCreating = false;
    this.newElement = null;
  }
}
