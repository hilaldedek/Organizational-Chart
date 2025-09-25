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
    updatingEmployees 
  } = useOrgChartStore();

  const handleEmployeeUpdate = useCallback(
    async ({ person_id, drop_department_id, drop_employee_id }: UpdateEmployeeParams) => {
      // Aynı anda güncelleme yapılıyor mu kontrol et
      if (updatingEmployees.has(person_id)) {
        showToast("warning", "Bu personel zaten güncelleniyor, lütfen bekleyin.");
        return { success: false };
      }

      try {
        addUpdatingEmployee(person_id);
        
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

        showToast("success", "Personel başarıyla güncellendi.");
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
    [showToast, addUpdatingEmployee, removeUpdatingEmployee, updatingEmployees]
  );

  return { handleEmployeeUpdate };
};