// src/app/hooks/useOrgChart.ts
import { useEffect, useRef } from "react";
import { Node } from "@xyflow/react";
import { Department, Employee, UseOrgChartParams } from "../types/orgChart";
import { useOrgChartStore } from "../stores/orgChartStore";
import { showToast } from "../utils/toast";

export const useOrgChart = ({
  handleEmployeeDragStart,
  handleEmployeeDrop,
  handleDepartmentEmployeeDrop,
}: Omit<UseOrgChartParams, 'newDepartment'>) => {
  const {
    nodes,
    edges,
    departments,
    ceo,
    allEmployees,
    loading,
    isLoading,
    onNodesChange,
    onEdgesChange,
    setNodes,
    setEdges,
    setDepartments,
    setCeo,
    setAllEmployees,
    setLoading,
    setIsLoading,
  } = useOrgChartStore();

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;

    const fetchCeoAndDepartments = async () => {
      try {
        setLoading(true);
        isInitializedRef.current = true;

        // CEO verisi
        const ceoResponse = await fetch("/api/get-ceo");
        if (!ceoResponse.ok) {
          throw new Error(`CEO verileri alınamadı: ${ceoResponse.status}`);
        }
        const ceoData = await ceoResponse.json();
        setCeo(ceoData);

        // Departmanlar
        const deptResponse = await fetch("/api/list-department");
        if (!deptResponse.ok) {
          throw new Error(`Departman verileri alınamadı: ${deptResponse.status}`);
        }
        const departmentsData: Department[] = await deptResponse.json();
        setDepartments(departmentsData);

        // Hiyerarşi
        const hierarchyResponse = await fetch("/api/get-org-hierarchy");
        if (!hierarchyResponse.ok) {
          throw new Error(`Hiyerarşi verileri alınamadı: ${hierarchyResponse.status}`);
        }
        const hierarchyData = await hierarchyResponse.json();

        // Sidebar'da kullanmak için employee array'i (CEO hariç)
        const employeesOnly = hierarchyData.filter((emp: any) => emp.role !== "CEO");
        setAllEmployees(employeesOnly);

        // CEO Node
        const ceoNode: Node = {
          id: ceoData.length > 0 ? ceoData[0].person_id.toString() : "ceo",
          type: "default",
          position: { x: 500, y: 50 },
          data: { 
            label: ceoData.length > 0 ? `${ceoData[0].first_name} ${ceoData[0].last_name}` : "CEO" 
          },
          draggable: false,
          style: {
            background: "#BBDCE5",
            fontSize: 16,
            color: "#252A34",
            textAlign: "center" as const,
            borderRadius: 8,
            padding: 10,
            fontWeight: "semibold",
          },
        };

        // Departman Grupları
        const departmentGroupNodes: Node[] = departmentsData.map((dept: Department, index: number) => ({
          id: `${dept.unit_id}`,
          type: "group",
          position: { 
            x: 100 + (index % 3) * 400, 
            y: 200 + Math.floor(index / 3) * 300 
          },
          data: { 
            unit_name: dept.unit_name, 
            unit_id: dept.unit_id.toString(), 
            onEmployeeDrop: handleDepartmentEmployeeDrop 
          },
          style: { width: "auto", height: "auto"},
          draggable: true,
        }));

        // Employee Node'ları ve Edge'ler
        const employeeNodes: Node[] = [];
        const hierarchyEdges: any[] = [];

        // Departmanlara göre çalışanları grupla
        const employeesByDept = hierarchyData.reduce((acc: any, emp: any) => {
          if (emp.department_id && emp.role !== "CEO") {
            if (!acc[emp.department_id]) acc[emp.department_id] = [];
            acc[emp.department_id].push(emp);
          }
          return acc;
        }, {});

        // Her departman için node'ları oluştur
        Object.keys(employeesByDept).forEach((deptId) => {
          const deptEmployees = employeesByDept[deptId];
          const deptGroupNode = departmentGroupNodes.find((node) => node.id === `${deptId}`);
          if (!deptGroupNode) return;

          // Departman yöneticisini bul
          const manager = deptEmployees.find((emp: any) => 
            emp.person_id.toString() === emp.dept_manager_id?.toString()
          );
          const otherEmployees = deptEmployees.filter((emp: any) => 
            emp.person_id.toString() !== emp.dept_manager_id?.toString()
          );

          // Departman yöneticisi node'u
          if (manager) {
            const managerNode: Node = {
              id: manager.person_id.toString(),
              type: "employee",
              position: { 
                x: deptGroupNode.position.x + 50, 
                y: deptGroupNode.position.y + 80 
              },
              data: { 
                ...manager, 
                person_id: manager.person_id, 
                isManager: true, 
                onDragStart: handleEmployeeDragStart, 
                onDrop: handleEmployeeDrop, 
                isDragTarget: false, 
                isBeingDragged: false 
              },
              draggable: true,
              parentId: `${deptId}`,
              extent: "parent",
              expandParent: true,
            };
            employeeNodes.push(managerNode);

            // CEO'ya bağlantı
            if (manager.manager_id && ceoData.length > 0 && 
                manager.manager_id === ceoData[0].person_id) {
              hierarchyEdges.push({
                id: `${manager.manager_id}-${manager.person_id}`,
                source: manager.manager_id.toString(),
                target: manager.person_id.toString(),
                type: "smoothstep",
                style: { stroke: "#4caf50", strokeWidth: 2 , strokeDasharray: undefined},
                labelStyle: { fontSize: 10 },
              });
            }
          }

          // Diğer çalışanlar
          otherEmployees.forEach((emp: any, empIndex: number) => {
            const employeeNode: Node = {
              id: emp.person_id.toString(),
              type: "employee",
              position: { 
                x: deptGroupNode.position.x + 50 + (empIndex % 2) * 200, 
                y: deptGroupNode.position.y + 160 + Math.floor(empIndex / 2) * 120 
              },
              data: { 
                ...emp, 
                person_id: emp.person_id, 
                isManager: false, 
                onDragStart: handleEmployeeDragStart, 
                onDrop: handleEmployeeDrop, 
                isDragTarget: false, 
                isBeingDragged: false 
              },
              draggable: true,
              parentId: `${deptId}`,
              extent: "parent",
              expandParent: true,
            };
            employeeNodes.push(employeeNode);

            // Yöneticiye bağlantı
            if (emp.manager_id) {
              hierarchyEdges.push({
                id: `${emp.manager_id}-${emp.person_id}`,
                source: emp.manager_id.toString(),
                target: emp.person_id.toString(),
                type: "smoothstep",
                animated: false,
                style: { stroke: "#4caf50", strokeWidth: 2, strokeDasharray: undefined  },
                labelStyle: { fontSize: 10 },
              });
            }
          });
        });

        // Store'a kaydet
        setNodes([ceoNode, ...departmentGroupNodes, ...employeeNodes]);
        setEdges(hierarchyEdges);
      } catch (error) {
        console.error("Veriler yüklenirken hata:", error);
        showToast("error", `Veriler yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      } finally {
        setLoading(false);
        setIsLoading(false);
      }
    };

    fetchCeoAndDepartments();
  }, [
    handleEmployeeDragStart,
    handleEmployeeDrop,
    handleDepartmentEmployeeDrop,
    showToast,
    setNodes,
    setEdges,
    setDepartments,
    setCeo,
    setAllEmployees,
    setLoading,
    setIsLoading,
  ]);

  return { 
    nodes, 
    edges, 
    departments, 
    ceo, 
    allEmployees, 
    loading, 
    isLoading, 
    onNodesChange, 
    onEdgesChange,
    // Store actions da return edelim ki component'lar kullanabilsin
    setNodes,
    setEdges 
  };
};