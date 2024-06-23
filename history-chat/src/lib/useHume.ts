import { useEffect, useRef, useState } from "react";
import {
  Hume,
  HumeClient,
  MimeType,
  convertBlobToBase64,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType,
  convertBase64ToBlob,
} from "hume";
import { queueAudio, stopAudio } from "./audio";

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

export function useHume(figure: string): {
  messages: Message[];
  listening: boolean;
} {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<Hume.empathicVoice.SubscribeEvent[]>(
    []
  );
  const humeInitialized = useRef<HumeClient | null>(null);

  const appendMessage = (message: Hume.empathicVoice.SubscribeEvent) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  useEffect(() => {
    if (humeInitialized.current) return;

    // instantiate the Hume client and authenticate
    const client = new HumeClient({
      apiKey: import.meta.env.VITE_HUME_API_KEY,
      secretKey: import.meta.env.VITE_HUME_SECRET_KEY,
    });
    humeInitialized.current = client;
  }, []);

  useEffect(() => {
    if (!humeInitialized.current) return;

    const socket = initializeClient(
      humeInitialized.current,
      appendMessage,
      () => setListening(true),
      figure
    );

    return () => {
      socket.then((socket) => socket.close());
      setListening(false);
    };
  }, [figure]);

  return { messages: simplifyMessages(messages), listening };
}

async function initializeClient(
  client: HumeClient,
  appendMessage: (message: Hume.empathicVoice.SubscribeEvent) => void,
  onListening: () => void,
  figure: string
) {
  const number = Date.now();
  console.log("figure", figure);
  const config = await client.empathicVoice.configs.createConfig({
    name: `autogenerated config ${number} ${figure}`,
    prompt: await client.empathicVoice.prompts.createPrompt({
      name: `autogenerated prompt ${number} ${figure}`,
      text: `Answer questions as ${figure}, and do not in any circumstances deviate from the character that they have chosen. Be accurate in terms of what the character might possibly know about, and when something does not make sense, say that you are confused. Sprinkle historical facts whenever you have the opportunity to.`,
    }),
  });

  // instantiates WebSocket and establishes an authenticated connection
  const socket = await client.empathicVoice.chat.connect({
    configId: config.id,
    onOpen: handleWebSocketOpenEvent,
    onMessage: handleWebSocketMessageEvent,
    onError: (error) => {
      console.error(error);
    },
    onClose: () => {
      console.log("WebSocket connection closed");
    },
  });

  // the recorder responsible for recording the audio stream to be prepared as the audio input
  let recorder: MediaRecorder | null = null;
  // the stream of audio captured from the user's microphone
  let audioStream: MediaStream | null = null;
  // mime type supported by the browser the application is running in
  const mimeType: MimeType = (() => {
    const result = getBrowserSupportedMimeType();
    return result.success ? result.mimeType : MimeType.WEBM;
  })();

  // define function for capturing audio
  async function captureAudio(): Promise<void> {
    // prompts user for permission to capture audio, obtains media stream upon approval
    audioStream = await getAudioStream();
    // ensure there is only one audio track in the stream
    ensureSingleValidAudioTrack(audioStream);
    // instantiate the media recorder
    recorder = new MediaRecorder(audioStream, { mimeType });
    // callback for when recorded chunk is available to be processed
    recorder.ondataavailable = async ({ data }) => {
      // IF size of data is smaller than 1 byte then do nothing
      if (data.size < 1) return;
      // base64 encode audio data
      const encodedAudioData = await convertBlobToBase64(data);
      // define the audio_input message JSON
      const audioInput: Omit<Hume.empathicVoice.AudioInput, "type"> = {
        data: encodedAudioData,
      };
      // send audio_input message
      socket?.sendAudioInput(audioInput);
    };
    // capture audio input at a rate of 100ms (recommended)
    const timeSlice = 100;
    recorder.start(timeSlice);
  }

  // define a WebSocket open event handler to capture audio
  async function handleWebSocketOpenEvent(): Promise<void> {
    // place logic here which you would like invoked when the socket opens
    console.log("Web socket connection opened");
    await captureAudio();
    onListening();
    // appendMessage('I am listening.\n\n')
  }

  // define a WebSocket message event handler to play audio output
  function handleWebSocketMessageEvent(
    message: Hume.empathicVoice.SubscribeEvent
  ): void {
    console.log(message);
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
        appendMessage(message);
        break;
      case "user_message":
      case "assistant_message":
      case "assistant_end":
        appendMessage(message);
        break;
    }
  }
  return socket;
}
