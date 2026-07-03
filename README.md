# 10WPM — Multiplayer Typing Game

10WPM is a real-time typing game built with React, Express, and Socket.IO. Practice alone, race a group of friends in a private room, or challenge one opponent in a dedicated 1v1 duel.

The interface uses an animated typing-themed background, smooth transitions, live player cards, synchronized countdowns, configurable rounds, performance results, and post-round leaderboards.

## Features

### Solo practice

- Word-count and timed practice modes
- Configurable word count
- 15, 30, 60, and 120-second tests
- Easy, medium, hard, and impossible difficulty levels
- Live timer and completion progress
- WPM and accuracy calculation
- Instant locally generated practice text
- Restart and generate-new-text controls

### Group multiplayer

- Create private rooms with shareable six-character codes
- Join rooms from another browser or device
- Live synchronized `3–2–1–GO` countdown
- Configurable word count, round duration, and difficulty
- Real-time visibility of every player's typing progress
- Server-authoritative round timer
- Automatic timeout results for unfinished players
- WPM, accuracy, round points, and cumulative points
- Animated post-round leaderboard
- Host controls and automatic host transfer when the current host leaves

### 1v1 duels

- Separate duel-room creation flow
- Strict two-player room limit
- Duel cannot start until both players are present
- Side-by-side player dashboard
- Persistent round-win score such as `1–2`
- Dedicated duel leaderboard and live arena styling

### Interface

- Responsive dark glassmorphism design
- Floating typing keys and words
- Player cards with depth, scale, blur, and drift animations
- Translucent centered typing arena during live rounds
- Smooth gliding typing caret
- Highlighted current-player card and `YOU` badges
- Copyable room code inside the lobby
- Reduced-motion accessibility support

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite |
| Realtime client | Socket.IO Client |
| Backend | Node.js, Express |
| Realtime server | Socket.IO |
| Styling | CSS, Font Awesome, Google Fonts |
| Code quality | ESLint |

## Project structure

```text
10WpM/
├── backend/
│   ├── app.js                 # Express and Socket.IO server
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MpTypingTest.jsx
│   │   │   ├── MultiplayerSection.jsx
│   │   │   ├── Players.jsx
│   │   │   ├── Timer.jsx
│   │   │   └── TypingTest.jsx
│   │   ├── css/
│   │   ├── socket/socket.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── Enhancements.css
│   │   ├── Smooth.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── LICENSE
└── README.md
```

## Requirements

- Node.js 18 or newer
- npm
- Two terminal windows for local development

## Installation

Clone the repository and install both applications:

```bash
git clone <your-repository-url>
cd 10WpM

cd backend
npm install

cd ../frontend
npm install
```

## Running locally

Start the backend in the first terminal:

```bash
cd backend
npm run dev
```

