Cinespace Project Blueprint & Implementation Guide
1. Project Overview & Tech Stack
Cinespace is a real-time, co-watching platform where users can stream synchronized local video clips and chat together in passcode-protected virtual rooms.

Framework: Next.js 14+ (Unified Single-Repository Architecture)

Deployment Target: Render (Always-on Web Service Container, 24/7 WebSockets)

Database: MongoDB Atlas (Persistent Room & Embedded Chat Logs)

Storage (Media Engine): Supabase Storage Buckets (Free Tier, Max 50MB optimized video clips)

Real-Time Synchronization: Node.js WebSockets (ws package)

Data Layout Layer: GraphQL (Queries, Mutations, and Subscriptions)

State Caching (Local Dev & Presentation): Server Memory Map (Zero-cost local Redis replacement)

2. Shared Project Initialization (Do This Together)
Before splitting tasks, set up the single Next.js workspace repository.

Step 1: Initialize Project Structure
Run the following commands in your project root:

Bash
npx create-next-app@latest cinespace --typescript --tailwind --app --src-dir
cd cinespace
npm install @supabase/supabase-js graphql graphql-ws mongoose ws
npm install --save-dev @types/node @types/ws ts-node ts-node-dev
Step 2: Configure Workspace Directories
Organize your src/ directory to cleanly separate your frontend and backend work:

Plaintext
cinespace/
├── src/
│   ├── app/                    # Next.js App Router (Pages & Routing)
│   ├── backend/                # BACKEND WORKSPACE (Your Territory)
│   │   ├── config/             # DB client initializations
│   │   ├── graphql/            # GraphQL Schemas, TypeDefs & Resolvers
│   │   └── models/             # MongoDB Mongoose Schemas (Room & Chat)
│   └── frontend/               # FRONTEND WORKSPACE (Your Friend's Territory)
│       ├── components/         # Video Player, Chat Panel, and Keypad UI
│       └── hooks/              # Latency Sync Engine, WS Network hooks
├── server.ts                   # Custom Node.js/Render entry point script
└── package.json
3. Backend Implementation Roadmap (Your Tasks)
Your goal is to build a continuous, persistent real-time engine that tracks room states, handles live text messages, and enforces the passcode protection rules.

Task B1: Set up the Custom Server Entrypoint (server.ts)
Create server.ts in your root directory. It runs the Next.js app inside a continuous Node.js runtime environment, handling standard pages, incoming text chat bytes, and video playback updates on the exact same port.

Implementation Checklist: Initialize a global JavaScript Map() to act as an in-memory Redis cache replacement. Bind a WebSocketServer instance from the ws package to the server's HTTP upgrade handshake event over /api/sync.

Task B2: Define the Room & Chat Database Schema (src/backend/models/Room.ts)
Create a Mongoose schema to back your persistent storage layer in MongoDB Atlas.

Fields to include: roomCode (String, unique), title (String), videoUrl (String), passcode (String, for Pattern 2 verification), playbackStatus (Enum: PLAYING/PAUSED), lastKnownPosition (Number), lastActivityAt (Date timestamp for TTL checks), and messages (Array of Sub-documents containing sender, text, and timestamp).

Task B3: Construct the GraphQL Schema & Passcode Validator
Create the Type Definitions and Resolvers (src/backend/graphql/).

Mutations: Write createRoom(title, passcode) which returns a random 6-character room code. Write verifyRoomPasscode(roomCode, passcode) to run an equality check against MongoDB before granting access.

Subscriptions: Set up WebSocket stream publishers that broadcast video actions (PLAY, PAUSE, SEEK) and chat events (NEW_MESSAGE) to room guests.

Task B4: Secure Automated /api/cleanup Route
Write a Next.js API route that acts as your Cron handler. When triggered daily by an external ping, it finds rooms inactive for 24 hours, uses the Supabase SDK to delete their target video files, and drops the room document out of MongoDB.

4. Frontend Implementation Roadmap (Your Friend's Tasks)
Your friend's goal is to handle user interactions, video playback triggers, live chat interfaces, and network drift corrections.

Task F1: Implement the Passcode Gate UI (src/app/room/[roomCode]/page.tsx)
Build a conditional lock screen. If a user tries to access a room URL:

Show a keypad UI demanding the 4-digit passcode.

Fire the backend GraphQL verification call.

If valid, request an anonymous display name, store it in local storage, and transition into the theater room view.

Task F2: Build the Supabase Direct Video Upload Component
Create an upload drop-zone targeting the public Supabase bucket.

Constraints: Keep sample videos under 50MB for presentation purposes. On completion, grab the public URL string and pass it to the backend room setup mutation.

Task F3: Develop the Core HTML5 Video Player Wrapper
Build a custom control wrapper around the standard browser video element.

Event Listeners: Capture local player manipulation events (onPlay, onPause, onSeeked). Send these user interactions directly to the backend WebSocket stream.

Task F4: Code the Latency Compensation Client Engine
Create a custom React hook (src/frontend/hooks/useRoomSync.ts) to manage stream drifting.

The Logic: Listen for incoming backend WebSocket updates. When a sync event arrives, calculate network latency using a simplified timestamp delta calculation. If the variance exceeds 1.0 second, programmatically jump the video timeline forward to synchronize perfectly with the group.

Task F5: Design the Real-Time Sidebar Chat Panel (src/frontend/components/ChatBox.tsx)
Build the floating side panel interface right next to the movie player.

Features: Include a scrollable message list window and a text input box. When a user hits Enter, push a SEND_MESSAGE payload through the open WebSocket pipe. Listen for incoming NEW_MESSAGE payloads from the server and append them seamlessly to the local state log array.

5. Deployment Step-by-Step (Render Guide)
When both of you are ready to present, execute these steps for a $0 production launch:

MongoDB Atlas: Spin up a free Mongoose cluster. Copy your connection URI string.

Supabase: Set up your bucket named videos and toggle the setting to Public. Copy your Project API credentials.

Render Deployment: Create a new Web Service container tied to your GitHub repo.

Configure Build/Start commands:

Build Command: npm run build

Start Command: npm run start

Inject Environment Variables: Paste your MongoDB connection string and Supabase API keys into the Render Dashboard setting panel.