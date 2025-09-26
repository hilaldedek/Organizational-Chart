// src/app/api/update-employee-and-manager/route.ts
import { NextResponse } from "next/server";
import pool from "../../../../lib/db";

export async function DELETE(req: Request) {
  const client = await pool.connect();
  try {
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Geçersiz içerik türü. Content-Type 'application/json' olmalıdır." },
        { status: 400 }
      );
    }

    const body = await req.text();
    if (!body || body.trim() === "") {
      return NextResponse.json(
        { error: "İstek gövdesi boş olamaz." },
        { status: 400 }
      );
    }

    let parsedData;
    try {
      parsedData = JSON.parse(body);
    } catch (parseError) {
      console.error("JSON parse hatası:", parseError);
      return NextResponse.json(
        { error: "Gönderilen veri geçerli bir JSON formatında değil." },
        { status: 400 }
      );
    }

    const { person_id } = parsedData;
    if (!person_id) {
      return NextResponse.json(
        { error: "Eksik parametre. 'person_id' gereklidir." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const departmentResult = await client.query(
      "SELECT department_id FROM employee WHERE person_id = $1",
      [person_id]
    );



    if (departmentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Belirtilen 'person_id' (${person_id}) için employee kaydı bulunamadı.` },
        { status: 404 }
      );
    }

    const department_id = departmentResult.rows[0].department_id;


    const sourceEmployeeParentsConnection = await client.query(
      "SELECT parents_connection FROM employee WHERE person_id = $1",
      [person_id]
    );

    const sourceParentsConnection =
      sourceEmployeeParentsConnection.rows[0].parents_connection;

    const result = await client.query(
      `
      WITH updated AS (
        UPDATE employee
        SET manager_id = NULL,
            department_id = NULL,
            parents_connection = NULL
        WHERE parents_connection LIKE $1 || '%'
        RETURNING person_id
      )
      SELECT COUNT(*) AS updated_count, ARRAY_REMOVE(ARRAY_AGG(person_id), NULL) AS updated_ids FROM updated;
      `,
      [sourceParentsConnection]
    );

    const updatedCount = parseInt(result.rows[0].updated_count, 10);
    const updatedIds: string[] = result.rows[0].updated_ids || [];
    console.log("Güncellenen kayıt sayısı:", updatedCount);

    if (updatedCount > 0 && department_id) {
      const deptResult = await client.query(
        `
        UPDATE department
        SET employee_count = employee_count - $1
        WHERE unit_id = $2
        RETURNING unit_id, employee_count;
        `,
        [updatedCount, department_id]
      );

      

      if (deptResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: `Belirtilen 'department_id' (${department_id}) için department kaydı bulunamadı.` },
          { status: 404 }
        );
      }

      console.log(
        `${updatedCount} kayıt güncellendi, department (${department_id}) employee_count güncellendi.`
      );
    }
    const checkManager = await client.query(
      `
      SELECT CASE 
               WHEN manager_id = $1 THEN 1 
               ELSE 0 
             END AS is_manager
      FROM department
      WHERE unit_id = $2
      `,
      [person_id, department_id]
    );
    
    const isManager = checkManager.rows[0]?.is_manager;
    if(isManager) {
      await client.query(
        "UPDATE department SET manager_id = NULL WHERE unit_id = $1",
        [department_id]
      );
    }


    await client.query("COMMIT");
    return NextResponse.json({
      message: "Silme işlemi başarıyla tamamlandı.",
      updatedEmployees: updatedCount,
      updatedPersonIds: updatedIds,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Veritabanı hatası:", err);
    return NextResponse.json(
      { error: "Beklenmeyen bir sunucu hatası oluştu." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}