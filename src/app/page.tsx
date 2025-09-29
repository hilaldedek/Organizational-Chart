"use client";
import { useState } from "react";
import { Department, Employee } from "./types/orgChart";
import { ReactFlowProvider } from "@xyflow/react";
import OrgChart from "./components/OrgChart";
import Sidebar from "./components/Sidebar";

export default function HomePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const handleAssignEmployee = (employeeId: string) => {
    console.log("Assigned employee:", employeeId);
  };

  return (
    <div className="flex w-full h-screen relative font-(family-name:--font-poppins)">
      <ReactFlowProvider>
        <OrgChart newDepartment={departments} />
        <Sidebar employees={employees} onAssign={handleAssignEmployee} />
      </ReactFlowProvider>
    </div>
  );
}
