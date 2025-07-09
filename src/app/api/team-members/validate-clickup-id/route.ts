import { NextResponse } from 'next/server';
import { z } from 'zod';

const validateSchema = z.object({
  clickup_user_id: z.string().min(1, 'ClickUp User ID is required'),
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

    const { clickup_user_id } = validation.data;

    // Check if it's a valid numeric ID
    const numericId = parseInt(clickup_user_id);
    if (isNaN(numericId) || numericId <= 0) {
      return new NextResponse(
        JSON.stringify({ error: 'ClickUp User ID must be a positive number' }), 
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

    // Validate the user ID exists in ClickUp
    const response = await fetch(`https://api.clickup.com/api/v2/user/${clickup_user_id}`, {
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new NextResponse(
          JSON.stringify({ error: 'ClickUp User ID not found' }), 
          { status: 400 }
        );
      } else if (response.status === 401 || response.status === 403) {
        return new NextResponse(
          JSON.stringify({ error: 'Unable to access ClickUp user - check permissions' }), 
          { status: 400 }
        );
      } else {
        return new NextResponse(
          JSON.stringify({ error: 'Unable to validate ClickUp User ID' }), 
          { status: 400 }
        );
      }
    }

    const userData = await response.json();

    // Return success with user information
    return NextResponse.json({
      valid: true,
      username: userData.user?.username || userData.username,
      email: userData.user?.email || userData.email,
      userId: clickup_user_id,
    });

  } catch (error) {
    console.error('ClickUp validation error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Unable to validate ClickUp User ID' }), 
      { status: 500 }
    );
  }
} 