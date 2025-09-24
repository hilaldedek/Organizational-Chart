import { ReactFlowProvider } from "@xyflow/react";
import { OrgChartInnerProps } from "../types/orgChart";
import OrgChartInner from "./OrgChartInner";

import { toast, ToastContainer } from "react-toastify";

const OrgChart: React.FC<OrgChartInnerProps> = ({ newDepartment }) => {
  const showToast = (type: "success" | "error" | "warning", message: string) => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else if (type === "warning") toast.warning(message);
  };

  return (
    <ReactFlowProvider>
      <OrgChartInner newDepartment={newDepartment} showToast={showToast} />
      <ToastContainer position="top-right" autoClose={3000} />
    </ReactFlowProvider>
  );
};

export default OrgChart;