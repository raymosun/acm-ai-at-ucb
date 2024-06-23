import {MimeType, ensureSingleValidAudioTrack, getAudioStream, getBrowserSupportedMimeType } from "hume";

export async function initializeRecorder(listener: (data: Blob) => void) {
  // the recorder responsible for recording the audio stream to be prepared as the audio input
  let recorder: MediaRecorder | null = null
  // the stream of audio captured from the user's microphone
  let audioStream: MediaStream | null = null
  // mime type supported by the browser the application is running in
  const mimeType: MimeType = (() => {
    const result = getBrowserSupportedMimeType()
    return result.success ? result.mimeType : MimeType.WEBM
  })();

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
    listener(data);
  }
  // capture audio input at a rate of 100ms (recommended)
  const timeSlice = 100
  recorder.start(timeSlice)
}