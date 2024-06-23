import "./App.css";
import { AiImage } from "./components/AiImage";
import React, { useState } from "react";
import { useCharacter } from "./lib/useCharacter";

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
