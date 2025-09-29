import { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";

export interface Employee {
  person_id: string;
  first_name: string;
  last_name: string;
  title: string;
  department_id: string | null;
  manager_id: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  unit_id: string;
  unit_name: string;
  manager_id: string | null;
  max_employees: number;
  employee_count: number;
  created_at: string;
  updated_at: string; 
}

export interface EmployeeNodeData extends Employee {
  isManager?: boolean;
  onDragStart?: (sourceNodeId: string) => void;
  onDrop?: (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => void;
  isDragTarget?: boolean;
  isBeingDragged?: boolean;
}

export interface DepartmentNodeData {
  unit_name: string;
  unit_id: number;
  onEmployeeDrop: (departmentId: string, employee: Employee, position: { x: number; y: number }) => void;
  departmentNodes?: any[]; // Legacy - now we use nodes from store
}

export interface DragData {
  type: "employee" | "employee-node";
  employee: Employee;
  sourceNodeId: string;
  person_id: string;
}

export interface UseOrgChartParams {
  handleEmployeeDragStart: (sourceNodeId: string) => void;
  handleEmployeeDrop: (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => void;
  handleDepartmentEmployeeDrop: (departmentId: string, employee: Employee, position: { x: number; y: number }) => void;
}

export interface UseOrgChartReturn {
  // State
  nodes: Node[];
  edges: Edge[];
  loading: boolean;
  departments: Department[];
  ceo: Employee[];
  isLoading: boolean;
  updatingEmployees: Set<string>;
  processedRequests: Set<string>;
  
  // Setters
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setUpdatingEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
  setProcessedRequests: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Event handlers
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onDragOver: (event: DragEvent) => void;
  
  // Handler functions for drag and drop
  handleEmployeeDragStart: (sourceNodeId: string) => void;
  handleDepartmentEmployeeDrop: (
    departmentId: string,
    employee: Employee,
    relativePosition: { x: number; y: number }
  ) => void;
}

export interface UpdateEmployeeParams {
  person_id: string;
  drop_department_id: string;
  drop_employee_id: string;
  employees_to_move_count?: number; // Taşınacak toplam employee sayısı
}

export interface DragHooksParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<any[]>>;
  processedRequests: Set<string>;
  updatingEmployees: Set<string>;
  findAllSubordinatesFromNodes: (managerId: string, allNodes: Node[]) => Node[];
  areInSameDepartmentNodes: (sourceNode: Node, targetNode: Node) => boolean;
}

export interface OrgChartInnerProps {
  newDepartment: Department[];
  onEmployeeAssigned?: (employeeId: string) => void;
}


export interface UseOrgChartParams {
  handleEmployeeDragStart: (sourceNodeId: string) => void;
  handleEmployeeDrop: (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => void;
  handleDepartmentEmployeeDrop: (departmentId: string, employee: Employee, position: { x: number; y: number }) => void;
}

export interface UseDragAndDropsParams {
  areInSameDepartmentNodes: (sourceNode: Node, targetNode: Node) => boolean;
}