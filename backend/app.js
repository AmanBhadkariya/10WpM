import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const port = process.env.PORT || 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://one0wpm.onrender.com"], methods: ["GET", "POST"], credentials: true },
});

const wordPools = {
  easy: "cat sun run tree blue soft happy jump moon game play fast cool warm bird book road star smile light".split(" "),
  medium: "quick bright focus rhythm keyboard motion spark cloud drift rapid steady clever dream signal flow orbit dash purple neon create race friend smooth energy level victory galaxy comfort yellow spiral typing speed challenge".split(" "),
  hard: "juxtapose labyrinthine zephyr mnemonic kaleidoscope quintessential synchronization extraordinary bureaucracy phosphorescent idiosyncratic metamorphosis cryptocurrency architecture miscellaneous questionnaire perseverance".split(" "),
  impossible: "pneumonoultramicroscopicsilicovolcanoconiosis electroencephalographically psychoneuroendocrinological spectrophotofluorometrically counterimmunoelectrophoresis thyroparathyroidectomized honorificabilitudinitatibus dichlorodifluoromethane incomprehensibilities uncopyrightable subdermatoglyphic".split(" "),
};
const randomText = (count = 30, difficulty = "medium") => {
  const words = wordPools[difficulty] || wordPools.medium;
  return Array.from({ length: Math.max(1, Math.min(Number(count) || 30, 300)) }, () => words[Math.floor(Math.random() * words.length)]).join(" ");
};
const rooms = {};
const roomIdFor = (socket) => [...socket.rooms].find((id) => id !== socket.id);
const publicRoom = (room) => ({ roomId: room.id, text: room.text, users: room.users, active: room.active, starting: room.starting, duration: room.duration, difficulty: room.difficulty, mode: room.mode, roundWinner: room.roundWinner, endsAt: room.endsAt });

function endRound(roomId, reason = "time") {
  const room = rooms[roomId];
  if (!room || !room.active) return;
  if (reason === "time") {
    room.users.forEach((user) => {
      if (user.finished) return;
      const correctChars = user.typed.split("").filter((char, index) => char === room.text[index]).length;
      user.accuracy = user.typed.length ? correctChars / user.typed.length : 0;
      user.wpm = Math.round((correctChars / 5) / (room.duration / 60));
      user.timeTaken = room.duration;
      user.points = Math.round(user.wpm * user.accuracy);
      user.totalpoints += user.points;
      user.finished = true;
    });
  }
  room.active = false;
  room.starting = false;
  room.endsAt = null;
  if (room.mode === "duel" && room.users.length === 2) {
    const ranked = [...room.users].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wpm || 0) - (a.wpm || 0));
    if ((ranked[0].points || 0) !== (ranked[1].points || 0)) {
      ranked[0].wins = (ranked[0].wins || 0) + 1;
      room.roundWinner = ranked[0].userid;
    } else {
      room.roundWinner = null;
    }
  }
  clearTimeout(room.roundTimer);
  io.to(roomId).emit("round-ended", { ...publicRoom(room), reason });
}

