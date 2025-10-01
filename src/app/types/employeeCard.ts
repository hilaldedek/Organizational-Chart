import { Employee } from "./orgChart";

/**
 * Personel kartı bileşeni için props interface'i
 * @interface EmployeeCardProps
 */
export interface EmployeeCardProps {
  employee: Employee;
  onEmployeeAssigned?: (employeeId: string) => void;
}