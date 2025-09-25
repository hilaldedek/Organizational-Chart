// src/app/api/add-employee/route.ts
import { NextResponse } from "next/server";
import { Department } from "@/app/types/orgChart";
import pool from "../../../../lib/db";

export async function PUT(req: Request) {
  const client = await pool.connect();
  try {
    const { person_id, drop_department_id, drop_employee_id } = await req.json();

    if (!person_id || !drop_department_id) {
      return NextResponse.json({ message: "Gerekli alanlar eksik." }, { status: 400 });
    }

    await client.query("BEGIN");

    // Departmanı kontrol et
    const departmentQuery = await client.query(
      "SELECT * FROM department WHERE unit_id = $1",
      [drop_department_id]
    );

    if (departmentQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ message: "Departman bulunamadı." }, { status: 404 });
    }

    const department: Department = departmentQuery.rows[0];

    // Kapasite kontrolü
    if (department.employee_count >= department.max_employees) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { message: `Departman maksimum personel sayısına (${department.max_employees}) ulaştı.` },
        { status: 400 }
      );
    }

    if (!department.manager_id) {
      // Departmana ilk kişi atanıyor → manager = CEO
      const ceoResult = await client.query("SELECT person_id FROM employee WHERE role = 'CEO'");
      const ceoId = ceoResult.rows[0]?.person_id;

      await client.query(
        'UPDATE employee SET department_id = $1, manager_id = $2 WHERE person_id = $3',
        [drop_department_id, ceoId, person_id]
      );
      // Departmanın manager_id'sini ilk atanan personel yap
      await client.query(
        "UPDATE department SET manager_id = $1 WHERE unit_id = $2",
        [person_id, drop_department_id]
      );
      await client.query(
        "UPDATE department SET employee_count = employee_count + 1 WHERE unit_id = $1",
        [drop_department_id]
      );
    }else{
// Employee güncelle
    await client.query(
      "UPDATE employee SET department_id = $1, manager_id = $2 WHERE person_id = $3",
      [drop_department_id, drop_employee_id, person_id]
    );

    // employee_count artır
    await client.query(
      "UPDATE department SET employee_count = employee_count + 1 WHERE unit_id = $1",
      [drop_department_id]
    );
    }

    

    await client.query("COMMIT");
    return NextResponse.json({ message: "Personel departmana başarıyla eklendi." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Veritabanı hatası:", err);
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 });
  } finally {
    client.release();
  }
}
