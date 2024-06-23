import './App.css'
import { useHume } from './lib/useHume';
import React, { useState } from 'react';

function App() {
  
  const [text, setText] = useState<string>('');
  const [displayText, setDisplayText] = useState<string>('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const handleButtonClick = () => {
    setDisplayText(text);

  };
  const messages = useHume(text);

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