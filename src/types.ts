export interface Point {
  x: number;
  y: number;
}

export type Matrix = [number, number, number, number, number, number];

export interface ShapeElement {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type ResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | null;
