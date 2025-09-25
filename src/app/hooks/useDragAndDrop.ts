// src/app/hooks/useDragAndDrops.ts
import { useCallback } from "react";
import { Node } from "@xyflow/react";
import { Employee } from "../types/orgChart";
import { useEmployeeUpdate } from "./useEmployeeUpdate";
import { useOrgChartStore } from "../stores/orgChartStore";

interface UseDragAndDropsParams {
  showToast: (type: "success" | "error" | "warning", message: string) => void;
  findAllSubordinatesFromNodes: (nodeId: string, nodes: Node[]) => Node[];
  areInSameDepartmentNodes: (sourceNode: Node, targetNode: Node) => boolean;
}

export const useDragAndDrops = ({
  showToast,
  findAllSubordinatesFromNodes,
  areInSameDepartmentNodes,
}: UseDragAndDropsParams) => {
  const {
    nodes,
    processedRequests,
    updatingEmployees,
    updateEmployeeInNodes,
    updateEdgesForEmployee,
    addProcessedRequest,
    removeProcessedRequest,
    setNodes,
  } = useOrgChartStore();
  
  const { handleAddEmployeeToDepartment, handleIntraDepartmentManagerUpdate } = useEmployeeUpdate({ showToast });

  const handleEmployeeDragStart = useCallback((sourceNodeId: string) => {
    console.log("handleEmployeeDragStart tetiklendi!", sourceNodeId);
  }, []);

 
  const handleIntraDepartmentMove = useCallback(
    async (sourceNodeId: string, targetNodeId: string, draggedEmployee: Employee) => {
      const { nodes: currentNodes } = useOrgChartStore.getState();
const targetNode = currentNodes.find((n) => n.id === targetNodeId);
if(!targetNode){showToast("error","Hedef node bulunamadı."); return;}
const departmentId= targetNode.parentId?.toString();
if(!departmentId){
  showToast("error","Hedef departman bulunamadı."); return;
}

      const requestId = `intra-dept-${sourceNodeId}-${targetNodeId}`;
      
      
      if (processedRequests.has(requestId) || updatingEmployees.has(sourceNodeId)) return;

      try {
        addProcessedRequest(requestId);
const result = await handleIntraDepartmentManagerUpdate({
          person_id: sourceNodeId,
          drop_department_id: departmentId,
          drop_employee_id: targetNodeId,
        });

        if(!result?.success){showToast("error","Güncelleme başarısız."); return;}
        // Optimistic UI
        updateEmployeeInNodes(sourceNodeId, targetNodeId);
        updateEdgesForEmployee(sourceNodeId, targetNodeId);


      } 
        finally {
        setTimeout(() => {
          removeProcessedRequest(requestId);
        }, 1000);
      }
    },
    [
      processedRequests, 
      updatingEmployees, 
      handleIntraDepartmentManagerUpdate, 
      updateEmployeeInNodes, 
      updateEdgesForEmployee,
      addProcessedRequest,
      removeProcessedRequest,
      showToast
    ]
  );

  const handleEmployeeDrop = useCallback(
    (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => {
      console.log("handleEmployeeDrop tetiklendi!", { targetNodeId, draggedNodeId });
      const {nodes:currentNodes} = useOrgChartStore.getState();
      if (!currentNodes.length) {
        console.warn("Nodes dizisi boş!");
        return;
      }

      const existingNode = currentNodes.find((node) => node.id === draggedEmployee.person_id.toString());

      if (existingNode) {
        const sourceNode = currentNodes.find((node) => node.id === draggedNodeId);
        const targetNode = currentNodes.find((node) => node.id === targetNodeId);

        if (!sourceNode || !targetNode) {
          console.error("Source veya target node bulunamadı!", { sourceNode, targetNode });
          return;
        }

        // Dairesel hiyerarşi kontrolü
        const allSubordinates = findAllSubordinatesFromNodes(draggedNodeId, currentNodes);
        if (allSubordinates.some((sub) => sub.id === targetNodeId)) {
          showToast("warning", "Dairesel hiyerarşi oluşturulamaz!");
          return;
        }

        // Kendisine taşıma kontrolü
        if (draggedNodeId === targetNodeId) {
          showToast("warning", "Personel kendisine rapor veremez!");
          return;
        }

        // Sadece aynı departman içinde taşıma yapılabilir
        if (areInSameDepartmentNodes(sourceNode, targetNode)) {
          handleIntraDepartmentMove(draggedNodeId, targetNodeId, draggedEmployee);
        } else {
          showToast("warning", "Departmanlar arası taşıma devre dışı bırakıldı.");
        }
        return;
      }
      if (!existingNode) {
        const { nodes: currentNodes } = useOrgChartStore.getState();
        const targetNode = currentNodes.find((n) => n.id === targetNodeId);
        const departmentId = targetNode?.parentId?.toString();
        if (!departmentId) {
          showToast("error", "Hedef departman bulunamadı.");
          return;
        }
      
        (async () => {
          // 1) API: yeni personeli hedef departmana ve targetNode'u manager olacak şekilde ekle
          const result = await handleAddEmployeeToDepartment({
            person_id: draggedEmployee.person_id.toString(),
            drop_department_id: departmentId,
            drop_employee_id: targetNodeId,
          });
          if (!result.success) return;
      
          // 2) UI: yeni node’u aynı departmanda oluştur
          const newNode: Node = {
            id: draggedEmployee.person_id.toString(),
            type: "employee",
            position: {
              x: targetNode?.position.x ?? 50,
              y: (targetNode?.position.y ?? 80) + 100, // hedefin altına yerleştir
            },
            data: {
              ...draggedEmployee,
              person_id: draggedEmployee.person_id,
              isManager: false,
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
      
          // 3) Edge: targetNode yönetici olacak şekilde bağla
          updateEdgesForEmployee(newNode.id, targetNodeId);
      
          showToast("success", "Personel eklendi ve bağlandı.");
        })();
      
        return;
      }
      // Sidebar’dan yeni personel ekleme devre dışı
      showToast("warning", "Yeni personel ekleme şu anda desteklenmiyor.");
    },
    [
      nodes, 
      handleIntraDepartmentMove,
      findAllSubordinatesFromNodes, 
      areInSameDepartmentNodes, 
      showToast
    ]
  );

  const checkCircularHierarchy = useCallback(
    (sourceNodeId: string, targetNodeId: string): boolean => {
      const allSubordinates = findAllSubordinatesFromNodes(sourceNodeId, nodes);
      return allSubordinates.some((sub) => sub.id === targetNodeId);
    },
    [findAllSubordinatesFromNodes, nodes]
  );

  const checkSameDepartment = useCallback(
    (sourceNodeId: string, targetNodeId: string): boolean => {
      const sourceNode = nodes.find((node) => node.id === sourceNodeId);
      const targetNode = nodes.find((node) => node.id === targetNodeId);
      
      if (!sourceNode || !targetNode) return false;
      
      return areInSameDepartmentNodes(sourceNode, targetNode);
    },
    [nodes, areInSameDepartmentNodes]
  );

  return { 
    handleEmployeeDragStart, 
    handleEmployeeDrop, 
    handleIntraDepartmentMove,
    checkCircularHierarchy,
    checkSameDepartment,
  };
};
