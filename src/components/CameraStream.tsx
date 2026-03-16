'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { FrameSampler } from '../utils/frameSampling';

export interface CameraStreamHandle {
  captureFrame: () => string | null;
}

interface CameraStreamProps {
  onFrameCapture?: (frameData: string) => void;
  analyser?: AnalyserNode | null;
  heartbeatIntervalMs?: number;
}

/**
 * Simple pixel-difference motion detection between two ImageData objects.
 * Returns a normalized motion level (0 = no motion, 100 = maximum).
 */
function computeMotionLevel(prev: ImageData, curr: ImageData): number {
  const len = prev.data.length;
  let diff = 0;
  // Sample every 16th pixel for performance
  for (let i = 0; i < len; i += 16) {
    const r = Math.abs(prev.data[i] - curr.data[i]);
    const g = Math.abs(prev.data[i + 1] - curr.data[i + 1]);
    const b = Math.abs(prev.data[i + 2] - curr.data[i + 2]);
    diff += (r + g + b) / 3;
  }
  const pixelCount = len / 16;
  const avgDiff = diff / pixelCount;
  // Normalize: 0-255 → 0-100
  return Math.min(100, (avgDiff / 255) * 100 * 5); // x5 amplification for sensitivity
}

/**
 * Simple energy-based VAD from an audio analyser.
 * Returns true if the average energy exceeds a threshold.
 */
function detectSpeech(analyser: AnalyserNode, threshold: number = 0.02): boolean {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);

  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    sumSquares += data[i] * data[i];
  }
  const rms = Math.sqrt(sumSquares / data.length);
  return rms > threshold;
}

const CameraStream = forwardRef<CameraStreamHandle, CameraStreamProps>(({
  onFrameCapture,
  analyser,
  heartbeatIntervalMs = 5000,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const samplerRef = useRef<FrameSampler | null>(null);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current) return null;

      const video = videoRef.current;
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (!context) return null;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8);
    },
  }));

  useEffect(() => {
    samplerRef.current = new FrameSampler({ motionThreshold: 5.0 });

    let stream: MediaStream | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    async function setupCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera API not supported in this browser');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false, // Audio is handled by the VoiceSession, not the camera stream
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // ─── Create offscreen canvas for motion detection ──────────
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }

        // ─── Sampling loop (every 200ms) ───────────────────────────
        const samplingTickMs = 200;
        const heartbeatTicks = Math.max(1, Math.ceil(heartbeatIntervalMs / samplingTickMs));
        let heartbeatCounter = 0;
        intervalId = setInterval(() => {
          if (!samplerRef.current || !onFrameCapture || !videoRef.current) return;

          const video = videoRef.current;
          if (video.videoWidth === 0 || video.videoHeight === 0) return;

          const canvas = canvasRef.current;
          if (!canvas) return;

          // Downscale for performance (max 1024px on either side)
          const MAX_DIM = 1024;
          let width = video.videoWidth;
          let height = video.videoHeight;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;

          // willReadFrequently optimization
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Compute motion level
          let motionLevel = 0;
          if (prevFrameRef.current && prevFrameRef.current.data.length === currentFrame.data.length) {
            motionLevel = computeMotionLevel(prevFrameRef.current, currentFrame);
          }
          prevFrameRef.current = currentFrame;

          // Detect speech via VAD (only if an analyser is available)
          const isSpeaking = analyserRef.current ? detectSpeech(analyserRef.current) : false;

          // Use the FrameSampler to decide if we should capture
          let triggerCapture = samplerRef.current.shouldCapture(isSpeaking, motionLevel);

          // Heartbeat sampling ensures periodic captures even in static scenes.
          heartbeatCounter++;
          if (heartbeatCounter >= heartbeatTicks) {
            triggerCapture = true;
            heartbeatCounter = 0;
          }

          if (triggerCapture) {
            const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            onFrameCapture(frameDataUrl);
            heartbeatCounter = 0; // Reset on any capture
          }
        }, samplingTickMs);
      } catch (err) {
        console.error('Error accessing camera.', err);
        setError('Unable to access camera');
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [heartbeatIntervalMs, onFrameCapture, ref]);

  // Update analyserRef when prop changes
  useEffect(() => {
    analyserRef.current = analyser ?? null;
  }, [analyser]);

  return (
    <div className="relative w-full h-full">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/20 text-red-500 p-4 text-center">
          {error}
        </div>
      ) : null}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        data-testid="video-stream"
      />
    </div>
  );
});

CameraStream.displayName = 'CameraStream';

export default CameraStream;
