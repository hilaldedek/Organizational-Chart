import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { Department, Employee } from "../types/orgChart";


export const useOrgChart = (newDepartment: Department[]) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ceo, setCeo] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const isInitializedRef = useRef(false);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  useEffect(() => {
    if (isInitializedRef.current) return;

    const fetchCeoAndDepartments = async () => {
      try {
        setLoading(true);
        isInitializedRef.current = true;

        const ceoResponse = await fetch("/api/get-ceo");
        const ceoData = await ceoResponse.json();
        setCeo(ceoData);

        const deptResponse = await fetch("/api/list-department");
        const departmentsData: Department[] = await deptResponse.json();
        setDepartments(departmentsData);

        const hierarchyResponse = await fetch("/api/get-org-hierarchy");
        const hierarchyData = await hierarchyResponse.json();

        // CEO Node
        const ceoNode: Node = {
          id: ceoData.length > 0 ? ceoData[0].person_id.toString() : "ceo",
          type: "default",
          position: { x: 500, y: 50 },
          data: { label: ceoData.length > 0 ? `${ceoData[0].first_name} ${ceoData[0].last_name}` : "CEO" },
          draggable: false,
          style: { background: "#BBDCE5", fontSize: 16, color: "#252A34", textAlign: "center", borderRadius: 8, padding: 10, fontWeight: "bold" },
        };

        setNodes([ceoNode]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setIsLoading(false);
      }
    };

    fetchCeoAndDepartments();
  }, []);

  return { nodes, edges, departments, ceo, loading, isLoading, setNodes, setEdges, onNodesChange, onEdgesChange };
};
