# xresearch.ai
The first website you want to visit when thinking of traveling somewhere.

## Description
An interactive map application that allows users to search for locations, view custom markers, and interact with their current geolocation.

## Project Structure
```
xresearch.ai/
├── frontend/
│   └── src/
│       ├── index.html     # Main HTML
│       ├── js/            
│       │   ├── main.js    # Main entry point
│       │   ├── map.js     # Map initialization and related functions
│       │   ├── geolocation.js # Geolocation functionalities
│       │   ├── geocoder.js    # Geocoder (search bar) functionality
│       │   ├── analytics.js   # Analytics setup and tracking functions
│       │   └── utils.js       # Utility functions (e.g., devLog, devError)
│       └── css/           
│           └── styles.css # Main stylesheet
├── netlify/
│   ├── functions/
│   │   ├── get-gpt4-locations.js  # Processes location queries using GPT-4 or routes to Mapbox
│   │   └── get-mapbox-token.js    # Securely provides Mapbox access token to frontend
│   └── utils.js           # Utility functions for Netlify functions
└── prompts/               # Project structure, todos, features, prompts
```

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Map Services: Mapbox GL JS, Mapbox Geocoder
- Backend: Netlify Functions
- Analytics: Google Analytics, Mixpanel

## Getting Started

### Prerequisites
- Node.js (v14 or later)
- npm (v6 or later)
- Netlify CLI (`npm install -g netlify-cli`)
- Mapbox API key
- OpenAI API key
- Google Analytics tracking ID (optional)
- Mixpanel project token (optional)

### Environment Setup
1. fill `.env` with your API keys/tokens
2. Install global dependencies:
   ```
   npm install -g netlify-cli
   ```
3. Install project dependencies:
   ```
   npm install
   ```

### Installation
1. Clone the repository
2. Install dependencies: `npm install`

### Running the app locally
1. Run the development server: `npm run dev`
2. Open your browser and navigate to `http://localhost:3000`

### Testing Frontend on Mobile
1. Open your website in Google Chrome (http://localhost:8888/)
2. Inspect via `Cmd + Option + I`
3. `Cmd + Shift + M`

### Testing GPT4 Calls for Natural Language Search

- To test GPT4 calls, run the following command in your terminal:

```bash
curl -X POST http://localhost:8888/.netlify/functions/get-gpt4-locations \
  -H "Content-Type: application/json" \
  -d '{"query": "Recommend cozy cafes in Paris tonight"}'
```

- Example response:

```json
{
  "locations": [
    "Café de Flore, 172 Boulevard Saint-Germain, 75006 Paris",
    "Les Deux Magots, 6 Place Saint-Germain des Prés, 75006 Paris",
    "Café des Deux Moulins, 15 Rue Lepic, 75018 Paris",
    "Le Consulat, 18 Rue Norvins, 75018 Paris",
    "Café Angelina, 226 Rue de Rivoli, 75001 Paris"
  ],
  "decision": "gpt"
}
```

### MapBox Geocode API Test
```bash
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/$(echo -n "$query" | jq -sRr @uri).json?access_token=$MAPBOX_ACCESS_TOKEN" | jq .
```


### Backend Testing
- set `DEBUG_MODE=True` inside `.env`
- you can open `netlify/debug.log`
- for real-time monitoring, use the `tail` command from terminal:
```bash
tail -f netlify/debug.log
```

### TODO

This project is in no way polished yet, rather an initial skeleton to search directly on a map instead of going back and forth between a language model and a map. Goolge search on maps is biased because of business ad spending to promote their locations, therefore having a pure search engine that is powered by LLMs sounds like a more honest approach.

List:

**1. Mobile:**

- the zoom in/out buttons become much smaller when I open keyboard from mobile browser.

**2. Unit tests:**

- add deployment tests and unit tests to make sure things work well on both desktop and mobile

**3. Natural Language Search:**

- autocomplete query
- save previous search queries like google maps
- implement a feature that displays recent searches for quick access.
- favourite locations feature.


**4. Authentication:**

- add user sign in via Google Account
- build user profile with system prompt or equivalent to gather preferecences.
- collect user data in DB or Mixpanel to track usage.

**5. Payments:**

- add payments link via Stripe to offer more advanced features.

**6. API Calls Optimization:**

- route to small cheap llms to determine if its a mapbox request
- caching common queries to reduce API calls and improve resopnse time.
- Rate Limiting: Depending on your usage, you might want to implement rate limiting on the client side to prevent excessive API calls.
- geocoding optimization: for the GPT-generated locations, you're making separate API calls for each location. You could potentially optimize this by using Mapbox's batch geocoding API if you're dealing with multiple locations frequently.
- we might not need the first gpt4 validation if we can get the mapbox validation to work properly.
- add param to disable GPT4 or fallback to smaller model in case spike in usage.

**7. Map Configuration**

- when user clicks on an attraction, they can get their address.
- user feedback: you might want to provide more detailed feedback to users when no results are found or when an error occurs. This could include suggestions for refining their search.

**8. Codebase Refactor**
- ensure frontend logging can be controlled from an environment variable.
