import React, { useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";
import { getDialogue, getSetting } from "./lib/gemini";

interface Person {
  name: string;
  description: string;
  relationship: string;
  voice: 'masculine' | 'feminine';
}

interface Setting {
  setting: string;
  personA: Person;
  personB: Person;
}

function Travel() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [dialogue, setSetDialogue] = useState<string[]>([]);
  const generated = useRef(false);

  const [searchParams] = useSearchParams();
  const prompt = searchParams.get('prompt');

  useEffect(() => {
    // prevent duplicate generation
    if (generated.current) return;
    generated.current = true;

    getSetting(prompt ?? '').then(out => {
      console.log(out)
      if (!out) return setSetting(null);
      setSetting(JSON.parse(out))
    });
  }, []);

  useEffect(() => {
    getDialogue(JSON.stringify(setting)).then(out => {
      if (out) {
        setSetDialogue(JSON.parse(out));
      }
    });
  }, [setting])

  return <>
  <h1>History Chat</h1>
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