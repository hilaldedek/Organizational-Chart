import { Node } from "@xyflow/react";
import { DragEvent } from "react";

export const EMPLOYEE_NODE_HEIGHT = 120;
export const DEPARTMENT_MIN_WIDTH = 300;
export const DEPARTMENT_MIN_HEIGHT = 200;
export const POSITION_OFFSET_RANGE = 50;
const DRAG_OFFSET = 80;

/**
 * Yeni bir düğümün, hedef düğümün altına yerleştirileceği pozisyonu hesaplar.
 * @param targetNode Hedef düğüm
 * @param offset Dikey mesafe
 * @returns Yeni düğüm pozisyonu
 */
export const calculateNodePosition = (
  targetNode: Node,
  offset: number = EMPLOYEE_NODE_HEIGHT
) => ({
  x:
    targetNode.position.x +
    Math.random() * POSITION_OFFSET_RANGE -
    POSITION_OFFSET_RANGE / 2,
  y: targetNode.position.y + offset,
});

/**
 * Bir sürükleme olayı için kapsayıcıya göre göreceli pozisyonu hesaplar.
 * @param event Sürükleme olayı
 * @param containerRect Kapsayıcı DOMRect objesi
 * @returns Göreceli pozisyon
 */
export const calculateRelativePosition = (
  event: DragEvent,
  containerRect: DOMRect
) => ({
  x: Math.max(0, event.clientX - containerRect.left - DRAG_OFFSET),
  y: Math.max(50, event.clientY - containerRect.top - DRAG_OFFSET),
});
