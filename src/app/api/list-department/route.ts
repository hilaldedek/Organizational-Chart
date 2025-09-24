// lib/db.ts dosyasından veritabanı bağlantısını içe aktarın
import pool from '../../../../lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM department');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Veritabanı sorgusu hatası:', error);
    return NextResponse.json({ message: 'Veri çekme işleminde bir hata oluştu.' }, { status: 500 });
  }
}