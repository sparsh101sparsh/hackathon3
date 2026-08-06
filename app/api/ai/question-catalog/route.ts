import { NextResponse } from 'next/server';
import { getQuestionCatalog } from '@/lib/problemKnowledge';

export const dynamic = 'force-dynamic';

/** Read-only coverage endpoint used by guided tooling and verification. */
export async function GET() {
  try {
    const questions = await getQuestionCatalog();
    return NextResponse.json({
      count: questions.length,
      questions,
    });
  } catch (error: unknown) {
    console.error('Error reading guided question catalog:', error);
    return NextResponse.json(
      { error: 'Failed to read guided question catalog' },
      { status: 500 }
    );
  }
}
