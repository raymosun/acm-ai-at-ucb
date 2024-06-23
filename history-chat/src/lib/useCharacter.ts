import { StreamSocket } from "hume/api/resources/empathicVoice";
import humeClient from "./hume";
import { useEffect, useRef, useState } from "react";
import {
  Hume,
  MimeType,
  convertBase64ToBlob,
  convertBlobToBase64,
  getBrowserSupportedMimeType,
} from "hume";
import { queueAudio, stopAudio } from "./audio";
import { initializeRecorder } from "./recorder";

const mimeType: MimeType = (() => {
  const result = getBrowserSupportedMimeType();
  return result.success ? result.mimeType : MimeType.WEBM;
})();

const voiceConfigIds = {
  ito: import.meta.env.VITE_HUME_ITO_ID,
  kora: import.meta.env.VITE_HUME_KORA_ID,
  dacher: import.meta.env.VITE_HUME_DACHER_ID,
};

export function useCharacter(
  description: string,
  onOpen: () => void,
  appendMessage: (message: string) => void,
  voice: keyof typeof voiceConfigIds = "ito"
) {
  const [socket, setSocket] = useState<StreamSocket | null>(null);
  const initializedCharacter = useRef("");

  function handleWebSocketMessageEvent(
    message: Hume.empathicVoice.SubscribeEvent
  ): void {
    console.log("got message", message);
    // place logic here which you would like to invoke when receiving a message through the socket
    switch (message.type) {
      // add received audio to the playback queue, and play next audio output
      case "audio_output":
        // convert base64 encoded audio to a Blob
        const audioOutput = message.data;
        const blob = convertBase64ToBlob(audioOutput, mimeType);
        // add audio Blob to audioQueue
        queueAudio(blob);
        break;
      // stop audio playback, clear audio playback queue, and update audio playback state on interrupt
      case "user_interruption":
        stopAudio();
        appendMessage(`(interrupted 😡)`);
        break;
      case "user_message":
        appendMessage(`[you] ${message.message.content}\n\n`);
        break;
      case "assistant_message":
        appendMessage(`[assistant] ${message.message.content}\n`);
        break;
      case "assistant_end":
        appendMessage(`🤖✅\n\n`);
        break;
    }
  }

  async function initalizeSocket() {
    // connect new socket
    const newSocket = await humeClient.empathicVoice.chat.connect({
      configId: voiceConfigIds[voice],
      onOpen,
      onMessage: handleWebSocketMessageEvent,
      onError: (error) => {
        console.error(error);
      },
      onClose: () => {
        console.log("WebSocket connection closed");
      },
    });

    // set up system prompt
    await newSocket.sendSessionSettings({
      systemPrompt: `Answer questions as ${description}, and do not in any circumstances deviate from the character that they have chosen. Be accurate in terms of what the character might possibly know about, and when something does not make sense, say that you are confused. Sprinkle historical facts whenever you have the opportunity to.`,
    });

    setSocket(newSocket);
  }

  useEffect(() => {
    // prevent duplicate socket connections
    if (initializedCharacter.current === description) return;
    initializedCharacter.current = description;

    // close old socket when changing characters
    if (socket) socket.close();

    initalizeSocket();
  }, [description]);

  useEffect(() => {
    async function sendAudio(audio: Blob) {
      if (!socket) return;
      // console.log('1111sending audio', audio)
      const encodedAudioData = await convertBlobToBase64(audio);
      const audioInput: Omit<Hume.empathicVoice.AudioInput, "type"> = {
        data: encodedAudioData,
      };
      socket.sendAudioInput(audioInput);
    }
    initializeRecorder(sendAudio);
  }, [socket]);
}
