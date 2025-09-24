import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DepartmentNodeData, Employee } from "../types/orgChart";
import { calculateRelativePosition, DEPARTMENT_MIN_HEIGHT, DEPARTMENT_MIN_WIDTH } from "../utils/constants";
import { NodeResizer } from "@xyflow/react";
import { getContainerStyle, headerStyle } from "../utils/orgChartHelpers";
import { FcOk } from "react-icons/fc";

const DepartmentNodeComponent: React.FC<{
  data: DepartmentNodeData;
  selected: boolean;
}> = ({ data, selected }) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Departmandaki personel sayısını kontrol et
  const departmentHasEmployees = useMemo(() => {
    console.log(
      "DepartmentGroupNodeComponent - departmentHasEmployees tetiklendi! departmentNodes:",
      data.departmentNodes
    );
    const departmentNodes = data.departmentNodes || [];
    return departmentNodes.length > 0;
  }, [data.departmentNodes]);

  const handleDragOver = useCallback((e: DragEvent) => {
    console.log("DepartmentGroupNodeComponent - handleDragOver tetiklendi!");
    e.preventDefault();
    setDraggedOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    console.log("DepartmentGroupNodeComponent - handleDragLeave tetiklendi!");

    // Debounce drag leave to prevent flickering
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }

    dragTimeoutRef.current = setTimeout(() => {
      setDraggedOver(false);
    }, 100);
  }, []);

  const handleEmployeeToDepartmentDrop = useCallback(
    (e: DragEvent) => {
      console.log(
        "DepartmentGroupNodeComponent - handleEmployeeToDepartmentDrop tetiklendi!"
      );
      e.preventDefault();
      setDraggedOver(false);

      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      try {
        const dropData = e.dataTransfer.getData("application/json");
        if (dropData) {
          const parsed = JSON.parse(dropData);

          // Sadece sidebar'dan gelen employee'leri kabul et (ilk atama için)
          if (
            parsed.type === "employee" ||
            (!parsed.type && parsed.person_id && !departmentHasEmployees)
          ) {
            const employee: Employee =
              parsed.type === "employee" ? parsed.data : parsed;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const relativePosition = calculateRelativePosition(e, rect);
            console.log("YÖNETİCİ ATANDI:");
            data.onEmployeeDrop(data.unit_id, employee, relativePosition);
          }
        }
      } catch (error) {
        console.error("Drop verisi parse edilemedi:", error);
      }
    },
    [data, departmentHasEmployees]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      style={getContainerStyle(draggedOver)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleEmployeeToDepartmentDrop}
    >
      <NodeResizer
        color="#007acc"
        isVisible={selected}
        minWidth={DEPARTMENT_MIN_WIDTH}
        minHeight={DEPARTMENT_MIN_HEIGHT}
        handleStyle={{
          background: "#007acc",
          width: 8,
          height: 8,
          borderRadius: "50%",
        }}
      />

      <div style={headerStyle
      } className="text-center">
        {data.unit_name}
        {departmentHasEmployees && (
          <div className="mt-2 font-normal text-xs flex items-center justify-center">
            <span className="text-[#252A34]">Yönetici:</span>
            <span className="text-[#4caf50] mr-1 ml-0.5">Atanmış</span>
            <FcOk className="w-4 h-4" />
          </div>
        )}
      </div>

      {draggedOver && !departmentHasEmployees && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "14px",
            color: "#f77e94ff",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          İlk personeli buraya bırakın (Yönetici)
        </div>
      )}

      {draggedOver && departmentHasEmployees && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "14px",
            color: "#ff6b6b",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 1,
            background: "rgba(255,255,255,0.9)",
            padding: "10px",
            borderRadius: "8px",
            border: "2px solid #ff6b6b",
          }}
        >
          ❌ Departmanda zaten yönetici var!
          <br />
          Yeni personelleri mevcut personellerin üstüne bırakın.
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 15,
          left: 15,
          right: 15,
          fontSize: "12px",
          color: "#999",
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        {departmentHasEmployees
          ? "Yeni personelleri mevcut personellerin üstüne sürükleyin"
          : "İlk personeli buraya sürükleyin (Departman Yöneticisi)"}
      </div>
    </div>
  );
};