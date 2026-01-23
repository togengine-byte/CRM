import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { developerLogs } from '@/drizzle/schema';
import { desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const level = searchParams.get('level');
    const category = searchParams.get('category');

    // Build query
    let query = db.select().from(developerLogs);

    // Apply filters
    if (level) {
      query = query.where(sql`${developerLogs.level} = ${level}`);
    }
    if (category) {
      query = query.where(sql`${developerLogs.category} = ${category}`);
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(developerLogs);
    const total = countResult[0]?.count || 0;

    // Get paginated logs
    const logs = await query
      .orderBy(desc(developerLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
