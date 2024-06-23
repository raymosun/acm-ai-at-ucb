import {
  Hume,
  MimeType,
  convertBase64ToBlob,
  getBrowserSupportedMimeType,
} from "hume";
import humeClient from "./hume";
import { LINE_READING_SYSTEM_INSTRUCTION } from "./prompts";
import { queueAudio } from "./audio";

const mimeType: MimeType = (() => {
  const result = getBrowserSupportedMimeType();
  return result.success ? result.mimeType : MimeType.WEBM;
})();

const voiceConfigIds = {
  ito: import.meta.env.VITE_HUME_ITO_ID,
  kora: import.meta.env.VITE_HUME_KORA_ID,
  dacher: import.meta.env.VITE_HUME_DACHER_ID,
};

type ScriptReaderOutType = [
  (line: string, prevLine: string) => Promise<void>,
  () => void
];

// get a hume model that can read any lines fed to it
export const getScriptReader = async (
  context: AudioContext | undefined,
  voice: keyof typeof voiceConfigIds = "ito",
  setting: string
): Promise<ScriptReaderOutType> => {
  // called when ai finishes reading line
  let finishCallback = () => {};

  const socket = await humeClient.empathicVoice.chat.connect({
    configId: voiceConfigIds[voice],
    onOpen: () => {
      console.log(`script reader ${voice} connected`);
    },
    onMessage: (message: Hume.empathicVoice.SubscribeEvent) => {
      if (message.type === "assistant_end") {
        finishCallback();
      }
      if (message.type === "audio_output") {
        const audioOutput = message.data;
        const blob = convertBase64ToBlob(audioOutput, mimeType);
        // add audio Blob to audioQueue
        queueAudio(context, blob);
      }
    },
    onError: (error) => {
      console.error(error);
    },
  });

  await socket.sendSessionSettings({
    systemPrompt:
      `The setting is ${setting}.` + LINE_READING_SYSTEM_INSTRUCTION,
  });

  const readLine = (line: string, prevLine: string) =>
    new Promise<void>((resolve) => {
      finishCallback = () => {
        resolve();
      };
      socket.sendTextInput(`"${prevLine}"\nYOUR LINE: "${line}"`);
    });

  const close = () => {
    console.log(`closing ${voice} reader socket`);
    socket.close();
  };

  return [readLine, close];
};
