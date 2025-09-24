import { useCallback } from "react";
import { EmployeeUpdateHooksParams, UpdateEmployeeParams } from "../types/orgChart";


export const useEmployeeUpdate = ({ showToast, setNodes, setEdges }: EmployeeUpdateHooksParams) => {
  const handleEmployeeUpdate = useCallback(
    async ({ person_id, drop_department_id, drop_employee_id }: UpdateEmployeeParams) => {
      try {
        const response = await fetch("/api/update-employee-and-department", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id, drop_department_id, drop_employee_id }),
        });

        const data = await response.json();
        if (!response.ok) {
          showToast("error", `Hata: ${data.message}`);
          return { success: false };
        }

        showToast("success", "Personel başarıyla güncellendi.");
        return { success: true };
      } catch (error) {
        console.error("API hatası:", error);
        showToast("error", "Sunucu hatası!");
        return { success: false };
      }
    },
    [showToast]
  );

  return { handleEmployeeUpdate };
};
