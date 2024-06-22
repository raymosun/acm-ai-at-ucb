// https://dev.hume.ai/docs/empathic-voice-interface-evi/quickstart/typescript

import { Hume, HumeClient, MimeType } from 'hume'

declare const HUME_API_KEY: string
declare const HUME_SECRET_KEY: string

// instantiate the Hume client and authenticate
const client = new HumeClient({
  apiKey: HUME_API_KEY,
  secretKey: HUME_SECRET_KEY
})

// instantiates WebSocket and establishes an authenticated connection
const socket = await client.empathicVoice.chat.connect({
  onOpen: handleWebSocketOpenEvent,
  onMessage: handleWebSocketMessageEvent,
  onError: error => {
    console.error(error)
  },
  onClose: () => {
    console.log('WebSocket connection closed')
  }
})

import {
  convertBlobToBase64,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType
} from 'hume'

// the recorder responsible for recording the audio stream to be prepared as the audio input
let recorder: MediaRecorder | null = null
// the stream of audio captured from the user's microphone
let audioStream: MediaStream | null = null
// mime type supported by the browser the application is running in
const mimeType: MimeType = (() => {
  const result = getBrowserSupportedMimeType()
  return result.success ? result.mimeType : MimeType.WEBM
})()

// define function for capturing audio
async function captureAudio (): Promise<void> {
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
async function handleWebSocketOpenEvent (): Promise<void> {
  // place logic here which you would like invoked when the socket opens
  console.log('Web socket connection opened')
  await captureAudio()
}

import { convertBase64ToBlob } from 'hume'

// audio playback queue
const audioQueue: Blob[] = []
// flag which denotes whether audio is currently playing or not
let isPlaying = false
// the current audio element to be played
let currentAudio: HTMLAudioElement | null = null

// play the audio within the playback queue, converting each Blob into playable HTMLAudioElements
function playAudio (): void {
  // IF there is nothing in the audioQueue OR audio is currently playing then do nothing
  if (!audioQueue.length || isPlaying) return
  // update isPlaying state
  isPlaying = true
  // pull next audio output from the queue
  const audioBlob = audioQueue.shift()
  // IF audioBlob is unexpectedly undefined then do nothing
  if (!audioBlob) return
  // converts Blob to AudioElement for playback
  const audioUrl = URL.createObjectURL(audioBlob)
  currentAudio = new Audio(audioUrl)
  // play audio
  currentAudio.play()
  // callback for when audio finishes playing
  currentAudio.onended = () => {
    // update isPlaying state
    isPlaying = false
    // attempt to pull next audio output from queue
    if (audioQueue.length) playAudio()
  }
}

// define a WebSocket message event handler to play audio output
function handleWebSocketMessageEvent (
  message: Hume.empathicVoice.SubscribeEvent
): void {
  // place logic here which you would like to invoke when receiving a message through the socket
  switch (message.type) {
    // add received audio to the playback queue, and play next audio output
    case 'audio_output':
      // convert base64 encoded audio to a Blob
      const audioOutput = message.data
      const blob = convertBase64ToBlob(audioOutput, mimeType)
      // add audio Blob to audioQueue
      audioQueue.push(blob)
      // play the next audio output
      if (audioQueue.length === 1) playAudio()
      break
    // stop audio playback, clear audio playback queue, and update audio playback state on interrupt
    case 'user_interruption':
      stopAudio()
      break
    default:
      console.log(message)
  }
}

// function for stopping the audio and clearing the queue
function stopAudio (): void {
  // stop the audio playback
  currentAudio?.pause()
  currentAudio = null
  // update audio playback state
  isPlaying = false
  // clear the audioQueue
  audioQueue.length = 0
}
