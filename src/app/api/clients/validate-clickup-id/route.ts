import { NextResponse } from 'next/server';
import { z } from 'zod';

const validateSchema = z.object({
  clickup_list_id: z.string().min(1, 'ClickUp List ID is required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request data' }), 
        { status: 400 }
      );
    }

    const { clickup_list_id } = validation.data;

    // Check if it's a valid numeric ID
    const numericId = parseInt(clickup_list_id);
    if (isNaN(numericId) || numericId <= 0) {
      return new NextResponse(
        JSON.stringify({ error: 'ClickUp List ID must be a positive number' }), 
        { status: 400 }
      );
    }

    // Get ClickUp API token from environment
    const clickupToken = process.env.CLICKUP_PERSONAL_TOKEN;
    if (!clickupToken) {
      console.error('CLICKUP_PERSONAL_TOKEN not configured');
      return new NextResponse(
        JSON.stringify({ error: 'ClickUp integration not configured' }), 
        { status: 500 }
      );
    }

    // Validate the list ID exists in ClickUp
    const response = await fetch(`https://api.clickup.com/api/v2/list/${clickup_list_id}`, {
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new NextResponse(
          JSON.stringify({ error: 'ClickUp List ID not found' }), 
          { status: 400 }
        );
      } else if (response.status === 401 || response.status === 403) {
        return new NextResponse(
          JSON.stringify({ error: 'Unable to access ClickUp list - check permissions' }), 
          { status: 400 }
        );
      } else {
        return new NextResponse(
          JSON.stringify({ error: 'Unable to validate ClickUp List ID' }), 
          { status: 400 }
        );
      }
    }

    const listData = await response.json();

    // Return success with list information
    return NextResponse.json({
      valid: true,
      listName: listData.name,
      listId: clickup_list_id,
    });

  } catch (error) {
    console.error('ClickUp validation error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Unable to validate ClickUp List ID' }), 
      { status: 500 }
    );
  }
} 