import './App.css'
import './Enhancements.css'
import './Smooth.css'
import MpTypingTest from './components/MpTypingTest'
import MultiplayerSection from './components/MultiplayerSection'
import { useEffect, useState } from 'react'
import socket from './socket/socket'

function App() {
  const [inRoom, setInRoom] = useState(false)
  const [raceActive, setRaceActive] = useState(false)
  const floatingKeys = ['A', 'TYPE', 'S', 'WPM', 'D', 'FLOW', 'F', 'RACE', 'J', 'FAST', 'K', '⌘', 'L', '↵', 'GO!', '10WPM',
      '`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',

      'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\',

      'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'",

      'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'
  ]

  useEffect(() => {
    const start = () => setRaceActive(true)
    const end = () => setRaceActive(false)
    socket.on('round-start', start)
    socket.on('round-ended', end)
    return () => { socket.off('round-start', start); socket.off('round-ended', end) }
  }, [])

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="floating-keys" aria-hidden="true">
        {floatingKeys.map((key, index) => (
          <span key={`${key}-${index}`} style={{ '--key-index': index, '--key-left': `${(index * 17 + 4) % 96}%` }}>{key}</span>
        ))}
      </div>
      <header className="topbar">
        <a className="brand" href="#" aria-label="10WPM home">
          <span className="brand-mark"><i className="fa-solid fa-keyboard" /></span>
          <span>10<span>WPM</span></span>
        </a>
        <div className="topbar-status"><span className="status-dot" /> Servers online</div>
      </header>
      <section className={`game-layout ${inRoom ? 'room-layout' : ''} ${raceActive ? 'live-layout' : ''}`}>
        <MpTypingTest />
        <MultiplayerSection onRoomChange={setInRoom} />
      </section>
      <footer className="app-footer">Type fast. Race friends. Climb the board.</footer>
    </main>
  )
}

export default App
