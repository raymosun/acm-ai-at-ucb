import './App.css'
import { useHume } from './lib/useHume';

function App() {
  const messages = useHume();

  return (
    <>
      <h1>History Chat</h1>
      <div>
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>
    </>
  )
}

export default App
