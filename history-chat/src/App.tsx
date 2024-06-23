import "./App.css";
import React, { useEffect, useState } from "react";
import { useCharacter } from "./lib/useCharacter";
import { MessageBubble } from "./components/MessageBubble";
import { useNavigate } from "react-router-dom";
import ClimateImage from "./assets/climate-change.jpeg";
import HistoryImage from "./assets/history.jpeg";

function App() {
  const [text, setText] = useState<string>("");
  const [displayText, setDisplayText] = useState<string>("");
  const [mode, setMode] = useState<"history" | "climate">("climate");
  const navigate = useNavigate();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const handleButtonClick = () => {
    navigate(`/travel?prompt=${text}`);
    // setDisplayText(text);
  };

  const { messages, listening } = useCharacter(
    mode === "history"
      ? `Answer questions as ${displayText}, and do not in any circumstances deviate from the character that they have chosen. Be accurate in terms of what the character might possibly know about, and when something does not make sense, say that you are confused. Sprinkle historical facts whenever you have the opportunity to.`
      : `Answer questions as the climate change researcher ${
          displayText || "(choose one)"
        }, and do not in any circumstances deviate from the character that they have chosen. Be accurate in terms of what the character might possibly know about, and when something does not make sense, say that you are confused. When possible, mention facts about the character and climate change, and discuss the work and impact they have done.`,
    "ito",
    true,
  );

  useEffect(() => {
    document.documentElement.scrollTop = document.documentElement.scrollHeight;
  }, [messages.length]);

  return (
    <>
      <div className="mode-select">
        <button
          className={`set-mode ${mode === "climate" ? "selected" : ""}`}
          onClick={() => setMode("climate")}
        >
          <img src={ClimateImage} alt="Climate change" />
        </button>
        <button
          className={`set-mode ${mode === "history" ? "selected" : ""}`}
          onClick={() => setMode("history")}
        >
          <img src={HistoryImage} alt="History" />
        </button>
      </div>
      <h1>
        {mode === "history" ? "History Chat" : "Meet a Climate Researcher"}
      </h1>
      {mode === "history" ? (
        <>
          <h4>
            <b>When</b> would you like to explore?
          </h4>
          <div>
            <input
              type="text"
              value={text}
              onChange={handleInputChange}
              placeholder="Input a place a time, or a historical event."
              style={{ width: "20rem" }}
            />
            <button onClick={handleButtonClick}>Submit</button>
            <p>You have selected: {displayText}</p>
          </div>
        </>
      ) : (
        <>
          <h4>
            <b>Who</b> would you like to meet?
          </h4>
          <div>
            <input
              type="text"
              value={text}
              onChange={handleInputChange}
              placeholder="Input the name of a climate change researcher."
              style={{ width: "20rem" }}
            />
            <button onClick={() => setDisplayText(text)}>Submit</button>
            <p>You have selected: {displayText}</p>
          </div>
        </>
      )}
      {listening ? <p>LISTENING</p> : null}
      <div className="messages">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
      </div>
    </>
  );
}

export default App;
