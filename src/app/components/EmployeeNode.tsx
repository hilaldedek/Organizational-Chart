"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { DragData, EmployeeNodeData } from "../types/orgChart";
import { Employee } from "../types/orgChart";
import { getNodeStyle, handleStyle } from "../utils/orgChartHelpers";
import { useOrgChartStore } from "../stores/orgChartStore";
import { FaDeleteLeft } from "react-icons/fa6";
import { showToast } from "../utils/toast";

/**
 * Personel node bileşeni - sürükle-bırak ve silme işlemlerini destekler
 * @param data - Personel node verisi
 * @returns JSX.Element
 */
const EmployeeNodeComponent: React.FC<{ data: EmployeeNodeData }> = ({
  data,
}) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setNodes, setEdges, addUnassignedEmployees } = useOrgChartStore();
  /**
   * Personel sürükleme işlemi başladığında çalışır ve temiz veri hazırlar
   * @param e - Drag event
   * @returns void
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // Data validation ve temizleme
      if (!data || !data.person_id) {
        console.error("Invalid employee data:", data);
        e.preventDefault();
        return;
      }

      // Clean employee data
      const cleanEmployeeData = {
        person_id: data.person_id,
        first_name: data.first_name || "Unknown",
        last_name: data.last_name || "Unknown",
        title: data.title || "",
        department_id: data.department_id
          ? data.department_id.toString()
          : null,
        manager_id: data.manager_id,
        role: data.role || "EMPLOYEE",
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      const dragData: DragData = {
        type: "employee-node",
        employee: cleanEmployeeData,
        sourceNodeId: cleanEmployeeData.person_id,
        person_id: cleanEmployeeData.person_id,
      };

      e.dataTransfer.setData("application/json", JSON.stringify(dragData));
      data.onDragStart?.(cleanEmployeeData.person_id);

      console.log("Clean employee data:", cleanEmployeeData);
      console.log(
        "Dragging employee:",
        cleanEmployeeData.first_name,
        cleanEmployeeData.last_name,
        cleanEmployeeData.department_id
      );
    },
    [data]
  );

  /**
   * Sürükleme işlemi sırasında personel üzerine gelindiğinde çalışır
   * @param e - Drag event
   * @returns void
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(true);
  }, []);

  /**
   * Sürükleme işlemi sırasında personelden ayrıldığında çalışır
   * @returns void
   */
  const handleDragLeave = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = setTimeout(() => setDraggedOver(false), 100);
  }, []);

  /**
   * Personel personel üzerine bırakıldığında çalışır ve hiyerarşi kurar
   * @param e - Drop event
   * @returns void
   */
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
          console.log(
            "DROP DATA: EmployeeNode",
            data.person_id,
            dropData.employee || dropData,
            sourceId
          );
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

  /**
   * Personeli departmandan siler ve atanmamış listesine ekler
   * @param e - Mouse event
   * @returns Promise<void>
   */
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
        showToast("error", "Atanmış çalışan departmandan silinemedi.");
        console.error("Silme başarısız:", await res.text());
        return;
      }
      showToast("success", "Atanmış personel departmandan kaldırıldı.");
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
