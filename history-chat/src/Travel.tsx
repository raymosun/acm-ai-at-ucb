import React, { useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";
import { getDialogue, getSetting } from "./lib/gemini";
import { readScript } from "./lib/readScript";
import { useCharacter } from "./lib/useCharacter";

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

function getCharacterPrompt(setting: string, {name, description, relationship}: Person, dialogue: string[]) {
  return `The setting is ${setting}. You are ${name}, ${description}. You just had the following conversation with someone where you are related by ${relationship}. ${JSON.stringify(dialogue)}`;
}

function Travel() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [dialogue, setDialogue] = useState<string[]>([]);
  const generated = useRef(false);

  const [searchParams] = useSearchParams();
  const prompt = searchParams.get("prompt");

  const [currentChatter, setCurrentChatter] = useState<'A' | 'B' | null>(null);

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
    getDialogue(JSON.stringify(setting)).then(out => {
      console.log('dialog output', out)
      if (out) {
        const parsedDialog = JSON.parse(out);
        setDialogue(old => {
          if (old.length > 0) return old;
          return parsedDialog;
        });
      }
    });
  }, [setting]);

  useEffect(() => {
    if (dialogue.length === 0) return;
    const voiceA = setting?.personA.voice === 'masculine' ? 'ito' : 'kora';
    const voiceB = setting?.personB.voice === 'masculine' ? 'dacher' : 'kora';
    readScript(dialogue, setting?.setting ?? '', voiceA, voiceB)
  }, [dialogue]);

  const characterPromptA = (setting && dialogue.length) ? getCharacterPrompt(setting.setting, setting.personA, dialogue) : "";
  const characterPromptB = (setting && dialogue.length) ? getCharacterPrompt(setting.setting, setting.personB, dialogue) : "";

  const { messages: messagesA } = useCharacter(characterPromptA, setting?.personA.voice === 'masculine' ? 'ito' : 'kora', currentChatter === 'A');
  const { messages: messagesB } = useCharacter(characterPromptB, setting?.personB.voice === 'masculine' ? 'dacher' : 'kora', currentChatter === 'B');

  return <>
  <h1>History Chat</h1>
  <button onClick={async () => {
    generateSetting();
  }}>Time Travel!</button>
  <h4>{prompt}</h4>
  <h4>{setting?.setting}</h4>
  <div style={{display: 'flex'}}>
    <div>
      {JSON.stringify(setting?.personA ?? {})}
    </div>
    <div>
      {JSON.stringify(setting?.personB ?? {})}
    </div>
  </div>
  {dialogue.map((line, index) => (
    <p key={index}>
      {index % 2 === 0 ? <b>{setting?.personA.name}</b> : <b>{setting?.personB.name}</b>}:&nbsp;
      {line}
    </p>)
  )}
  <div style={{display: 'flex', justifyContent: 'space-between'}}>
<button onClick={() => { setCurrentChatter('A') }}>
  Speak with {setting?.personA.name}
</button>
<button onClick={() => { setCurrentChatter(null) }}>
  Mute
</button>
<button onClick={() => { setCurrentChatter('B') }}>
  Speak with {setting?.personB.name}
</button>
</div>
<div style={{display: 'flex'}}>
  <div>
    {messagesA?.map((message, index) => (
      <div key={index}>
        [{message.role}]{" "}
        {message.role === "user"
          ? message.content
          : message.content.map((line) => <p>{line}</p>)}{" "}
        {message.role === "assistant" && message.interrupted
          ? "(interrupted 😡)"
          : null}{" "}
        {message.role === "assistant" && message.done ? (
          <img src={message.content.join(" ")} alt="assistant" />
        ) : null}
      </div>
    ))}
  </div>
  <div>
    {messagesB?.map((message, index) => (
      <div key={index}>
        [{message.role}]{" "}
        {message.role === "user"
          ? message.content
          : message.content.map((line) => <p>{line}</p>)}{" "}
        {message.role === "assistant" && message.interrupted
          ? "(interrupted 😡)"
          : null}{" "}
        {message.role === "assistant" && message.done ? (
          <img src={message.content.join(" ")} alt="assistant" />
        ) : null}
      </div>
    ))}
  </div>
</div>
  </>
  
}

export default Travel;
