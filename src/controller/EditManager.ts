import type { ShapeElement, ResizeHandle } from "../types";

export class EditManager {
  private selectedObject: ShapeElement | null = null;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private isResizing = false;
  private resizeHandle: ResizeHandle = null;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartLeft = 0;
  private resizeStartTop = 0;
  private resizeStartWidth = 0;
  private resizeStartHeight = 0;

  private readonly HANDLE_SIZE = 10;

  constructor(
    private elements: ShapeElement[],
    private getCameraX: () => number,
    private getCameraY: () => number,
    private getZoomLevel: () => number
  ) {}

  getSelectedObject(): ShapeElement | null {
    return this.selectedObject;
  }

  setSelectedObject(element: ShapeElement | null) {
    this.selectedObject = element;
  }

  isActive(): boolean {
    return this.isDragging || this.isResizing;
  }

  private getResizeHandle(
    x: number,
    y: number,
    element: ShapeElement
  ): ResizeHandle {
    const handleSize = this.HANDLE_SIZE / this.getZoomLevel();
    const left = element.left + this.getCameraX();
    const top = element.top + this.getCameraY();
    const right = left + element.width;
    const bottom = top + element.height;

    if (Math.abs(x - left) < handleSize && Math.abs(y - top) < handleSize) {
      return "top-left";
    }
    if (Math.abs(x - right) < handleSize && Math.abs(y - top) < handleSize) {
      return "top-right";
    }
    if (Math.abs(x - left) < handleSize && Math.abs(y - bottom) < handleSize) {
      return "bottom-left";
    }
    if (Math.abs(x - right) < handleSize && Math.abs(y - bottom) < handleSize) {
      return "bottom-right";
    }

    return null;
  }

  handleMouseDown(x: number, y: number): boolean {
    if (this.selectedObject) {
      const handle = this.getResizeHandle(x, y, this.selectedObject);
      if (handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartX = x;
        this.resizeStartY = y;
        this.resizeStartLeft = this.selectedObject.left;
        this.resizeStartTop = this.selectedObject.top;
        this.resizeStartWidth = this.selectedObject.width;
        this.resizeStartHeight = this.selectedObject.height;
        return true;
      }
    }

    let selected = false;
    for (const element of this.elements) {
      if (
        y > element.top + this.getCameraY() &&
        y < element.top + this.getCameraY() + element.height &&
        x > element.left + this.getCameraX() &&
        x < element.left + this.getCameraX() + element.width
      ) {
        this.selectedObject = element;
        selected = true;
        this.isDragging = true;
        this.dragOffsetX = x - element.left - this.getCameraX();
        this.dragOffsetY = y - element.top - this.getCameraY();
        break;
      }
    }

    if (!selected) {
      this.selectedObject = null;
    }

    return selected;
  }

  handleMouseMove(x: number, y: number): string {
    if (this.selectedObject && !this.isResizing && !this.isDragging) {
      const handle = this.getResizeHandle(x, y, this.selectedObject);
      return this.getCursorForHandle(handle);
    }

    if (this.isResizing && this.selectedObject) {
      const dx = x - this.resizeStartX;
      const dy = y - this.resizeStartY;

      const minSize = this.HANDLE_SIZE;

      switch (this.resizeHandle) {
        case "top-left":
          this.selectedObject.width = Math.max(
            minSize,
            this.resizeStartWidth - dx
          );
          this.selectedObject.height = Math.max(
            minSize,
            this.resizeStartHeight - dy
          );
          this.selectedObject.left =
            this.resizeStartLeft +
            (this.resizeStartWidth - this.selectedObject.width);
          this.selectedObject.top =
            this.resizeStartTop +
            (this.resizeStartHeight - this.selectedObject.height);
          break;
        case "top-right":
          this.selectedObject.width = Math.max(
            minSize,
            this.resizeStartWidth + dx
          );
          this.selectedObject.height = Math.max(
            minSize,
            this.resizeStartHeight - dy
          );
          this.selectedObject.top =
            this.resizeStartTop +
            (this.resizeStartHeight - this.selectedObject.height);
          break;
        case "bottom-left":
          this.selectedObject.width = Math.max(
            minSize,
            this.resizeStartWidth - dx
          );
          this.selectedObject.height = Math.max(
            minSize,
            this.resizeStartHeight + dy
          );
          this.selectedObject.left =
            this.resizeStartLeft +
            (this.resizeStartWidth - this.selectedObject.width);
          break;
        case "bottom-right":
          this.selectedObject.width = Math.max(
            minSize,
            this.resizeStartWidth + dx
          );
          this.selectedObject.height = Math.max(
            minSize,
            this.resizeStartHeight + dy
          );
          break;
      }

      return this.getCursorForHandle(this.resizeHandle);
    } else if (this.isDragging && this.selectedObject) {
      this.selectedObject.left = x - this.dragOffsetX - this.getCameraX();
      this.selectedObject.top = y - this.dragOffsetY - this.getCameraY();
      return "move";
    }

    return "default";
  }

  handleMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  private getCursorForHandle(handle: ResizeHandle): string {
    switch (handle) {
      case "top-left":
      case "bottom-right":
        return "nwse-resize";
      case "top-right":
      case "bottom-left":
        return "nesw-resize";
      default:
        return "default";
    }
  }

  drawResizeHandles(ctx: CanvasRenderingContext2D, element: ShapeElement) {
    const handleSize = this.HANDLE_SIZE / this.getZoomLevel();
    const left = element.left + this.getCameraX();
    const top = element.top + this.getCameraY();
    const right = left + element.width;
    const bottom = top + element.height;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#4e5af8ff";
    ctx.lineWidth = 1 / this.getZoomLevel();

    const handles = [
      { x: left, y: top },
      { x: right, y: top },
      { x: left, y: bottom },
      { x: right, y: bottom },
    ];

    handles.forEach((handle) => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
  }
}
