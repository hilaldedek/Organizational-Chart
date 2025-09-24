import { DEPARTMENT_MIN_HEIGHT, DEPARTMENT_MIN_WIDTH } from "./constants";


export const getNodeStyle = (
  draggedOver: boolean,
  data: { isBeingDragged: boolean }
) => ({
  border: `2px solid ${
    draggedOver ? "#898AC4" : data.isBeingDragged ? "#ff6b6b" : "#333"
  }`,
  borderRadius: 8,
  padding: 12,
  background: draggedOver
    ? "#f0f8ff"
    : data.isBeingDragged
    ? "#ffe6e6"
    : "#ffffff",
  minWidth: 160,
  cursor: "move",
  position: "relative" as const,
  transition: "all 0.3s ease",
  boxShadow: draggedOver
    ? "0 2px 4px #898AC4"
    : data.isBeingDragged
    ? "0 2px 4px rgba(255,107,107,0.3)"
    : "0 2px 4px rgba(0,0,0,0.1)",
});

export const handleStyle = {
  background: "#4caf50",
  width: 10,
  height: 10,
  border: "2px solid #fff",
};

export const getContainerStyle = (draggedOver: boolean) => ({
  width: "100%",
  height: "100%",
  border: `2px dashed ${draggedOver ? "#F49BAB" : "#ccc"}`,
  borderRadius: 12,
  background: draggedOver ? "#f49bab1c" : "rgba(248,249,250,0.3)",
  padding: 15,
  position: "relative" as const,
  transition: "all 0.3s ease",
  minHeight: DEPARTMENT_MIN_HEIGHT,
  minWidth: DEPARTMENT_MIN_WIDTH,
});

export const headerStyle = {
  position: "absolute" as const,
  top: 8,
  left: 8,
  right: 8,
  fontSize: "20px",
  fontWeight: "bold",
  color: "#252A34",
  textAlign: "center" as const,
  background: "#f49bab56",
  padding: "8px 15px",
  borderRadius: 8,
  border: "1px solid #ddd",
  zIndex: 1,
};
