import { StreamSocket } from "hume/api/resources/empathicVoice";
import humeClient from "./hume";
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Hume,
  MimeType,
  convertBase64ToBlob,
  convertBlobToBase64,
  getBrowserSupportedMimeType,
} from "hume";
import { queueAudio, stopAudio } from "./audio";
import { Recorder, initializeRecorder } from "./recorder";
export type UserMessage = {
  role: "user";
  content: string;
};
export type AssistantMessage = {
  role: "assistant";
  content: string[];
  done: boolean;
  interrupted: boolean;
};
export type Message = UserMessage | AssistantMessage;

type BetterNameLater = {
  newSocket: StreamSocket;
  sendAudioCallback: (blob: Blob) => void;
};

function simplifyMessages(
  rawMessages: Hume.empathicVoice.SubscribeEvent[]
): Message[] {
  const simplified: Message[] = [];
  let lastAssistantMessage: AssistantMessage | undefined;
  let userLastSpoke = true;
  for (const message of rawMessages) {
    switch (message.type) {
      case "user_message":
        simplified.push({
          role: "user",
          content: message.message.content ?? "[no content]",
        });
        userLastSpoke = true;
        break;
      case "assistant_message":
        if (lastAssistantMessage && !userLastSpoke) {
          lastAssistantMessage.content.push(
            message.message.content ?? "[no content]"
          );
        } else {
          lastAssistantMessage = {
            role: "assistant",
            content: [message.message.content ?? "[no content]"],
            done: false,
            interrupted: false,
          };
          simplified.push(lastAssistantMessage);
          userLastSpoke = false;
        }
        break;
      case "assistant_end":
        if (lastAssistantMessage) {
          lastAssistantMessage.done = true;
        }
        break;
      case "user_interruption":
        if (lastAssistantMessage) {
          lastAssistantMessage.interrupted = true;
        }
        break;
    }
  }
  return simplified;
}

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
  prompt: string,
  voice: keyof typeof voiceConfigIds = "ito",
  active: boolean
): {
  messages: Message[];
  listening: boolean;
  context: MutableRefObject<Promise<Recorder> | undefined>;
} {
  const [messages, setMessages] = useState<Hume.empathicVoice.SubscribeEvent[]>(
    []
  );
  const [openSocket, setOpenSocket] = useState<StreamSocket | null>(null);

  const recorderRef = useRef<Promise<Recorder>>();
  useEffect(() => {
    recorderRef.current = initializeRecorder();
  }, []);

  async function handleWebSocketMessageEvent(
    message: Hume.empathicVoice.SubscribeEvent
  ): Promise<void> {
    console.log("got message", message);
    // place logic here which you would like to invoke when receiving a message through the socket
    switch (message.type) {
      // add received audio to the playback queue, and play next audio output
      case "audio_output":
        // convert base64 encoded audio to a Blob
        const audioOutput = message.data;
        const blob = convertBase64ToBlob(audioOutput, mimeType);
        // add audio Blob to audioQueue
        queueAudio((await recorderRef.current)?.context, blob);
        break;
      // stop audio playback, clear audio playback queue, and update audio playback state on interrupt
      case "user_interruption":
        stopAudio();
        setMessages((messages) => [...messages, message]);
        break;
      case "user_message":
      case "assistant_message":
      case "assistant_end":
        setMessages((messages) => [...messages, message]);
        break;
    }
  }

  const initalizeSocket = useCallback(
    async (cancelledRef: { cancelled: boolean }): Promise<BetterNameLater> => {
      // connect new socket
      const newSocket = await humeClient.empathicVoice.chat.connect({
        configId: voiceConfigIds[voice],
        onOpen: async () => {
          if (cancelledRef.cancelled) {
            newSocket.close();
            return;
          }
          // setMessages([]);
          setOpenSocket(newSocket);
          (await recorderRef.current)?.start(sendAudioCallback);
        },
        onMessage: handleWebSocketMessageEvent,
        onError: (error) => {
          console.error(error);
        },
        onClose: async () => {
          setOpenSocket((socket) => (socket === newSocket ? null : socket));
          (await recorderRef.current)?.stop(sendAudioCallback);
        },
      });

      const sendAudioCallback = async function sendAudio(audio: Blob) {
        if (!active) return;
        const encodedAudioData = await convertBlobToBase64(audio);
        const audioInput: Omit<Hume.empathicVoice.AudioInput, "type"> = {
          data: encodedAudioData,
        };
        newSocket.sendAudioInput(audioInput);
      };

      if (!cancelledRef.cancelled) {
        // set up system prompt
        await newSocket.sendSessionSettings({
          systemPrompt: prompt,
        });
      }

      return { newSocket, sendAudioCallback };
    },
    [prompt, voice, active]
  );

  useEffect(() => {
    const bleh = { cancelled: false };
    const promise = initalizeSocket(bleh);

    return () => {
      bleh.cancelled = true;
      promise.then(async ({ newSocket, sendAudioCallback }) => {
        if (newSocket.websocket.readyState === WebSocket.OPEN) {
          newSocket.close();
        }
        setOpenSocket((socket) => (socket === newSocket ? null : socket));
        (await recorderRef.current)?.stop(sendAudioCallback);
      });
    };
  }, [initalizeSocket]);

  return {
    messages: simplifyMessages(messages),
    listening: openSocket !== null,
    context: recorderRef,
  };
}
