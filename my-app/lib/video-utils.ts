import { ViewData, ViewType, AnalysisState } from '../lib/types';         // Import required types

export const extractVideoFrames = (file: File): Promise<string[]> => {    // Function to extract frames from video file
  return new Promise((resolve, reject) => {                              // Create promise for async operation
    console.group('🎥 Video Frame Extraction');
    console.log('Starting extraction for file:', file.name);
    
    const video = document.createElement('video');                        // Create video element in memory
    video.playsInline = true;                                           // Set video properties for mobile compatibility
    video.muted = true;
    video.autoplay = false;
    
    const canvas = document.createElement('canvas');                      // Create canvas for frame capture
    const ctx = canvas.getContext('2d');                                // Get canvas context for drawing
    const frames: string[] = [];                                        // Array to store captured frames
    const MAX_FRAMES = 5;                                              // Maximum number of frames to extract
    
    const videoUrl = URL.createObjectURL(file);                         // Create URL for video file
    video.src = videoUrl;
    
    video.onloadeddata = () => {                                       // When video metadata is loaded
      console.log('✅ Video data loaded:', {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });

      canvas.width = video.videoWidth * 0.25;                          // Reduce canvas size to 25% of video
      canvas.height = video.videoHeight * 0.25;
      
      if (!ctx) {                                                      // Check if canvas context exists
        console.error('❌ Could not get canvas context');
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Canvas context not available'));
        return;
      }

      const timestamps = Array.from(                                   // Create array of frame timestamps
        { length: Math.min(MAX_FRAMES, Math.floor(video.duration)) },
        (_, i) => (video.duration * (i + 1)) / (Math.floor(video.duration) + 1)
      ).sort(() => Math.random() - 0.5).slice(0, MAX_FRAMES);         // Randomize and limit frame selection

      let currentFrame = 0;                                           // Track current frame being processed

      const processNextFrame = () => {                                // Function to process each frame
        if (currentFrame >= timestamps.length) {                      // If all frames are processed
          console.log('✅ Frame extraction complete:', frames.length, 'frames');
          URL.revokeObjectURL(videoUrl);                             // Clean up video URL
          console.groupEnd();
          resolve(frames);                                           // Return captured frames
          return;
        }

        video.currentTime = timestamps[currentFrame];                 // Set video to next timestamp
      };

      video.onseeked = () => {                                       // When video seeks to timestamp
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);   // Draw current frame to canvas
          const frameData = canvas.toDataURL('image/jpeg', 0.5);     // Convert to JPEG at 50% quality
          
          console.group(`📊 Frame ${currentFrame + 1} Metrics`);     // Log frame metrics
          console.log({
            resolution: `${canvas.width}x${canvas.height}`,
            totalSize: `${(frameData.length / 1024).toFixed(2)}KB`,
            base64Size: `${(frameData.replace(/^data:image\/\w+;base64,/, '').length / 1024).toFixed(2)}KB`,
            quality: '50%',
            timestamp: `${video.currentTime.toFixed(2)}s`,
            frameNumber: currentFrame + 1,
            totalFrames: timestamps.length
          });
          console.groupEnd();
          
          frames.push(frameData);                                    // Store captured frame
          currentFrame++;
          processNextFrame();                                        // Process next frame
        } catch (error) {
          console.error('Frame capture error:', error);
          currentFrame++;
          processNextFrame();                                        // Continue to next frame on error
        }
      };

      processNextFrame();                                            // Start frame processing
    };

    video.onerror = (e) => {                                        // Handle video loading errors
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

      const response = await fetch('/api/askllm', {               // Send to AI analysis API
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