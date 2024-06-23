// audio playback queue
const audioQueue: Blob[] = [];
// flag which denotes whether audio is currently playing or not
let isPlaying = false;
// the current audio element to be played
let currentAudio: HTMLAudioElement | null = null;

// play the audio within the playback queue, converting each Blob into playable HTMLAudioElements
function playAudio(context?: AudioContext): void {
  // If there is nothing in the audioQueue OR audio is currently playing then do nothing
  if (!audioQueue.length || isPlaying) return;
  // update isPlaying state
  isPlaying = true;
  // pull next audio output from the queue
  const audioBlob = audioQueue.shift();
  // IF audioBlob is unexpectedly undefined then do nothing
  if (!audioBlob) return;
  // converts Blob to AudioElement for playback
  const audioUrl = URL.createObjectURL(audioBlob);
  currentAudio = new Audio(audioUrl);
  if (context) {
    const track = context.createMediaElementSource(currentAudio);
    const gainNode = context.createGain();
    gainNode.gain.value = 5;
    track.connect(gainNode);
    gainNode.connect(context.destination);
  }
  // play audio
  currentAudio.play();
  // callback for when audio finishes playing
  currentAudio.onended = () => {
    // update isPlaying state
    isPlaying = false;
    // attempt to pull next audio output from queue
    if (audioQueue.length) playAudio(context);
  };
}

export function queueAudio(
  context: AudioContext | undefined,
  audioBlob: Blob
): void {
  // add audio Blob to audioQueue
  audioQueue.push(audioBlob);
  // play the next audio output
  if (audioQueue.length === 1) setTimeout(() => playAudio(context), 500);
}

// function for stopping the audio and clearing the queue
export function stopAudio(): void {
  // stop the audio playback
  currentAudio?.pause();
  currentAudio = null;
  // update audio playback state
  isPlaying = false;
  // clear the audioQueue
  audioQueue.length = 0;
}
