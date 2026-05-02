let audio;

export const startAlarm = () => {
  if (!audio) {
    audio = new Audio("/alarm.mp3");
    audio.loop = true;
  }

  audio.play().catch((err) => {
    console.log("🔇 Autoplay blocked, waiting for user interaction");
  });
};

export const stopAlarm = () => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
};