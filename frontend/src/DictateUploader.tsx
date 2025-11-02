import React, { useState, useRef } from "react";
import axios from "axios";

export default function MicRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (e) => chunks.current.push(e.data);
    mediaRecorderRef.current.onstop = handleStop;
    chunks.current = [];
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleStop = async () => {
    const blob = new Blob(chunks.current, { type: "audio/webm" });
    const file = new File([blob], "dictation.webm", { type: "audio/webm" });

    const form = new FormData();
    form.append("audio", file);

    try {
      const res = await axios.post(
        "https://arabic-dictation-app.onrender.com/dictate/upload",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      // ✅ Fix here: use res.data.url directly (it's already a full URL)
      setAudioUrl(res.data.url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to transcribe the audio.");
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? "🛑 Stop" : "🎙️ Start Recording"}
      </button>

      {audioUrl && (
        <p>
          ✅ Done!{" "}
          <a href={audioUrl} target="_blank" rel="noreferrer">
            Download Word File
          </a>
        </p>
      )}
    </div>
  );
}

