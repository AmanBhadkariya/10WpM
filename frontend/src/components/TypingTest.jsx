import React, { useState, useEffect } from "react";
import "../css/TypingTest.css";

const TypingTest = () => {
  const [mainText, setmainText] = useState("about about about about");
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [userAccuracy, setUserAccuracy] = useState(0.0);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (!isTestStarted) {
      setStartTime(Date.now());
      setIsTestStarted(true);
    }

    if (value.length === mainText.length) {
      setIsTestFinished(true);

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
      const totalTimeTaken = (endTime - startTime) / 1000;

      const wpm =
        (mainText.split(" ").length / totalTimeTaken) *
        60 *
        (correctWords / actualWords.length);
      setTimeTaken(Math.round(wpm));
    }
  };

  const handleRestart = () => {
    setInput("");
    setStartTime(null);
    setIsTestStarted(false);
    setIsTestFinished(false);
    setTimeTaken(0);
    setUserAccuracy(0);
  };

  const cursorPosition =
    input.length < mainText.length ? input.length : mainText.length;

  useEffect(() => {
    if (isTestFinished) {
      console.log(`Accuracy: ${userAccuracy}`);
    }
  }, [userAccuracy, isTestFinished]);

  return (
    <div className="test-container">
      <h3>main</h3>
      <div className="test-text">
        {mainText.split("").map((char, index) => {
          const isCurrentChar = index === cursorPosition;
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
              {char}
            </span>
          );
        })}
      </div>
      <textarea
        className="text-area"
        disabled={isTestFinished}
        value={input}
        onChange={handleInputChange}
        rows="4"
        cols="50"
        onPaste={(e) => {
          e.preventDefault();
          return false;
        }}
        onCopy={(e) => {
          e.preventDefault();
          return false;
        }}
      />
      <button className="retry-btn" onClick={handleRestart}>
        <img src="../src/assets/reload1.png" alt="image-not-found" />
      </button>
      <div className={`test-result ${isTestFinished ? "show" : ""}`}>
        {isTestFinished && (
          <div>
            <h2>Test Finished!</h2>
            <h2>{timeTaken} WPM</h2>
            <h3>Accuracy : {userAccuracy * 100} %</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingTest;
