import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DepartmentNodeData, Employee } from "../types/orgChart";
import {
  calculateRelativePosition,
  DEPARTMENT_MIN_HEIGHT,
  DEPARTMENT_MIN_WIDTH,
} from "../utils/constants";
import { NodeResizer, useReactFlow } from "@xyflow/react";
import { useOrgChartStore } from "../stores/orgChartStore";
import { useEmployeeUpdate } from "../hooks/useEmployeeUpdate";
import { showToast } from "../utils/toast";

/**
 * Departman node bileşeni - sürükle-bırak işlemlerini destekler
 * @param data - Departman verisi
 * @param selected - Node seçili mi
 * @returns JSX.Element
 */
export const DepartmentNodeComponent: React.FC<{
  data: DepartmentNodeData;
  selected: boolean;
}> = ({ data, selected }) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { getNode } = useReactFlow();
  const node = getNode(data.unit_id.toString());
  const nodeWidth = node?.width || DEPARTMENT_MIN_WIDTH;
  const nodeHeight = node?.height || DEPARTMENT_MIN_HEIGHT;

  const { handleMoveEmployeeBetweenDepartments } = useEmployeeUpdate();
  const { nodes, setNodes, updateEdgesForEmployee } = useOrgChartStore();

  /**
   * Personeli farklı departmanlar arasında taşıma işlemini gerçekleştirir
   * @param sourceNodeId - Taşınacak personelin node ID'si
   * @param targetDepartmentId - Hedef departman ID'si
   * @param draggedEmployee - Sürüklenen personel verisi
   * @returns Promise<void>
   */
  const handleInterDepartmentMove = useCallback(
    async (
      sourceNodeId: string,
      targetDepartmentId: string,
      draggedEmployee: Employee
    ) => {
      try {
        const targetDepartmentEmployees = nodes.filter(
          (node) =>
            node.type === "employee" && node.parentId === targetDepartmentId
        );

        let targetManagerId: string | null = null;

        if (targetDepartmentEmployees.length > 0) {
          targetManagerId = targetDepartmentEmployees[0].id;
        }

        const result = await handleMoveEmployeeBetweenDepartments({
          person_id: sourceNodeId,
          new_department_id: targetDepartmentId,
          drop_employee_id: targetManagerId || undefined,
        });

        if (!result?.success) {
          showToast("error", "Departmanlar arası taşıma başarısız.");
          return;
        }

        const movedEmployeeIds = result.movedEmployeeIds || [sourceNodeId];

        const sourceNode = nodes.find((n) => n.id === sourceNodeId);
        if (sourceNode) {
          const oldManagerId = sourceNode.data?.manager_id?.toString();
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

  /**
   * Bu departmana ait personelleri filtreler
   * @returns Employee node'ları dizisi
   */
  const departmentEmployees = useMemo(() => {
    return nodes.filter(
      (node) =>
        node.type === "employee" && node.parentId === data.unit_id.toString()
    );
  }, [nodes, data.unit_id]);

  /**
   * Departmanda personel olup olmadığını kontrol eder
   * @returns boolean - Personel varsa true, yoksa false
   */
  const departmentHasEmployees = useMemo(() => {
    return departmentEmployees.length > 0;
  }, [departmentEmployees.length]);

  /**
   * Departman yöneticisini bulur (isManager=true olan veya ilk personel)
   * @returns Node | undefined - Departman yöneticisi node'u
   */
  const departmentManager = useMemo(() => {
    let manager = departmentEmployees.find(
      (node) => node.data?.isManager === true
    );

    if (!manager && departmentEmployees.length > 0) {
      manager = departmentEmployees[0];
    }

    return manager;
  }, [departmentEmployees]);

  /**
   * Sürükleme işlemi sırasında departman üzerine gelindiğinde çalışır
   * @param e - Drag event
   * @returns void
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

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

    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
  }, []);

  /**
   * Sürükleme işlemi sırasında departmandan ayrıldığında çalışır
   * @param e - Drag event
   * @returns void
   */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      dragTimeoutRef.current = setTimeout(() => {
        setDraggedOver(false);
        setDraggedEmployee(null);
      }, 100);
    }
  }, []);

  /**
   * Personel departmana bırakıldığında çalışır ve gerekli işlemleri başlatır
   * @param e - Drop event
   * @returns void
   */
  const handleEmployeeToDepartmentDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDraggedOver(false);
      setDraggedEmployee(null);

      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      try {
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

        if (parsed.type === "employee-node" && parsed.employee.department_id) {
          handleInterDepartmentMove(
            parsed.employee.person_id.toString(),
            data.unit_id.toString(),
            parsed.employee
          );
          return;
        }

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

          if (!parsed.type || parsed.type === "employee") {
            if (departmentHasEmployees) {
              console.log("Department already has employees, rejecting drop");
              return;
            }
          }

          const rect = e.currentTarget.getBoundingClientRect();
          const relativePosition = calculateRelativePosition(e as any, rect);

          if (data.onEmployeeDrop) {
            data.onEmployeeDrop(
              data.unit_id.toString(),
              employee,
              relativePosition
            );
          }
        }
      } catch (error) {
        console.error("Drop verisi parse edilemedi:", error);
      }
    },
    [data, departmentHasEmployees, handleInterDepartmentMove]
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
      style={{
        width: "100%",
        height: "100%",
        minWidth: DEPARTMENT_MIN_WIDTH,
        minHeight: DEPARTMENT_MIN_HEIGHT,
        border: draggedOver ? "3px dashed #4caf50" : "2px solid #000",
        borderRadius: "8px",
        background: draggedOver ? "rgba(76, 175, 80, 0.1)" : "#ffffff",
        position: "relative",
        transition: "all 0.3s ease",
        boxShadow: draggedOver
          ? "0 0 15px rgba(76, 175, 80, 0.3)"
          : "0 2px 8px rgba(0,0,0,0.15)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
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
          width: 10,
          height: 10,
          borderRadius: "50%",
          border: "2px solid #fff",
        }}
      />

      {/* Departman İsmi */}
      <div
        style={{
          fontSize: "16px",
          fontWeight: "bold",
          color: "#252A34",
          background: "#FFD5D5",
          padding: "8px 12px",
          borderRadius: "6px",
          textAlign: "center",
          border: "1px solid #ddd",
        }}
      >
        {data.unit_name}
      </div>

      {/* Talimat Mesajı */}
      <div
        style={{
          fontSize: "13px",
          color: "#666",
          textAlign: "center",
          fontStyle: "italic",
          lineHeight: "1.4",
          padding: "8px",
        }}
      >
        {departmentHasEmployees
          ? "Yeni personelleri mevcut personellerin üstüne sürükleyin"
          : "İlk personeli buraya sürükleyin (Departman Yöneticisi)"}
      </div>
    </div>
  );
};
