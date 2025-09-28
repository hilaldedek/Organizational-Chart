// src/utils/toast.ts
import { toast } from "react-toastify";

export const showToast = (
  type: "success" | "error" | "warn",
  message: string
) => {
  
  switch (type) {
    case "success":
      toast.success(message);
      break;
    case "error":
      toast.error(message);
      break;
    case "warn":
      toast.warn(message);
      break;
    default:
      toast(message);
      break;
  }
};