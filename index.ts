import type { ShapeElement } from "./src/types";
import { Canvas } from "./src/canvas";
let elements: ShapeElement[] = [
  { top: 20, left: 15, width: 150, height: 100 },
  { top: 200, left: 200, width: 100, height: 100 },
];
const canvasEl = document.getElementById("canvas_box")! as HTMLCanvasElement;
new Canvas(canvasEl, elements);
