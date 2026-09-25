// src/lib/video/mediapipe.ts
// Lazily loads MediaPipe models in the browser. Everything runs on the player's
// device; video frames are never uploaded.
import { FilesetResolver, ObjectDetector, PoseLandmarker } from '@mediapipe/tasks-vision';

const VERSION = '1.0.1'; // keep in step with package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const BALL_MODEL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
let ballDetectorPromise: Promise<ObjectDetector> | null = null;
let posePromise: Promise<PoseLandmarker> | null = null;

function fileset() {
  return (filesetPromise ??= FilesetResolver.forVisionTasks(WASM_URL));
}

/** Tries the GPU first (much faster on phones) and falls back to the CPU. */
async function withDelegate<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await create('GPU');
  } catch {
    return create('CPU');
  }
}

export function getBallDetector(): Promise<ObjectDetector> {
  return (ballDetectorPromise ??= (async () => {
    const vision = await fileset();
    return withDelegate((delegate) =>
      ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: BALL_MODEL, delegate },
        runningMode: 'VIDEO',
        scoreThreshold: 0.25,
        maxResults: 3,
        categoryAllowlist: ['sports ball'],
      })
    );
  })());
}

export function getPoseLandmarker(): Promise<PoseLandmarker> {
  return (posePromise ??= (async () => {
    const vision = await fileset();
    return withDelegate((delegate) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
      })
    );
  })());
}