The server runs at [http://localhost:3000](http://localhost:3000). Opening that URL should return:

```json
{
  "status": "ok",
  "message": "10WPM server is running"
}
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To test multiplayer locally, open the frontend in two browser windows. Create a room in one window and join its code from the other.

## Environment configuration

The frontend connects to `http://localhost:3000` by default. To use a different backend, copy the example environment file:

```bash
cd frontend
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

Set the server URL:

```env
VITE_SOCKET_URL=http://localhost:3000
```

Restart Vite whenever an environment variable changes.

## Available scripts

### Frontend

Run these commands from `frontend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create an optimized production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint checks |

### Backend

Run these commands from `backend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the server with Nodemon |
| `npm start` | Start the server with Node.js |

The backend accepts a custom port through `PORT`:

```bash
PORT=4000 npm start
```

PowerShell:

```powershell
$env:PORT=4000
npm start
```

## How to play

### Solo practice

1. Select **Words** or **Timer**.
2. Choose the word count or duration.
3. Select a difficulty.
4. Press **Apply**.
5. Start typing in the input field.

### Group race

1. Enter a racer name.
2. Select **Group room**.
3. Share the generated room code.
4. Enter the lobby.
5. Configure words, seconds, and difficulty.
6. The host starts the round.
7. Type after the synchronized countdown.

### 1v1 duel

1. Enter a racer name.
2. Select **Start 1 vs 1 duel**.
3. Share the room code with one opponent.
4. Wait for the opponent to join.
5. The host configures and starts the duel.
6. The player with the better round score receives one duel win.

## Difficulty levels

| Difficulty | Description |
| --- | --- |
| Easy | Short, familiar words |
| Medium | Typical typing-test vocabulary |
| Hard | Long and uncommon words |
| Impossible | Extremely long specialist vocabulary |

Difficulty is enforced by the backend for multiplayer rounds and generated locally for solo practice.

## Scoring

- **WPM** measures typing speed adjusted by correctness.
- **Accuracy** represents the proportion of correct input.
- **Round points** are calculated from WPM and accuracy.
- **Total points** accumulate across group-room rounds.
- **Duel wins** increase by one for the higher-scoring player after each non-tied duel round.
- If time expires, the server calculates partial results from the text already typed.

## Realtime architecture

The backend stores active rooms in memory and coordinates every multiplayer round. It controls room membership, countdowns, generated text, deadlines, score updates, duel wins, and round completion.

Important Socket.IO events include:

| Event | Direction | Purpose |
| --- | --- | --- |
| `create-room` | Client → server | Create a group room |
| `create-duel-room` | Client → server | Create a two-player duel |
| `join-room` | Client → server | Join by room code |
| `room-details` | Server → client | Synchronize room state |
| `start-btn` | Client → server | Request a new round |
| `start-timer` | Server → client | Synchronize `3–2–1–GO` |
| `round-start` | Server → client | Enable typing and provide the deadline |
| `typing` | Client → server | Send live typing progress |
| `another-player-typing` | Server → client | Broadcast typing progress |
| `test-finished` | Client → server | Submit a completed result |
| `round-ended` | Server → client | Finish the round and publish results |
| `leave-room` | Client → server | Leave the current room |

## Production deployment

### Backend

Deploy the `backend/` directory to a Node.js host such as Render, Railway, Fly.io, or a virtual server.

- Build command: `npm install`
- Start command: `npm start`
- Configure `PORT` if required by the host.
- Add the deployed frontend origin to the Socket.IO CORS list in `backend/app.js`.

### Frontend

Deploy the `frontend/` directory to a static host such as Vercel, Netlify, Cloudflare Pages, or Render Static Sites.

- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_SOCKET_URL=https://your-backend.example.com`

Both deployments must use compatible HTTPS/WSS origins in production.

## Current storage limitation

Rooms and scores are stored in server memory. Restarting the backend clears all rooms and ongoing matches. Multiple backend instances will not share room state.

For horizontal scaling or persistent accounts, add a shared store such as Redis and configure the Socket.IO Redis adapter.

## Troubleshooting

### The frontend loads but multiplayer is offline

- Confirm the backend is running on port `3000`.
- Open [http://localhost:3000](http://localhost:3000) and check the health response.
- Verify `VITE_SOCKET_URL`.
- Restart the Vite server after changing `.env`.
- Check that the frontend origin is allowed by backend CORS.

### A room code does not work

- Room codes are tied to the current backend process.
- Confirm both players use the same backend URL.
- Do not restart the backend after creating the room.
- Duel rooms reject a third player.

### The host cannot start a duel

A duel requires exactly two connected players. The button remains disabled until the opponent joins.

### Port already in use

Stop the older Node.js process or start the backend with a different `PORT`, then update `VITE_SOCKET_URL` to match.

### Dependencies or Vite commands are missing

Run `npm install` separately inside both `backend/` and `frontend/`.

## Validation

Before opening a pull request, run:

```bash
cd frontend
npm run lint
npm run build

cd ../backend
node --check app.js
```

## Future improvements

- Persistent user accounts and profiles
- Public matchmaking and discoverable rooms
- Redis-backed room state and horizontal scaling
- Match history and global leaderboards
- Custom avatars and profile statistics
- Sound and accessibility preferences
- Automated frontend and Socket.IO integration tests
