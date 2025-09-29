// src/app/api/move-employee-between-departments/route.ts
import { NextResponse } from "next/server";
import pool from "../../../../lib/db";

export async function PUT(req: Request) {
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

    const { person_id, new_department_id, drop_employee_id } = parsedData;
    if (!person_id || !new_department_id) {
      return NextResponse.json(
        { error: "Eksik parametre. 'person_id' ve 'new_department_id' gereklidir." },
        { status: 400 }
      );
    }
console.log("PERSON_ID: ",person_id,"DROP_EMLOYEE_ID: ",drop_employee_id,"NEW_DEPARTMENT_ID: ",new_department_id);
    await client.query("BEGIN");

    // Employee'nin mevcut departmanını ve parent connection'ını al
    const employeeResult = await client.query(
      "SELECT department_id, parents_connection FROM employee WHERE person_id = $1",
      [person_id]
    );

    if (employeeResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Belirtilen 'person_id' (${person_id}) için employee kaydı bulunamadı.` },
        { status: 404 }
      );
    }

    const currentDepartmentId = employeeResult.rows[0].department_id;
    const parentsConnection = employeeResult.rows[0].parents_connection;

    if (currentDepartmentId === new_department_id) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Employee zaten bu departmanda bulunuyor." },
        { status: 400 }
      );
    }

    // Taşınacak personel sayısını hesapla (kendisi + tüm alt personelleri)
    const calculateEmployeesToMove = async (sourcePersonId: string): Promise<number> => {
      const result = await client.query(
        `WITH RECURSIVE subordinates AS (
          SELECT person_id, 1 as level FROM employee WHERE person_id = $1
          UNION ALL
          SELECT e.person_id, s.level + 1 FROM employee e
          INNER JOIN subordinates s ON e.manager_id = s.person_id
          WHERE s.level < 10  -- Max depth protection
        )
        SELECT COUNT(*) as count FROM subordinates`,
        [sourcePersonId]
      );
      return parseInt(result.rows[0].count, 10);
    };

    const employeesToMoveCount = await calculateEmployeesToMove(person_id);
    console.log("Backend calculated employees to move:", employeesToMoveCount);

    const deptResult = await client.query(
      "SELECT unit_id, max_employees, employee_count FROM department WHERE unit_id = $1",
      [new_department_id]
    );

    if (deptResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Belirtilen 'new_department_id' (${new_department_id}) için department kaydı bulunamadı.` },
        { status: 404 }
      );
    }

    const targetDepartment = deptResult.rows[0];
    const maxEmployee = targetDepartment.max_employees;
    const currentEmployeeCount = targetDepartment.employee_count;
    
  
    console.log("Hedef departman bilgileri:", {
      maxEmployee,
      currentEmployeeCount,
      employeesToMoveCount
    });
    
    const totalEmployeeCount = currentEmployeeCount + employeesToMoveCount;
    console.log("Total employee count:", totalEmployeeCount);
  
    if (maxEmployee && totalEmployeeCount > maxEmployee) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { 
          error: `Bu taşıma departmanın maximum çalışan değerini aşıyor. Mevcut çalışan sayısı: ${currentEmployeeCount}, Taşınacak çalışan sayısı: ${employeesToMoveCount}, Toplam: ${totalEmployeeCount}, Maksimum izin verilen: ${maxEmployee}` 
        },
        { status: 400 }
      );
    }

    // // Dairesel hiyerarşi kontrolü (eğer drop_employee_id varsa)
    // if (drop_employee_id) {
    //   const circularCheckResult = await client.query(
    //     `WITH RECURSIVE subordinates AS (
    //       SELECT person_id FROM employee WHERE manager_id = $1
    //       UNION ALL
    //       SELECT e.person_id FROM employee e
    //       INNER JOIN subordinates s ON e.manager_id = s.person_id
    //     )
    //     SELECT person_id FROM subordinates WHERE person_id = $2`,
    //     [person_id, drop_employee_id]
    //   );
      
    //   if (circularCheckResult.rowCount && circularCheckResult.rowCount > 0) {
    //     await client.query("ROLLBACK");
    //     return NextResponse.json(
    //       { error: "Dairesel hiyerarşi oluşturulamaz! Bir personel kendi alt personellerinden birinin üstü olamaz." },
    //       { status: 400 }
    //     );
    //   }
    // }
    //sürüklediğimiz employee parentları
    const sourceEmployeeParentsConnection=await client.query(
      "SELECT parents_connection FROM employee WHERE person_id = $1",
      [person_id]
    );
    const sourceParentsConnection = sourceEmployeeParentsConnection.rows[0].parents_connection;
    
    let newManagerId: string;
    let newTargetEmployeeParentsConnection: string;
    
    if (drop_employee_id) {
      // Hedef departmanda personel varsa, o personeli manager yap
      const targetEmployeeParentsConnection=await client.query(
        "SELECT parents_connection FROM employee WHERE person_id = $1",
        [drop_employee_id]
      );
      const targetParentsConnection = targetEmployeeParentsConnection.rows[0].parents_connection;
      console.log("DROP EMPLOYEE ID: ",drop_employee_id)
      
      newManagerId = drop_employee_id;
      newTargetEmployeeParentsConnection = targetParentsConnection + ">" + person_id;
    } else {
      // Hedef departmanda personel yoksa, CEO'ya bağla
      const ceoResult = await client.query("SELECT person_id FROM employee WHERE role = 'CEO'");
      const ceoId = ceoResult.rows[0]?.person_id;
      newManagerId = ceoId;
      newTargetEmployeeParentsConnection = ceoId + ">" + person_id;
    }
    
    await client.query(
      "UPDATE employee SET manager_id = $1 WHERE person_id = $2",
      [newManagerId, person_id]
    );
    // Employee ve tüm children'larını yeni departmana taşı
    const result = await client.query(
      `WITH updated AS (
          UPDATE employee
          SET parents_connection = regexp_replace(parents_connection, '^' || $1, $2),
              department_id = $3
          WHERE parents_connection LIKE $1 || '%'
          RETURNING person_id
       )
       SELECT person_id FROM updated;`,
      [sourceParentsConnection, newTargetEmployeeParentsConnection, new_department_id]
    );
    
    const movedEmployeeIds = result.rows.map(row => row.person_id.toString());
    const movedCount = movedEmployeeIds.length;
    
    console.log('Moved employee IDs:', movedEmployeeIds);
    console.log('Updated rows count:', movedCount);

    // Eski departmanın employee_count'unu güncelle
    if (currentDepartmentId) {
      await client.query(
        `
        UPDATE department
        SET employee_count = employee_count - $1
        WHERE unit_id = $2
        `,
        [movedCount, currentDepartmentId]
      );
    }

    // Yeni departmanın employee_count'unu güncelle
    await client.query(
      `
      UPDATE department
      SET employee_count = employee_count + $1
      WHERE unit_id = $2
      `,
      [movedCount, new_department_id]
    );

    const checkNewManager = await client.query(
      `SELECT CASE WHEN manager_id IS NULL THEN 0 ELSE 1 END AS is_assigned
       FROM department
       WHERE unit_id = $1`,
      [new_department_id]
    );
    
    const isNewManager = checkNewManager.rows[0]?.is_assigned;
    if(!isNewManager) {
      await client.query(
        "UPDATE department SET manager_id = $1 WHERE unit_id = $2",
        [person_id,new_department_id]
      );
    }

    const checkOldManager = await client.query(
      `
      SELECT CASE 
               WHEN manager_id = $1 THEN 1 
               ELSE 0 
             END AS is_manager
      FROM department
      WHERE unit_id = $2
      `,
      [person_id, currentDepartmentId]
    );
    const isOldManager = checkOldManager.rows[0]?.is_manager;
    console.log("PERSON_ID: ",person_id," ESKİ DEPT: ",currentDepartmentId,"CHECKOLDMANAGER: ",isOldManager)
    
    if(isOldManager) {
      console.log("DENEME")
      await client.query(
        "UPDATE department SET manager_id = NULL WHERE unit_id = $1",
        [currentDepartmentId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({
      message: "Employee ve children'ları başarıyla yeni departmana taşındı.",
      movedEmployees: movedCount,
      movedEmployeeIds: movedEmployeeIds, // Taşınan personel ID'leri
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
