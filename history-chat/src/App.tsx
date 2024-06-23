import "./App.css";
import { AiImage } from "./components/AiImage";
import React, { useState } from "react";
import { useCharacter } from "./lib/useCharacter";
import { useNavigate } from "react-router-dom";

function App() {
  const [text, setText] = useState<string>("");
  const [displayText, setDisplayText] = useState<string>("");
  const navigate = useNavigate();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const handleButtonClick = () => {
    navigate(`/travel?prompt=${text}`)
    // setDisplayText(text);
  };

  const { messages, listening } = useCharacter(displayText, "ito");

  return (
    <>
      <h1>History Chat</h1>
      <h4><b>When</b> would you like to explore?</h4>
      <h6></h6>
      <div>
        <input
          type="text"
          value={text}
          onChange={handleInputChange}
          placeholder="Input a place a time, or a historical event."
          style={{width: '20rem'}}
        />
        <button onClick={handleButtonClick}>Submit</button>
        <p>You have selected: {displayText}</p>
        {listening ? <p>LISTENING</p> : null}
      </div>
      <div>
        {messages.map((message, index) => (
          <div key={index}>
            [{message.role}]{" "}
            {message.role === "user"
              ? message.content
              : message.content.map((line) => <p>{line}</p>)}{" "}
            {message.role === "assistant" && message.interrupted
              ? "(interrupted 😡)"
              : null}{" "}
            {message.role === "assistant" && message.done ? (
              <AiImage prompt={message.content.join(" ")} />
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
