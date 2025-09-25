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
          style: { stroke: "#4caf50", strokeWidth: 2,strokeDasharray: undefined },
          labelStyle: { fontSize: 10 },
        };
        return { edges: [...filteredEdges, newEdge] };
      }),
      
      applyAutoLayout: async () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;
        
        try {
          // Dynamic import to avoid SSR issues
          const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
          const elk = new ELK();

          // Sadece employee node'ları için ELK layout uygula
          const employeeNodes = nodes.filter(node => node.type === 'employee');
          const nodeWidth = 180;
          const nodeHeight = 120;

          // Aynı manager'a bağlı node'ları gruplandır
          const managerGroups = new Map<string, string[]>();
          employeeNodes.forEach(node => {
            const managerId = node.data?.manager_id?.toString();
            if (managerId) {
              if (!managerGroups.has(managerId)) {
                managerGroups.set(managerId, []);
              }
              managerGroups.get(managerId)!.push(node.id);
            }
          });

          const elkNodes = employeeNodes.map(node => {
            const managerId = node.data?.manager_id?.toString();
            const siblings = managerId ? managerGroups.get(managerId) || [] : [];
            const isGrouped = siblings.length > 1;

            const layoutOptions: Record<string, string> = {
              'elk.priority': '1',
              'elk.nodeSize.constraints': 'NODE_LABELS',
              'elk.spacing.nodeNode': isGrouped ? '400' : '50',
              'elk.spacing.edgeNode': '60',
              'elk.layered.spacing.nodeNodeBetweenLayers': '200'
            };

            if (isGrouped && managerId) {
              layoutOptions['elk.partitioning.partition'] = managerId;
              layoutOptions['elk.spacing.nodeNode'] = '120';
              layoutOptions['elk.spacing.edgeNode'] = '80';
            }

            return {
              id: node.id,
              width: nodeWidth,
              height: nodeHeight,
              layoutOptions
            };
          });

          // Sadece employee'lar arası edge'leri al
          const employeeIds = new Set(employeeNodes.map(n => n.id));
          const elkEdges = edges
            .filter(edge => employeeIds.has(edge.source) && employeeIds.has(edge.target))
            .map(edge => ({
              id: edge.id,
              sources: [edge.source],
              targets: [edge.target]
            }));

          const elkGraph = {
            id: 'root',
            children: elkNodes,
            edges: elkEdges,
            layoutOptions: {
              'elk.algorithm': 'layered',
              'elk.direction': 'DOWN',
              'elk.spacing.nodeNode': '150',
              'elk.spacing.edgeNode': '100',
              'elk.layered.spacing.nodeNodeBetweenLayers': '200',
              'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
              'elk.layered.nodePlacement.strategy': 'SIMPLE',
              'elk.layered.cycleBreaking.strategy': 'GREEDY',
              'elk.layered.layering.strategy': 'INTERACTIVE',
              'elk.layered.edgeRouting': 'ORTHOGONAL',
              'elk.spacing.edgeEdge': '50',
              'elk.layered.spacing.edgeNodeBetweenLayers': '120',
              'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
              'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS'
            }
          };

          const layoutedGraph = await elk.layout(elkGraph);

          if (!layoutedGraph.children) {
            console.warn('ELK layout sonucu beklenmedik formatta');
            return;
          }

          // ELK sonuçlarını React Flow node'larına dönüştür - sadece employee'ları güncelle
          const layoutedNodes = nodes.map(node => {
            if (node.type === 'employee') {
              const elkNode = layoutedGraph.children?.find(n => n.id === node.id);
              if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
                return {
                  ...node,
                  position: {
                    x: elkNode.x,
                    y: elkNode.y
                  }
                };
              }
            }
            return node;
          });

          set({ nodes: layoutedNodes });
        } catch (error) {
          console.error('Auto layout hatası:', error);
        }
      },
      
      applyHierarchicalLayout: async () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;
        
        try {
          // Dynamic import to avoid SSR issues
          const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
          const elk = new ELK();

          // Sadece employee node'ları için ELK layout uygula
          const employeeNodes = nodes.filter(node => node.type === 'employee');
          const nodeWidth = 180;
          const nodeHeight = 120;

          // Aynı manager'a bağlı node'ları gruplandır
          const managerGroups = new Map<string, string[]>();
          employeeNodes.forEach(node => {
            const managerId = node.data?.manager_id?.toString();
            if (managerId) {
              if (!managerGroups.has(managerId)) {
                managerGroups.set(managerId, []);
              }
              managerGroups.get(managerId)!.push(node.id);
            }
          });

          const elkNodes = employeeNodes.map(node => {
            const managerId = node.data?.manager_id?.toString();
            const siblings = managerId ? managerGroups.get(managerId) || [] : [];
            const isGrouped = siblings.length > 1;

            const layoutOptions: Record<string, string> = {
              'elk.priority': '1',
              'elk.nodeSize.constraints': 'NODE_LABELS',
              'elk.spacing.nodeNode': isGrouped ? '100' : '50',
              'elk.spacing.edgeNode': '60',
              'elk.layered.spacing.nodeNodeBetweenLayers': '80'
            };

            if (isGrouped && managerId) {
              layoutOptions['elk.partitioning.partition'] = managerId;
              layoutOptions['elk.spacing.nodeNode'] = '120';
              layoutOptions['elk.spacing.edgeNode'] = '80';
            }

            return {
              id: node.id,
              width: nodeWidth,
              height: nodeHeight,
              layoutOptions
            };
          });

          // Sadece employee'lar arası edge'leri al
          const employeeIds = new Set(employeeNodes.map(n => n.id));
          const elkEdges = edges
            .filter(edge => employeeIds.has(edge.source) && employeeIds.has(edge.target))
            .map(edge => ({
              id: edge.id,
              sources: [edge.source],
              targets: [edge.target]
            }));

          const elkGraph = {
            id: 'root',
            children: elkNodes,
            edges: elkEdges,
            layoutOptions: {
              'elk.algorithm': 'layered',
              'elk.direction': 'DOWN',
              'elk.spacing.nodeNode': '150',
              'elk.spacing.edgeNode': '100',
              'elk.layered.spacing.nodeNodeBetweenLayers': '200',
              'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
              'elk.layered.nodePlacement.strategy': 'SIMPLE',
              'elk.layered.cycleBreaking.strategy': 'GREEDY',
              'elk.layered.layering.strategy': 'INTERACTIVE',
              'elk.layered.edgeRouting': 'ORTHOGONAL',
              'elk.spacing.edgeEdge': '50',
              'elk.layered.spacing.edgeNodeBetweenLayers': '120',
              'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
              'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS'
            }
          };

          const layoutedGraph = await elk.layout(elkGraph);

          if (!layoutedGraph.children) {
            console.warn('ELK hierarchical layout sonucu beklenmedik formatta');
            return;
          }

          // ELK sonuçlarını React Flow node'larına dönüştür - sadece employee'ları güncelle
          const layoutedNodes = nodes.map(node => {
            if (node.type === 'employee') {
              const elkNode = layoutedGraph.children?.find(n => n.id === node.id);
              if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
                return {
                  ...node,
                  position: {
                    x: elkNode.x,
                    y: elkNode.y
                  }
                };
              }
            }
            return node;
          });

          set({ nodes: layoutedNodes });
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
        loading: state.loading,
        isLoading: state.isLoading
      })
     }
  )
);