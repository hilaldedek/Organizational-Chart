import { ReactFlowProvider } from "@xyflow/react";
import { OrgChartInnerProps } from "../types/orgChart";
import OrgChartInner from "./OrgChartInner";

import { toast, ToastContainer } from "react-toastify";

interface OrgChartProps extends OrgChartInnerProps {
  onEmployeeAssigned?: (employeeId: string) => void;
}

const OrgChart: React.FC<OrgChartProps> = ({
  newDepartment,
  showToast,
  onEmployeeAssigned,
}) => {
  return (
    <ReactFlowProvider>
      <OrgChartInner
        showToast={showToast}
        onEmployeeAssigned={onEmployeeAssigned}
      />
      <ToastContainer position="top-right" autoClose={3000} />
    </ReactFlowProvider>
  );
};

export default OrgChart;
