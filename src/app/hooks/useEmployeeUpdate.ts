// src/app/hooks/useEmployeeUpdate.ts
import { useCallback } from "react";
import { UpdateEmployeeParams } from "../types/orgChart";
import { useOrgChartStore } from "../stores/orgChartStore";

interface UseEmployeeUpdateParams {
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export const useEmployeeUpdate = ({ showToast }: UseEmployeeUpdateParams) => {
  const { 
    addUpdatingEmployee, 
    removeUpdatingEmployee, 
    updatingEmployees,
    nodes,
    setAllEmployees,
    removeUnassignedEmployee, // Store'dan yeni eklenen fonksiyonu al
  } = useOrgChartStore();

  // Departman içi manager güncelleme (sadece manager_id değişir)
  const handleIntraDepartmentManagerUpdate = useCallback(
    async ({ person_id, drop_department_id, drop_employee_id }: UpdateEmployeeParams) => {
      if (updatingEmployees.has(person_id)) {
        showToast("warning", "Bu personel zaten güncelleniyor, lütfen bekleyin.");
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
        return { success: true };
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
        showToast("warning", "Bu personel zaten güncelleniyor, lütfen bekleyin.");
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
        
        if (!response.ok) {
          const errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
          showToast("error", `Hata: ${errorMessage}`);
          return { success: false };
        }
        
        removeUnassignedEmployee(person_id);
        showToast("success", "Personel departmana başarıyla eklendi.");
        return { success: true };
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

  return { 
    handleEmployeeUpdate,
    handleIntraDepartmentManagerUpdate,
    handleAddEmployeeToDepartment
  };
};