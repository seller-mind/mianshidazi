import { NextRequest, NextResponse } from 'next/server';
import { calculateDiagnosticResult } from '@/lib/ai/config';
import type { TensionType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json();

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Invalid answers format' },
        { status: 400 }
      );
    }

    // 计算诊断结果
    const result = calculateDiagnosticResult(answers);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Diagnose API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
