// src/app/hooks/useEmployeeUpdate.ts
import { useCallback } from "react";
import { UpdateEmployeeParams } from "../types/orgChart";
import { useOrgChartStore } from "../stores/orgChartStore";
import { showToast } from "../utils/toast";

export const useEmployeeUpdate = () => {
  const { 
    addUpdatingEmployee, 
    removeUpdatingEmployee, 
    updatingEmployees,
    nodes,
    removeUnassignedEmployee,
    setNodes,
  } = useOrgChartStore();

  // Departman içi manager güncelleme (sadece manager_id değişir)
  const handleIntraDepartmentManagerUpdate = useCallback(
    async ({ person_id, drop_department_id, drop_employee_id }: UpdateEmployeeParams) => {
      if (updatingEmployees.has(person_id)) {
        showToast("warn", "Bu personel zaten güncelleniyor, lütfen bekleyin.");
        return { success: false };
      }

      try {
        addUpdatingEmployee(person_id);
        const { nodes: currentNodes } = useOrgChartStore.getState();
        const targetNode = currentNodes.find((n) => n.id === drop_employee_id);
        if (!targetNode) {
          showToast("error", "Hedef node bulunamadı.");
          return { success: false };
        }
        
        const response = await fetch("/api/update-employee-and-department", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            person_id, 
            drop_department_id, 
            drop_employee_id 
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          const errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
          showToast("error", `Hata: ${errorMessage}`);
          return { success: false };
        }

        // Başarılı olursa personeli atanmamış listesinden kaldır
        removeUnassignedEmployee(person_id);
        showToast("success", "Departman içi yönetici güncellemesi başarılı.");
        return { success: true, employee: data.employee };
      } catch (error) {
        console.error("API hatası:", error);
        const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
        showToast("error", `Sunucu hatası: ${errorMessage}`);
        return { success: false };
      } finally {
        removeUpdatingEmployee(person_id);
      }
    },
    [showToast, addUpdatingEmployee, removeUpdatingEmployee, updatingEmployees, removeUnassignedEmployee]
  );

  // Yeni personel departmana ekleme (hem department_id hem manager_id değişir)
  const handleAddEmployeeToDepartment = useCallback(
    async ({ person_id, drop_department_id, drop_employee_id }: UpdateEmployeeParams) => {
      console.log("handleAddEmployeeToDepartment tetiklendi!", { person_id, drop_department_id, drop_employee_id });
      if (updatingEmployees.has(person_id)) {
        showToast("warn", "Bu personel zaten güncelleniyor, lütfen bekleyin.");
        return { success: false };
      }

      try {
        addUpdatingEmployee(person_id);
        
        const response = await fetch("/api/add-employee-to-department", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            person_id, 
            drop_department_id, 
            drop_employee_id 
          }),
        });

        const data = await response.json();
        console.log("DATA: ",data);
        if(response.ok){
          setNodes((prev) => prev.map((node) => {
            if (node.id === person_id && node.type === "employee") {
              return {
                ...node,
                data: {
                  ...node.data,
                  ...data.employee,
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
          console.log("NODES: ",nodes)
          removeUnassignedEmployee(person_id);
        showToast("success", "Personel departmana başarıyla eklendi.");
        return { success: true, employee: data.employee };
        }else{
          const errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
          showToast("error", `Hata: ${errorMessage}`);
          return { success: false };
        }
      } catch (error) {
        console.error("API hatası:", error);
        const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
        showToast("error", `Sunucu hatası: ${errorMessage}`);
        return { success: false };
      } finally {
        removeUpdatingEmployee(person_id);
      }
    },
    [showToast, addUpdatingEmployee, removeUpdatingEmployee, updatingEmployees, removeUnassignedEmployee, setNodes]
  );

  // Hangi API'yi kullanacağını belirleyen ana fonksiyon
  const handleEmployeeUpdate = useCallback(
    async ({ person_id, drop_department_id, drop_employee_id }: UpdateEmployeeParams) => {
      // API çağrısı tamamlandığında başarılı olursa personeli atanmamış listesinden kaldır
      const result = await handleIntraDepartmentManagerUpdate({
        person_id, 
        drop_department_id, 
        drop_employee_id
      });
      
      return result;
    },
    [handleIntraDepartmentManagerUpdate]
  );

  // Departmanlar arası taşıma
const handleMoveEmployeeBetweenDepartments = useCallback(
    async ({ 
      person_id, 
      new_department_id, 
      drop_employee_id
    }: { 
      person_id: string; 
      new_department_id: string; 
      drop_employee_id?: string; // Optional yapıldı
    }) => {
      if (updatingEmployees.has(person_id)) {
        showToast("warn", "Bu personel zaten güncelleniyor, lütfen bekleyin.");
        return { success: false };
      }

      try {
        addUpdatingEmployee(person_id);
        console.log("HELLOO")
        console.log("API'ye gönderilen veri:", {
          person_id, 
          new_department_id,
          drop_employee_id
        });
        
        // drop_employee_id varsa body'ye ekle, yoksa ekleme
        const requestBody: any = {
          person_id, 
          new_department_id,
          drop_employee_id
        };
        
        // if (drop_employee_id) {
        //   requestBody.drop_employee_id = drop_employee_id;
        // }
        
        const response = await fetch("/api/move-employee-between-departments", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        
        if (!response.ok) {
          const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
          showToast("error", `Hata: ${errorMessage}`);
          return { success: false };
        }

        showToast("success", "Personel ve alt personelleri başarıyla yeni departmana taşındı.");
        return { 
          success: true, 
          movedEmployees: data.movedEmployees,
          movedEmployeeIds: data.movedEmployeeIds // API'den gelen taşınan personel ID'leri
        };
      } catch (error) {
        console.error("API hatası:", error);
        const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
        showToast("error", `Sunucu hatası: ${errorMessage}`);
        return { success: false };
      } finally {
        removeUpdatingEmployee(person_id);
      }
    },
    [showToast, addUpdatingEmployee, removeUpdatingEmployee, updatingEmployees]
  );

  return { 
    handleEmployeeUpdate,
    handleIntraDepartmentManagerUpdate,
    handleAddEmployeeToDepartment,
    handleMoveEmployeeBetweenDepartments
  };
};