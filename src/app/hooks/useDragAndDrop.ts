import { useCallback } from "react";
import { DragHooksParams, Employee } from "../types/orgChart";
import { useEmployeeUpdate } from "./useEmployeeUpdate";

export const useDragAndDrops = ({
  nodes,
  setNodes,
  setEdges,
  processedRequests,
  updatingEmployees,
  showToast,
  findAllSubordinatesFromNodes,
  areInSameDepartmentNodes,
}: DragHooksParams) => {

  const { handleEmployeeUpdate } = useEmployeeUpdate({ showToast, setNodes, setEdges });

  const handleEmployeeDragStart = useCallback((sourceNodeId: string) => {
    console.log("handleEmployeeDragStart tetiklendi!");
  }, []);

  const handleIntraDepartmentMove = useCallback(
    async (sourceNodeId: string, targetNodeId: string, draggedEmployee: Employee) => {
      const requestId = `intra-dept-${sourceNodeId}-${targetNodeId}`;
      if (processedRequests.has(requestId) || updatingEmployees.has(sourceNodeId)) return;

      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === sourceNodeId && node.type === "employee") {
            return {
              ...node,
              data: { ...node.data, manager_id: parseInt(targetNodeId) },
            };
          }
          return node;
        })
      );

      setEdges((prev) => {
        const filteredEdges = prev.filter((edge) => edge.target !== sourceNodeId);
        const newEdge = {
          id: `${targetNodeId}-${sourceNodeId}`,
          source: targetNodeId,
          target: sourceNodeId,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#4caf50", strokeWidth: 2 },
          label: "yönetir",
          labelStyle: { fontSize: 10 },
        };
        return [...filteredEdges, newEdge];
      });

      await handleEmployeeUpdate({
        person_id: sourceNodeId,
        drop_department_id: draggedEmployee.department_id ?? "",
        drop_employee_id: targetNodeId,
      });
    },
    [processedRequests, updatingEmployees, handleEmployeeUpdate, setNodes, setEdges]
  );

  const handleEmployeeDrop = useCallback(
    (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => {
      console.log("handleEmployeeDrop tetiklendi!");
      if (!nodes.length) return;

      const existingNode = nodes.find((node) => node.id === draggedEmployee.person_id.toString());

      if (existingNode) {
        const sourceNode = nodes.find((node) => node.id === draggedNodeId);
        const targetNode = nodes.find((node) => node.id === targetNodeId);

        if (!sourceNode || !targetNode) return;

        if (!areInSameDepartmentNodes(sourceNode, targetNode)) {
          showToast("warning", "Personeller sadece aynı departman içinde taşınabilir!");
          return;
        }

        const allSubordinates = findAllSubordinatesFromNodes(draggedNodeId, nodes);
        if (allSubordinates.some((sub) => sub.id === targetNodeId)) {
          showToast("warning", "Dairesel hiyerarşi oluşturulamaz!");
          return;
        }

        handleIntraDepartmentMove(draggedNodeId, targetNodeId, draggedEmployee);
        return;
      }

      // Sidebar’dan gelen yeni personel için işlemler
    },
    [nodes, handleIntraDepartmentMove, findAllSubordinatesFromNodes, areInSameDepartmentNodes, showToast]
  );

  return { handleEmployeeDragStart, handleEmployeeDrop, handleIntraDepartmentMove, findAllSubordinatesFromNodes,
    areInSameDepartmentNodes};
};
