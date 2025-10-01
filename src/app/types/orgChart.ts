import { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";

/**
 * Personel veri yapısı interface'i
 * @interface Employee
 */
export interface Employee {
  /** Personel ID'si */
  person_id: string;
  /** Personel adı */
  first_name: string;
  /** Personel soyadı */
  last_name: string;
  /** Personel ünvanı */
  title: string;
  /** Bağlı olduğu departman ID'si */
  department_id: string | null;
  /** Yönetici personel ID'si */
  manager_id: string | null;
  /** Personel rolü */
  role: string;
  /** Oluşturulma tarihi */
  created_at: string;
  /** Güncellenme tarihi */
  updated_at: string;
}

/**
 * Departman veri yapısı interface'i
 * @interface Department
 */
export interface Department {
  /** Departman ID'si */
  unit_id: string;
  /** Departman adı */
  unit_name: string;
  /** Departman yönetici ID'si */
  manager_id: string | null;
  /** Maksimum personel sayısı */
  max_employees: number;
  /** Mevcut personel sayısı */
  employee_count: number;
  /** Oluşturulma tarihi */
  created_at: string;
  /** Güncellenme tarihi */
  updated_at: string; 
}

/**
 * Personel node veri yapısı interface'i - Employee'yi genişletir
 * @interface EmployeeNodeData
 */
export interface EmployeeNodeData extends Employee {
  /** Personelin yönetici olup olmadığı */
  isManager?: boolean;
  /** Sürükleme başlangıcı callback'i */
  onDragStart?: (sourceNodeId: string) => void;
  /** Bırakma işlemi callback'i */
  onDrop?: (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => void;
  /** Sürükleme hedefi olup olmadığı */
  isDragTarget?: boolean;
  /** Şu anda sürüklenip sürüklenmediği */
  isBeingDragged?: boolean;
}

/**
 * Departman node veri yapısı interface'i
 * @interface DepartmentNodeData
 */
export interface DepartmentNodeData {
  /** Departman adı */
  unit_name: string;
  /** Departman ID'si */
  unit_id: number;
  /** Personel bırakma işlemi callback'i */
  onEmployeeDrop: (departmentId: string, employee: Employee, position: { x: number; y: number }) => void;
  /** Legacy - artık store'dan node'lar kullanılıyor */
  departmentNodes?: any[];
}

/**
 * Sürükle-bırak işlemi için veri yapısı interface'i
 * @interface DragData
 */
export interface DragData {
  /** Sürükleme tipi */
  type: "employee" | "employee-node";
  /** Sürüklenen personel verisi */
  employee: Employee;
  /** Kaynak node ID'si */
  sourceNodeId: string;
  /** Personel ID'si */
  person_id: string;
}

/**
 * Organizasyon şeması hook'u için parametreler interface'i
 * @interface UseOrgChartParams
 */
export interface UseOrgChartParams {
  /** Personel sürükleme başlangıcı handler'ı */
  handleEmployeeDragStart: (sourceNodeId: string) => void;
  /** Personel bırakma handler'ı */
  handleEmployeeDrop: (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => void;
  /** Departmana personel bırakma handler'ı */
  handleDepartmentEmployeeDrop: (departmentId: string, employee: Employee, position: { x: number; y: number }) => void;
}

/**
 * Organizasyon şeması hook'u dönüş değerleri interface'i
 * @interface UseOrgChartReturn
 */
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

/**
 * Personel güncelleme işlemi için parametreler interface'i
 * @interface UpdateEmployeeParams
 */
export interface UpdateEmployeeParams {
  /** Güncellenecek personel ID'si */
  person_id: string;
  /** Hedef departman ID'si */
  drop_department_id: string;
  /** Hedef personel ID'si */
  drop_employee_id: string;
  /** Taşınacak toplam personel sayısı (opsiyonel) */
  employees_to_move_count?: number;
}

/**
 * Sürükle-bırak hook'ları için parametreler interface'i
 * @interface DragHooksParams
 */
export interface DragHooksParams {
  /** Mevcut node'lar */
  nodes: Node[];
  /** Node'ları güncelleme fonksiyonu */
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  /** Edge'leri güncelleme fonksiyonu */
  setEdges: React.Dispatch<React.SetStateAction<any[]>>;
  /** İşlenen istekler set'i */
  processedRequests: Set<string>;
  /** Güncellenen personeller set'i */
  updatingEmployees: Set<string>;
  /** Alt personelleri bulma fonksiyonu */
  findAllSubordinatesFromNodes: (managerId: string, allNodes: Node[]) => Node[];
  /** Aynı departmanda olup olmadığını kontrol eden fonksiyon */
  areInSameDepartmentNodes: (sourceNode: Node, targetNode: Node) => boolean;
}

/**
 * Organizasyon şeması iç bileşeni için props interface'i
 * @interface OrgChartInnerProps
 */
export interface OrgChartInnerProps {
  /** Yeni departman listesi */
  newDepartment: Department[];
  /** Personel atandığında çalışacak callback (opsiyonel) */
  onEmployeeAssigned?: (employeeId: string) => void;
}


export interface UseOrgChartParams {
  handleEmployeeDragStart: (sourceNodeId: string) => void;
  handleEmployeeDrop: (targetNodeId: string, draggedEmployee: Employee, draggedNodeId: string) => void;
  handleDepartmentEmployeeDrop: (departmentId: string, employee: Employee, position: { x: number; y: number }) => void;
}

/**
 * Sürükle-bırak hook'u için parametreler interface'i
 * @interface UseDragAndDropsParams
 */
export interface UseDragAndDropsParams {
  /** Aynı departmanda olup olmadığını kontrol eden fonksiyon */
  areInSameDepartmentNodes: (sourceNode: Node, targetNode: Node) => boolean;
}