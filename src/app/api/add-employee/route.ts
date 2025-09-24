import { NextResponse } from "next/server";
import pool from "../../../../lib/db";

export async function POST(request: Request) {
  try {
    const { first_name, last_name, title } = await request.json();

    if (!first_name || !last_name || !title) {
      return NextResponse.json(
        { message: "Eksik alanlar var." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO employee (first_name, last_name, title)
       VALUES ($1, $2, $3)
       RETURNING person_id, first_name, last_name, title`,
      [first_name, last_name, title]
    );

    const newEmployee = result.rows[0];

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error("Veritabanı sorgusu hatası:", error);
    return NextResponse.json(
      { message: "Veri ekleme işleminde bir hata oluştu." },
      { status: 500 }
    );
  }
}
