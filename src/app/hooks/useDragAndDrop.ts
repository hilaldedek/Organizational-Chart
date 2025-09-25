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
  } = useOrgChartStore();

  const { handleEmployeeUpdate } = useEmployeeUpdate({ showToast });

  const handleEmployeeDragStart = useCallback((sourceNodeId: string) => {
    console.log("handleEmployeeDragStart tetiklendi!", sourceNodeId);
    // Drag başladığında gerekirse UI güncellemeleri yapılabilir
  }, []);

  const handleIntraDepartmentMove = useCallback(
    async (sourceNodeId: string, targetNodeId: string, draggedEmployee: Employee) => {
      const requestId = `intra-dept-${sourceNodeId}-${targetNodeId}`;
      
      // Duplicate işlem kontrolü
      if (processedRequests.has(requestId) || updatingEmployees.has(sourceNodeId)) {
        console.log("İşlem zaten yapılıyor veya tamamlanmış:", requestId);
        return;
      }

      try {
        addProcessedRequest(requestId);

        // UI'ı hemen güncelle (optimistic update)
        updateEmployeeInNodes(sourceNodeId, targetNodeId);
        updateEdgesForEmployee(sourceNodeId, targetNodeId);

        // API çağrısı
        const result = await handleEmployeeUpdate({
          person_id: sourceNodeId,
          drop_department_id: draggedEmployee.department_id?.toString() ?? "",
          drop_employee_id: targetNodeId,
        });

        // API başarısız olursa UI'ı eski haline döndürmek gerekebilir
        if (!result.success) {
          // Burada rollback işlemi yapılabilir
          showToast("error", "Güncelleme başarısız oldu, sayfa yenilenecek.");
          // Sayfayı yenile veya state'i reload et
          window.location.reload();
        }
      } catch (error) {
        console.error("İntra-department move hatası:", error);
        showToast("error", "Taşıma işlemi başarısız oldu.");
      } finally {
        // İşlem tamamlandıktan sonra request'i kaldır
        setTimeout(() => {
          removeProcessedRequest(requestId);
        }, 1000); // 1 saniye sonra kaldır
      }
    },
    [
      processedRequests, 
      updatingEmployees, 
      handleEmployeeUpdate, 
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
      
      if (!nodes.length) {
        console.warn("Nodes dizisi boş!");
        return;
      }

      // Mevcut çalışan mı yoksa yeni mi?
      const existingNode = nodes.find((node) => node.id === draggedEmployee.person_id.toString());

      if (existingNode) {
        // Mevcut çalışan taşınıyor
        const sourceNode = nodes.find((node) => node.id === draggedNodeId);
        const targetNode = nodes.find((node) => node.id === targetNodeId);

        if (!sourceNode || !targetNode) {
          console.error("Source veya target node bulunamadı!", { sourceNode, targetNode });
          return;
        }

        // Aynı departmanda mı kontrol et
        if (!areInSameDepartmentNodes(sourceNode, targetNode)) {
          showToast("warning", "Personeller sadece aynı departman içinde taşınabilir!");
          return;
        }

        // Dairesel hiyerarşi kontrolü
        const allSubordinates = findAllSubordinatesFromNodes(draggedNodeId, nodes);
        if (allSubordinates.some((sub) => sub.id === targetNodeId)) {
          showToast("warning", "Dairesel hiyerarşi oluşturulamaz!");
          return;
        }

        // Kendisine taşıma kontrolü
        if (draggedNodeId === targetNodeId) {
          showToast("warning", "Personel kendisine rapor veremez!");
          return;
        }

        handleIntraDepartmentMove(draggedNodeId, targetNodeId, draggedEmployee);
        return;
      }

      // Sidebar'dan gelen yeni personel için işlemler
      // Bu kısım implementation'a göre eklenebilir
      console.log("Sidebar'dan yeni personel ekleniyor:", draggedEmployee);
    },
    [
      nodes, 
      handleIntraDepartmentMove, 
      findAllSubordinatesFromNodes, 
      areInSameDepartmentNodes, 
      showToast
    ]
  );

  // Utility fonksiyonları da export edelim
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