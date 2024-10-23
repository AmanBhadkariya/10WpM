import React, { useEffect, useState, useRef, useContext } from "react";
import "../css/MultiplayerSection.css";
import "../css/Players.css";
import socket from "../socket/socket";

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
  const [showSettings, setShowSettings] = useState(false);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  useEffect(() => {
    if (roomOwner) {
      console.log("Updated room owner:", roomOwner);
    }
  }, [roomOwner]);

  const handleStart = () => {
    socket.emit("start-btn", {
      numwords: wordsintext,
      time: roundTime,
      owner: roomOwner.username,
    });
  };

  useEffect(() => {
    socket.on("connect", () => {
      setSocketId(socket.id);
      console.log("you", socket.id);
    });

    socket.on("another-player-typing", (value) => {
      setPlayersText((prevState) => ({
        ...prevState,
        [value.id]: { username: value.username, text: value.text },
      }));
    });

    socket.on("reset-scores", (data) => {
      setPlayersText({});
      setMainText(data.text);
    });

    socket.on("test-finished-score", (data) => {
      setPlayers(data.users);
      console.log("here",data.users);
    });
    socket.on("reset-scores", (data) => {
      setPlayers(data.users);
    });
    socket.on("user-joined", (roomDetails) => {
      setPlayers(roomDetails.users);
      setMainText(roomDetails.text);
      setRoomOwner(roomDetails.users[0]);
    });

    socket.on("new-notification", (newnotification) => {
      setnotifications((noti) => [...noti, newnotification]);
      setTimeout(() => {
        setnotifications((prevItems) =>
          prevItems.filter((i) => i !== newnotification)
        );
      }, 4000);
    });

    socket.on("user-left", (roomDetails) => {
      setPlayers(roomDetails.users);
      setRoomOwner(roomDetails.users[0]);
    });

    socket.on("user-dis", (roomDetails) => {
      setPlayers(roomDetails.users);
      setRoomOwner(roomDetails.users[0]);
    });

    return () => {
      socket.off("another-player-typing");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("user-dis");
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
    <div className="player-container">
      {socket.id == roomOwner.userid ? (
        <>
          <button className="start-btn leave-room-btn" onClick={handleStart}>
            start
          </button>
          <div className="settings-container">
            <button className="settings-button" onClick={toggleSettings}>
              {!showSettings ? (
                <i className="fa-solid fa-gear"></i>
              ) : (
                <i className="fa-solid fa-xmark"></i>
              )}
            </button>

            <div className={`settings-panel ${showSettings ? "open" : ""}`}>
              <div className="setting-options">
                <i className="fa-solid fa-w"></i>
                <span>words</span>
                <input
                  type="number"
                  value={wordsintext}
                  onChange={(e) => setwordsintext(e.target.value)}
                  min='1'
                  max='1000'
                />
              </div>
              {/* {TO DO} */}
              {/* <div className="setting-options">
                <i className="fa-regular fa-clock"></i>
                <span>Time</span>
                <input
                  type="number"
                  value={roundTime}
                  onChange={(e) => setRoundTime(e.target.value)}
                />
              </div> */}
            </div>
          </div>
        </>
      ) : null}
      <div className="timer"></div>
      <div className="all-players">
        {players.map((player, index) => {
          const playerText =
            playersText[player.userid]?.text ||
            (player.userid === socketId ? playersText[socketId]?.text : "");
          return (
            <>
              <div key={index} className="player-bar">
                <div className="player-pic">
{/*                   <img src="../src/assets/player.png" alt="np" /> */}
                  <i className="fa-regular fa-user"></i>
                </div>
                <div className="player-details">
                  <div className="username-pts">
                    <div className="username">
                      {player.username}{" "}
                      {player.userid == roomOwner.userid ? (
                        <i
                          className="fa-solid fa-crown"
                          style={{ color: "#FFD43B" }}
                        ></i>
                      ) : null}
                    </div>
                    <div className="total-pts">{player.totalpoints} pts.</div>
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
            </>
          );
        })}
      </div>
      <div className="notification-box">
        {notifications.map((noti, index) => (
          <div className="notifications" key={index}>
            {noti}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Players;
