import type { ShapeElement, Matrix, ResizeHandle } from "./types";
import { transformPoint, invertTransform } from "./utils";

export class Canvas {
  private ctx: CanvasRenderingContext2D;
  private zoomLevel = 1;
  private viewPortMatrix: Matrix;

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

  private isPanning = false;
  private cameraX = 0;
  private cameraY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private isCreating = false;
  private createStartX = 0;
  private createStartY = 0;
  private newElement: ShapeElement | null = null;

  private readonly HANDLE_SIZE = 10;

  constructor(
    private canvas: HTMLCanvasElement,
    private elements: ShapeElement[]
  ) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error();
    this.ctx = ctx;

    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    this.viewPortMatrix = [
      this.zoomLevel,
      0,
      0,
      this.zoomLevel,
      window.innerWidth / 2,
      window.innerHeight / 2,
    ];

    this.addEventListeners();
    this.renderElements();
  }

  private addEventListeners() {
    window.addEventListener("resize", () => this.onResize());
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("mouseup", () => this.onMouseUp());
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private onResize() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.renderElements();
  }

  private getResizeHandle(
    x: number,
    y: number,
    element: ShapeElement
  ): ResizeHandle {
    const handleSize = this.HANDLE_SIZE / this.zoomLevel;
    const left = element.left + this.cameraX;
    const top = element.top + this.cameraY;
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

  private onMouseDown(event: MouseEvent) {
    const point = transformPoint(invertTransform(this.viewPortMatrix), {
      x: event.offsetX,
      y: event.offsetY,
    });

    const { x, y } = point;

    if (event.button === 0) {
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
          return;
        }
      }

      let selected = false;
      for (const element of this.elements) {
        if (
          y > element.top + this.cameraY &&
          y < element.top + this.cameraY + element.height &&
          x > element.left + this.cameraX &&
          x < element.left + this.cameraX + element.width
        ) {
          this.selectedObject = element;
          selected = true;
          this.isDragging = true;
          this.dragOffsetX = x - element.left - this.cameraX;
          this.dragOffsetY = y - element.top - this.cameraY;
          break;
        }
      }

      if (!selected) this.selectedObject = null;
      this.renderElements();
    } else if (event.button === 1) {
      this.isPanning = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      event.preventDefault();
    } else if (event.button === 2) {
      this.isCreating = true;
      this.createStartX = x;
      this.createStartY = y;
      this.newElement = {
        left: x - this.cameraX,
        top: y - this.cameraY,
        width: 0,
        height: 0,
      };
    }
  }

  private onMouseMove(event: MouseEvent) {
    const point = transformPoint(invertTransform(this.viewPortMatrix), {
      x: event.offsetX,
      y: event.offsetY,
    });

    if (
      this.selectedObject &&
      !this.isResizing &&
      !this.isDragging &&
      !this.isCreating
    ) {
      const handle = this.getResizeHandle(
        point.x,
        point.y,
        this.selectedObject
      );
      this.canvas.style.cursor = this.getCursorForHandle(handle);
    }

    if (this.isCreating && this.newElement) {
      const dx = point.x - this.createStartX;
      const dy = point.y - this.createStartY;

      this.newElement.left =
        Math.min(this.createStartX, point.x) - this.cameraX;
      this.newElement.top = Math.min(this.createStartY, point.y) - this.cameraY;
      this.newElement.width = Math.abs(dx);
      this.newElement.height = Math.abs(dy);

      this.canvas.style.cursor = "crosshair";
      this.renderElements();
    } else if (event.buttons === 1 && this.isResizing && this.selectedObject) {
      const dx = point.x - this.resizeStartX;
      const dy = point.y - this.resizeStartY;

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

      this.renderElements();
    } else if (event.buttons === 1 && this.isDragging && this.selectedObject) {
      this.selectedObject.left = point.x - this.dragOffsetX - this.cameraX;
      this.selectedObject.top = point.y - this.dragOffsetY - this.cameraY;
      this.renderElements();
    } else if (event.buttons === 4 && this.isPanning) {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;

      this.cameraX += dx / this.zoomLevel;
      this.cameraY += dy / this.zoomLevel;

      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;

      this.renderElements();
    }
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

  private onMouseUp() {
    if (this.isCreating && this.newElement) {
      if (this.newElement.width > 5 && this.newElement.height > 5) {
        this.elements.push(this.newElement);
        this.selectedObject = this.newElement;
      }
      this.newElement = null;
      this.isCreating = false;
    }

    this.isDragging = false;
    this.isPanning = false;
    this.isResizing = false;
    this.resizeHandle = null;
    this.canvas.style.cursor = "default";
    this.renderElements();
  }

  private renderElements() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.transform(...this.viewPortMatrix);

    ctx.beginPath();
    ctx.moveTo(Number.MIN_SAFE_INTEGER, this.cameraY);
    ctx.lineTo(Number.MAX_SAFE_INTEGER, this.cameraY);
    ctx.moveTo(this.cameraX, Number.MIN_SAFE_INTEGER);
    ctx.lineTo(this.cameraX, Number.MAX_SAFE_INTEGER);
    ctx.stroke();

    this.elements.forEach((element) => {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        element.left + this.cameraX,
        element.top + this.cameraY,
        element.width,
        element.height
      );

      if (element === this.selectedObject) {
        const borderWidth = 2;
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = "#4e5af8ff";

        ctx.strokeRect(
          element.left - borderWidth + this.cameraX,
          element.top - borderWidth + this.cameraY,
          element.width + borderWidth * 2,
          element.height + borderWidth * 2
        );

        this.drawResizeHandles(ctx, element);
      }
    });

    if (this.isCreating && this.newElement) {
      ctx.strokeStyle = "#4e5af8ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        this.newElement.left + this.cameraX,
        this.newElement.top + this.cameraY,
        this.newElement.width,
        this.newElement.height
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  private drawResizeHandles(
    ctx: CanvasRenderingContext2D,
    element: ShapeElement
  ) {
    const handleSize = this.HANDLE_SIZE / this.zoomLevel;
    const left = element.left + this.cameraX;
    const top = element.top + this.cameraY;
    const right = left + element.width;
    const bottom = top + element.height;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#4e5af8ff";
    ctx.lineWidth = 1 / this.zoomLevel;

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
