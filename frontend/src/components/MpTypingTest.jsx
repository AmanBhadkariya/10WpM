import { useState, useEffect, useLayoutEffect, useRef } from "react";
import "../css/TypingTest.css";
import socket from "../socket/socket";

const MpTypingTest = () => {
  const [mainText, setmainText] = useState(
    "The quick brown fox jumps over the lazy dog"
  );
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [totalTimeTaken, setTotalTimeTaken] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [userAccuracy, setUserAccuracy] = useState(0.0);
  const [timer, setTimer] = useState("");
  const testTextRef = useRef(null);
  const inputRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [inroom, setinroom] = useState(false);
  const [roundEndsAt, setRoundEndsAt] = useState(null);
  const [roundEndReason, setRoundEndReason] = useState("");
  const [roundActive, setRoundActive] = useState(false);
  const [soloWords, setSoloWords] = useState(25);
  const [soloDuration, setSoloDuration] = useState(60);
  const [soloMode, setSoloMode] = useState("words");
  const [soloDifficulty, setSoloDifficulty] = useState("medium");
  const [roomMode, setRoomMode] = useState("race");
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0, height: 28, visible: false });
  const clockRef = useRef(null);
  const countdownRef = useRef(null);
  const roundWatchdogRef = useRef(null);
  const practiceWatchdogRef = useRef(null);
  const liveStateRef = useRef({});
  liveStateRef.current = { input, mainText, startTime, isTestFinished };

  function randomText(wordCount, difficulty = "medium") {
    const pools = {
      easy: "cat sun run tree blue soft happy jump moon game play fast cool warm bird book road star smile light".split(" "),
      medium: "swift quiet pixel rhythm bright focus glide keyboard motion spark cloud drift rapid steady clever dream signal flow orbit dash purple neon create race friend smooth quick energy level victory".split(" "),
      hard: "juxtapose labyrinthine zephyr mnemonic kaleidoscope quintessential synchronization extraordinary bureaucracy phosphorescent idiosyncratic metamorphosis cryptocurrency architecture miscellaneous questionnaire perseverance".split(" "),
      impossible: "pneumonoultramicroscopicsilicovolcanoconiosis electroencephalographically psychoneuroendocrinological spectrophotofluorometrically counterimmunoelectrophoresis thyroparathyroidectomized honorificabilitudinitatibus incomprehensibilities".split(" "),
    };
    const words = pools[difficulty] || pools.medium;
    return Array.from({ length: Math.max(Number(wordCount) || 25, 1) }, () =>
      words[Math.floor(Math.random() * words.length)]
    ).join(" ");
  }

  useEffect(() => {
    const syncRoomMode = (data) => data?.mode && setRoomMode(data.mode);
    socket.on("room-details", syncRoomMode);
    socket.on("welcome", (text) => {
      setmainText(text);
    });

    socket.on("start-timer", (t) => {
      setTimer(t);
      if (t === "GO!") {
        setIsTestStarted(true);
        setIsTestFinished(false);
        setStartTime(Date.now());
        setInput("");
        clearInterval(clockRef.current);
        clockRef.current = setInterval(() => {
          setCurrentTime(Date.now());
        }, 1000);
        clearTimeout(countdownRef.current);
        countdownRef.current = setTimeout(() => {
          setTimer("");
          inputRef.current?.focus();
        }, 450);
      }
    });

    socket.on("reset-scores", (data) => {
      syncRoomMode(data);
      setmainText(data.text);
      setInput("");
      setIsTestFinished(false);
      setIsTestStarted(false);
      setRoundActive(false);
      setRoundEndsAt(null);
      setRoundEndReason("");
    });

    const handleRoundEnd = ({ reason }) => {
      clearTimeout(roundWatchdogRef.current);
      clearTimeout(practiceWatchdogRef.current);
      setTimer("");
      setRoundEndsAt(null);
      setRoundEndReason(reason);
      setRoundActive(false);
      setIsTestStarted(false);
      clearInterval(clockRef.current);
      const state = liveStateRef.current;
      if (state.isTestFinished) return;
      const elapsed = Math.max(1, (Date.now() - (state.startTime || Date.now())) / 1000);
      const correctChars = state.input.split("").filter((char, index) => char === state.mainText[index]).length;
      const accuracy = state.input.length ? correctChars / state.input.length : 0;
      const wpm = (correctChars / 5) / (elapsed / 60);
      setUserAccuracy(accuracy);
      setTimeTaken(Math.round(wpm));
      setTotalTimeTaken(Math.round(elapsed));
      setIsTestFinished(true);
    };

    const handleRoundStart = (data) => {
      const now = Date.now();
      setRoundActive(true);
      setIsTestStarted(true);
      setIsTestFinished(false);
      setStartTime(now);
      setCurrentTime(now);
      setRoundEndsAt(data.endsAt);
      clearInterval(clockRef.current);
      clockRef.current = setInterval(() => setCurrentTime(Date.now()), 250);
      clearTimeout(roundWatchdogRef.current);
      clearTimeout(practiceWatchdogRef.current);
      roundWatchdogRef.current = setTimeout(
        () => handleRoundEnd({ reason: "time" }),
        Math.max(0, data.endsAt - now) + 750
      );
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    socket.on("round-start", handleRoundStart);
    socket.on("round-ended", handleRoundEnd);

    socket.on("me-joined", (roomDetails) => {
      syncRoomMode(roomDetails);
      setIsTestStarted(false);
      setmainText(roomDetails.text);
      setinroom(true);
      setInput("");
    });

    socket.on("details-of-room-created", (roomDetails) => {
      syncRoomMode(roomDetails);
      setmainText(roomDetails.text);
      setinroom(true);
      setInput("");
    });
    socket.on("leave", () => {
      setinroom(false);
      setRoundActive(false);
    });

    return () => {
      clearInterval(clockRef.current);
      clearTimeout(countdownRef.current);
      clearTimeout(roundWatchdogRef.current);
      clearTimeout(practiceWatchdogRef.current);
      socket.off("welcome"); socket.off("start-timer"); socket.off("reset-scores");
      socket.off("me-joined"); socket.off("details-of-room-created"); socket.off("leave");
      socket.off("round-start", handleRoundStart); socket.off("round-ended", handleRoundEnd);
      socket.off("room-details", syncRoomMode);
    };
  }, []);

  useLayoutEffect(() => {
    const current = testTextRef.current?.querySelector('[data-current="true"]');
    if (!current || isTestFinished) {
      setCursorPosition((position) => ({ ...position, visible: false }));
      return;
    }
    setCursorPosition({ x: current.offsetLeft - 2, y: current.offsetTop + 4, height: Math.max(22, current.offsetHeight - 8), visible: true });
  }, [input, mainText, isTestFinished]);

  const finishTimedPractice = () => {
    const state = liveStateRef.current;
    if (state.isTestFinished) return;
    const elapsed = Math.max(1, (Date.now() - (state.startTime || Date.now())) / 1000);
    const correctChars = state.input.split("").filter((char, index) => char === state.mainText[index]).length;
    const accuracy = state.input.length ? correctChars / state.input.length : 0;
    setUserAccuracy(accuracy);
    setTimeTaken(Math.round((correctChars / 5) / (elapsed / 60)));
    setTotalTimeTaken(Math.round(elapsed));
    setRoundEndReason("time");
    setRoundEndsAt(null);
    setIsTestStarted(false);
    setIsTestFinished(true);
    clearInterval(clockRef.current);
  };

  const handleInputChange = (e) => {
    if (inroom && !roundActive) return;
    const value = e.target.value;
    setInput(value);
    socket.emit("typing", value);

    if (!isTestStarted) {
      const now = Date.now();
      setStartTime(now);
      setIsTestStarted(true);
      clearInterval(clockRef.current);
      clockRef.current = setInterval(() => setCurrentTime(Date.now()), 250);
      if (!inroom && soloMode === "time") {
        const endsAt = now + Number(soloDuration) * 1000;
        setRoundEndsAt(endsAt);
        clearTimeout(practiceWatchdogRef.current);
        practiceWatchdogRef.current = setTimeout(finishTimedPractice, Number(soloDuration) * 1000);
      }
    }

    if (testTextRef.current) {
      const progress = value.length / mainText.length;
      const maxScroll =
        testTextRef.current.scrollHeight - testTextRef.current.clientHeight;
      testTextRef.current.scrollTo({
        top: progress * maxScroll * 0.9,
        behavior: "smooth",
      });
    }

    if (value.length === mainText.length) {
      console.log("finished");
      setTimer("");
      setIsTestFinished(true);
      setIsTestStarted(false);
      clearInterval(clockRef.current);
      clearTimeout(practiceWatchdogRef.current);

      const userText = value.trim().split(" ");
      const actualWords = mainText.split(" ");

      const minLength = Math.min(userText.length, actualWords.length);
      let correctWords = 0;

      for (let i = 0; i < minLength; i++) {
        if (userText[i] === actualWords[i]) {
          correctWords++;
        }
      }

      setUserAccuracy(correctWords / actualWords.length);

      const endTime = Date.now();
      setTotalTimeTaken((endTime - startTime) / 1000);

      const wpm =
        (mainText.split(" ").length / ((endTime - startTime) / 1000)) *
        60 *
        (correctWords / actualWords.length);
      setTimeTaken(Math.round(wpm));
      socket.emit("test-finished", {
        userid: socket.id,
        wmp: wpm,
        time: (endTime - startTime) / 1000,
        accuracy: correctWords / actualWords.length,
      });
      setStartTime(null);
    }
  };

  const handleRestart = () => {
    setInput("");
    setStartTime(null);
    setIsTestStarted(false);
    setIsTestFinished(false);
    setTimeTaken(0);
    setUserAccuracy(0);
    setTotalTimeTaken(null);
    setCurrentTime(Date.now());
    setRoundEndsAt(null);
    setRoundEndReason("");
    clearTimeout(practiceWatchdogRef.current);
    setmainText(randomText(soloMode === "time" ? 200 : Number(soloWords), soloDifficulty));
    testTextRef.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const getResultMessage = () => {
    const accuracy = userAccuracy * 100;
    if (timeTaken <= 0 || accuracy <= 0) return "A warm-up run";
    if (accuracy < 50) return "Finding the rhythm";
    if (accuracy < 80) return "Speed is building";
    if (timeTaken >= 80 && accuracy >= 95) return "Absolutely flying!";
    if (timeTaken >= 50 && accuracy >= 90) return "That was sharp!";
    return "Nice clean run!";
  };

  return (
    <div className={`test-container ${isTestStarted || timer ? "race-active" : ""}`}>
      <div className="test-topline">
        <div>
          <span className="eyebrow">Speed arena</span>
          <h1>Find your <em>flow.</em></h1>
        </div>
        <div className={`mode-pill ${inroom ? "live" : ""}`}>
          <span /> {inroom ? (roomMode === "duel" ? "1 vs 1 duel" : "Race mode") : "Solo practice"}
        </div>
      </div>
      <p className="test-subtitle">Stay smooth, trust your hands, and let the speed follow.</p>
      {!inroom && !isTestStarted && !isTestFinished && (
        <div className="solo-settings">
          <div className="solo-setting-head"><span><i className="fa-solid fa-wand-magic-sparkles" /> Practice setup</span><div className="solo-mode-toggle"><button className={soloMode === "words" ? "active" : ""} onClick={() => setSoloMode("words")}>Words</button><button className={soloMode === "time" ? "active" : ""} onClick={() => setSoloMode("time")}>Timer</button></div></div>
          <div className="solo-setting-fields">
            {soloMode === "words" ? <label><span>Word count</span><input type="number" min="5" max="300" value={soloWords} onChange={(e) => setSoloWords(e.target.value)} /></label> : <label><span>Duration</span><select value={soloDuration} onChange={(e) => setSoloDuration(e.target.value)}><option value="15">15 sec</option><option value="30">30 sec</option><option value="60">60 sec</option><option value="120">120 sec</option></select></label>}
            <label><span>Difficulty</span><select value={soloDifficulty} onChange={(e) => setSoloDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="impossible">Impossible</option></select></label>
            <button onClick={handleRestart}><i className="fa-solid fa-check" /> Apply</button>
          </div>
        </div>
      )}
      <div className="metrics-row">
        <div className="metric"><small>Time</small><strong>
        {roundEndsAt
          ? `${Math.max(0, Math.ceil((roundEndsAt - currentTime) / 1000))}s`
          : startTime
          ? currentTime - startTime > 0
            ? `${Math.floor((currentTime - startTime) / 1000)}s`
            : "0s"
          : "0s"}
        </strong></div>
        <div className="metric"><small>Progress</small><strong>{Math.min(100, Math.round((input.length / mainText.length) * 100))}%</strong></div>
        <div className="metric"><small>Mode</small><strong>{inroom ? (roomMode === "duel" ? "Duel" : "Race") : soloMode === "time" ? "Timed" : "Words"}</strong></div>
      </div>
      {roundEndsAt && (roundActive || (!inroom && isTestStarted)) && (
        <div className="round-clock"><i className="fa-regular fa-clock" /> {Math.max(0, Math.ceil((roundEndsAt - currentTime) / 1000))}<small> seconds left</small></div>
      )}
      {timer && <div className={`countdown ${timer === "GO!" ? "go" : ""}`}>{timer}</div>}
      <div className="test-text" ref={testTextRef}>
        <span className={`glide-caret ${cursorPosition.visible ? "visible" : ""}`} style={{ transform: `translate3d(${cursorPosition.x}px, ${cursorPosition.y}px, 0)`, height: `${cursorPosition.height}px` }} aria-hidden="true" />
        {mainText.split("").map((char, index) => {
          const isCurrentChar = index === input.length;
          const isTypedChar =
            index < input.length ? input[index] === char : false;
          return (
            <span
              key={index}
              data-current={isCurrentChar ? "true" : "false"}
              className={`${index < input.length ? (isTypedChar ? "char-correct" : "char-wrong") : ""} ${isCurrentChar ? "char-current" : ""}`}
            >
              {(input[index] !== " " ? input[index] : char) || char}
            </span>
          );
        })}
      </div>
      <div className="input-wrap"><i className="fa-solid fa-i-cursor" />
      <textarea
        ref={inputRef}
        className="text-area"
        disabled={inroom ? !roundActive : isTestFinished}
        value={input}
        onChange={handleInputChange}
        rows="4"
        cols="50"
        onPaste={(e) => {
          e.preventDefault();
        }}
        onCopy={(e) => {
          e.preventDefault();
        }}
        placeholder={inroom && !isTestStarted ? "Waiting for the host to start the race…" : "Start typing here…"}
        aria-label="Typing input"
      /></div>
      {!inroom ? (
        <button className="retry-btn" onClick={handleRestart}>
          <i className="fa-solid fa-rotate-right"></i><span>New text</span>
        </button>
      ) : null}
      <div className={`test-result ${isTestFinished ? "show" : ""}`}>
        {isTestFinished && (
          <div>
            <span className="result-icon"><i className="fa-solid fa-bolt" /></span>
            <h2>{roundEndReason === "time" && input.length < mainText.length ? "Time is up!" : getResultMessage()}</h2>
            <div className="result-stats"><strong>{Math.round(timeTaken)}<small> WPM</small></strong><strong>{Math.round(userAccuracy * 100)}<small>% ACC</small></strong><strong>{Math.round(totalTimeTaken)}<small>s TIME</small></strong></div>
            {!inroom ? (
              <button className="result-restart" onClick={handleRestart}>
                <i className="fa-solid fa-rotate-right" /> Try another text
              </button>
            ) : (
              <p className="next-round-note">Waiting for the host to start the next round</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MpTypingTest;
