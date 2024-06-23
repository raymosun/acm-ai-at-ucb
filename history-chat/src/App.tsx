import "./App.css";
import React, { useState } from "react";
import { useCharacter } from "./lib/useCharacter";
import { MessageBubble } from "./components/MessageBubble";

function App() {
  const [text, setText] = useState<string>("");
  const [displayText, setDisplayText] = useState<string>("");

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const handleButtonClick = () => {
    setDisplayText(text);
  };

  const { messages, listening } = useCharacter(displayText, "ito");

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
        {listening ? <p>LISTENING</p> : null}
      </div>
      <div className="messages">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
      </div>
    </>
  );
}

export default App;
