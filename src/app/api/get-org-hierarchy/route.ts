import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    // Tüm personelleri departman bilgileriyle birlikte çek
    const employeesQuery = await client.query(`
      SELECT 
        e.person_id,
        e.first_name,
        e.last_name,
        e.department_id,
        e.manager_id,
        e.role,
        d.unit_name,
        d.unit_id,
        d.manager_id as dept_manager_id
      FROM employee e
      LEFT JOIN department d ON e.department_id = d.unit_id
      ORDER BY e.role DESC, e.department_id, e.person_id
    `);

    return NextResponse.json(employeesQuery.rows);
  } catch (error) {
    console.error('Hiyerarşi verisi alınırken hata:', error);
    return NextResponse.json({ message: 'Sunucu hatası' }, { status: 500 });
  } finally {
    client.release();
  }
}