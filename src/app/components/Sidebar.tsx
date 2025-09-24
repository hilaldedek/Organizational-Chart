"use client";

import Reac, { useEffect, useState } from "react";
import { Department, Employee } from "../types/orgChart";
import { toast } from "react-toastify";
import EmployeeCard from "./EmployeeCard";
import { SidebarProps } from "../types/sidebar";

const Sidebar: React.FC<SidebarProps> = ({ departments, setDepartments }) => {
  const [unassignedEmployees, setUnassignedEmployees] = useState<Employee[]>(
    []
  );
  const [newEmployeeFirstName, setNewEmployeeFirstName] = useState("");
  const [newEmployeeLastName, setNewEmployeeLastName] = useState("");
  const [newEmployeeTitle, setNewEmployeeTitle] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentMaxCapacity, setNewDepartmentMaxCapacity] = useState("");

  useEffect(() => {
    const fetchUnassignedEmployees = async () => {
      try {
        const response = await fetch("/api/list-unemployed");
        if (!response.ok) throw new Error("Veri çekme işlemi başarısız oldu.");
        const employees: Employee[] = await response.json();
        setUnassignedEmployees(employees);
      } catch (err) {
        toast.error("⚠️ Personel listesi alınamadı!");
      }
    };
    fetchUnassignedEmployees();
  }, []);

  const handleAddEmployee = async () => {
    try {
      const response = await fetch("/api/add-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: newEmployeeFirstName,
          last_name: newEmployeeLastName,
          title: newEmployeeTitle,
        }),
      });

      if (!response.ok) throw new Error("Personel ekleme başarısız oldu.");
      const newEmployee: Employee = await response.json();
      setUnassignedEmployees((prev) => [...prev, newEmployee]);
      setNewEmployeeFirstName("");
      setNewEmployeeLastName("");
      setNewEmployeeTitle("");
      toast.success("✅ Yeni personel başarıyla eklendi!");
    } catch (error) {
      toast.error("❌ Personel eklenirken hata oluştu!");
    }
  };

  const handleAddDepartment = async () => {
    try {
      const response = await fetch("/api/add-department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_name: newDepartmentName,
          max_employees: newDepartmentMaxCapacity,
        }),
      });

      if (!response.ok) throw new Error("Departman ekleme başarısız oldu.");
      const newDepartment: Department = await response.json();
      setDepartments((prev) => [...prev, newDepartment]);
      setNewDepartmentName("");
      setNewDepartmentMaxCapacity("");
      toast.success("🏢 Yeni birim başarıyla eklendi!");
    } catch (error) {
      toast.error("❌ Birim eklenirken hata oluştu!");
    }
  };

  return (
    <div className="p-6 min-h-screen bg-[#f9f7f7ea] w-80 overflow-y-auto fixed right-0 top-0 h-full">
      <div className="m-2 text-[#252A34] p-4 rounded-lg">
        <h2 className="text-xl text-center font-semibold mb-4 border-b pb-2">
          Atanmamış Personeller
        </h2>
        <div className="space-y-4 mb-8">
          {unassignedEmployees.length > 0 ? (
            unassignedEmployees.map((employee) => (
              <EmployeeCard key={employee.person_id} employee={employee} />
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
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
          />
          <input
            type="text"
            placeholder="Soyadı"
            value={newEmployeeLastName}
            onChange={(e) => setNewEmployeeLastName(e.target.value)}
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
          />
          <input
            type="text"
            placeholder="Ünvanı"
            value={newEmployeeTitle}
            onChange={(e) => setNewEmployeeTitle(e.target.value)}
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
          />
          <div className="flex justify-center">
            <button
              onClick={handleAddEmployee}
              className="bg-[#ED775A] text-white px-4 py-2 rounded-4xl font-normal hover:bg-[#FF714B]/90 transition-colors"
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
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
          />
          <input
            type="text"
            placeholder="Birimdeki Max Personel Sayısı"
            value={newDepartmentMaxCapacity}
            onChange={(e) => setNewDepartmentMaxCapacity(e.target.value)}
            className="w-full p-2 border border-[#7D7C7C] rounded-4xl focus:outline-none focus:ring-2 focus:ring-[#96B6C5]"
          />
          <div className="flex justify-center">
            <button
              onClick={handleAddDepartment}
              className="bg-[#ED775A] text-white px-4 py-2 rounded-4xl font-normal hover:bg-[#FF714B]/90 transition-colors"
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
