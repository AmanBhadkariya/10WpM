import React, { useState, useEffect } from "react";
import "../css/MultiplayerSection.css";
import Players from "./Players";
import socket from "../socket/socket";

const MultiplayerSection = () => {
  const [inRoom, setinRoom] = useState(false);
  const [roomAction, setRoomAction] = useState("");
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [clickcopy, setclickCopy] = useState("click to copy");

  const handleJoinRoom = () => {
    setRoomAction("join");
  };

  const handleCreateRoom = () => {
    setRoomAction("create");
    socket.emit("create-room", userName);
    socket.on("room-created", (id) => {
      setRoomId(id);
    });
  };

  const handleBack = () => {
    setRoomAction("");
    setRoomId("");
  };

  const handleCreateRoomId = () => {
    setinRoom(true);
    socket.emit("user-joined", { roomId, userName });
  };
  const handleJoinRoomById = () => {
    if (userName != "" && roomId != "") {
      setinRoom(true);
      socket.emit("join-room", { roomId, userName });
    }
  };

  useEffect(() => {
    socket.on("user-joined", ({ userId }) => {
      console.log(`User ${userId} joined the room.`);
    });

    socket.on("user-left", ({ userId }) => {
      console.log(`User ${userId} left the room.`);
    });

    return () => {
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, []);

  const handleLeaveRoom = () => {
    setinRoom(false);
    setRoomAction("");
    setRoomId("");
    socket.emit("leave-room");
  };

  return (
    <>
      <div className="multiplayer-Container">
        <div className="multiplayer-header">
          {inRoom ? (
            <div className="in-room">
              <div className="option-btns">
                <button className="leave-room-btn" onClick={handleLeaveRoom}>
                  Leave Room
                </button>
              </div>
              <Players />
            </div>
          ) : roomAction === "" ? (
            <div className="name-input-room-options">
            <div className="mp-heading">Multiplayer</div>
              <input
                className="name-input code-input"
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
              <div className="room-options">
                <div className="mp-btn" onClick={handleJoinRoom}>
                  Join Room
                </div>
                <div className="mp-btn" onClick={handleCreateRoom}>
                  Create Room
                </div>
              </div>
            </div>
          ) : roomAction === "join" ? (
            <div className="room-code">
              <h4>Join a Room</h4>

              <input
                className="code-input"
                type="text"
                placeholder="Enter Room Code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              />

              <div className="join-create-back-btns">
                <div className="back-btn mp-btn" onClick={handleBack}>
                  Back
                </div>
                <div
                  type="submit"
                  className="back-btn mp-btn"
                  onClick={handleJoinRoomById}
                >
                  Join
                </div>
              </div>
            </div>
          ) : roomAction === "create" ? (
            <div className="room-code">
              <h3>Room created</h3>
              <h2>
                Room code:
                <span
                  onClick={() => {
                    navigator.clipboard.writeText(roomId);
                    setclickCopy("copied");
                    setTimeout(() => {
                      setclickCopy("click to copy");
                    }, 2000);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {" " + roomId}
                </span>
                <div className="click-to-copy">{clickcopy}</div>
              </h2>
              <div className="join-create-back-btns">
                <div className="back-btn mp-btn" onClick={handleBack}>
                  Back
                </div>
                <div className="back-btn mp-btn" onClick={handleCreateRoomId}>
                  Join
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default MultiplayerSection;
