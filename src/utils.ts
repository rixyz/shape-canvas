import type { Matrix, Point } from "./types";

export function transformPoint(m: Matrix, p: Point): Point {
  return {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
}
export function invertTransform(m: Matrix): Matrix {
  const det = 1.0 / (m[0] * m[3] - m[1] * m[2]);
  return [
    m[3] * det,
    -m[1] * det,
    -m[2] * det,
    m[0] * det,
    (m[2] * m[5] - m[3] * m[4]) * det,
    (m[1] * m[4] - m[0] * m[5]) * det,
  ];
}
