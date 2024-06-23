import { getScriptReader } from "./getScriptReader";

type voiceType = 'ito' | 'kora' | 'dacher';

export async function readScript(script: string[], setting: string, voiceA: voiceType, voiceB: voiceType) {
  const [readA, closeA] = await getScriptReader(voiceA, setting);
  const [readB, closeB] = await getScriptReader(voiceB, setting);
  
  for (const [index, line] of script.entries()) {
    if (index % 2 === 0) {
      await readA(line, script[index]);
    } else {
      await readB(line, script[index]);
    }
  }

  closeA();
  closeB();
}