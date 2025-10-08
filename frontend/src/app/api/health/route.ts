// ヘルスチェック用のAPIルート
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'gunchart-frontend'
    },
    { status: 200 }
  );
}