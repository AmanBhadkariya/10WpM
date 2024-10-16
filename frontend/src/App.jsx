import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TypingTest from './components/TypingTest'
import MpTypingTest from './components/MpTypingTest'
import MultiplayerSection from './components/MultiplayerSection'
import Players from './components/Players'

function App() {
  return (
    <div className='main-body'>
    <MpTypingTest/>
    {/* <Players/> */}
    <MultiplayerSection/>
    </div>
  )
}

export default App
