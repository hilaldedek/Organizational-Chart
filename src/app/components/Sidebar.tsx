"use client";

import React, { useEffect, useState } from "react";
import { Employee } from "../types/orgChart";
import { toast } from "react-toastify";
import EmployeeCard from "./EmployeeCard";
import { useOrgChartStore } from "../stores/orgChartStore";
import { SidebarProps } from "../types/sidebar";

const Sidebar: React.FC<SidebarProps> = () => {
  const { departments, setDepartments } = useOrgChartStore();

  const [unassignedEmployees, setUnassignedEmployees] = useState<Employee[]>(
    []
  );
  const [newEmployeeFirstName, setNewEmployeeFirstName] = useState("");
  const [newEmployeeLastName, setNewEmployeeLastName] = useState("");
  const [newEmployeeTitle, setNewEmployeeTitle] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentMaxCapacity, setNewDepartmentMaxCapacity] = useState("");

  // Unassigned employees fetch
  useEffect(() => {
    const fetchUnassignedEmployees = async () => {
      try {
        const response = await fetch("/api/list-unemployed");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const employees: Employee[] = await response.json();
        setUnassignedEmployees(employees);
      } catch (err) {
        console.error("Atanmamış personeller alınırken hata:", err);
        toast.error("⚠️ Personel listesi alınamadı!");
      }
    };

    fetchUnassignedEmployees();
  }, []);

  const validateEmployeeForm = (): boolean => {
    if (!newEmployeeFirstName.trim()) {
      toast.error("❌ Personel adı gereklidir!");
      return false;
    }
    if (!newEmployeeLastName.trim()) {
      toast.error("❌ Personel soyadı gereklidir!");
      return false;
    }
    if (!newEmployeeTitle.trim()) {
      toast.error("❌ Personel ünvanı gereklidir!");
      return false;
    }
    return true;
  };

  const validateDepartmentForm = (): boolean => {
    if (!newDepartmentName.trim()) {
      toast.error("❌ Departman adı gereklidir!");
      return false;
    }
    if (
      !newDepartmentMaxCapacity.trim() ||
      isNaN(Number(newDepartmentMaxCapacity)) ||
      Number(newDepartmentMaxCapacity) <= 0
    ) {
      toast.error("❌ Geçerli bir maksimum personel sayısı giriniz!");
      return false;
    }
    return true;
  };

  const handleAddEmployee = async () => {
    if (!validateEmployeeForm()) return;

    try {
      const response = await fetch("/api/add-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: newEmployeeFirstName.trim(),
          last_name: newEmployeeLastName.trim(),
          title: newEmployeeTitle.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Personel ekleme başarısız oldu.");
      }

      const newEmployee: Employee = await response.json();
      setUnassignedEmployees((prev) => [...prev, newEmployee]);

      // Form temizle
      setNewEmployeeFirstName("");
      setNewEmployeeLastName("");
      setNewEmployeeTitle("");

      toast.success("✅ Yeni personel başarıyla eklendi!");
    } catch (error) {
      console.error("Personel ekleme hatası:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(`❌ Personel eklenirken hata oluştu: ${errorMessage}`);
    }
  };

  const handleAddDepartment = async () => {
    if (!validateDepartmentForm()) return;

    try {
      const response = await fetch("/api/add-department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_name: newDepartmentName.trim(),
          max_employees: parseInt(newDepartmentMaxCapacity),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Departman ekleme başarısız oldu."
        );
      }

      const newDepartment = await response.json();
      setDepartments([...departments, newDepartment]);

      // Form temizle
      setNewDepartmentName("");
      setNewDepartmentMaxCapacity("");

      toast.success("🏢 Yeni birim başarıyla eklendi!");
    } catch (error) {
      console.error("Departman ekleme hatası:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(`❌ Birim eklenirken hata oluştu: ${errorMessage}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action();
    }
  };

  return (
    <div className="p-6 min-h-screen bg-[#f9f7f7ea] w-80 overflow-y-auto fixed right-0 top-0 h-full">
      {/* Atanmamış Personeller */}
      <div className="m-2 text-[#252A34] p-4 rounded-lg">
        <h2 className="text-xl text-center font-semibold mb-4 border-b pb-2">
          Atanmamış Personeller
        </h2>
        <div className="space-y-4 mb-8">
          {unassignedEmployees.length > 0 ? (
            unassignedEmployees.map((employee) => (
              <EmployeeCard
                key={employee.person_id}
                employee={employee}
                onEmployeeAssigned={(employeeId: string) => {
                  // Personel atandığında listeden kaldır
                  setUnassignedEmployees((prev) =>
                    prev.filter((emp) => emp.person_id !== employeeId)
                  );
                }}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm text-center">
              Atanmamış personel bulunmamaktadır.
            </p>
          )}
        </div>
      </div>

      {/* Yeni Personel Ekle */}
      <div className="m-2 text-[#252A34] rounded-lg p-4">
        <h2 className="text-xl text-center font-semibold mb-4 border-b">
          Yeni Personel Ekle
        </h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Adı"
            value={newEmployeeFirstName}
            onChange={(e) => setNewEmployeeFirstName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddEmployee)}
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
            maxLength={50}
          />
          <input
            type="text"
            placeholder="Soyadı"
            value={newEmployeeLastName}
            onChange={(e) => setNewEmployeeLastName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddEmployee)}
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
            maxLength={50}
          />
          <input
            type="text"
            placeholder="Ünvanı"
            value={newEmployeeTitle}
            onChange={(e) => setNewEmployeeTitle(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddEmployee)}
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
            maxLength={100}
          />
          <div className="flex justify-center">
            <button
              onClick={handleAddEmployee}
              disabled={
                !newEmployeeFirstName.trim() ||
                !newEmployeeLastName.trim() ||
                !newEmployeeTitle.trim()
              }
              className="bg-[#ED775A] text-white px-4 py-2 rounded-4xl font-normal hover:bg-[#FF714B]/90 transition-colors disabled:cursor-not-allowed"
            >
              Personel Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Yeni Birim Ekle */}
      <div className="m-2 text-[#252A34] rounded-lg p-4">
        <h2 className="text-xl text-center font-semibold mb-4 border-b">
          Yeni Birim Ekle
        </h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Birim Adı"
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddDepartment)}
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
            maxLength={100}
          />
          <input
            type="number"
            placeholder="Birimdeki Max Personel Sayısı"
            value={newDepartmentMaxCapacity}
            onChange={(e) => setNewDepartmentMaxCapacity(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddDepartment)}
            min="1"
            max="10"
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
          />
          <div className="flex justify-center">
            <button
              onClick={handleAddDepartment}
              disabled={
                !newDepartmentName.trim() || !newDepartmentMaxCapacity.trim()
              }
              className="bg-[#ED775A] text-white px-4 py-2 rounded-4xl font-normal hover:bg-[#FF714B]/90 disabled:cursor-not-allowed"
            >
              Birim Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
