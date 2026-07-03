import { useState, useEffect } from "react";
import "../css/MultiplayerSection.css";
import Players from "./Players";
import socket from "../socket/socket";

// eslint-disable-next-line react/prop-types
const MultiplayerSection = ({ onRoomChange }) => {
  const [inRoom, setinRoom] = useState(false);
  const [roomAction, setRoomAction] = useState("");
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [clickcopy, setclickCopy] = useState("click to copy");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [createdMode, setCreatedMode] = useState("race");
  const [activeRoomId, setActiveRoomId] = useState("");
  const [activeMode, setActiveMode] = useState("race");

  const handleJoinRoom = () => {
    setRoomAction("join");
  };

  const handleCreateRoom = () => {
    if (!userName.trim()) return;
    setRoomAction("create");
    setCreatedMode("race");
    socket.emit("create-room", userName);
  };

  const handleCreateDuel = () => {
    if (!userName.trim()) return;
    setRoomAction("create");
    setCreatedMode("duel");
    socket.emit("create-duel-room", userName);
  };

  const handleBack = () => {
    setRoomAction("");
    setRoomId("");
  };

  const handleCreateRoomId = () => {
    setinRoom(true);
    onRoomChange?.(true);
  };
  const handleJoinRoomById = () => {
    if (userName != "" && roomId != "") {
      setJoining(true);
      setJoinError("");
      socket.emit("join-room", { roomId, userName });
    }
  };

  useEffect(() => {
    const roomCreated = (id) => { setRoomId(id); setActiveRoomId(id); };
    const joined = (details) => {
      setJoining(false);
      setinRoom(true);
      setActiveRoomId(details?.roomId || "");
      setActiveMode(details?.mode || "race");
      onRoomChange?.(true);
    };
    const syncRoom = (details) => {
      if (details?.roomId) setActiveRoomId(details.roomId);
      if (details?.mode) setActiveMode(details.mode);
    };
    const joinFailed = (message) => {
      setJoining(false);
      setinRoom(false);
      setRoomAction("join");
      setJoinError(message || "Room not found");
    };
    socket.on("room-created", roomCreated);
    socket.on("me-joined", joined);
    socket.on("room-dne-error", joinFailed);
    socket.on("details-of-room-created", syncRoom);
    socket.on("room-details", syncRoom);

    return () => {
      socket.off("room-created", roomCreated);
      socket.off("me-joined", joined);
      socket.off("room-dne-error", joinFailed);
      socket.off("details-of-room-created", syncRoom);
      socket.off("room-details", syncRoom);
    };
  }, [onRoomChange]);

  const handleLeaveRoom = () => {
    setinRoom(false);
    setRoomAction("");
    setRoomId("");
    setActiveRoomId("");
    onRoomChange?.(false);
    socket.emit("leave-room");
  };

  return (
    <>
      <div className="multiplayer-Container">
        <div className="multiplayer-header">
          {inRoom ? (
            <div className="in-room">
              <div className="option-btns">
                <div><span className="eyebrow">{activeMode === "duel" ? "1 vs 1 duel" : "Live room"}</span><h2>{activeMode === "duel" ? "Duel lobby" : "Race lobby"}</h2><button className="room-code-chip" onClick={() => navigator.clipboard.writeText(activeRoomId)} title="Copy room code"><i className="fa-regular fa-copy" /> {activeRoomId || "------"}</button></div>
                <button className="leave-room-btn" onClick={handleLeaveRoom}>
                  <i className="fa-solid fa-arrow-right-from-bracket" /> Leave
                </button>
              </div>
              <Players />
            </div>
          ) : roomAction === "" ? (
            <div className="name-input-room-options lobby-enter">
            <div className="lobby-icon"><i className="fa-solid fa-users" /></div>
            <div className="mp-heading">Race together</div>
            <p>Join a code, create a group race, or challenge one friend to a dedicated duel.</p>
              <label className="input-label">Your racer name</label>
              <input
                className="name-input code-input"
                type="text"
                placeholder="e.g. SpeedySam"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
              {joinError && <div className="join-error">{joinError}</div>}
              <div className="room-options">
                <button className="mp-btn secondary" onClick={handleJoinRoom} disabled={!userName.trim()}>
                  <i className="fa-solid fa-arrow-right-to-bracket" /> Join
                </button>
                <button className="mp-btn" onClick={handleCreateRoom} disabled={!userName.trim()}>
                  <i className="fa-solid fa-users" /> Group room
                </button>
                <button className="mp-btn duel-create-btn" onClick={handleCreateDuel} disabled={!userName.trim()}>
                  <i className="fa-solid fa-bolt" /> Start 1 vs 1 duel
                </button>
              </div>
            </div>
          ) : roomAction === "join" ? (
            <div className="room-code">
              <span className="lobby-icon small"><i className="fa-solid fa-ticket" /></span><h3>Enter room code</h3>
              <p>Ask the host for their unique code.</p>

              <input
                className="code-input"
                type="text"
                placeholder="XXXXXX"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              />

              <div className="join-create-back-btns">
                <button className="back-btn mp-btn secondary" onClick={handleBack}>
                  Back
                </button>
                <button
                  type="submit"
                  className="back-btn mp-btn"
                  onClick={handleJoinRoomById}
                  disabled={joining || !roomId.trim()}
                >
                  {joining ? "Joining..." : "Join race"}
                </button>
              </div>
            </div>
          ) : roomAction === "create" ? (
            <div className="room-code">
              <span className={`lobby-icon small success ${createdMode === "duel" ? "duel" : ""}`}><i className={`fa-solid ${createdMode === "duel" ? "fa-bolt" : "fa-check"}`} /></span><h3>{createdMode === "duel" ? "Duel arena ready" : "Your room is ready"}</h3>
              <p>{createdMode === "duel" ? "Share this code with one opponent. The room locks at two players." : "Share this code with your friends."}</p>
              <div className="room-code-display">
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
                  {roomId || "••••••"}
                </span>
                <div className="click-to-copy">{clickcopy}</div>
              </div>
              <div className="join-create-back-btns">
                <button className="back-btn mp-btn secondary" onClick={handleBack}>
                  Back
                </button>
                <button className="back-btn mp-btn" onClick={handleCreateRoomId} disabled={!roomId}>
                  Enter lobby
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default MultiplayerSection;
