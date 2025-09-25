// src/app/stores/orgChartStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { Department, Employee } from "../types/orgChart";

interface OrgChartState {
  // State
  nodes: Node[];
  edges: Edge[];
  departments: Department[];
  ceo: Employee[];
  allEmployees: Employee[];
  loading: boolean;
  isLoading: boolean;
  processedRequests: Set<string>;
  updatingEmployees: Set<string>;
  
  // Actions
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setDepartments: (departments: Department[]) => void;
  setCeo: (ceo: Employee[]) => void;
  setAllEmployees: (employees: Employee[]) => void;
  setLoading: (loading: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addProcessedRequest: (requestId: string) => void;
  removeProcessedRequest: (requestId: string) => void;
  addUpdatingEmployee: (employeeId: string) => void;
  removeUpdatingEmployee: (employeeId: string) => void;
  
  // Complex actions
  updateEmployeeInNodes: (sourceNodeId: string, targetNodeId: string) => void;
  updateEdgesForEmployee: (sourceNodeId: string, targetNodeId: string) => void;
  
  // Reset
  resetStore: () => void;
}

const initialState = {
  nodes: [],
  edges: [],
  departments: [],
  ceo: [],
  allEmployees: [],
  loading: true,
  isLoading: true,
  processedRequests: new Set<string>(),
  updatingEmployees: new Set<string>(),
};

export const useOrgChartStore = create<OrgChartState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      setNodes: (nodes) => set((state) => ({
        nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes
      })),
      
      setEdges: (edges) => set((state) => ({
        edges: typeof edges === 'function' ? edges(state.edges) : edges
      })),
      
      setDepartments: (departments) => set({ departments }),
      
      setCeo: (ceo) => set({ ceo }),
      
      setAllEmployees: (allEmployees) => set({ allEmployees }),
      
      setLoading: (loading) => set({ loading }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      onNodesChange: (changes) => set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes)
      })),
      
      onEdgesChange: (changes) => set((state) => ({
        edges: applyEdgeChanges(changes, state.edges)
      })),
      
      addProcessedRequest: (requestId) => set((state) => ({
        processedRequests: new Set([...state.processedRequests, requestId])
      })),
      
      removeProcessedRequest: (requestId) => set((state) => {
        const newSet = new Set(state.processedRequests);
        newSet.delete(requestId);
        return { processedRequests: newSet };
      }),
      
      addUpdatingEmployee: (employeeId) => set((state) => ({
        updatingEmployees: new Set([...state.updatingEmployees, employeeId])
      })),
      
      removeUpdatingEmployee: (employeeId) => set((state) => {
        const newSet = new Set(state.updatingEmployees);
        newSet.delete(employeeId);
        return { updatingEmployees: newSet };
      }),
      
      updateEmployeeInNodes: (sourceNodeId, targetNodeId) => set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id === sourceNodeId && node.type === "employee") {
            return {
              ...node,
              data: { ...node.data, manager_id: parseInt(targetNodeId) },
            };
          }
          return node;
        })
      })),
      
      updateEdgesForEmployee: (sourceNodeId, targetNodeId) => set((state) => {
        const filteredEdges = state.edges.filter((edge) => edge.target !== sourceNodeId);
        const newEdge = {
          id: `${targetNodeId}-${sourceNodeId}`,
          source: targetNodeId,
          target: sourceNodeId,
          type: "smoothstep" as const,
          animated: true,
          style: { stroke: "#4caf50", strokeWidth: 2 },
          label: "yönetir",
          labelStyle: { fontSize: 10 },
        };
        return { edges: [...filteredEdges, newEdge] };
      }),
      
      resetStore: () => set(initialState),
    }),
    { name: 'org-chart-store',
      partialize:(state:OrgChartState)=>({
        nodes:state.nodes,
        edges:state.edges,
        departments:state.departments,
        ceo:state.ceo,
        allEmployees: state.allEmployees,
        loading: state.loading,
        isLoading: state.isLoading
      })
     }
  )
);