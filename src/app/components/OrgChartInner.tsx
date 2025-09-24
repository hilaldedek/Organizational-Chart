"use client";

import React, { useMemo } from "react";
import { Background, BackgroundVariant, ConnectionLineType, ReactFlow, Node, Edge, NodeChange, EdgeChange } from "@xyflow/react";
import { useOrgChart } from "../hooks/useOrgChart";
import { useDragAndDrops } from "../hooks/useDragAndDrop";
import { useEmployeeUpdate } from "../hooks/useEmployeeUpdate";
import { OrgChartInnerProps } from "../types/orgChart";

import EmployeeNode from "./EmployeeNode";

const OrgChartInner: React.FC<OrgChartInnerProps> = ({ newDepartment, showToast }) => {
  const orgChartState = useOrgChart(newDepartment);
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } = orgChartState;

  // --- Node Types ---
  const nodeTypes = useMemo(
    () => ({
      employee: EmployeeNode,
      group: DepartmentNode,
    }),
    []
  );

  // --- Drag & Drop ---
  const dragHandlers = useDragAndDrops({
    nodes,
    setNodes,
    setEdges,
    processedRequests: new Set(),
    updatingEmployees: new Set(),
    showToast,
    findAllSubordinatesFromNodes: orgChartState.findAllSubordinatesFromNodes,
    areInSameDepartmentNodes: orgChartState.areInSameDepartmentNodes,
  });

  const { handleEmployeeDragStart, handleEmployeeDrop, handleIntraDepartmentMove } = dragHandlers;

  // --- Employee Update ---
  const { handleEmployeeUpdate } = useEmployeeUpdate({ showToast, setNodes, setEdges });

  // --- Drag over handler ---
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  return (
    <div className="w-[200vw] h-[200vh]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onDragOver={onDragOver}
        fitView
        nodeTypes={nodeTypes}
        connectionLineStyle={{ stroke: "#555", strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background color="#44444E" gap={20} variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  );
};

export default OrgChartInner;
