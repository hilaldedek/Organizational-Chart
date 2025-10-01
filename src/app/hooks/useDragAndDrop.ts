// src/app/hooks/useDragAndDrops.ts
import { useCallback } from "react";
import { Node } from "@xyflow/react";
import { Employee, UseDragAndDropsParams } from "../types/orgChart";
import { useEmployeeUpdate } from "./useEmployeeUpdate";
import { useOrgChartStore } from "../stores/orgChartStore";
import { showToast } from "../utils/toast";



export const useDragAndDrops = ({
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
  
  const { handleAddEmployeeToDepartment, handleIntraDepartmentManagerUpdate, handleMoveEmployeeBetweenDepartments } = useEmployeeUpdate();

  /**
   * Personel sürükleme işlemi başladığında çalışan fonksiyon
   * @param sourceNodeId - Sürüklenen personelin node ID'si
   */
  const handleEmployeeDragStart = useCallback((sourceNodeId: string) => {
    console.log("handleEmployeeDragStart tetiklendi!", sourceNodeId);
  }, []);

 
  /**
   * Aynı departman içinde personel taşıma işlemini gerçekleştirir
   * @param sourceNodeId - Taşınacak personelin node ID'si
   * @param targetNodeId - Hedef yöneticinin node ID'si
   * @param draggedEmployee - Sürüklenen personel verisi
   * @returns Promise<void>
   */
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
        
        // API'den dönen güncel veri ile node'u güncelle
        if (result.employee) {
          setNodes((prev) => prev.map((node) => {
            if (node.id === sourceNodeId && node.type === "employee") {
              return {
                ...node,
                data: {
                  ...node.data,
                  ...result.employee,
                  isManager: node.data.isManager,
                  onDragStart: node.data.onDragStart,
                  onDrop: node.data.onDrop,
                  isDragTarget: node.data.isDragTarget,
                  isBeingDragged: node.data.isBeingDragged,
                }
              };
            }
            return node;
          }));
        } else {
          // Fallback: Optimistic UI
          updateEmployeeInNodes(sourceNodeId, targetNodeId);
        }
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

  /**
   * Farklı departmanlar arasında personel taşıma işlemini gerçekleştirir
   * @param sourceNodeId - Taşınacak personelin node ID'si
   * @param targetNodeId - Hedef yöneticinin node ID'si
   * @param draggedEmployee - Sürüklenen personel verisi
   * @returns Promise<void>
   */
  const handleInterDepartmentMove = useCallback(
    async (sourceNodeId: string, targetNodeId: string, draggedEmployee: Employee) => {
      const { nodes: currentNodes } = useOrgChartStore.getState();
      const targetNode = currentNodes.find((n) => n.id === targetNodeId);
      if(!targetNode){showToast("error","Hedef node bulunamadı."); return;}
      
      const newDepartmentId = targetNode.parentId?.toString();
      if(!newDepartmentId){
        showToast("error","Hedef departman bulunamadı."); return;
      }

      const requestId = `inter-dept-${sourceNodeId}-${targetNodeId}`;
      
      if (processedRequests.has(requestId) || updatingEmployees.has(sourceNodeId)) return;

      try {
        addProcessedRequest(requestId);
        
        // Hedef departmanın manager'ını bul
        const targetDepartmentEmployees = currentNodes.filter(
          (node) => node.type === "employee" && node.parentId === newDepartmentId
        );

        // let targetManagerId: string | null = null;
        
        // if (targetDepartmentEmployees.length > 0) {
        //   // Departmanda personel varsa ilk personeli manager olarak kullan
        //   targetManagerId = targetDepartmentEmployees[0].id;
        // }
        // Eğer departmanda personel yoksa targetManagerId null kalır
console.log("APIII: ","person_id: ",sourceNodeId,"new_department_id: ",newDepartmentId,"drop_employee_id: ",targetNodeId)


        const result = await handleMoveEmployeeBetweenDepartments({
          person_id: sourceNodeId,
          new_department_id: newDepartmentId,
          drop_employee_id: targetNodeId || undefined, // null ise undefined gönder
        });

        if(!result?.success){showToast("error","Departmanlar arası taşıma başarısız."); return;}
        
        // API'den gelen taşınan personel ID'lerini kullan
        const movedEmployeeIds = result.movedEmployeeIds || [sourceNodeId];
        console.log("Moved employee IDs from API:", movedEmployeeIds);
        
        // Taşınan employee'ları yeni departmana taşı
        const sourceNode = currentNodes.find((n) => n.id === sourceNodeId);
        if (sourceNode) {
          // Eski manager'ı bul ve edge'ini sil
          const oldManagerId = sourceNode.data?.manager_id?.toString();
          if (oldManagerId) {
            const { setEdges } = useOrgChartStore.getState();
            setEdges((prev) => prev.filter(edge => 
              !(edge.source === oldManagerId && edge.target === sourceNodeId)
            ));
          }

        // API'den gelen ID'lere göre node'ları güncelle
        console.log("Moved employee IDs from API (useDragAndDrop):", movedEmployeeIds);
        setNodes((prev) => prev.map((node) => {
          if (movedEmployeeIds.includes(node.id)) {
            return {
              ...node,
              parentId: newDepartmentId,
              data: {
                ...node.data,
                department_id: newDepartmentId,
                manager_id: node.id === sourceNodeId && targetNodeId
                  ? targetNodeId
                  : node.data.manager_id,
              }
            };
          }
          return node;
        }));
        }
        
        // Edge'leri güncelle (eğer targetManagerId varsa)
        if (targetNodeId) {
          updateEdgesForEmployee(sourceNodeId, targetNodeId);
        }
        
        showToast("success", `Personel ve ${result.movedEmployees || 1} alt personeli yeni departmana taşındı.`);

      } finally {
        setTimeout(() => {
          removeProcessedRequest(requestId);
        }, 1000);
      }
    },
    [
      processedRequests, 
      updatingEmployees, 
      handleMoveEmployeeBetweenDepartments, 
      updateEdgesForEmployee,
      addProcessedRequest,
      removeProcessedRequest,
      showToast,
    ]
  );

  /**
   * Personel bırakma işlemini yönetir ve gerekli taşıma işlemlerini başlatır
   * @param targetNodeId - Hedef node ID'si
   * @param draggedEmployee - Sürüklenen personel verisi
   * @param draggedNodeId - Sürüklenen node ID'si
   * @returns void
   */
  const handleEmployeeDrop = useCallback(
    (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => {
      console.log("handleEmployeeDrop tetiklendi!", { targetNodeId, draggedNodeId,draggedEmployee });
      const {nodes:currentNodes} = useOrgChartStore.getState();
      console.log("currentNodes: ",currentNodes)
      if (!currentNodes.length) {
        console.warn("Nodes dizisi boş!");
        return;
      }

      const existingNode = currentNodes.find((node) => node.id === draggedEmployee.person_id.toString());
      console.log("existingNode: useDragAndDrop-handleEmployeeDrop",existingNode)

      if (existingNode) {
        const sourceNode = currentNodes.find((node) => node.id === draggedNodeId);
        const targetNode = currentNodes.find((node) => node.id === targetNodeId);
        console.log("sourceNode: useDragAndDrop-handleEmployeeDrop",sourceNode)
        console.log("targetNode: useDragAndDrop-handleEmployeeDrop",targetNode)

        if (!sourceNode || !targetNode) {
          console.error("Source veya target node bulunamadı!", { sourceNode, targetNode });
          return;
        }

        // Dairesel hiyerarşi kontrolü - basit kontrol
        const isCircular = (sourceId: string, targetId: string, nodes: Node[]): boolean => {
          const visited = new Set<string>();
          const checkSubordinates = (currentId: string): boolean => {
            if (visited.has(currentId)) return false;
            if (currentId === targetId) return true;
            visited.add(currentId);
            
            const subordinates = nodes.filter(node => 
              node.type === "employee" && 
              node.data?.manager_id?.toString() === currentId
            );
            
            return subordinates.some(sub => checkSubordinates(sub.id));
          };
          
          return checkSubordinates(sourceId);
        };

        // Kendisine taşıma kontrolü
        if (draggedNodeId === targetNodeId) {
          showToast("warn", "Personel kendisine rapor veremez!");
          return;
        }

        if(sourceNode.data.department_id !== targetNode.data.department_id){
          console.log("DEPARTMANLAR ARASI TAŞIMA")
          handleInterDepartmentMove(draggedNodeId, targetNodeId, draggedEmployee);
        
        } else {
          console.log("DEPARTMAN İÇİ TAŞIMA")
          // Sadece aynı departman içindeki taşımalarda dairesel hiyerarşi kontrolü
          if (isCircular(draggedNodeId, targetNodeId, currentNodes)) {
            showToast("warn", "Dairesel hiyerarşi oluşturulamaz!");
            return;
          }
          handleIntraDepartmentMove(draggedNodeId, targetNodeId, draggedEmployee);
        }
      } else {
        // Sidebar'dan yeni personel ekleme
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
      
          // 2) UI: yeni node'u aynı departmanda oluştur - API'den dönen güncel veri ile
          const updatedEmployee = result.employee || {
            ...draggedEmployee,
            department_id: departmentId, // String olarak tut
            manager_id: targetNodeId, // String olarak tut
          };
          
          const newNode: Node = {
            id: draggedEmployee.person_id.toString(),
            type: "employee",
            position: {
              x: targetNode?.position.x ?? 50,
              y: (targetNode?.position.y ?? 80) + 100, // hedefin altına yerleştir
            },
            data: {
              ...updatedEmployee,
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
      }
    },
    [
      nodes, 
      handleIntraDepartmentMove,
, 
      areInSameDepartmentNodes, 
      showToast,
      handleAddEmployeeToDepartment,
      updateEdgesForEmployee,
      setNodes
    ]
  );

  /**
   * Dairesel hiyerarşi kontrolü yapar (bir personelin kendi altındakine rapor verip veremeyeceğini kontrol eder)
   * @param sourceNodeId - Kaynak node ID'si
   * @param targetNodeId - Hedef node ID'si
   * @returns boolean - Dairesel hiyerarşi varsa true, yoksa false
   */
  const checkCircularHierarchy = useCallback(
    (sourceNodeId: string, targetNodeId: string): boolean => {
      const visited = new Set<string>();
      const checkSubordinates = (currentId: string): boolean => {
        if (visited.has(currentId)) return false;
        if (currentId === targetNodeId) return true;
        visited.add(currentId);
        
        const subordinates = nodes.filter(node => 
          node.type === "employee" && 
          node.data?.manager_id?.toString() === currentId
        );
        
        return subordinates.some(sub => checkSubordinates(sub.id));
      };
      
      return checkSubordinates(sourceNodeId);
    },
    [nodes]
  );

  /**
   * İki personelin aynı departmanda olup olmadığını kontrol eder
   * @param sourceNodeId - Kaynak node ID'si
   * @param targetNodeId - Hedef node ID'si
   * @returns boolean - Aynı departmandaysa true, değilse false
   */
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
    handleInterDepartmentMove,
    checkCircularHierarchy,
    checkSameDepartment,
  };
};
