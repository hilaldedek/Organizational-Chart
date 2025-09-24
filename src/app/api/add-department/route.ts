import { NextResponse } from "next/server";
import pool from "../../../../lib/db";

export async function POST(request: Request) {
  try {
    const { unit_name, max_employees } = await request.json();

    if (!unit_name || !max_employees) {
      return NextResponse.json(
        { message: "Eksik alanlar var." },
        { status: 400 }
      );
    }
    const maxEmployeesValue = Number(max_employees) + 1;

    const result = await pool.query(
      `INSERT INTO department (unit_name, max_employees)
       VALUES ($1, $2)
       RETURNING unit_id, unit_name, max_employees`,
      [unit_name, maxEmployeesValue]
    );

    const newDepartment = result.rows[0];

    return NextResponse.json(newDepartment, { status: 201 });
  } catch (error) {
    console.error("Veritabanı sorgusu hatası:", error);
    return NextResponse.json(
      { message: "Veri ekleme işleminde bir hata oluştu." },
      { status: 500 }
    );
  }
}
