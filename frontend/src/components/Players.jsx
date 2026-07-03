import { useEffect, useState, useRef } from "react";
import "../css/MultiplayerSection.css";
import "../css/Players.css";
import socket from "../socket/socket";

const getFloatingStyle = (index, total) => {
  const useTwoRings = total > 10;
  const ringIndex = useTwoRings ? Math.floor(index / 2) : index;
  const ringTotal = useTwoRings ? Math.ceil(total / 2) : total;
  const innerRing = useTwoRings && index % 2 === 1;
  const angle = -Math.PI / 2 + (Math.PI * 2 * ringIndex) / Math.max(ringTotal, 1) + (innerRing ? 0.22 : 0);
  const radiusX = innerRing ? 34 : 45;
  const radiusY = innerRing ? 31 : 42;
  const x = Math.max(8, Math.min(92, 50 + Math.cos(angle) * radiusX));
  const y = Math.max(10, Math.min(90, 50 + Math.sin(angle) * radiusY));
  const seed = (index + 1) * 37;
  const movement = (offset, range) => Math.round(Math.sin(seed + offset) * range);
  const scale = total > 14 ? (innerRing ? 0.57 : 0.64) : total > 8 ? (innerRing ? 0.68 : 0.76) : 0.82 + (index % 3) * 0.08;
  const rotation = movement(31, 3);

  return {
    "--float-x": `${x}%`, "--float-y": `${y}%`, "--float-scale": scale, "--float-near": scale * 1.14, "--float-far": scale * 0.88,
    "--float-duration": `${7 + (seed % 6)}s`, "--float-delay": `${-(seed % 9)}s`,
    "--dx-1": `${movement(1, 28)}px`, "--dy-1": `${movement(7, 24)}px`,
    "--dx-2": `${movement(13, 34)}px`, "--dy-2": `${movement(19, 20)}px`,
    "--dx-3": `${movement(23, 22)}px`, "--dy-3": `${movement(29, 30)}px`,
    "--float-rotate": `${rotation}deg`, "--float-rotate-neg": `${-rotation}deg`, "--float-rotate-half": `${rotation * -0.5}deg`,
  };
};

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [playersText, setPlayersText] = useState({});
  const [mainText, setMainText] = useState("");
  const [socketId, setSocketId] = useState(null);
  const textContainerRefs = useRef({});
  const [roomOwner, setRoomOwner] = useState({});
  const [roundTime, setRoundTime] = useState(60);
  const [wordsintext, setwordsintext] = useState(50);
  const [notifications, setnotifications] = useState([]);
  const [roundBusy, setRoundBusy] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [roomMode, setRoomMode] = useState("race");
  const [settingsError, setSettingsError] = useState("");
  const leaderboardTimerRef = useRef(null);

  const handleStart = () => {
    socket.emit("start-btn", {
      numwords: wordsintext,
      time: roundTime,
      owner: roomOwner.username,
      difficulty,
    });
  };
  const duelWaiting = roomMode === "duel" && players.length !== 2;

  useEffect(() => {
    setSocketId(socket.id);

    const hydrateRoom = (roomDetails) => {
      setPlayers(roomDetails.users || []);
      setMainText(roomDetails.text || "");
      setRoomOwner(roomDetails.users?.[0] || {});
      setPlayersText(Object.fromEntries((roomDetails.users || []).map((user) => [user.userid, { username: user.username, text: user.typed || "" }])));
      setRoundBusy(Boolean(roomDetails.active || roomDetails.starting));
      if (roomDetails.difficulty) setDifficulty(roomDetails.difficulty);
      if (roomDetails.mode) setRoomMode(roomDetails.mode);
    };

    const onConnect = () => {
      setSocketId(socket.id);
      socket.emit("get-room-details");
    };
    const onTyping = (value) => {
      setPlayersText((prevState) => ({
        ...prevState,
        [value.id]: { username: value.username, text: value.text },
      }));
    };
    const onReset = (data) => { clearTimeout(leaderboardTimerRef.current); setShowLeaderboard(false); hydrateRoom(data); };
    const onScores = (data) => setPlayers(data.users || []);
    const onNotification = (newnotification) => {
      setnotifications((noti) => [...noti, newnotification]);
      setTimeout(() => {
        setnotifications((prevItems) =>
          prevItems.filter((i) => i !== newnotification)
        );
      }, 4000);
    };
    const onSettingsError = (message) => {
      setSettingsError(message);
      setTimeout(() => setSettingsError(""), 3500);
    };

    socket.on("connect", onConnect);
    socket.on("room-details", hydrateRoom);
    socket.on("another-player-typing", onTyping);
    socket.on("reset-scores", onReset);
    socket.on("test-finished-score", onScores);
    socket.on("user-joined", hydrateRoom);
    socket.on("new-notification", onNotification);
    socket.on("user-left", hydrateRoom);
    const onRoundEnd = (data) => {
      hydrateRoom(data);
      clearTimeout(leaderboardTimerRef.current);
      leaderboardTimerRef.current = setTimeout(() => setShowLeaderboard(true), 1400);
    };
    socket.on("round-ended", onRoundEnd);
    socket.on("settings-error", onSettingsError);

    socket.emit("get-room-details");

    return () => {
      socket.off("connect", onConnect);
      socket.off("another-player-typing", onTyping);
      socket.off("reset-scores", onReset);
      socket.off("test-finished-score", onScores);
      socket.off("user-joined", hydrateRoom);
      socket.off("new-notification", onNotification);
      socket.off("user-left", hydrateRoom);
      socket.off("round-ended", onRoundEnd);
      socket.off("room-details", hydrateRoom);
      socket.off("settings-error", onSettingsError);
      clearTimeout(leaderboardTimerRef.current);
    };
  }, []);

  useEffect(() => {
    Object.keys(playersText).forEach((playerId) => {
      const container = textContainerRefs.current[playerId];
      if (container) {
        const playerText = playersText[playerId]?.text || "";

        const characterWidth = 7;
        const textWidth = playerText.length * characterWidth;

        const scrollPosition = Math.max(
          0,
          textWidth - container.clientWidth / 2
        );

        container.scrollTo({
          left: scrollPosition,
          behavior: "smooth",
        });
      }
    });
  }, [playersText]);

  return (
    <div className={`player-container ${roomMode === "duel" ? "duel-dashboard" : "race-dashboard"}`}>
      {socket.id == roomOwner.userid ? (
        <div className="host-controls">
          <div className="host-controls-title"><span><i className="fa-solid fa-sliders" /> {roomMode === "duel" ? "Duel setup" : "Race setup"}</span><small>Host controls</small></div>
          <div className="host-setting-grid">
            <label><span>Words</span><input type="number" value={wordsintext} onChange={(e) => setwordsintext(e.target.value)} min="5" max="300" /></label>
            <label><span>Seconds</span><input type="number" value={roundTime} onChange={(e) => setRoundTime(e.target.value)} min="10" max="600" /></label>
            <label><span>Difficulty</span><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="impossible">Impossible</option></select></label>
          </div>
          {settingsError && <div className="settings-inline-error">{settingsError}</div>}
          <button className="start-btn" onClick={handleStart} disabled={roundBusy || duelWaiting}>
            <i className={`fa-solid ${roundBusy || duelWaiting ? "fa-hourglass-half" : "fa-play"}`} /> {roundBusy ? "Round running" : duelWaiting ? "Waiting for opponent" : roomMode === "duel" ? "Start duel" : "Start race"}
          </button>
        </div>
      ) : null}
      <div className="timer"></div>
      {roomMode === "duel" && (
        <div className="duel-scoreboard">
          <div><span>{players[0]?.username || "Player 1"}</span><strong>{players[0]?.wins || 0}</strong></div>
          <em>VS</em>
          <div><strong>{players[1]?.wins || 0}</strong><span>{players[1]?.username || "Waiting..."}</span></div>
        </div>
      )}
      <div className="all-players">
        {players.map((player, index) => {
          const playerText =
            playersText[player.userid]?.text ||
            (player.userid === socketId ? playersText[socketId]?.text : "");
          return (
              <div key={player.userid || index} className={`player-bar ${player.userid === socketId ? "is-you" : ""}`} style={{animationDelay:`${index * 70}ms`, ...getFloatingStyle(index, players.length)}}>
                <div className="player-pic">
{/*                   <img src="../src/assets/player.png" alt="np" /> */}
                  {(player.username || "?").charAt(0).toUpperCase()}
                </div>
                <div className="player-details">
                  <div className="username-pts">
                    <div className="username">
                      {player.username}{player.userid === socketId ? <span className="you-badge">YOU</span> : " "}
                      {player.userid == roomOwner.userid ? (
                        <i
                          className="fa-solid fa-crown"
                          style={{ color: "#FFD43B" }}
                        ></i>
                      ) : null}
                    </div>
                    <div className="total-pts">{roomMode === "duel" ? `${player.wins || 0} wins` : `${player.totalpoints} pts.`}</div>
                  </div>
                  {player.wpm != null ? (
                    <div className="score-box">
                      <h5>{Math.round(player.wpm)} WpM </h5>
                      <h5>Accuracy: {Math.round(player.accuracy * 100)}%</h5>
                      <h5>Time: {Math.round(player.timeTaken)} s</h5>
                    </div>
                  ) : null}
                  <div className="userText">
                    <div
                      className="players-test-text"
                      ref={(el) =>
                        (textContainerRefs.current[player.userid] = el)
                      }
                    >
                      {mainText.split("").map((char, charIndex) => {
                        const isCorrectChar =
                          charIndex < playerText.length &&
                          playerText[charIndex] === char;
                        return (
                          <span
                            key={charIndex}
                            style={{
                              color: isCorrectChar
                                ? "#2eb872"
                                : charIndex < playerText.length
                                ? "red"
                                : "#dbd8e3",
                              textDecoration: "none",
                              fontWeight: "normal",
                            }}
                          >
                            {(playerText[charIndex] != " "
                              ? playerText[charIndex]
                              : mainText[charIndex]) || mainText[charIndex]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
          );
        })}
      </div>
      {showLeaderboard && (
        <div className="leaderboard-overlay">
          <div className="leaderboard-card">
            <button className="leaderboard-close" onClick={() => setShowLeaderboard(false)} aria-label="Close leaderboard"><i className="fa-solid fa-xmark" /></button>
            <div className="leaderboard-trophy"><i className="fa-solid fa-trophy" /></div>
            <span className="eyebrow">Round complete</span><h2>{roomMode === "duel" ? "Duel Score" : "Leaderboard"}</h2>
            <div className="leaderboard-list">
              {[...players].sort((a,b) => roomMode === "duel" ? (b.wins || 0) - (a.wins || 0) : (b.points || 0) - (a.points || 0) || b.totalpoints - a.totalpoints).map((player, index) => (
                <div className={`leader-row rank-${index + 1} ${player.userid === socketId ? "is-you" : ""}`} key={player.userid} style={{animationDelay:`${index * 100}ms`}}>
                  <strong>{index + 1}</strong><span className="leader-avatar">{player.username.charAt(0).toUpperCase()}</span><div><b>{player.username} {player.userid === socketId && <span className="you-badge">YOU</span>}</b><small>{Math.round(player.wpm || 0)} WPM · {Math.round((player.accuracy || 0) * 100)}%</small></div><em>{roomMode === "duel" ? player.wins || 0 : `+${player.points || 0}`}<small>{roomMode === "duel" ? "round wins" : `${player.totalpoints} total`}</small></em>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="notification-box">
        {notifications.map((noti, index) => (
          <div className="notifications" key={index}>
            <i className="fa-solid fa-circle-info" /> {noti}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Players;
