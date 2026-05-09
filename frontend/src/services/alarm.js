let audio;
let isUnlocked = false;

// Initialize audio early to bypass autoplay restrictions on some browsers
if (typeof window !== 'undefined') {
  audio = new Audio("/alarm.mp3");
  audio.loop = true;
}

// Function to unlock audio context on first user interaction
export const initAudio = () => {
  if (isUnlocked || !audio) return;
  
  // Play and immediately pause to unlock the audio context
  audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    isUnlocked = true;
    console.log("🔊 Audio unlocked successfully");
  }).catch(err => {
    console.log("🔇 Audio unlock failed:", err);
  });
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
    };

    document.addEventListener('click', unlockOnClick);
  }
};

export const stopAlarm = () => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
};
