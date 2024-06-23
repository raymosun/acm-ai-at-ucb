import React, { useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";
import { getDialogue, getSetting } from "./lib/gemini";
import { readScript } from "./lib/readScript";

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

function Travel() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [dialogue, setDialogue] = useState<string[]>([]);
  const generated = useRef(false);

  const [searchParams] = useSearchParams();
  const prompt = searchParams.get("prompt");

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
  }, [dialogue])

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
  </>
}

export default Travel;
