import type { ShapeElement, Matrix } from "./types";
import { transformPoint, invertTransform } from "./utils";
import { EditManager } from "./controller/EditManager";
import { CreateManager } from "./controller/CreateManager";

export class Canvas {
  private ctx: CanvasRenderingContext2D;
  private zoomLevel = 1;
  private viewPortMatrix: Matrix;

  private editManager: EditManager;
  private createManager: CreateManager;

  private isPanning = false;
  private cameraX = 0;
  private cameraY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;

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

    this.editManager = new EditManager(
      this.elements,
      () => this.cameraX,
      () => this.cameraY,
      () => this.zoomLevel
    );

    this.createManager = new CreateManager(
      () => this.cameraX,
      () => this.cameraY
    );

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

  private onMouseDown(event: MouseEvent) {
    const point = transformPoint(invertTransform(this.viewPortMatrix), {
      x: event.offsetX,
      y: event.offsetY,
    });

    const { x, y } = point;

    if (event.button === 0) {
      const handled = this.editManager.handleMouseDown(x, y);
      this.renderElements();
    } else if (event.button === 1) {
      this.isPanning = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      event.preventDefault();
    } else if (event.button === 2) {
      this.createManager.handleMouseDown(x, y);
    }
  }

  private onMouseMove(event: MouseEvent) {
    const point = transformPoint(invertTransform(this.viewPortMatrix), {
      x: event.offsetX,
      y: event.offsetY,
    });

    let cursor = "default";

    if (this.createManager.isActive()) {
      cursor = this.createManager.handleMouseMove(point.x, point.y);
      this.renderElements();
    } else if (event.buttons === 1 && this.editManager.isActive()) {
      cursor = this.editManager.handleMouseMove(point.x, point.y);
      this.renderElements();
    } else if (event.buttons === 0 && this.editManager.getSelectedObject()) {
      cursor = this.editManager.handleMouseMove(point.x, point.y);
    } else if (event.buttons === 4 && this.isPanning) {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;

      this.cameraX += dx / this.zoomLevel;
      this.cameraY += dy / this.zoomLevel;

      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;

      this.renderElements();
    }

    this.canvas.style.cursor = cursor;
  }

  private onMouseUp() {
    const newElement = this.createManager.handleMouseUp();
    if (newElement) {
      this.elements.push(newElement);
      this.editManager.setSelectedObject(newElement);
    }

    this.editManager.handleMouseUp();
    this.isPanning = false;
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

    const selectedObject = this.editManager.getSelectedObject();

    this.elements.forEach((element) => {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        element.left + this.cameraX,
        element.top + this.cameraY,
        element.width,
        element.height
      );

      if (element === selectedObject) {
        const borderWidth = 2;
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = "#4e5af8ff";

        ctx.strokeRect(
          element.left - borderWidth + this.cameraX,
          element.top - borderWidth + this.cameraY,
          element.width + borderWidth * 2,
          element.height + borderWidth * 2
        );

        this.editManager.drawResizeHandles(ctx, element);
      }
    });

    const newElement = this.createManager.getNewElement();
    if (newElement) {
      ctx.strokeStyle = "#4e5af8ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        newElement.left + this.cameraX,
        newElement.top + this.cameraY,
        newElement.width,
        newElement.height
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
