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
import { OrgChartInnerProps } from "../types/orgChart";
import { showToast } from "../utils/toast";

/**
 * Organizasyon şemasının iç bileşeni - ReactFlow ile node'ları ve edge'leri render eder
 * @param onEmployeeAssigned - Personel atandığında çalışacak callback
 * @returns JSX.Element
 */
const OrgChartInner: React.FC<OrgChartInnerProps> = ({
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

  /**
   * İki node'un aynı departmanda olup olmadığını kontrol eder
   * @param sourceNode - Kaynak node
   * @param targetNode - Hedef node
   * @returns boolean - Aynı departmandaysa true, değilse false
   */
  const areInSameDepartmentNodes = useCallback(
    (sourceNode: Node, targetNode: Node): boolean => {
      return (
        sourceNode.parentId?.toString() === targetNode.parentId?.toString()
      );
    },
    []
  );

  const { handleEmployeeDragStart, handleEmployeeDrop } = useDragAndDrops({
    areInSameDepartmentNodes,
  });

  const {
    handleAddEmployeeToDepartment,
    handleMoveEmployeeBetweenDepartments,
  } = useEmployeeUpdate();

  /**
   * Personel departmana bırakıldığında çalışır ve gerekli işlemleri başlatır
   * @param departmentId - Hedef departman ID'si
   * @param employee - Bırakılan personel verisi
   * @param position - Bırakma pozisyonu
   * @returns void
   */
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

      const existingEmployeeNode = nodes.find(
        (node) =>
          node.type === "employee" && node.id === employee.person_id.toString()
      );

      if (existingEmployeeNode) {
        (async () => {
          // Mevcut employee node'u sil
          setNodes((prev) =>
            prev.filter((node) => node.id !== employee.person_id.toString())
          );

          const targetDepartmentEmployees = nodes.filter(
            (node) => node.type === "employee" && node.parentId === departmentId
          );

          const dropEmployeeId =
            targetDepartmentEmployees.length > 0
              ? targetDepartmentEmployees[0].id
              : employee.person_id.toString();

          const result = await handleMoveEmployeeBetweenDepartments({
            person_id: employee.person_id.toString(),
            new_department_id: departmentId,
            drop_employee_id: dropEmployeeId,
          });

          if (!result.success) return;

          // API'den gelen taşınan personel ID'lerini kullan
          const movedEmployeeIds = result.movedEmployeeIds || [
            employee.person_id.toString(),
          ];
          console.log(
            "Moved employee IDs from API (OrgChartInner):",
            movedEmployeeIds
          );

          setNodes((prev) =>
            prev.map((node) => {
              if (movedEmployeeIds.includes(node.id)) {
                return {
                  ...node,
                  parentId: departmentId,
                  data: {
                    ...node.data,
                    department_id: departmentId,
                    manager_id:
                      node.id === employee.person_id.toString() &&
                      dropEmployeeId !== employee.person_id.toString()
                        ? dropEmployeeId
                        : node.data?.manager_id,
                  },
                  position: {
                    x: position.x + (Math.random() - 0.5) * 100,
                    y: position.y + (Math.random() - 0.5) * 100,
                  },
                };
              }
              return node;
            })
          );

          // Sadece ana employee'un edge'ini güncelle, diğerlerinin edge'leri aynı kalacak
          if (dropEmployeeId !== employee.person_id.toString()) {
            // Ana employee'un eski edge'ini sil
            setEdges((prev) =>
              prev.filter(
                (edge) =>
                  !(
                    edge.source === employee.person_id.toString() ||
                    edge.target === employee.person_id.toString()
                  )
              )
            );

            // Ana employee'un yeni edge'ini oluştur
            setEdges((prev) => [
              ...prev,
              {
                id: `${dropEmployeeId}-${employee.person_id}`,
                source: dropEmployeeId,
                target: employee.person_id.toString(),
                type: "smoothstep",
                animated: true,
                style: { stroke: "#555", strokeWidth: 2 },
              },
            ]);
          }
        })();
      } else {
        const departmentEmployees = nodes.filter(
          (node) => node.type === "employee" && node.parentId === departmentId
        );

        if (departmentEmployees.length > 0) {
          showToast(
            "warn",
            "Bu departmanda zaten personel var! Yeni personelleri mevcut personellerin üstüne sürükleyin."
          );
          return;
        }

        (async () => {
          const result = await handleAddEmployeeToDepartment({
            person_id: employee.person_id.toString(),
            drop_department_id: departmentId,
            drop_employee_id: employee.person_id.toString(),
            employees_to_move_count: 1, // Sadece kendisi ekleniyor
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
              department_id: departmentId, // String olarak tut
              manager_id: employee.person_id, // Kendisi manager olacak
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
          if (onEmployeeAssigned) {
            onEmployeeAssigned(employee.person_id.toString());
          }
        })();
      }
    },
    [
      nodes,
      handleAddEmployeeToDepartment,
      handleMoveEmployeeBetweenDepartments,
      onEmployeeAssigned,
      setNodes,
      setEdges,
    ]
  );

  useEffect(() => {
    useOrgChartStore
      .getState()
      .setDepartmentDropHandler?.(handleDepartmentEmployeeDrop);
  }, [handleDepartmentEmployeeDrop]);

  useOrgChart({
    handleEmployeeDragStart,
    handleEmployeeDrop,
    handleDepartmentEmployeeDrop,
  });

  useEffect(() => {
    if (nodes.length > 0 && edges.length > 0) {
      const timer = setTimeout(() => {
        applyHierarchicalLayout();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, edges.length, applyHierarchicalLayout]);

  /**
   * ReactFlow için node tiplerini tanımlar
   * @returns Node tipleri objesi
   */
  const nodeTypes = useMemo(
    () => ({
      employee: EmployeeNode,
      group: DepartmentNodeComponent,
    }),
    []
  );

  /**
   * Canvas üzerinde sürükleme işlemi sırasında çalışır
   * @param e - Drag event
   * @returns void
   */
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  /**
   * Canvas'a bırakma işlemi sırasında çalışır
   * @param e - Drop event
   * @returns void
   */
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background color="#44444E" gap={20} variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  );
};

export default OrgChartInner;
