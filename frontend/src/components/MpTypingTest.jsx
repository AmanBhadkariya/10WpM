import React, { useState, useEffect, useRef, useContext } from "react";
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
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [inroom, setinroom] = useState(false);

  function randomText(wordCount) {
    return fetch('https://baconipsum.com/api/?type=all-meat&paras=2&format=text')
      .then(response => response.text())
      .then(data => {
        let paragraph = data; // Use the fetched paragraph data
        const words = paragraph.split(/\s+/).filter(word => word); // Split paragraph into words
        
        let sentence = [];
        
        for (let i = 0; i < Math.max(wordCount, 1); i++) {
          const randomIndex = Math.floor(Math.random() * words.length);
          sentence.push(words[randomIndex].replace(/[^a-zA-Z]/g, '')); // Clean the word of punctuation
        }
        
        return sentence.join(" "); // Return the generated sentence
      })
      .catch(error => {
        console.error('Error fetching the data:', error);
        return "Error occurred"; // Return a fallback text in case of an error
      });
  }

  useEffect(() => {
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
        setInterval(() => {
          setCurrentTime(Date.now());
        }, 1000);
      }
    });

    socket.on("reset-scores", (data) => {
      setmainText(data.text);
    });

    socket.on("me-joined", (roomDetails) => {
      setIsTestStarted(false);
      setmainText(roomDetails.text);
      setinroom(true);
      setInput("");
    });

    socket.on("details-of-room-created", (roomDetails) => {
      setmainText(roomDetails.text);
      setinroom(true);
      setInput("");
    });
    socket.on("leave", () => {
      setinroom(false);
    });

    return () => {
      socket.off("welcome");
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    socket.emit("typing", value);

    if (!isTestStarted) {
      setStartTime(Date.now());
      setIsTestStarted(true);
    }

    if (!startTime) {
      setStartTime(Date.now());
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
    randomText(10).then(text => setmainText(text));
    testTextRef.current.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="test-container">
      <div className="logo">
        <i className="fa-solid fa-keyboard"></i>10WpM
      </div>
      <h2>{timer}</h2>
      <h3>
        {startTime
          ? currentTime - startTime > 0
            ? Math.floor((currentTime - startTime) / 1000)
            : ""
          : ""}
      </h3>
      <div className="test-text" ref={testTextRef}>
        {mainText.split("").map((char, index) => {
          const isCurrentChar = index === input.length;
          const isTypedChar =
            index < input.length ? input[index] === char : false;
          return (
            <span
              key={index}
              style={{
                color: isTypedChar
                  ? "#2eb872"
                  : index < input.length
                  ? "red"
                  : "#dbd8e3",
                textDecoration: isCurrentChar ? "underline" : "none",
                fontWeight: isCurrentChar ? "bold" : "normal",
              }}
            >
              {(input[index] !== " " ? input[index] : char) || char}
            </span>
          );
        })}
      </div>
      <textarea
        className="text-area"
        disabled={(isTestFinished || inroom) && !isTestStarted}
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
      />
      {!inroom ? (
        <button className="retry-btn" onClick={handleRestart}>
          <i className="fa-solid fa-rotate-right"></i>
        </button>
      ) : null}
      <div className={`test-result ${isTestFinished ? "show" : ""}`}>
        {isTestFinished && (
          <div>
            <h2>Completed!!</h2>
            <h2>{Math.round(timeTaken)} WPM</h2>
            <h3>Accuracy : { Math.round(userAccuracy * 100)} %</h3>
            <h4>Time Taken: {Math.round(totalTimeTaken)} s</h4>
          </div>
        )}
      </div>
    </div>
  );
};

export default MpTypingTest;
