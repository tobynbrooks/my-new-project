import { ViewData, ViewType, AnalysisState } from '../lib/types';         // Import required types

interface FrameExtractionConfig {
  maxFrames?: number;          // Maximum number of frames to extract
  framesPerSecond?: number;    // How many frames to extract per second
  quality?: number;            // JPEG quality (0-1)
  scaleFactor?: number;        // Scale factor for frame size (0-1)
  randomize?: boolean;         // Whether to randomize frame selection
}

const DEFAULT_CONFIG: FrameExtractionConfig = {     //change these for fine tuning 
  maxFrames: 10,
  framesPerSecond: 2,
  quality: 0.5,
  scaleFactor: 0.25,
  randomize: true
};

export const extractVideoFrames = async (
  file: File, 
  config: FrameExtractionConfig = DEFAULT_CONFIG
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    console.group('🎥 Video Frame Extraction');
    console.log('Config:', config);
    console.log('Starting extraction for file:', file.name);
    
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.autoplay = false;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: string[] = [];
    
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    
    video.onloadeddata = () => {
      console.log('✅ Video data loaded:', {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });

      // Set canvas size based on scale factor
      canvas.width = video.videoWidth * (config.scaleFactor ?? DEFAULT_CONFIG.scaleFactor!);
      canvas.height = video.videoHeight * (config.scaleFactor ?? DEFAULT_CONFIG.scaleFactor!);
      
      if (!ctx) {
        console.error('❌ Could not get canvas context');
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Canvas context not available'));
        return;
      }

      // Calculate frame timestamps
      const frameInterval = 1 / (config.framesPerSecond ?? DEFAULT_CONFIG.framesPerSecond!);
      const totalPossibleFrames = Math.floor(video.duration / frameInterval);
      const maxFrames = Math.min(
        config.maxFrames ?? DEFAULT_CONFIG.maxFrames!,
        totalPossibleFrames
      );

      let timestamps = Array.from(
        { length: totalPossibleFrames },
        (_, i) => i * frameInterval
      );

      // Randomize and limit frame selection if needed
      if (config.randomize ?? DEFAULT_CONFIG.randomize!) {
        timestamps = timestamps.sort(() => Math.random() - 0.5);
      }
      timestamps = timestamps.slice(0, maxFrames);
      timestamps.sort((a, b) => a - b); // Sort chronologically after selection

      let currentFrame = 0;

      const processNextFrame = () => {
        if (currentFrame >= timestamps.length) {
          console.log('✅ Frame extraction complete:', frames.length, 'frames');
          URL.revokeObjectURL(videoUrl);
          console.groupEnd();
          resolve(frames);
          return;
        }

        video.currentTime = timestamps[currentFrame];
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL(
            'image/jpeg', 
            config.quality ?? DEFAULT_CONFIG.quality!
          );
          
          console.group(`📊 Frame ${currentFrame + 1} Metrics`);
          console.log({
            resolution: `${canvas.width}x${canvas.height}`,
            totalSize: `${(frameData.length / 1024).toFixed(2)}KB`,
            base64Size: `${(frameData.replace(/^data:image\/\w+;base64,/, '').length / 1024).toFixed(2)}KB`,
            quality: `${(config.quality ?? DEFAULT_CONFIG.quality!) * 100}%`,
            timestamp: `${video.currentTime.toFixed(2)}s`,
            frameNumber: currentFrame + 1,
            totalFrames: timestamps.length
          });
          console.groupEnd();
          
          frames.push(frameData);
          currentFrame++;
          processNextFrame();
        } catch (error) {
          console.error('Frame capture error:', error);
          currentFrame++;
          processNextFrame();
        }
      };

      processNextFrame();
    };

    video.onerror = (e) => {
      console.error('❌ Video loading error:', e);
      URL.revokeObjectURL(videoUrl);
      console.groupEnd();
      reject(new Error('Error loading video'));
    };
  });
};

export const checkFrameQuality = (frameData: string): boolean => {    // Check if frame meets quality standards
  const QUALITY_THRESHOLD = 500000;                                  // Minimum size threshold (500KB)
  const MIN_DATA_URI_LENGTH = 50;                                   // Minimum length for valid data URI
  
  if (frameData.length < MIN_DATA_URI_LENGTH) {                     // Check if data URI is valid
    console.log('Frame rejected: invalid data URI');
    return false;
  }
  
  if (frameData.length < QUALITY_THRESHOLD) {                       // Check if frame quality is sufficient
    console.log('Frame rejected: quality too low', {
      size: frameData.length,
      threshold: QUALITY_THRESHOLD
    });
    return false;
  }
  
  return true;                                                      // Frame passed quality checks
};

export const handleAnalyze = async (                                // Main analysis function
  media: ViewData,
  setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setAnalysis: React.Dispatch<React.SetStateAction<AnalysisState>>
) => {
  setIsAnalyzing(true);                                            // Start loading state
  setError(null);                                                  // Clear any previous errors
  
  console.group('🔍 Analysis Request');
  
  try {
    for (const [key, mediaItem] of Object.entries(media)) {        // Process each media item
      if (!mediaItem.file) continue;
      
      const formData = new FormData();                             // Prepare form data for API request
      
      if (mediaItem.type === 'video' && 
          Array.isArray(mediaItem.frames) && 
          mediaItem.frames.length > 0) {                           // Handle video frames
          
        const totalSize = mediaItem.frames.reduce((acc: number, frame: string) => {
          const base64Data = frame.replace(/^data:image\/\w+;base64,/, '');
          return acc + (base64Data.length * 0.75);                 // Calculate actual byte size
        }, 0);
        
        const sizeMB = totalSize / (1024 * 1024);                 // Convert to megabytes
        
        if (sizeMB > 9) {                                         // Check if under 9MB limit
          throw new Error('Video frames exceed size limit. Please use a shorter video or lower quality.');
        }
        
        mediaItem.frames.forEach((frameData: string) => {         // Add each frame to form data
          formData.append('files[]', frameData);
        });
        
        formData.append('viewType', key as ViewType);             // Add metadata
        formData.append('isVideo', 'true');
        
      } else {
        formData.append('file', mediaItem.file);                  // Handle single image upload
        formData.append('viewType', key as ViewType);
      }

      const response = await fetch('/api/tread-analysis', {               // Send to AI analysis API
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {                                         // Handle API errors
        const errorText = await response.text();
        throw new Error(`API request failed: ${errorText}`);
      }

      const result = await response.json();                       // Update UI with results
      setAnalysis(prev => ({
        ...prev,
        [key]: result
      }));
    }
  } catch (error) {                                              // Handle any errors in process
    console.error('Analysis error:', error);
    setError(error instanceof Error ? error.message : 'An error occurred');
  } finally {
    setIsAnalyzing(false);                                       // Reset loading state
    console.groupEnd();
  }
}; 