import {
  FilesetResolver,
  HandLandmarker,
  HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

const createHandLandmarker = async () => {
  console.log('loading handLandmarker');
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
  );
  console.log('vision loaded');
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: 'GPU',
    },
    runningMode: runningMode,
    numHands: 2,
  });
  console.log('handLandmarker loaded', handLandmarker);
  return handLandmarker;
};

let handLandmarker: HandLandmarker;

const runningMode = 'VIDEO';

export class MediapipeModel {
  videoRef: React.RefObject<HTMLVideoElement>;
  lastVideoTimeRef = 0;
  isInitialized = false;
  landmarker: HandLandmarker | null = null;

  constructor(videoRef: React.RefObject<HTMLVideoElement>) {
    this.videoRef = videoRef;
  }


  initUserMedia = async (updateResults: (results: HandLandmarkerResult) => void, callback?: () => void) => {
    try {
      if (this.isInitialized) {
        return;
      }
      this.landmarker = await createHandLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
      });

      if (this.videoRef.current) {
        this.videoRef.current.srcObject = stream;
        this.videoRef.current.addEventListener('loadeddata', () => {
          this.detectForVideo(updateResults);
          callback?.();
          console.log('====== initUserMedia');
        });
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('Error accessing webcam:', err);
      throw new Error('Error accessing webcam');
    }
  };

  detectForVideo = async (updateResults: (results: HandLandmarkerResult) => void) => {
    if (!this.videoRef.current || !this.landmarker) {
      return;
    }

    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');
    const width = this.videoRef.current.videoWidth;
    const height = this.videoRef.current.videoHeight;
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const startTimeMs = performance.now();

    if (this.lastVideoTimeRef !== this.videoRef.current.currentTime && ctx) {
      this.lastVideoTimeRef = this.videoRef.current.currentTime;
      ctx.drawImage(this.videoRef.current, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const image = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
      );
      const results = await this.landmarker.detectForVideo(image, startTimeMs);
      updateResults(results);
    }
    window.requestAnimationFrame(() => this.detectForVideo(updateResults));
  };

  destroy = () => {
    // this.worker.terminate();
  };
}
