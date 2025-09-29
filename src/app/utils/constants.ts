// src/app/utils/constants.ts
export const DEPARTMENT_MIN_WIDTH = 300;
export const DEPARTMENT_MIN_HEIGHT = 400;

export const calculateRelativePosition = (
  e: React.DragEvent | DragEvent,
  rect: DOMRect
): { x: number; y: number } => {
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};