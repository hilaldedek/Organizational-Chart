// src/app/stores/orgChartStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { Department, Employee } from "../types/orgChart";

interface OrgChartState {
  nodes: Node[];
  edges: Edge[];
  departments: Department[];
  ceo: Employee[];
  allEmployees: Employee[];
  unassignedEmployees: Employee[];
  loading: boolean;
  isLoading: boolean;
  processedRequests: Set<string>;
  updatingEmployees: Set<string>;
  departmentDropHandler?: (departmentId: string, employee: any, position: { x: number; y: number }) => void;
  
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setDepartments: (departments: Department[]) => void;
  setCeo: (ceo: Employee[]) => void;
  setAllEmployees: (employees: Employee[]) => void;
  setUnassignedEmployees: (employees: Employee[]) => void; 
  addUnassignedEmployees: (employees: Employee[]) => void; 
  removeUnassignedEmployee: (employeeId: string) => void; 
  setLoading: (loading: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addProcessedRequest: (requestId: string) => void;
  removeProcessedRequest: (requestId: string) => void;
  addUpdatingEmployee: (employeeId: string) => void;
  removeUpdatingEmployee: (employeeId: string) => void;
  setDepartmentDropHandler: (handler: OrgChartState['departmentDropHandler']) => void;
  updateEmployeeInNodes: (sourceNodeId: string, targetNodeId: string) => void;
  updateEdgesForEmployee: (sourceNodeId: string, targetNodeId: string) => void;
  applyAutoLayout: () => Promise<void>;
  applyHierarchicalLayout: () => Promise<void>;
  resetStore: () => void;
}

const initialState = {
  nodes: [],
  edges: [],
  departments: [],
  ceo: [],
  allEmployees: [],
  unassignedEmployees: [],
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

      addUnassignedEmployees: (newEmployees) => set((state) => {
        const existing = new Map(state.unassignedEmployees.map(e => [e.person_id, e]));
        newEmployees.forEach(emp => {
          if (!existing.has(emp.person_id)) existing.set(emp.person_id, emp);
        });
        return { unassignedEmployees: Array.from(existing.values()) };
      }),

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
      
      updateEmployeeInNodes: (sourceNodeId, targetNodeId) => set((state) => {
        const targetNode = state.nodes.find(n => n.id === targetNodeId);
        const departmentId = targetNode?.parentId ? parseInt(targetNode.parentId) : null;
        
        return {
          nodes: state.nodes.map((node) => {
            if (node.id === sourceNodeId && node.type === "employee") {
              return {
                ...node,
                data: { 
                  ...node.data, 
                  manager_id: parseInt(targetNodeId),
                  department_id: departmentId || node.data.department_id
                },
              };
            }
            return node;
          })
        };
      }),
      
      updateEdgesForEmployee: (sourceNodeId, targetNodeId) => set((state) => {
        const filteredEdges = state.edges.filter((edge) => edge.target !== sourceNodeId);
        const newEdge = {
          id: `${targetNodeId}-${sourceNodeId}`,
          source: targetNodeId,
          target: sourceNodeId,
          type: "smoothstep" as const,
          style: { stroke: "#4caf50", strokeWidth: 2, strokeDasharray: undefined },
        };
        return { edges: [...filteredEdges, newEdge] };
      }),
      
      applyAutoLayout: async () => {
        const { nodes, edges } = get();
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

            // Edge'leri filtrele - sadece bu group içindeki node'lar arası
            const childIds = new Set(children.map(c => c.id));
            const elkEdges = edges
              .filter(e => childIds.has(e.source) && childIds.has(e.target))
              .map(edge => ({
                id: edge.id,
                sources: [edge.source],
                targets: [edge.target]
              }));

            const elkGraph = {
              id: `group-${group.id}`,
              children: elkNodes,
              edges: elkEdges,
              layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'elk.spacing.nodeNode': '30',
                'elk.spacing.edgeNode': '20',
                'elk.layered.spacing.nodeNodeBetweenLayers': '50',
                'elk.layered.nodePlacement.strategy': 'SIMPLE',
                'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP'
              }
            } as any;

            const layouted = await elk.layout(elkGraph);
            const offsetX = 16;
            const offsetY = 120;

            // Department node boyutunu ELK.js'in hesapladığı boyutlara göre ayarla
            const departmentNodeIndex = updatedNodes.findIndex(n => n.id === group.id);
            if (departmentNodeIndex >= 0 && layouted.width && layouted.height) {
              // Employee sayısına göre dinamik boyut hesaplama
              const employeeCount = children.length;
              const baseWidth = Math.max(layouted.width + 60, 300); // Daha fazla padding
              const baseHeight = Math.max(layouted.height + 100, 400); // Daha fazla header alanı
              
              // Employee sayısına göre ekstra alan ekle
              const extraWidth = Math.max(0, (employeeCount - 1) * 20); // Her ek employee için 20px
              const extraHeight = Math.max(0, (employeeCount - 1) * 30); // Her ek employee için 30px
              
              updatedNodes[departmentNodeIndex] = {
                ...updatedNodes[departmentNodeIndex],
                style: {
                  ...updatedNodes[departmentNodeIndex].style,
                  width: baseWidth + extraWidth,
                  height: baseHeight + extraHeight,
                }
              };
            }

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
        const { nodes, edges } = get();
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

            // Edge'leri filtrele - sadece bu group içindeki node'lar arası
            const childIds = new Set(children.map(c => c.id));
            const elkEdges = edges
              .filter(e => childIds.has(e.source) && childIds.has(e.target))
              .map(edge => ({
                id: edge.id,
                sources: [edge.source],
                targets: [edge.target]
              }));

            const elkGraph = {
              id: `group-${group.id}`,
              children: elkNodes,
              edges: elkEdges,
              layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'elk.spacing.nodeNode': '25',
                'elk.spacing.edgeNode': '15',
                'elk.layered.spacing.nodeNodeBetweenLayers': '40',
                'elk.layered.nodePlacement.strategy': 'SIMPLE',
                'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
                'elk.layered.layering.strategy': 'LONGEST_PATH'
              }
            } as any;

            const layouted = await elk.layout(elkGraph);
            const offsetX = 16;
            const offsetY = 120;

            // Department node boyutunu ELK.js'in hesapladığı boyutlara göre ayarla
            const departmentNodeIndex = updatedNodes.findIndex(n => n.id === group.id);
            if (departmentNodeIndex >= 0 && layouted.width && layouted.height) {
              // Employee sayısına göre dinamik boyut hesaplama
              const employeeCount = children.length;
              const baseWidth = Math.max(layouted.width + 60, 300); // Daha fazla padding
              const baseHeight = Math.max(layouted.height + 100, 400); // Daha fazla header alanı
              
              // Employee sayısına göre ekstra alan ekle
              const extraWidth = Math.max(0, (employeeCount - 1) * 20); // Her ek employee için 20px
              const extraHeight = Math.max(0, (employeeCount - 1) * 30); // Her ek employee için 30px
              
              updatedNodes[departmentNodeIndex] = {
                ...updatedNodes[departmentNodeIndex],
                style: {
                  ...updatedNodes[departmentNodeIndex].style,
                  width: baseWidth + extraWidth,
                  height: baseHeight + extraHeight,
                }
              };
            }

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
    { 
      name: 'org-chart-store',
      partialize: (state: OrgChartState) => ({
        nodes: state.nodes,
        edges: state.edges,
        departments: state.departments,
        ceo: state.ceo,
        allEmployees: state.allEmployees,
        unassignedEmployees: state.unassignedEmployees,
        loading: state.loading,
        isLoading: state.isLoading
      })
    }
  )
);