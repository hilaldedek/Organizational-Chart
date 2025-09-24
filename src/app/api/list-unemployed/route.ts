import pool from '../../../../lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT * 
      FROM employee 
      WHERE department_id IS NULL
      AND role <> 'CEO'
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Veritabanı sorgusu hatası:', error);
    return NextResponse.json({ message: 'Veri çekme işleminde bir hata oluştu.' }, { status: 500 });
  }
}