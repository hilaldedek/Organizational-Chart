// src/app/api/department/update-employee-and-manager/route.ts
import { NextResponse } from "next/server";
import pool from "../../../../lib/db";

export async function PUT(req: Request) {
  const client = await pool.connect();
  try {
    const { person_id, drop_department_id, drop_employee_id } = await req.json();

    if (!person_id || !drop_department_id) {
      return NextResponse.json({ message: "Gerekli alanlar eksik." }, { status: 400 });
    }

    await client.query("BEGIN");

    // Çalışanın mevcut departmanını bul
    const empQuery = await client.query(
      "SELECT department_id FROM employee WHERE person_id = $1",
      [person_id]
    );

    if (empQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ message: "Personel bulunamadı." }, { status: 404 });
    }

    const currentDepartmentId = empQuery.rows[0].department_id;

    if (currentDepartmentId !== parseInt(drop_department_id)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { message: "Bu API sadece departman içi manager güncellemesi için kullanılabilir." },
        { status: 400 }
      );
    }

    const managerId = drop_employee_id;

    await client.query(
      "UPDATE employee SET manager_id = $1 WHERE person_id = $2",
      [managerId, person_id]
    );

    await client.query("COMMIT");
    return NextResponse.json({ message: "Departman içi manager güncellemesi başarılı." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Veritabanı hatası:", err);
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 });
  } finally {
    client.release();
  }
}
