"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { DragData, EmployeeNodeData } from "../types/orgChart";
import { Employee } from "../types/orgChart";
import { getNodeStyle, handleStyle } from "../utils/orgChartHelpers";
import { useOrgChartStore } from "../stores/orgChartStore";
import { FaDeleteLeft } from "react-icons/fa6";

const EmployeeNodeComponent: React.FC<{ data: EmployeeNodeData }> = ({
  data,
}) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setNodes, setEdges, addUnassignedEmployees } = useOrgChartStore();

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
          data.onDrop?.(
            data.person_id,
            dropData.employee || dropData,
            sourceId
          ); // ✅ optional chaining
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      console.log("DATA: ", data);
      const res = await fetch("/api/delete-employee", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: data.person_id,
        }),
      });
      if (!res.ok) {
        console.error("Silme başarısız:", await res.text());
        return;
      }
      const payload = await res.json();
      const ids: string[] = payload.updatedPersonIds || [data.person_id];

      const { nodes: currentNodes } = useOrgChartStore.getState();
      const newEmployees: Employee[] = ids
        .map((id) => currentNodes.find((n) => n.id === id))
        .filter((n): n is NonNullable<typeof n> => Boolean(n))
        .map((n) => ({
          person_id: n.id,
          first_name: String((n as any).data?.first_name ?? ""),
          last_name: String((n as any).data?.last_name ?? ""),
          title: String((n as any).data?.title ?? ""),
          department_id: null,
          manager_id: null,
          role: String((n as any).data?.role ?? ""),
          created_at: String(
            (n as any).data?.created_at ?? new Date().toISOString()
          ),
          updated_at: new Date().toISOString(),
        }));

      if (newEmployees.length > 0) {
        addUnassignedEmployees(newEmployees);
      }

      // Edge'leri temizle
      setEdges((prev) =>
        prev.filter(
          (edge) => !ids.includes(edge.source) && !ids.includes(edge.target)
        )
      );
      // Node'ları temizle
      setNodes((prev) => prev.filter((node) => !ids.includes(node.id)));
    } catch (err) {
      console.error("Delete API hatası:", err);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleEmployeeToEmployeeDrop}
      style={getNodeStyle(draggedOver, data)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        id={data.person_id}
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={data.person_id}
        style={handleStyle}
      />

      <div className="font-medium text-[#252A34]">
        {data.first_name} {data.last_name}
      </div>

      {hovered && (
        <button
          onClick={handleDelete}
          className="absolute top-1/2 -translate-y-1/2 right-[-15px] text-white text-xs px-2 py-1 rounded"
        >
          <FaDeleteLeft className="text-[#f44538] text-2xl" />
        </button>
      )}

      {draggedOver && (
        <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 bg-[#898AC4] text-white py-[2px] px-[8px] rounded-sm text-[10px] whitespace-nowrap">
          Hiyerarşi kurmak için bırakın
        </div>
      )}
    </div>
  );
};

export default EmployeeNodeComponent;
