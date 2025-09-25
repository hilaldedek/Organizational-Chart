"use client";
import React, { useMemo, useCallback } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ReactFlow,
  Node,
} from "@xyflow/react";
import { useOrgChart } from "../hooks/useOrgChart";
import { useDragAndDrops } from "../hooks/useDragAndDrop";
import { useOrgChartStore } from "../stores/orgChartStore";
import EmployeeNode from "./EmployeeNode";
import { DepartmentNodeComponent } from "./DepartmentNode";

interface OrgChartInnerProps {
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

const OrgChartInner: React.FC<OrgChartInnerProps> = ({ showToast }) => {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange 
  } = useOrgChartStore();

  // Utility functions
  const findAllSubordinatesFromNodes = useCallback((nodeId: string, nodes: Node[]): Node[] => {
    const result: Node[] = [];
    const visited = new Set<string>();
    
    const findSubordinates = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);
      
      const subordinates = nodes.filter(node => 
        node.type === "employee" && 
        node.data?.manager_id?.toString() === currentNodeId
      );
      
      subordinates.forEach(subordinate => {
        result.push(subordinate);
        findSubordinates(subordinate.id);
      });
    };
    
    findSubordinates(nodeId);
    return result;
  }, []);

  const areInSameDepartmentNodes = useCallback((sourceNode: Node, targetNode: Node): boolean => {
    return sourceNode.parentId === targetNode.parentId;
  }, []);

  // Drag handlers
  const { handleEmployeeDragStart, handleEmployeeDrop } = useDragAndDrops({
    showToast,
    findAllSubordinatesFromNodes,
    areInSameDepartmentNodes,
  });

  const handleDepartmentEmployeeDrop = useCallback(
    (departmentId: string, employee: any, position: { x: number; y: number }) => {
      console.log("Department employee drop:", { departmentId, employee, position });
      
      // Bu departmanda zaten personel var mı kontrol et
      const departmentEmployees = nodes.filter(node => 
        node.type === "employee" && node.parentId === departmentId
      );
      
      if (departmentEmployees.length > 0) {
        showToast("warning", "Bu departmanda zaten personel var! Yeni personelleri mevcut personellerin üstüne sürükleyin.");
        return;
      }
      
      // İlk personeli departman yöneticisi olarak ekle
      // Bu işlem API çağrısı ile yapılmalı
      // Şimdilik sadece log bırakıyoruz
      console.log("İlk personel departman yöneticisi olarak atanacak:", employee);
    },
    [nodes, showToast]
  );

  // useOrgChart hook'u - sadece gerekli handler'ları geçiyoruz
  useOrgChart({
    handleEmployeeDragStart,
    handleEmployeeDrop,
    handleDepartmentEmployeeDrop,
    showToast,
  });

  // Node types
  const nodeTypes = useMemo(
    () => ({
      employee: EmployeeNode,
      group: DepartmentNodeComponent,
    }),
    []
  );

  // Drag over handler
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Canvas'a drop edilen itemleri handle et
    try {
      const dropData = JSON.parse(e.dataTransfer.getData("application/json"));
      console.log("Canvas'a drop edildi:", dropData);
    } catch (error) {
      console.error("Drop data parse error:", error);
    }
  }, []);

  return (
    <div className="w-[200vw] h-[200vh]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        nodeTypes={nodeTypes}
        connectionLineStyle={{ stroke: "#555", strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Meta", "Ctrl"]}
        panOnScroll
        panOnScrollSpeed={0.5}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        preventScrolling={false}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background
          color="#44444E"
          gap={20}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
    </div>
  );
};

export default OrgChartInner;