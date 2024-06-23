import {  useState } from 'react';
import './App.css'
import { useCharacter } from './lib/useCharacter';

function App() {
  
  const [text, setText] = useState<string>('');
  const [displayText, setDisplayText] = useState<string>('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const handleButtonClick = () => {
    setDisplayText(text);

  };
  // const messages = useHume(text);
  const [messages, setMessages] = useState<string[]>([])

  function appendMessage(message: string) {
    setMessages((prevMessages) => [...prevMessages, message])
  }

  useCharacter(displayText, () => appendMessage('connected!'), appendMessage, 'ito');

  return (
    <>
      <h1>History Chat</h1>
      <div>
      <input 
        type="text" 
        value={text} 
        onChange={handleInputChange} 
        placeholder="Input a historical figure here" 
      />
      <button onClick={handleButtonClick}>Submit</button>
      <p>You have selected: {displayText}</p>
    </div>
      <div>
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>
    </>
  )
}

export default App
