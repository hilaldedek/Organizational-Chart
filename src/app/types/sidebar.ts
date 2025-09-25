import { Department, Employee } from "./orgChart";

export interface SidebarProps {
  employees: Employee[];
  onAssign?: (employeeId: string) => void;
}