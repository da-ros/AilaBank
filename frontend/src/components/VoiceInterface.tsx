'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

/**
 * VoiceInterface Component
 * Owned by Pedro - Full voice stack integration
 * 
 * Features:
 * - Audio recording via Web Audio API
 * - STT via Cloudflare Workers AI
 * - Intent submission to backend /api/v1/intent
 * - TTS playback from ElevenLabs
 * - Error handling, retries, timeouts
 * - Multilingual support
 */

interface VoiceInterfaceProps {
  userId: string;
  onIntentProcessed?: (result: any) => void;
  locale?: string;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  userId,
  onIntentProcessed,
  locale = 'en'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioResponseUrl, setAudioResponseUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RECORDING_TIME = 10000; // 10 seconds
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  /**
   * Start recording audio
   */
  const startRecording = async () => {
    try {
      setError(null);
      setTranscript('');
      setAudioResponseUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudio();
      };

      mediaRecorder.start();
      setIsListening(true);

      // Auto-stop after max time
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_TIME);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access denied or not available');
      setIsListening(false);
    }
  };

  /**
   * Stop recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  /**
   * Process audio: STT → Intent → TTS
   */
  const processAudio = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Convert audio blob to buffer
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioBuffer = await audioBlob.arrayBuffer();

      // Step 2: Send to backend /api/v1/intent (handles STT + intent parsing)
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('userId', userId);
      formData.append('locale', locale);

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/intent`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const { transcript: transcribedText, intent, explanation, audioResponseURL } = response.data;

      setTranscript(transcribedText);

      // Step 3: Play TTS response
      if (audioResponseURL) {
        setAudioResponseUrl(audioResponseURL);
        if (audioElementRef.current) {
          audioElementRef.current.src = `${API_BASE_URL}${audioResponseURL}`;
          await audioElementRef.current.play();
        }
      }

      // Step 4: Notify parent component
      if (onIntentProcessed) {
        onIntentProcessed({
          intent,
          transcript: transcribedText,
          explanation,
          actions: response.data.actions || []
        });
      }

    } catch (err: any) {
      console.error('Error processing audio:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Voice processing failed';
      setError(errorMsg);
      
      // Retry once on network errors
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        setTimeout(() => {
          processAudio();
        }, 2000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isListening]);

  return (
    <div className="voice-interface p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">🎤 Voice Assistant (Aila)</h2>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isListening ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`
            px-8 py-4 rounded-full font-bold text-white transition-all
            ${isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isListening ? '🛑 Stop Recording' : isProcessing ? '⏳ Processing...' : '🎤 Start Speaking'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
            ❌ {error}
          </div>
        )}

        {transcript && (
          <div className="mt-4 p-4 bg-white rounded border border-gray-200 w-full">
            <p className="text-sm text-gray-600 mb-2">You said:</p>
            <p className="font-semibold text-gray-800">{transcript}</p>
          </div>
        )}

        {audioResponseUrl && (
          <div className="mt-4 p-4 bg-green-50 rounded border border-green-200 w-full">
            <p className="text-sm text-green-700 mb-2">Aila responded:</p>
            <audio
              ref={audioElementRef}
              controls
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioElementRef} style={{ display: 'none' }} />
    </div>
  );
};

