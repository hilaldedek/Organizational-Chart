"use client";

import React, { DragEvent } from "react";
import { EmployeeCardProps } from "../types/employeeCard";

/**
 * Personel kartı bileşeni - sürükle-bırak işlemlerini destekler
 * @param employee - Personel verisi
 * @param onEmployeeAssigned - Personel atandığında çalışacak callback
 * @returns JSX.Element
 */
const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onEmployeeAssigned,
}) => {
  /**
   * Personel sürükleme işlemi başladığında çalışır
   * @param e - Drag event
   * @returns void
   */
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("application/json", JSON.stringify(employee));
    console.log("Dragging employee:", employee);
  };

  return (
    <div
      className="p-3 bg-[#BDD2B6] rounded-lg shadow cursor-move hover:bg-[#CADCAE]/90 transition-colors"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onEmployeeAssigned?.(employee.person_id)}
    >
      <p className="font-medium">
        {employee.first_name} {employee.last_name}
      </p>
    </div>
  );
};

export default EmployeeCard;
