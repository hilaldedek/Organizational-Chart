"use client";
import React, { useMemo, useCallback, useEffect } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ReactFlow,
  Node,
} from "@xyflow/react";
import { useOrgChart } from "../hooks/useOrgChart";
import { useDragAndDrops } from "../hooks/useDragAndDrop";
import { useOrgChartStore } from "../stores/orgChartStore";
import EmployeeNode from "./EmployeeNode";
import { DepartmentNodeComponent } from "./DepartmentNode";
import { useEmployeeUpdate } from "../hooks/useEmployeeUpdate";

interface OrgChartInnerProps {
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  onEmployeeAssigned?: (employeeId: string) => void;
}

const OrgChartInner: React.FC<OrgChartInnerProps> = ({
  showToast,
  onEmployeeAssigned,
}) => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setNodes,
    setEdges,
    applyHierarchicalLayout,
  } = useOrgChartStore();

  // Utility functions
  const findAllSubordinatesFromNodes = useCallback(
    (nodeId: string, nodes: Node[]): Node[] => {
      const result: Node[] = [];
      const visited = new Set<string>();

      const findSubordinates = (currentNodeId: string) => {
        if (visited.has(currentNodeId)) return;
        visited.add(currentNodeId);

        const subordinates = nodes.filter(
          (node) =>
            node.type === "employee" &&
            node.data?.manager_id?.toString() === currentNodeId
        );

        subordinates.forEach((subordinate) => {
          result.push(subordinate);
          findSubordinates(subordinate.id);
        });
      };

      findSubordinates(nodeId);
      return result;
    },
    []
  );

  const areInSameDepartmentNodes = useCallback(
    (sourceNode: Node, targetNode: Node): boolean => {
      return (
        sourceNode.parentId?.toString() === targetNode.parentId?.toString()
      );
    },
    []
  );

  // Drag handlers
  const { handleEmployeeDragStart, handleEmployeeDrop } = useDragAndDrops({
    showToast,
    findAllSubordinatesFromNodes,
    areInSameDepartmentNodes,
  });
  const {
    handleAddEmployeeToDepartment,
    handleMoveEmployeeBetweenDepartments,
  } = useEmployeeUpdate({ showToast });

  const handleDepartmentEmployeeDrop = useCallback(
    (
      departmentId: string,
      employee: any,
      position: { x: number; y: number }
    ) => {
      console.log("Department employee drop:", {
        departmentId,
        employee,
        position,
      });

      // Eğer employee zaten bir departmanda ise (departmanlar arası taşıma)
      const existingEmployeeNode = nodes.find(
        (node) =>
          node.type === "employee" && node.id === employee.person_id.toString()
      );

      console.log("Employee node kontrolü:", {
        employeeId: employee.person_id.toString(),
        existingEmployeeNode: !!existingEmployeeNode,
        currentParentId: existingEmployeeNode?.parentId,
        targetDepartmentId: departmentId,
      });

      if (existingEmployeeNode) {
        // Departmanlar arası taşıma - mevcut node'u ve children'larını güncelle
        (async () => {
          // Hedef departmandaki mevcut employee'yi bul (drop target)
          const targetDepartmentEmployees = nodes.filter(
            (node) => node.type === "employee" && node.parentId === departmentId
          );

          // Eğer hedef departmanda employee yoksa, taşınan employee'yi manager yap
          const dropEmployeeId =
            targetDepartmentEmployees.length > 0
              ? targetDepartmentEmployees[0].id
              : employee.person_id.toString();

          console.log("Departmanlar arası taşıma başlıyor:", {
            person_id: employee.person_id.toString(),
            new_department_id: departmentId,
            drop_employee_id: dropEmployeeId,
          });
console.log("GELDİM Mİ")
          const result = await handleMoveEmployeeBetweenDepartments({
            person_id: employee.person_id.toString(),
            new_department_id: departmentId,
            drop_employee_id: dropEmployeeId,
          });

          console.log("API sonucu:", result);
          if (!result.success) return;

          // Taşınan employee'nin children'larını bul
          const { nodes: currentNodes } = useOrgChartStore.getState();
          const movedEmployeeIds = [employee.person_id.toString()];

          // Children'ları bul (parents_connection'a göre)
          const childrenNodes = currentNodes.filter((node) => {
            if (
              node.type !== "employee" ||
              node.id === employee.person_id.toString()
            )
              return false;
            const nodeData = node.data as any;
            return nodeData?.parents_connection?.startsWith(
              employee.person_id.toString()
            );
          });

          childrenNodes.forEach((child) => movedEmployeeIds.push(child.id));

          // Taşınan tüm node'ları yeni departmana güncelle
          setNodes((prev) =>
            prev.map((node) => {
              if (movedEmployeeIds.includes(node.id)) {
                return {
                  ...node,
                  parentId: departmentId,
                  position: {
                    x: position.x + (Math.random() - 0.5) * 100, // Küçük rastgele offset
                    y: position.y + (Math.random() - 0.5) * 100,
                  },
                };
              }
              return node;
            })
          );

          // Eski edge'leri temizle (taşınan employee'lerle ilgili tüm edge'ler)
          setEdges((prev) =>
            prev.filter((edge) => {
              const sourceMoved = movedEmployeeIds.includes(edge.source);
              const targetMoved = movedEmployeeIds.includes(edge.target);
              // Eğer edge'in kaynağı veya hedefi taşınan employee'lerden biri ise sil
              return !sourceMoved && !targetMoved;
            })
          );
        })();
      } else {
        // İlk atama - yeni node oluştur
        const departmentEmployees = nodes.filter(
          (node) => node.type === "employee" && node.parentId === departmentId
        );

        if (departmentEmployees.length > 0) {
          showToast(
            "warning",
            "Bu departmanda zaten personel var! Yeni personelleri mevcut personellerin üstüne sürükleyin."
          );
          return;
        }

        (async () => {
          const result = await handleAddEmployeeToDepartment({
            person_id: employee.person_id.toString(),
            drop_department_id: departmentId,
            drop_employee_id: employee.person_id.toString(),
          });
          if (!result.success) return;

          const { nodes: currentNodes } = useOrgChartStore.getState();
          const deptGroupNode = currentNodes.find((n) => n.id === departmentId);
          if (!deptGroupNode) return;

          const newNode: Node = {
            id: employee.person_id.toString(),
            type: "employee",
            position: {
              x: deptGroupNode.position.x + 50,
              y: deptGroupNode.position.y + 80,
            },
            data: {
              ...employee,
              person_id: employee.person_id,
              isManager: true,
              onDragStart: handleEmployeeDragStart,
              onDrop: handleEmployeeDrop,
              isDragTarget: false,
              isBeingDragged: false,
            },
            draggable: true,
            parentId: departmentId,
            extent: "parent",
            expandParent: true,
          };
          setNodes((prev) => [...prev, newNode]);
          // Atama başarılıysa callback'i çağır
          if (onEmployeeAssigned) {
            onEmployeeAssigned(employee.person_id.toString());
          }
        })();
      }
    },
    [
      nodes,
      showToast,
      handleAddEmployeeToDepartment,
      handleMoveEmployeeBetweenDepartments,
      onEmployeeAssigned,
      setNodes,
      setEdges,
    ]
  );

  // Store'a department drop handler'ını kaydet
  useEffect(() => {
    useOrgChartStore
      .getState()
      .setDepartmentDropHandler?.(handleDepartmentEmployeeDrop);
  }, [handleDepartmentEmployeeDrop]);

  // useOrgChart hook'u - sadece gerekli handler'ları geçiyoruz
  useOrgChart({
    handleEmployeeDragStart,
    handleEmployeeDrop,
    handleDepartmentEmployeeDrop,
    showToast,
  });

  // Otomatik düzen uygula - nodes yüklendiğinde
  useEffect(() => {
    if (nodes.length > 0 && edges.length > 0) {
      // Kısa bir gecikme ile düzen uygula (DOM güncellemeleri için)
      const timer = setTimeout(() => {
        applyHierarchicalLayout();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [nodes.length, edges.length, applyHierarchicalLayout]);

  // Node types
  const nodeTypes = useMemo(
    () => ({
      employee: EmployeeNode,
      group: DepartmentNodeComponent,
    }),
    []
  );

  // Drag over handler
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Canvas'a drop edilen itemleri handle et
    try {
      const dropData = JSON.parse(e.dataTransfer.getData("application/json"));
      console.log("Canvas'a drop edildi:", dropData);
    } catch (error) {
      console.error("Drop data parse error:", error);
    }
  }, []);

  return (
    <div style={{ width: "200vw", height: "200vh", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        nodeTypes={nodeTypes}
        connectionLineStyle={{
          stroke: "#555",
          strokeWidth: 2,
          strokeDasharray: undefined,
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background color="#44444E" gap={20} variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  );
};

export default OrgChartInner;
