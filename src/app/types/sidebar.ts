import { Department, Employee } from "./orgChart";

export interface EmployeeCardProps {
  employee: Employee;
  onEmployeeAssigned?: (employeeId: string) => void;
}