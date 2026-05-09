let audio;
let isUnlocked = false;

// Initialize audio early to bypass autoplay restrictions on some browsers
if (typeof window !== 'undefined') {
  audio = new Audio("/alarm.mp3");
  audio.loop = true;
}

// Function to unlock audio context on first user interaction
export const initAudio = async () => {
  if (!audio) return false;
  if (isUnlocked) return true;
  
  try {
    // Mute the volume for silent unlocking
    const originalVolume = audio.volume;
    audio.volume = 0;
    
    // Play and immediately pause to unlock the audio context
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    
    // Restore the volume for when the alarm actually rings
    audio.volume = originalVolume;
    
    isUnlocked = true;
    console.log("🔊 Audio unlocked successfully");
    return true;
  } catch (err) {
    console.log("🔇 Audio unlock failed:", err);
    throw err;
  }
};

export const startAlarm = async () => {
  if (!audio) return;

  try {
    await audio.play();
    console.log("🚨 Alarm playing");
  } catch (err) {
    console.log("🔇 Autoplay blocked, waiting for user interaction.");

    const unlockOnClick = async () => {
      try {
        await audio.play();
        console.log("🚨 Alarm unlocked and playing");
      } catch (e) {
        console.log("Still blocked:", e);
      }

      document.removeEventListener('click', unlockOnClick);
      document.removeEventListener('touchstart', unlockOnClick);
    };

    document.addEventListener('click', unlockOnClick);
    document.addEventListener('touchstart', unlockOnClick); // mobile support
  }
};

export const stopAlarm = () => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
};
