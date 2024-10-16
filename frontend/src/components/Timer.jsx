import React, { useEffect, useState } from 'react';

const Timer = ({ initialSeconds }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prevSeconds) => prevSeconds > 0 ? prevSeconds - 1 : 0);
    }, 1000);

    return () => clearInterval(timer); // Clean up the interval on component unmount
  }, []);

  // Convert seconds to mm:ss format
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return (
    <div>
      <h1>{formatTime(seconds)}</h1>
    </div>
  );
};

export default Timer;
