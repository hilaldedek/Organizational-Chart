"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { DragData, EmployeeNodeData } from "../types/orgChart";
import { getNodeStyle, handleStyle } from "../utils/orgChartHelpers";

const EmployeeNodeComponent: React.FC<{ data: EmployeeNodeData }> = ({ data }) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      const dragData: DragData = {
        type: "employee-node",
        employee: data,
        sourceNodeId: data.person_id,
        person_id: data.person_id,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(dragData));
      data.onDragStart?.(data.person_id); // ✅ optional chaining
      console.log("Dragging employee:", data.first_name, data.last_name);
    },
    [data]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = setTimeout(() => setDraggedOver(false), 100);
  }, []);

  const handleEmployeeToEmployeeDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedOver(false);

      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      try {
        const dropData = JSON.parse(e.dataTransfer.getData("application/json"));
        if (dropData && (dropData.person_id || dropData.sourceNodeId)) {
          const sourceId = dropData.person_id || dropData.sourceNodeId;
          data.onDrop?.(data.person_id, dropData.employee || dropData, sourceId); // ✅ optional chaining
        }
      } catch (error) {
        console.error("Drop verisi parse edilemedi:", error);
      }
    },
    [data]
  );

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleEmployeeToEmployeeDrop}
      style={getNodeStyle(draggedOver, data)}
    >
      <Handle type="target" position={Position.Top} id={data.person_id} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id={data.person_id} style={handleStyle} />

      <div className="font-medium text-[#252A34]">
        {data.first_name} {data.last_name}
      </div>
      <div className="text-[11px] text-black">ID: {data.person_id}</div>

      {draggedOver && (
        <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 bg-[#898AC4] text-white py-[2px] px-[8px] rounded-sm text-[10px] whitespace-nowrap">
          Hiyerarşi kurmak için bırakın
        </div>
      )}
    </div>
  );
};

export default EmployeeNodeComponent;