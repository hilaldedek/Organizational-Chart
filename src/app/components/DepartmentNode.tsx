import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DepartmentNodeData, Employee } from "../types/orgChart";
import {
  calculateRelativePosition,
  DEPARTMENT_MIN_HEIGHT,
  DEPARTMENT_MIN_WIDTH,
} from "../utils/constants";
import { NodeResizer } from "@xyflow/react";
import { getContainerStyle, headerStyle } from "../utils/orgChartHelpers";
import { FcHighPriority, FcOk } from "react-icons/fc";
import { useOrgChartStore } from "../stores/orgChartStore";
import { useEmployeeUpdate } from "../hooks/useEmployeeUpdate";
import { showToast } from "../utils/toast";

export const DepartmentNodeComponent: React.FC<{
  data: DepartmentNodeData;
  selected: boolean;
}> = ({ data, selected }) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { handleMoveEmployeeBetweenDepartments } = useEmployeeUpdate();

  const { nodes, setNodes, updateEdgesForEmployee } = useOrgChartStore();

  // Alt personelleri bulma fonksiyonu

  // Departmanlar arası taşıma fonksiyonu
  const handleInterDepartmentMove = useCallback(
    async (
      sourceNodeId: string,
      targetDepartmentId: string,
      draggedEmployee: Employee
    ) => {
      try {
        // Hedef departmanın manager'ını bul
        const targetDepartmentEmployees = nodes.filter(
          (node) =>
            node.type === "employee" && node.parentId === targetDepartmentId
        );

        let targetManagerId: string | null = null;

        if (targetDepartmentEmployees.length > 0) {
          // Departmanda personel varsa ilk personeli manager olarak kullan
          targetManagerId = targetDepartmentEmployees[0].id;
        }
        // Eğer departmanda personel yoksa targetManagerId null kalır

        const result = await handleMoveEmployeeBetweenDepartments({
          person_id: sourceNodeId,
          new_department_id: targetDepartmentId,
          drop_employee_id: targetManagerId || undefined, // null ise undefined gönder
        });
        console.log("RESULT: ", result);
        if (!result?.success) {
          showToast("error", "Departmanlar arası taşıma başarısız.");
          return;
        }

        // API'den gelen taşınan personel ID'lerini kullan
        const movedEmployeeIds = result.movedEmployeeIds || [sourceNodeId];
        console.log("Moved employee IDs from API:", movedEmployeeIds);

        // Taşınan employee'ları yeni departmana taşı
        const sourceNode = nodes.find((n) => n.id === sourceNodeId);
        if (sourceNode) {
          // Eski manager'ı bul ve edge'ini sil
          const oldManagerId = sourceNode.data?.manager_id?.toString();
          console.log(
            "OLD MANAGER ID - departmentNodeComponent: ",
            oldManagerId
          );
          if (oldManagerId) {
            const { setEdges } = useOrgChartStore.getState();
            setEdges((prev) =>
              prev.filter(
                (edge) =>
                  !(
                    edge.source === oldManagerId && edge.target === sourceNodeId
                  )
              )
            );
          }

          // API'den gelen ID'lere göre node'ları güncelle
          setNodes((prev) =>
            prev.map((node) => {
              if (movedEmployeeIds.includes(node.id)) {
                return {
                  ...node,
                  parentId: targetDepartmentId,
                  data: {
                    ...node.data,
                    department_id: targetDepartmentId,
                    manager_id:
                      node.id === sourceNodeId && targetManagerId
                        ? targetManagerId
                        : node.data.manager_id,
                  },
                };
              }
              return node;
            })
          );
        }

        // Edge'leri güncelle (eğer targetManagerId varsa)
        if (targetManagerId) {
          updateEdgesForEmployee(sourceNodeId, targetManagerId);
        }

        showToast(
          "success",
          `Personel ve ${
            result.movedEmployees || 1
          } alt personeli yeni departmana taşındı.`
        );
      } catch (error) {
        console.error("Departmanlar arası taşıma hatası:", error);
        showToast("error", "Departmanlar arası taşıma sırasında hata oluştu.");
      }
    },
    [
      handleMoveEmployeeBetweenDepartments,
      nodes,
      setNodes,
      updateEdgesForEmployee,
    ]
  );

  // Bu departmandaki çalışanları nodes'tan al
  const departmentEmployees = useMemo(() => {
    return nodes.filter(
      (node) =>
        node.type === "employee" && node.parentId === data.unit_id.toString()
    );
  }, [nodes, data.unit_id]);

  // Departmanda çalışan var mı kontrolü
  const departmentHasEmployees = useMemo(() => {
    return departmentEmployees.length > 0;
  }, [departmentEmployees.length, data.unit_id]);
  // console.log(
  //   "DEPARTMENT EMPLOYEES - departmentNodeComponent: ",
  //   departmentEmployees
  // );
  // Departman yöneticisini bul - önce isManager field'ına bak, yoksa ilk employee'yi al
  const departmentManager = useMemo(() => {
    let manager = departmentEmployees.find(
      (node) => node.data?.isManager === true
    );

    // Eğer isManager field'ı ile manager bulunamazsa, ilk employee'yi manager olarak kabul et
    if (!manager && departmentEmployees.length > 0) {
      manager = departmentEmployees[0];
    }

    return manager;
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

        if (parsed.type === "employee-node" && parsed.employee.department_id) {
          console.log("DEPARTMENT NODE : DEPARTMANLAR ARASI YÖNETİCİ TAŞIMASI");
          // Departmanlar arası taşıma işlemini başlat
          handleInterDepartmentMove(
            parsed.employee.person_id.toString(),
            data.unit_id.toString(),
            parsed.employee
          );
          return;
        }

        // Sidebar'dan gelen employee'ler (ilk atama) veya departmanlar arası taşınan employee'ler
        if (
          parsed.type === "employee" ||
          parsed.type === "employee-node" ||
          (!parsed.type && parsed.person_id)
        ) {
          const employee: Employee =
            parsed.type === "employee"
              ? parsed.data
              : parsed.type === "employee-node"
              ? parsed.employee
              : parsed;

          // İlk atama için departmanda zaten personel varsa reddet (departmanlar arası taşıma için değil)
          if (!parsed.type || parsed.type === "employee") {
            if (departmentHasEmployees) {
              console.log("Department already has employees, rejecting drop");
              return;
            }
          }

          // Relative position hesapla
          const rect = e.currentTarget.getBoundingClientRect();
          const relativePosition = calculateRelativePosition(e as any, rect);

          console.log(
            "İlk personel departman yöneticisi olarak atanıyor:",
            employee
          );

          // Department employee drop handler'ını çağır
          if (data.onEmployeeDrop) {
            data.onEmployeeDrop(
              data.unit_id.toString(),
              employee,
              relativePosition
            );
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

  return (
    <div>
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
      <div style={headerStyle}>
        <div className="text-center text-xl font-semibold">
          {data.unit_name}
        </div>

        {/* <div className="mt-2 font-normal text-sm flex items-center justify-center">
          <span className="text-[#252A34]">Yönetici:</span>
          {departmentManager ? (
            <span className="text-[#4caf50] mr-1 ml-0.5">
              {`${departmentManager.data?.first_name || "Bilinmeyen"} ${
                departmentManager.data?.last_name || "Bilinmeyen"
              }`}
            </span>
          ) : (
            <span className="text-[#f44336] mr-1 ml-0.5">Atanmamış</span>
          )}
          {departmentManager ? (
            <FcOk className="w-4 h-4" />
          ) : (
            <FcHighPriority className="w-4 h-4" />
          )}
        </div> */}

        {/* {departmentEmployees.length >= 0 && (
          <div className="mt-1 text-xs font-normal text-gray-600">
            Personel Sayısı: {departmentEmployees.length}
          </div>
        )} */}
      </div>

      {/* Instructions */}
      <div
        style={getContainerStyle(draggedOver)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleEmployeeToDepartmentDrop}
      >
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
    </div>
  );
};
