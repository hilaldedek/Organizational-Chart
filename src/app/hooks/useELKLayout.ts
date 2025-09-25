// src/app/hooks/useELKLayout.ts
import { useCallback } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from '@xyflow/react';

interface ELKNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  children?: ELKNode[];
  layoutOptions?: Record<string, string>;
}

interface ELKEdge {
  id: string;
  sources: string[];
  targets: string[];
}

interface ELKGraph {
  id: string;
  children: ELKNode[];
  edges: ELKEdge[];
  layoutOptions?: Record<string, string>;
}

export const useELKLayout = () => {
  const elk = new ELK();

  const createELKGraph = useCallback((nodes: Node[], edges: Edge[]): ELKGraph => {
    // Node boyutlarını tanımla
    const nodeWidth = 200;
    const nodeHeight = 100;
    const departmentWidth = 300;
    const departmentHeight = 150;

    const elkNodes: ELKNode[] = nodes.map(node => {
      const isDepartment = node.type === 'group';
      const width = isDepartment ? departmentWidth : nodeWidth;
      const height = isDepartment ? departmentHeight : nodeHeight;

      return {
        id: node.id,
        width,
        height,
        layoutOptions: isDepartment ? {
          'elk.priority': '1',
          'elk.nodeSize.constraints': 'NODE_LABELS',
          'elk.spacing.nodeNode': '20'
        } : {
          'elk.priority': '2',
          'elk.nodeSize.constraints': 'NODE_LABELS',
          'elk.spacing.nodeNode': '15'
        }
      };
    });

    const elkEdges: ELKEdge[] = edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }));

    return {
      id: 'root',
      children: elkNodes,
      edges: elkEdges,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '30',
        'elk.spacing.edgeNode': '20',
        'elk.layered.spacing.nodeNodeBetweenLayers': '80',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.nodePlacement.strategy': 'SIMPLE',
        'elk.layered.cycleBreaking.strategy': 'GREEDY',
        'elk.layered.layering.strategy': 'INTERACTIVE'
      }
    };
  }, []);

  const applyELKLayout = useCallback(async (nodes: Node[], edges: Edge[]): Promise<Node[]> => {
    try {
      const elkGraph = createELKGraph(nodes, edges);
      const layoutedGraph = await elk.layout(elkGraph);

      if (!layoutedGraph.children) {
        console.warn('ELK layout sonucu beklenmedik formatta');
        return nodes;
      }

      // ELK sonuçlarını React Flow node'larına dönüştür
      const layoutedNodes = nodes.map(node => {
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
        return node;
      });

      return layoutedNodes;
    } catch (error) {
      console.error('ELK layout hatası:', error);
      return nodes;
    }
  }, [createELKGraph, elk]);

  const applyHierarchicalLayout = useCallback(async (nodes: Node[], edges: Edge[]): Promise<Node[]> => {
    try {
      const elkGraph = createELKGraph(nodes, edges);
      
      // Hiyerarşik düzen için özel ayarlar
      elkGraph.layoutOptions = {
        ...elkGraph.layoutOptions,
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '40',
        'elk.spacing.edgeNode': '30',
        'elk.layered.spacing.nodeNodeBetweenLayers': '80',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.layered.cycleBreaking.strategy': 'GREEDY',
        'elk.layered.layering.strategy': 'LONGEST_PATH',
        'elk.layered.edgeRouting': 'ORTHOGONAL'
      };

      const layoutedGraph = await elk.layout(elkGraph);

      if (!layoutedGraph.children) {
        console.warn('ELK hierarchical layout sonucu beklenmedik formatta');
        return nodes;
      }

      const layoutedNodes = nodes.map(node => {
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
        return node;
      });

      return layoutedNodes;
    } catch (error) {
      console.error('ELK hierarchical layout hatası:', error);
      return nodes;
    }
  }, [createELKGraph, elk]);

  return {
    applyELKLayout,
    applyHierarchicalLayout,
    createELKGraph
  };
};
