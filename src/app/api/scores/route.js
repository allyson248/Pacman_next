import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'pacman_game',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// GET: Retorna o ranking
export async function GET() {
  try {
    const [rows] = await pool.query(
      'SELECT player_name, score, level FROM high_scores ORDER BY score DESC LIMIT 10'
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ ERRO NO GET /api/scores:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Salva a pontuação
export async function POST(request) {
  try {
    const body = await request.json();
    const { playerName, score, level } = body;

    console.log('📥 Dados recebidos para salvar:', { playerName, score, level });

    if (!playerName || score === undefined) {
      return NextResponse.json({ success: false, error: 'Dados incompletos (playerName ou score faltando)' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO high_scores (player_name, score, level) VALUES (?, ?, ?)',
      [playerName, score, level || 1]
    );

    console.log('✅ Pontuação salva com sucesso! ID:', result.insertId);
    return NextResponse.json({ success: true, message: 'Pontuação salva com sucesso!' });
  } catch (error) {
    console.error('❌ ERRO NO POST /api/scores:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}