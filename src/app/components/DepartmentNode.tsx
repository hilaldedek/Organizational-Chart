import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DepartmentNodeData, Employee } from "../types/orgChart";
import { calculateRelativePosition, DEPARTMENT_MIN_HEIGHT, DEPARTMENT_MIN_WIDTH } from "../utils/constants";
import { NodeResizer } from "@xyflow/react";
import { getContainerStyle, headerStyle } from "../utils/orgChartHelpers";
import { FcOk } from "react-icons/fc";
import { useOrgChartStore } from "../stores/orgChartStore";

export const DepartmentNodeComponent: React.FC<{
  data: DepartmentNodeData;
  selected: boolean;
}> = ({ data, selected }) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { nodes } = useOrgChartStore();

  console.log("DepartmentNodeComponent render edildi:", data);

  // Bu departmandaki çalışanları nodes'tan al
  const departmentEmployees = useMemo(() => {
    return nodes.filter(node => 
      node.type === "employee" && 
      node.parentId === data.unit_id.toString()
    );
  }, [nodes, data.unit_id]);

  // Departmanda çalışan var mı kontrolü
  const departmentHasEmployees = useMemo(() => {
    console.log(
      "DepartmentGroupNodeComponent - departmentHasEmployees check:",
      "unit_id:", data.unit_id,
      "employees count:", departmentEmployees.length
    );
    return departmentEmployees.length > 0;
  }, [departmentEmployees.length, data.unit_id]);

  // Departman yöneticisini bul
  const departmentManager = useMemo(() => {
    return departmentEmployees.find(node => 
      node.data?.isManager === true
    );
  }, [departmentEmployees]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    // Sürüklenen veriyi al
    try {
      const dragData = e.dataTransfer.getData("application/json");
      if (dragData) {
        const parsed = JSON.parse(dragData);
        if (parsed.type === "employee" || parsed.employee) {
          setDraggedEmployee(parsed.employee || parsed);
        }
      }
    } catch (error) {
      console.log("Drag over data parsing failed:", error);
    }
    
    setDraggedOver(true);

    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {

    // Check if we're actually leaving the department area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      // Debounce drag leave to prevent flickering
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      dragTimeoutRef.current = setTimeout(() => {
        setDraggedOver(false);
        setDraggedEmployee(null);
      }, 100);
    }
  }, []);

  const handleEmployeeToDepartmentDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDraggedOver(false);
      setDraggedEmployee(null);

      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      try {
        // DataTransfer null kontrolü
        const dataTransfer = e.dataTransfer;
        if (!dataTransfer) {
          console.error("DataTransfer is null");
          return;
        }

        const dropData = dataTransfer.getData("application/json");
        if (!dropData) {
          console.error("No drop data available");
          return;
        }

        const parsed = JSON.parse(dropData);
        console.log("Department drop data:", parsed);

        // Sadece sidebar'dan gelen employee'leri kabul et (ilk atama için)
        if (parsed.type === "employee" || (!parsed.type && parsed.person_id)) {
          const employee: Employee = parsed.type === "employee" ? parsed.data : parsed;
          
          // Departmanda zaten personel varsa reddet
          if (departmentHasEmployees) {
            console.log("Department already has employees, rejecting drop");
            return;
          }
          
          // Relative position hesapla
          const rect = e.currentTarget.getBoundingClientRect();
          const relativePosition = calculateRelativePosition(e as any, rect);
          
          console.log("İlk personel departman yöneticisi olarak atanıyor:", employee);
          
          // Department employee drop handler'ını çağır
          if (data.onEmployeeDrop) {
            data.onEmployeeDrop(data.unit_id.toString(), employee, relativePosition);
          }
        } else {
          console.log("Invalid drop data type:", parsed.type);
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

  // Drag feedback message
  const getDragFeedbackMessage = () => {
    if (!draggedOver) return null;
    
    if (!departmentHasEmployees) {
      return (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "14px",
            color: "#4caf50",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 1,
            background: "rgba(255,255,255,0.9)",
            padding: "10px",
            borderRadius: "8px",
            border: "2px solid #4caf50",
          }}
        >
          ✅ İlk personeli buraya bırakın (Yönetici)
          {draggedEmployee && (
            <div className="mt-2 text-sm">
              <strong>{draggedEmployee.first_name} {draggedEmployee.last_name}</strong>
              <br />
              <span className="text-xs">Departman Yöneticisi olarak atanacak</span>
            </div>
          )}
        </div>
      );
    }
    
    return (
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
    );
  };

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

      <div style={headerStyle} className="text-center">
        {data.unit_name}
        {departmentHasEmployees && (
          <div className="mt-2 font-normal text-xs flex items-center justify-center">
            <span className="text-[#252A34]">Yönetici:</span>
            <span className="text-[#4caf50] mr-1 ml-0.5">
              {departmentManager ? 
                `${departmentManager.data.first_name} ${departmentManager.data.last_name}` : 
                'Atanmış'
              }
            </span>
            <FcOk className="w-4 h-4" />
          </div>
        )}
        {departmentEmployees.length > 0 && (
          <div className="mt-1 text-xs text-gray-600">
            Personel Sayısı: {departmentEmployees.length}
          </div>
        )}
      </div>

      {/* Drag feedback message */}
      {getDragFeedbackMessage()}

      {/* Instructions */}
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