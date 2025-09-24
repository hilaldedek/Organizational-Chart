import { Department } from "./orgChart";

export interface SidebarProps {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
}