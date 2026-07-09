import { useState, useEffect, useRef } from 'react';

export function useAudioLevel(stream) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    // If there's no stream or no audio tracks, do nothing
    if (!stream || stream.getAudioTracks().length === 0) return;

    // 1. Initialize the Web Audio API
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    // 2. Create an analyzer to measure the volume
    analyzerRef.current = audioContextRef.current.createAnalyser();
    analyzerRef.current.fftSize = 256;

    // 3. Connect the media stream to the analyzer
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyzerRef.current);

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);

    // 4. Create a loop to check the volume constantly
    const checkAudioLevel = () => {
      if (!analyzerRef.current) return;
      
      analyzerRef.current.getByteFrequencyData(dataArray);

      // Calculate the average volume level of the stream
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      // If the average volume is above 15, they are speaking! 
      // (You can adjust this number if it's too sensitive or not sensitive enough)
      setIsSpeaking(average > 15);

      // Loop it
      requestRef.current = requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();

    // 5. Cleanup when the component unmounts or stream changes
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [stream]);

  return isSpeaking;
}
