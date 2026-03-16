# SentiLens: Real-Time Assistive Vision

SentiLens is a real-time assistive application designed to help visually impaired individuals navigate and understand their environment. Powered by **Google Gemini 3.0 Flash** and the **Gemini Multimodal Live API**, it provides a low-latency, voice-first interface for grocery shopping, document reading, medication safety, and general environmental awareness.

## Architecture & Integration

```mermaid
graph TD
    Client[Next.js Frontend] -->|Camera Stream| Vision_Service[Gemini 3.0 Flash]
    Client <-->|WebSocket| Live_API[Gemini Multimodal Live API]
    Vision_Service -->|JSON Analysis| Client
    Live_API -->|Real-Time Voice| Client
    
    API_Routes -->|Vision/Grounding| Gemini_Flash[Google Gemini 3.0 Flash]
    Client -->|Memory/Goals| Firestore[Firebase Firestore]
    
    subgraph GCP/Firebase
    Gemini_Flash
    Live_API
    Firestore
    end
```

- **Client-Side:** Next.js application capturing video frames and audio.
- **Real-Time Pipeline:** Direct WebSocket connection to the Gemini Multimodal Live API.
- **Vision:** Gemini 3.0 Flash handles OCR and scene reasoning via high-performance multimodal endpoints.
- **Grounding:** Function Calling (Tools) allows the AI to verify facts against external databases.
- **Memory:** Firestore stores persistent user context and environmental knowledge.

## Features

- **Grocery Assistant:** Identifies products and prices in real-time.
- **Document Interpreter:** Reads, summarizes, and answers questions about physical documents.
- **Medication Safety:** Validates medication labels against official databases and provides safety warnings.
- **Environmental Awareness:** Proactively identifies safety-critical objects and scene changes.

## Prerequisites

- [Google Cloud Project](https://console.cloud.google.com/) or [Google AI Studio](https://aistudio.google.com/) account.
- **API Key** with access to Gemini 3.0 Flash and the Multimodal Live API.
- [Firebase CLI](https://firebase.google.com/docs/cli) installed and configured.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/senti-lens.git
    cd senti-lens
    ```

Configuring API keys:
    Create a `.env.local` file with your Google AI API key:
    ```bash
    NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here
    ```
    > [!NOTE]
    > The `NEXT_PUBLIC_` prefix is required for the real-time voice feature because it connects directly from the browser. For production, ensure you restrict this key to your browser domain in the Google Cloud Console.

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open in your browser:**
    Navigate to `http://localhost:3000`.

## Testing

Run the test suite:
```bash
npm test
```

## License

MIT
