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
  unassignedEmployees: Employee[]; // Yeni eklenen state
  loading: boolean;
  isLoading: boolean;
  processedRequests: Set<string>;
  updatingEmployees: Set<string>;
  // Handlers
  departmentDropHandler?: (departmentId: string, employee: any, position: { x: number; y: number }) => void;
  
  // Actions
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setDepartments: (departments: Department[]) => void;
  setCeo: (ceo: Employee[]) => void;
  setAllEmployees: (employees: Employee[]) => void;
  setUnassignedEmployees: (employees: Employee[]) => void; // Yeni eklenen action
  removeUnassignedEmployee: (employeeId: string) => void; // Yeni eklenen action
  setLoading: (loading: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addProcessedRequest: (requestId: string) => void;
  removeProcessedRequest: (requestId: string) => void;
  addUpdatingEmployee: (employeeId: string) => void;
  removeUpdatingEmployee: (employeeId: string) => void;
  setDepartmentDropHandler: (handler: OrgChartState['departmentDropHandler']) => void;
  
  // Complex actions
  updateEmployeeInNodes: (sourceNodeId: string, targetNodeId: string) => void;
  updateEdgesForEmployee: (sourceNodeId: string, targetNodeId: string) => void;
  
  // ELK Layout actions
  applyAutoLayout: () => Promise<void>;
  applyHierarchicalLayout: () => Promise<void>;
  
  // Reset
  resetStore: () => void;
}

const initialState = {
  nodes: [],
  edges: [],
  departments: [],
  ceo: [],
  allEmployees: [],
  unassignedEmployees: [], // Yeni eklenen initial state
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

      setUnassignedEmployees: (unassignedEmployees) => set({ unassignedEmployees }),

      removeUnassignedEmployee: (employeeId) => set((state) => ({
        unassignedEmployees: state.unassignedEmployees.filter(emp => emp.person_id !== employeeId)
      })),
      
      setLoading: (loading) => set({ loading }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      setDepartmentDropHandler: (handler) => set({ departmentDropHandler: handler }),
      
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
          style: { stroke: "#4caf50", strokeWidth: 2,strokeDasharray: undefined },
          label:"delete",
          labelStyle: { fontSize: 10 },
        };
        return { edges: [...filteredEdges, newEdge] };
      }),
      
      applyAutoLayout: async () => {
        const { nodes } = get();
        if (nodes.length === 0) return;
        try {
          const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
          const elk = new ELK();

          // Her departman (group) için lokal layout uygula
          const groupNodes = nodes.filter(n => n.type === 'group');
          const updatedNodes = [...nodes];

          for (const group of groupNodes) {
            const children = updatedNodes.filter(n => n.type === 'employee' && n.parentId === group.id);
            if (children.length === 0) continue;

            const nodeWidth = 180;
            const nodeHeight = 120;

            const elkNodes = children.map(child => ({
              id: child.id,
              width: nodeWidth,
              height: nodeHeight,
            }));

            const elkEdges: { id: string; sources: string[]; targets: string[] }[] = [];

            const elkGraph = {
              id: `group-${group.id}`,
              children: elkNodes,
              edges: elkEdges,
              layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'elk.spacing.nodeNode': '120',
                'elk.spacing.edgeNode': '80',
                'elk.layered.spacing.nodeNodeBetweenLayers': '160'
              }
            } as any;

            const layouted = await elk.layout(elkGraph);
            const offsetX = 16; // getContainerStyle iç alan sol boşluk uyumu
            const offsetY = 120; // header + getContainerStyle marginTop uyumu

            layouted.children?.forEach((ln: any) => {
              const index = updatedNodes.findIndex(n => n.id === ln.id);
              if (index >= 0) {
                updatedNodes[index] = {
                  ...updatedNodes[index],
                  position: {
                    x: (ln.x ?? 0) + offsetX,
                    y: (ln.y ?? 0) + offsetY,
                  }
                };
              }
            });
          }

          set({ nodes: updatedNodes });
        } catch (error) {
          console.error('Auto layout hatası:', error);
        }
      },
      
      applyHierarchicalLayout: async () => {
        const { nodes } = get();
        if (nodes.length === 0) return;
        try {
          const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
          const elk = new ELK();

          const groupNodes = nodes.filter(n => n.type === 'group');
          const updatedNodes = [...nodes];

          for (const group of groupNodes) {
            const children = updatedNodes.filter(n => n.type === 'employee' && n.parentId === group.id);
            if (children.length === 0) continue;

            const nodeWidth = 180;
            const nodeHeight = 120;

            const elkNodes = children.map(child => ({
              id: child.id,
              width: nodeWidth,
              height: nodeHeight,
            }));

            const elkGraph = {
              id: `group-${group.id}`,
              children: elkNodes,
              layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'elk.spacing.nodeNode': '100',
                'elk.spacing.edgeNode': '60',
                'elk.layered.spacing.nodeNodeBetweenLayers': '120'
              }
            } as any;

            const layouted = await elk.layout(elkGraph);

            // getContainerStyle alanına yerleştirmek için offset uygula
            const offsetX = 16;
            const offsetY = 120; // header + marginTop(100) yaklaşık uyumu

            layouted.children?.forEach((ln: any) => {
              const index = updatedNodes.findIndex(n => n.id === ln.id);
              if (index >= 0) {
                updatedNodes[index] = {
                  ...updatedNodes[index],
                  position: {
                    x: (ln.x ?? 0) + offsetX,
                    y: (ln.y ?? 0) + offsetY,
                  }
                };
              }
            });
          }

          set({ nodes: updatedNodes });
        } catch (error) {
          console.error('Hierarchical layout hatası:', error);
        }
      },
      
      resetStore: () => set(initialState),
    }),
    { name: 'org-chart-store',
      partialize:(state:OrgChartState)=>({
        nodes:state.nodes,
        edges:state.edges,
        departments:state.departments,
        ceo:state.ceo,
        allEmployees: state.allEmployees,
        unassignedEmployees: state.unassignedEmployees, // Yeni eklenen
        loading: state.loading,
        isLoading: state.isLoading
      })
     }
  )
);