
import { NextResponse } from "next/server";
import pool from "../../../../lib/db";
import { Department, UpdateEmployeeParams } from "@/app/types/orgChart";

export async function PUT(req: Request) {
  const client = await pool.connect();
  try {
    const { person_id, drop_department_id, drop_employee_id }: UpdateEmployeeParams = await req.json();

    if (!person_id || !drop_department_id) {
      return NextResponse.json({ message: 'Gerekli alanlar eksik.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Personelin mevcut durumunu al
    const currentEmployeeQuery = await client.query(
      'SELECT department_id, manager_id FROM employee WHERE person_id = $1', 
      [person_id]
    );
    
    const currentEmployee = currentEmployeeQuery.rows[0];
    const currentDepartmentId = currentEmployee?.department_id;
    
    // Aynı departmanda sadece manager değişikliği mi?
    if (currentDepartmentId && currentDepartmentId === parseInt(drop_department_id)) {
      // Sadece manager_id güncelle, employee_count değiştirme
      const managerId = drop_employee_id || currentEmployee.manager_id;
      
      await client.query(
        'UPDATE employee SET manager_id = $1 WHERE person_id = $2',
        [managerId, person_id]
      );
      
      await client.query('COMMIT');
      return NextResponse.json({ message: 'Personel hiyerarşisi başarıyla güncellendi.' });
    }

    // Farklı departmana taşıma veya yeni atama
    const departmentQuery = await client.query('SELECT * FROM department WHERE unit_id = $1', [drop_department_id]);
    if (departmentQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Departman bulunamadı.' }, { status: 404 });
    }
    const department: Department = departmentQuery.rows[0];

    if (!department.manager_id) {
      // İlk personel - Yönetici olarak ata
      const ceoResult = await client.query("SELECT person_id FROM employee WHERE role = 'CEO'");
      const ceo_id = ceoResult.rows[0]?.person_id;

      // Employee tablosunu güncelle
      await client.query(
        'UPDATE employee SET department_id = $1, manager_id = $2 WHERE person_id = $3',
        [drop_department_id, ceo_id, person_id]
      );

      // Department tablosunu güncelle (yönetici atanıyor)
      await client.query(
        'UPDATE department SET manager_id = $1 WHERE unit_id = $2', 
        [person_id, drop_department_id]
      );
      await client.query(
        'UPDATE department SET employee_count = employee_count + 1 WHERE unit_id = $1', 
        [drop_department_id]
      );

    } else {
      // Departmanın maksimum personel sayısını kontrol et
      if (department.employee_count >= department.max_employees) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          message: `Departman maksimum personel sayısına (${department.max_employees}) ulaştı.` 
        }, { status: 400 });
      }

      const managerId = drop_employee_id || department.manager_id;
      
      // Employee tablosunu güncelle
      await client.query(
        'UPDATE employee SET department_id = $1, manager_id = $2 WHERE person_id = $3',
        [drop_department_id, managerId, person_id]
      );

      // Yeni departmanın employee_count'unu artır
      await client.query(
        'UPDATE department SET employee_count = employee_count + 1 WHERE unit_id = $1', 
        [drop_department_id]
      );

      // Eski departmanın employee_count'unu azalt (eğer vardıysa)
      if (currentDepartmentId) {
        await client.query(
          'UPDATE department SET employee_count = employee_count - 1 WHERE unit_id = $1', 
          [currentDepartmentId]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Personel başarıyla güncellendi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Veritabanı işlemi hatası:', err);
    return NextResponse.json({ message: 'Sunucu hatası. Tekrar deneyin.' }, { status: 500 });
  } finally {
    client.release();
  }
}