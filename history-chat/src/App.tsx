import {  useState } from 'react';
import './App.css'
import { useCharacter } from './lib/useCharacter';

function App() {
  // const messages = useHume();
  const [messages, setMessages] = useState<string[]>([])

  function appendMessage(message: string) {
    setMessages((prevMessages) => [...prevMessages, message])
  }

  const description = 'John, who just escaped the 1906 san francisco earthquake';

  useCharacter(description, () => appendMessage('connected!'), appendMessage, 'ito');

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
