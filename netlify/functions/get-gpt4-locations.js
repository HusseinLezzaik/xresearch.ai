import { debugLog, debugError } from '../utils.js';

const fetch = require('node-fetch');

// Modify your handler function to be async
export const handler = async function(event, context) {
    try {
        // Parse the incoming request body to get the user's query
        const { query } = JSON.parse(event.body);
        await debugLog('Received query:', query);

        // Helper function to add a timeout to a fetch call
        const fetchWithTimeout = (url, options, timeout = 10000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            
            return fetch(url, { ...options, signal: controller.signal })
                .finally(() => clearTimeout(id));
        };

        // First GPT prompt to decide whether to use Mapbox or GPT, including detailed criteria
        const routingPrompt = `
You are a system that determines whether a user's search query should be directly handled by a geocoding service like Mapbox, or if it requires interpretation by an AI assistant. Follow these guidelines to make your decision:

## Route to Mapbox API if the query matches these criteria:

1. Full addresses: e.g., "1600 Pennsylvania Ave NW, Washington, DC 20500"
2. Place names: e.g., "Eiffel Tower, Paris"
3. City and country combinations: e.g., "Tokyo, Japan"
4. Postal codes: e.g., "90210"
5. Landmark names: e.g., "Statue of Liberty"
6. Intersections: e.g., "5th Avenue and 42nd Street, New York"
7. Points of interest: e.g., "Central Park"
8. Neighborhood names: e.g., "SoHo, New York"
9. Natural features: e.g., "Mount Everest"
10. Queries explicitly asking for location information: e.g., "Where is the Louvre?"

## Route to LLM if:

1. The query doesn't match any of the above criteria
2. The query is not primarily about location or geography
3. The query requires complex reasoning or general knowledge
4. The query is conversational or requires understanding context
5. The query is about a topic unrelated to locations or mapping

## Instructions:

- Analyze the user's query.
- If it matches the Mapbox criteria, respond with: "mapbox"
- If it doesn't match Mapbox criteria, respond with: "gpt"
- Do not provide any additional text or explanation.

Given the following query:"${query}"
Respond with "mapbox" or "gpt" only based on the criteria above.
        `;

        // Log the routing prompt
        debugLog('Routing prompt sent to OpenAI:', routingPrompt);

        // Call OpenAI API for routing decision with timeout
        let routingResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Ensure your OpenAI API key is stored securely
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Replace with 'gpt-4o-mini' if available
                messages: [{ role: 'user', content: routingPrompt }],
                max_tokens: 10,
                temperature: 0
            })
        }, 10000); // 10-second timeout

        // Parse the API response
        let routingData = await routingResponse.json();

        // Log the response from OpenAI
        debugLog('Routing response from OpenAI:', routingData);

        // Handle API errors
        if (routingData.error) {
            debugError('OpenAI API Error:', routingData.error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'OpenAI API Error', details: routingData.error })
            };
        }

        // Extract the assistant's reply
        const assistantReply = routingData.choices?.[0]?.message?.content?.trim().toLowerCase();
        debugLog('Assistant reply for routing decision:', assistantReply);

        if (!assistantReply) {
            debugError('No content in OpenAI API response:', routingData);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Invalid response from OpenAI API' })
            };
        }

        // Determine the decision based on the assistant's reply
        let decision;
        if (assistantReply === 'mapbox') {
            decision = 'mapbox';
        } else if (assistantReply === 'gpt') {
            decision = 'gpt';
        } else {
            // Default to 'mapbox' if the response is unclear
            decision = 'mapbox';
        }

        debugLog('Decision made:', decision);

        // If decision is 'gpt', proceed to get locations from GPT
        let locations = [];
        if (decision === 'gpt') {
            // Second prompt to ensure city and state are included to generate locations
            const locationPrompt = `
You are an AI assistant providing specific location recommendations based on the user's query.

User's query: "${query}"

Please provide a list of up to 5 specific places located in or near the area mentioned in the user's query. Ensure that each location includes the full address with city and state (e.g., "Golden Gate Bridge, San Francisco, CA"). Respond with the following JSON format:

{
  "locations": [
    "Location 1",
    "Location 2",
    "Location 3"
  ]
}

Only include the JSON in your response. Do not include any additional text.
            `;

            // Log the location prompt
            debugLog('Location prompt sent to OpenAI:', locationPrompt);

            // Call OpenAI API to get locations with timeout
            let locationResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Replace with 'gpt-4o-mini' if available
                    messages: [{ role: 'user', content: locationPrompt }],
                    max_tokens: 300,
                    temperature: 0.7
                })
            }, 10000); // 10-second timeout

            let locationData = await locationResponse.json();

            // Log the response from OpenAI
            debugLog('Location response from OpenAI:', locationData);

            // Handle API errors
            if (locationData.error) {
                debugError('OpenAI API Error:', locationData.error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'OpenAI API Error', details: locationData.error })
                };
            }

            const locationReply = locationData.choices?.[0]?.message?.content?.trim();

            debugLog('Assistant reply for locations:', locationReply);

            if (!locationReply) {
                debugError('No content in OpenAI API response:', locationData);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Invalid response from OpenAI API' })
                };
            }

            // Parse the JSON response
            try {
                const locationsData = JSON.parse(locationReply);
                locations = locationsData.locations || [];
                debugLog('Parsed locations:', locations);
            } catch (parseError) {
                debugError('Error parsing JSON response:', parseError);
                debugError('Assistant reply:', locationReply);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Error parsing JSON response', details: parseError.message })
                };
            }
        }

        // Return the decision and locations (if any)
        debugLog('Returning response:', { decision, locations });
        return {
            statusCode: 200,
            body: JSON.stringify({ decision, locations })
        };

    } catch (error) {
        await debugError('Error in get-gpt4-locations:', error);

        if (error.name === 'AbortError') {
            return {
                statusCode: 504,
                body: JSON.stringify({ error: 'Request timed out' })
            };
        }

        // Fallback to Mapbox if GPT calls fail
        return {
            statusCode: 200,
            body: JSON.stringify({ decision: 'mapbox' })
        };
    }
};