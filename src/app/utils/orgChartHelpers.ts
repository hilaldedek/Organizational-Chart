// src/app/utils/orgChartHelpers.ts
import { CSSProperties } from "react";
import { EmployeeNodeData } from "../types/orgChart";

export const getContainerStyle = (draggedOver: boolean): CSSProperties => ({
  width: "100%",
  height: "100%",
  minWidth: "300px",
  minHeight: "400px", 
  marginTop: "55px", 
  border: draggedOver ? "3px dashed #4caf50" : "2px solid #ddd",
  borderRadius: "12px",
  background: draggedOver ? "rgba(76, 175, 80, 0.1)" : "#f9f9f9",
  position: "relative",
  transition: "all 0.3s ease",
  boxShadow: draggedOver ? "0 0 15px rgba(76, 175, 80, 0.3)" : "0 2px 4px rgba(0,0,0,0.1)",
  overflow: "hidden",
});

export const headerStyle: CSSProperties = {
  position: "absolute",
  top: "10px",
  left: "10px",
  right: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  color: "#252A34",
  background: "#FFD5D5",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
};

export const getNodeStyle = (draggedOver: boolean, data: EmployeeNodeData): CSSProperties => ({
  background: "#f5f5f5",
  border: draggedOver ? "2px solid #4caf50" : "1px solid #ddd",
  borderRadius: "8px",
  padding: "10px",
  minWidth: "120px",
  textAlign: "center" as const,
  fontSize: "12px",
  position: "relative",
  boxShadow: draggedOver ? "0 0 10px rgba(76, 175, 80, 0.3)" : "0 1px 3px rgba(0,0,0,0.1)",
  transition: "all 0.2s ease",
});

export const handleStyle: CSSProperties = {
  background: "#555",
  width: "8px",
  height: "8px",
  border: "2px solid #fff",
};