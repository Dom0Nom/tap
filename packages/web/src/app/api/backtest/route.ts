import { NextResponse } from 'next/server';
import { getDemoData } from '@/lib/demo-data';

export async function POST(): Promise<NextResponse> {
  const data = getDemoData();
  return NextResponse.json(data);
}

export async function GET(): Promise<NextResponse> {
  const data = getDemoData();
  return NextResponse.json(data);
}