io.on("connection", (socket) => {
  socket.emit("welcome", randomText(10));

  const createRoom = (owner, mode) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    socket.join(roomId);
    rooms[roomId] = {
      id: roomId, text: randomText(30), active: false, starting: false, duration: 60, difficulty: "medium", mode, roundWinner: null, endsAt: null, roundTimer: null,
      users: [{ userid: socket.id, username: String(owner).trim(), timeTaken: null, wpm: null, accuracy: null, points: null, totalpoints: 0, wins: 0, typed: "", finished: false }],
    };
    socket.emit("room-created", roomId);
    socket.emit("details-of-room-created", publicRoom(rooms[roomId]));
  };
  socket.on("create-room", (owner) => createRoom(owner, "race"));
  socket.on("create-duel-room", (owner) => createRoom(owner, "duel"));

  socket.on("join-room", ({ roomId, userName }) => {
    const room = rooms[String(roomId).trim().toLowerCase()];
    if (!room) return socket.emit("room-dne-error", "Room does not exist");
    if (room.mode === "duel" && room.users.length >= 2) return socket.emit("room-dne-error", "This 1 vs 1 room is full");
    if (room.users.some((user) => user.userid === socket.id)) return socket.emit("me-joined", publicRoom(room));
    socket.join(String(roomId).trim().toLowerCase());
    room.users.push({ userid: socket.id, username: String(userName).trim(), timeTaken: null, wpm: null, accuracy: null, points: null, totalpoints: 0, wins: 0, typed: "", finished: false });
    socket.emit("me-joined", publicRoom(room));
    io.to(String(roomId).trim().toLowerCase()).emit("user-joined", publicRoom(room));
    socket.to(String(roomId).trim().toLowerCase()).emit("new-notification", `${String(userName).trim()} joined the room`);
  });

  socket.on("get-room-details", () => {
    const room = rooms[roomIdFor(socket)];
    if (room) socket.emit("room-details", publicRoom(room));
  });

  socket.on("start-btn", ({ numwords, time, difficulty }) => {
    const roomId = roomIdFor(socket);
    const room = rooms[roomId];
    if (!room || room.users[0]?.userid !== socket.id || room.active || room.starting) return;
    if (room.mode === "duel" && room.users.length !== 2) return socket.emit("settings-error", "A duel needs exactly two players");
    room.starting = true;
    room.difficulty = ["easy", "medium", "hard", "impossible"].includes(difficulty) ? difficulty : "medium";
    room.text = randomText(numwords, room.difficulty);
    room.duration = Math.max(10, Math.min(Number(time) || 60, 600));
    room.users.forEach((user) => Object.assign(user, { timeTaken: null, wpm: null, accuracy: null, points: null, typed: "", finished: false }));
    room.roundWinner = null;
    io.to(roomId).emit("reset-scores", publicRoom(room));
    ["3", "2", "1"].forEach((value, index) => setTimeout(() => io.to(roomId).emit("start-timer", value), index * 1000));
    setTimeout(() => {
      if (!rooms[roomId]) return;
      room.active = true;
      room.starting = false;
      room.endsAt = Date.now() + room.duration * 1000;
      io.to(roomId).emit("start-timer", "GO!");
      io.to(roomId).emit("round-start", publicRoom(room));
      room.roundTimer = setTimeout(() => endRound(roomId, "time"), room.duration * 1000);
    }, 3000);
  });

  socket.on("typing", (text) => {
    const roomId = roomIdFor(socket);
    const room = rooms[roomId];
    if (!room?.active) return;
    const user = room.users.find((item) => item.userid === socket.id);
    if (!user || user.finished) return;
    user.typed = String(text).slice(0, room.text.length);
    io.to(roomId).emit("another-player-typing", { id: socket.id, username: user.username, text: user.typed });
  });

  socket.on("test-finished", (data) => {
    const roomId = roomIdFor(socket);
    const room = rooms[roomId];
    const user = room?.users.find((item) => item.userid === socket.id);
    if (!room?.active || !user || user.finished) return;
    user.finished = true;
    user.timeTaken = Number(data.time) || 0;
    user.wpm = Math.max(0, Number(data.wmp) || 0);
    user.accuracy = Math.max(0, Math.min(Number(data.accuracy) || 0, 1));
    user.points = Math.round(user.wpm * user.accuracy);
    user.totalpoints += user.points;
    io.to(roomId).emit("test-finished-score", publicRoom(room));
    if (room.users.every((item) => item.finished)) endRound(roomId, "finished");
  });

  const removePlayer = () => {
    const roomId = roomIdFor(socket);
    const room = rooms[roomId];
    if (!room) return;
    const index = room.users.findIndex((user) => user.userid === socket.id);
    if (index < 0) return;
    const [user] = room.users.splice(index, 1);
    socket.leave(roomId);
    socket.emit("leave");
    if (!room.users.length) { clearTimeout(room.roundTimer); delete rooms[roomId]; return; }
    io.to(roomId).emit("new-notification", `${user.username} left the room`);
    io.to(roomId).emit("user-left", publicRoom(room));
  };
  socket.on("leave-room", removePlayer);
  socket.on("disconnecting", removePlayer);
});

app.get("/", (_req, res) => res.json({ status: "ok", message: "10WPM server is running" }));
server.listen(port, () => console.log(`listening on port ${port}`));
