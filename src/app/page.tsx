"use client";

import { ReactFlowProvider } from "@xyflow/react";
import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import { Department } from "./types/orgChart";
import OrgChart from "./components/OrgChart";



export default function HomePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
 
  return (
    <div className="flex font-(family-name:--font-poppins) w-full h-screen">
      <ReactFlowProvider>
        <OrgChart
        />
        <Sidebar departments={departments} setDepartments={setDepartments} />
      </ReactFlowProvider>
    </div>
  );
}