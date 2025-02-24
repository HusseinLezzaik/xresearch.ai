// Load environment variables from a .env file into process.env
import dotenv from 'dotenv';
dotenv.config();

// Export an asynchronous function to be used as a serverless function handler
export const handler = async (event, context) => ({
  // Set HTTP status code to 200 (OK)
  statusCode: 200,
  // Set the response body to a JSON string containing the Mapbox access token from Netlify environment variables
  body: JSON.stringify({ token: process.env.MAPBOX_ACCESS_TOKEN })
});