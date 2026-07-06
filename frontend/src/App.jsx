import { useState } from 'react'
import './index.css'

function App() {
  const [step, setStep] = useState(1) // 1: Name, 2: Create/Join, 3: Editor Room
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')

  const handleNameSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) setStep(2)
    }

  const handleCreateRoom = () => {
    // Generate a simple random string for the room code
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomId(newRoomId)
    setStep(3)
  }

  const handleJoinRoom = (e) => {
    e.preventDefault()
    if (joinCodeInput.trim()) {
      setRoomId(joinCodeInput.toUpperCase())
      setStep(3)
    }
  }

  return (
    <div className="app-container">
      {step === 1 && (
        <div className="card">
          <h2>Welcome to Code-Collab</h2>
          <form onSubmit={handleNameSubmit}>
            <input
              type="text"
              placeholder="Enter your name..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={!username.trim()}>Continue</button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Hello, {username}!</h2>
          <div className="actions">
            <button className="primary-btn" onClick={handleCreateRoom}>
              Create New Room
            </button>
            
            <div className="divider"><span>OR</span></div>
            
            <form onSubmit={handleJoinRoom} className="join-form">
              <input
                type="text"
                placeholder="Paste Room Code..."
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
              />
              <button type="submit" disabled={!joinCodeInput.trim()}>
                Join Room
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="room-container">
          <header className="room-header">
            <div>
              <span className="dot"></span> Connected as <strong>{username}</strong>
            </div>
            <div className="room-info">
              Room Code: <strong>{roomId}</strong>
              <button 
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="copy-btn"
              >
                Copy Code
              </button>
            </div>
          </header>
          
          <div className="editor-placeholder">
            {/* Monaco Editor and Yjs will be mounted here in the next steps */}
            <p>Editor mounting area for {roomId}...</p>
            <p className="sub-text">Ready for C++ and Python.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App