import { useEffect, useRef, useState } from 'react';
import {
  Hume,
  HumeClient,
  MimeType,
  convertBlobToBase64,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType,
  convertBase64ToBlob
} from 'hume';
import { queueAudio, stopAudio } from './audio';

export function useHume() {
  const [messages, setMessages] = useState<string[]>([]);
  const humeInitialized = useRef(false);

  const appendMessage = (message: string) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  useEffect(() => {
    if (humeInitialized.current) return;
    humeInitialized.current = true;

    // instantiate the Hume client and authenticate
    const client = new HumeClient({
      apiKey: import.meta.env.VITE_HUME_API_KEY,
      secretKey: import.meta.env.VITE_HUME_SECRET_KEY,
    });

    initializeClient(client, appendMessage);

  }, []);

  return messages;
}

async function initializeClient(client: HumeClient, appendMessage: (message: string) => void){
  // instantiates WebSocket and establishes an authenticated connection
  const socket = await client.empathicVoice.chat.connect({
    configId: import.meta.env.VITE_HUME_CONFIG_ID,
    onOpen: handleWebSocketOpenEvent,
    onMessage: handleWebSocketMessageEvent,
    onError: error => {
      console.error(error)
    },
    onClose: () => {
      console.log('WebSocket connection closed')
    }
  });

  // the recorder responsible for recording the audio stream to be prepared as the audio input
  let recorder: MediaRecorder | null = null
  // the stream of audio captured from the user's microphone
  let audioStream: MediaStream | null = null
  // mime type supported by the browser the application is running in
  const mimeType: MimeType = (() => {
    const result = getBrowserSupportedMimeType()
    return result.success ? result.mimeType : MimeType.WEBM
  })();


  // define function for capturing audio
  async function captureAudio(): Promise<void> {
    // prompts user for permission to capture audio, obtains media stream upon approval
    audioStream = await getAudioStream()
    // ensure there is only one audio track in the stream
    ensureSingleValidAudioTrack(audioStream)
    // instantiate the media recorder
    recorder = new MediaRecorder(audioStream, { mimeType })
    // callback for when recorded chunk is available to be processed
    recorder.ondataavailable = async ({ data }) => {
      // IF size of data is smaller than 1 byte then do nothing
      if (data.size < 1) return
      // base64 encode audio data
      const encodedAudioData = await convertBlobToBase64(data)
      // define the audio_input message JSON
      const audioInput: Omit<Hume.empathicVoice.AudioInput, 'type'> = {
        data: encodedAudioData
      }
      // send audio_input message
      socket?.sendAudioInput(audioInput)
    }
    // capture audio input at a rate of 100ms (recommended)
    const timeSlice = 100
    recorder.start(timeSlice)
  }

  // define a WebSocket open event handler to capture audio
  async function handleWebSocketOpenEvent(): Promise<void> {
    // place logic here which you would like invoked when the socket opens
    console.log('Web socket connection opened')
    await captureAudio()
    appendMessage('I am listening.\n\n')
  }

  

  // define a WebSocket message event handler to play audio output
  function handleWebSocketMessageEvent(
    message: Hume.empathicVoice.SubscribeEvent
  ): void {
    console.log(message)
    // place logic here which you would like to invoke when receiving a message through the socket
    switch (message.type) {
      // add received audio to the playback queue, and play next audio output
      case 'audio_output':
        // convert base64 encoded audio to a Blob
        const audioOutput = message.data
        const blob = convertBase64ToBlob(audioOutput, mimeType)
        // add audio Blob to audioQueue
        queueAudio(blob);
        break
      // stop audio playback, clear audio playback queue, and update audio playback state on interrupt
      case 'user_interruption':
        stopAudio()
        appendMessage(`(interrupted 😡)`)
        break
      case 'user_message':
        appendMessage(`[you] ${message.message.content}\n\n`)
        break
      case 'assistant_message':
        appendMessage(`[assistant] ${message.message.content}\n`)
        break
      case 'assistant_end':
        appendMessage(`🤖✅\n\n`)
        break
    }
  }
}