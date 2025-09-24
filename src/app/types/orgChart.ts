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

