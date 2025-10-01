import { ReactFlowProvider } from "@xyflow/react";
import { OrgChartInnerProps } from "../types/orgChart";
import OrgChartInner from "./OrgChartInner";

import { toast, ToastContainer } from "react-toastify";
import { showToast } from "../utils/toast";

interface OrgChartProps extends OrgChartInnerProps {
  onEmployeeAssigned?: (employeeId: string) => void;
}

/**
 * Ana organizasyon şeması bileşeni - ReactFlow provider ile sarmalanmış
 * @param newDepartment - Yeni departman verisi
 * @param onEmployeeAssigned - Personel atandığında çalışacak callback
 * @returns JSX.Element
 */
const OrgChart: React.FC<OrgChartProps> = ({
  newDepartment,
  onEmployeeAssigned,
}) => {
  return (
    <ReactFlowProvider>
      <OrgChartInner
        newDepartment={newDepartment}
        onEmployeeAssigned={onEmployeeAssigned}
      />
      <ToastContainer position="top-right" autoClose={3000} />
    </ReactFlowProvider>
  );
};

export default OrgChart;
