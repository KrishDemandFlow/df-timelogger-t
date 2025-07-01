const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2';

// Ensure the personal token is set in the environment
const CLICKUP_PERSONAL_TOKEN = process.env.CLICKUP_PERSONAL_TOKEN;
if (!CLICKUP_PERSONAL_TOKEN) {
  throw new Error('CLICKUP_PERSONAL_TOKEN is not set in the environment variables.');
}

/**
 * A basic ClickUp API client for making authorized requests.
 */
export const clickupApi = {
  /**
   * Performs a GET request to the ClickUp API.
   * @param endpoint The API endpoint to call (e.g., '/team').
   * @returns The JSON response from the API.
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = `${CLICKUP_API_BASE_URL}${endpoint}`;
    console.log(`Making ClickUp API request to: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: CLICKUP_PERSONAL_TOKEN,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('ClickUp API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      throw new Error(`ClickUp API request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  },

  // TODO: Add post, put, delete methods as needed
};

// Example function to test the API connection
async function getClickUpUser() {
  try {
    // The endpoint `/user` will get the authenticated user's details
    const user = await clickupApi.get('/user');
    console.log('Successfully fetched ClickUp user:', user);
    return user;
  } catch (error) {
    console.error('Failed to fetch ClickUp user:', error);
    return null;
  }
} 