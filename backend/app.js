import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const port = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://one0wpm.onrender.com",
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

function randomText(wordCount) {
    const paragraph = `
        The quick brown fox jumps over the lazy dog. It was a bright cold day in April, and the clocks were striking thirteen.
        In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell,
        nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat: it was a hobbit-hole, and that means comfort.
        Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small unregarded yellow sun.
    `;

    const words = paragraph.split(/\s+/).filter(word => word); 

    let sentence = [];
    
    for (let i = 0; i < Math.max(wordCount,1); i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        sentence.push(words[randomIndex].replace(/[^a-zA-Z]/g, ''));
    }
    
    return sentence.join(" ");
}

function calculatePoints(wpm, accuracy) {
  return Math.round(wpm * accuracy / 100);
}

const rooms = {};

io.on("connection", (socket) => {
  console.log("user connected", socket.id);
  socket.emit("welcome",randomText(10));
  socket.on("create-room", (owner) => {
    const roomId = Math.random().toString(36).substring(2, 8); 
    socket.join(roomId);

    const textToWrite = randomText(10);

    rooms[roomId] = { text:textToWrite,
      users: [{ userid: socket.id,
         username: owner,
         timeTaken: null,
         wpm: null,
         accuracy: null,
         points: null,
         totalpoints:0
        }] }; 
    console.log(`User ${owner}, id ${socket.id} created room ${roomId}`);
    console.log(textToWrite);
    socket.emit("room-created", roomId);
    const roomDetails = rooms[roomId];
    io.to(roomId).emit("details-of-room-created", roomDetails ); 
  });

  socket.on("join-room", (newUser) => {
    const { roomId, userName } = newUser;
    
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].users.push({ 
        userid: socket.id,
        username: userName,
        timeTaken: null,
        wpm: null,
        accuracy: null,
        points: null,
        totalpoints:0
      });
      console.log(`${userName} joined the room`);

      console.log(JSON.stringify(rooms, null, 2));


      const numberOfUsers = rooms[roomId].users.length;
      const roomDetails = rooms[roomId];
      socket.emit("me-joined",roomDetails);
      io.to(roomId).emit("user-joined",roomDetails);
      io.to(roomId).emit("new-notification",`${userName} joined the room`);
  
    } else {
      socket.emit("room-dne-error", "Room does not exist");
      console.log("Room does not exist");
    }
  });

  socket.on("start-btn",(data)=>{
    const roomId = [...socket.rooms][1];
    const text = randomText(data.numwords);

    console.log("started by ", data.owner , "time : ", data.time,"room id", roomId);
    setTimeout(() => {
      rooms[roomId].text = text;
        io.to(roomId).emit("start-timer","3");
        setTimeout(() => {
            io.to(roomId).emit("start-timer","2");
            setTimeout(() => {
                io.to(roomId).emit("start-timer","1");
                setTimeout(() => {
                    io.to(roomId).emit("start-timer","GO!");
                    if (rooms[roomId]) {
                      rooms[roomId].users.forEach(user => {
                        user.wpm = null;
                        user.accuracy = null;
                        user.timeTaken = null;
                        user.points = null;
                      });
                      const roomDetails = rooms[roomId];
                      console.log("reseted");
                      console.log(JSON.stringify(rooms, null, 2));
                      io.to(roomId).emit("reset-scores", roomDetails);
                    }
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
  });

  socket.on("typing", (data) => {
    const roomId = [...socket.rooms][1];
    if (roomId && rooms[roomId]) {
        const user = rooms[roomId].users.find(user => user.userid === socket.id);
        socket.to(roomId).emit("another-player-typing", {
            id:socket.id,
            username: user.username,
            text:data
        });
    }
  });

  socket.on("test-finished", (userdata) => {
    const data = userdata;
    const roomId = [...socket.rooms][1];
    const room = rooms[roomId]; 
    console.log("data",data);
    if (room && room.users) {
      const user = room.users.find((u) => u.userid === data.userid);
      
      if (user) {
        user.timeTaken = data.time;
        user.wpm = data.wmp;
        user.accuracy = data.accuracy;
        user.points = data.wmp;
        user.totalpoints = Math.round(user.totalpoints + user.points);
      }
      console.log("someonefinished");
      console.log(JSON.stringify(rooms, null, 2));
      const roomDetails = rooms[roomId];
      io.to(roomId).emit("test-finished-score", roomDetails);
    }
  });

  socket.on("leave-room", () => {
    let roomIdToLeave = null;

    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex(user => user.userid === socket.id);
      const username = room.users.findIndex(user => user.userid === socket.id)

      console.log(`${rooms[roomId].users[userIndex].username} left the room`)

      io.to(roomId).emit("new-notification",`${rooms[roomId].users[userIndex].username} left the room`);


      if (userIndex !== -1) {
        roomIdToLeave = roomId;
        room.users.splice(userIndex, 1);
        const numberOfUsers = room.users.length;
        const roomDetails = rooms[roomId];
        io.to(roomId).emit("user-left", roomDetails);
        socket.emit("leave","left");
        if (numberOfUsers === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted as it is now empty.`);
        }
      }
    }

    if (roomIdToLeave) {
      socket.leave(roomIdToLeave);
      console.log(`User ${socket.id} left the room`);
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex(user => user.userid === socket.id);

      if (userIndex !== -1) {
        room.users.splice(userIndex, 1); 
        const numberOfUsers = room.users.length;

        const roomDetails = rooms[roomId];
        io.to(roomId).emit("user-dis", roomDetails);

        if (numberOfUsers === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted as it is now empty.`);
          }
      }
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.get("/", (req, res) => {
  res.send("connected for now he he :)");
});

server.listen(port, () => {
  console.log(`listening on port ${port}`);
});
