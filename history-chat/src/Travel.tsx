import React, { useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";
import { getDialogue, getSetting } from "./lib/gemini";
import { readScript } from "./lib/readScript";
import { useCharacter } from "./lib/useCharacter";
import { MessageBubble } from "./components/MessageBubble";

interface Person {
  name: string;
  description: string;
  relationship: string;
  voice: "masculine" | "feminine";
}

interface Setting {
  setting: string;
  personA: Person;
  personB: Person;
}

function getCharacterPrompt(
  setting: string,
  { name, description, relationship }: Person,
  dialogue: string[]
) {
  return `You are roleplaying a historical figure. Answer questions in character, and do not in any circumstances deviate from the character that they have chosen. Be accurate in terms of what the character might possibly know about, and when something does not make sense, say that you are confused. Sprinkle historical facts whenever you have the opportunity to.\n\nThe setting is ${setting}. You are ${name}, ${description}. You just had the following conversation with someone where you are related by ${relationship}. ${JSON.stringify(
    dialogue
  )}`;
}

function Travel() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [dialogue, setDialogue] = useState<string[]>([]);
  const generated = useRef(false);

  const [searchParams] = useSearchParams();
  const prompt = searchParams.get("prompt");

  const [currentChatter, setCurrentChatter] = useState<"A" | "B" | null>(null);

  const generateSetting = () => {
    // prevent duplicate generation
    if (generated.current) return;
    generated.current = true;

    getSetting(prompt ?? "").then((out) => {
      console.log(out);
      if (!out) return setSetting(null);
      setSetting(JSON.parse(out));
    });
  };

  useEffect(() => {
    if (dialogue.length > 0 || !setting) return;
    getDialogue(JSON.stringify(setting)).then((out) => {
      console.log("dialog output", out);
      if (out) {
        const parsedDialog = JSON.parse(out);
        setDialogue((old) => {
          if (old.length > 0) return old;
          return parsedDialog;
        });
      }
    });
  }, [setting]);

  const characterPromptA =
    setting && dialogue.length
      ? getCharacterPrompt(setting.setting, setting.personA, dialogue)
      : "";
  const characterPromptB =
    setting && dialogue.length
      ? getCharacterPrompt(setting.setting, setting.personB, dialogue)
      : "";

  const { messages: messagesA, context: bruh } = useCharacter(
    characterPromptA,
    setting?.personA.voice === "masculine" ? "ito" : "kora",
    currentChatter === "A"
  );
  const { messages: messagesB } = useCharacter(
    characterPromptB,
    setting?.personB.voice === "masculine" ? "dacher" : "kora",
    currentChatter === "B"
  );

  useEffect(() => {
    if (dialogue.length === 0) return;
    const voiceA = setting?.personA.voice === "masculine" ? "ito" : "kora";
    const voiceB = setting?.personB.voice === "masculine" ? "dacher" : "kora";
    console.log("readScript", dialogue, setting?.setting ?? "", voiceA, voiceB);
    bruh.current?.then((w) =>
      readScript(w.context, dialogue, setting?.setting ?? "", voiceA, voiceB)
    );
  }, [dialogue, bruh]);

  return (
    <>
      <h1>History Chat</h1>
      <button
        onClick={async () => {
          generateSetting();
        }}
      >
        Time Travel!
      </button>
      <h2 className="prompt">{prompt}</h2>
      <p className="setting">{setting?.setting}</p>
      <div className="people">
        <div className="person">
          <p className="persoon-name">{setting?.personA.name}</p>{" "}
          <p className="person-relationship">{setting?.personA.relationship}</p>
          <p>{setting?.personA.description}</p>
        </div>
        <div className="person person-right">
          <p className="persoon-name">{setting?.personB.name}</p>{" "}
          <p className="person-relationship">{setting?.personB.relationship}</p>
          <p>{setting?.personB.description}</p>
        </div>
      </div>
      <div className="messages">
        {dialogue.map((line, index) => (
          <MessageBubble
            message={{
              role: "travel",
              side: index % 2 === 0 ? "left" : "right",
              name:
                index % 2 === 0
                  ? setting?.personA.name ?? "Anonymous"
                  : setting?.personB.name ?? "Anonymous",
              content: line,
            }}
            key={index}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          margin: "40px 0",
        }}
      >
        <button
          onClick={() => {
            setCurrentChatter("A");
          }}
        >
          Speak with {setting?.personA.name}
        </button>
        <button
          onClick={() => {
            setCurrentChatter(null);
          }}
        >
          Mute
        </button>
        <button
          onClick={() => {
            setCurrentChatter("B");
          }}
        >
          Speak with {setting?.personB.name}
        </button>
      </div>
      <div style={{ display: "flex", gap: "40px" }}>
        <div className="messages" style={{ flex: "1 0 0" }}>
          {messagesA.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
        </div>
        <div className="messages" style={{ flex: "1 0 0" }}>
          {messagesB.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
        </div>
      </div>
    </>
  );
}

export default Travel;
