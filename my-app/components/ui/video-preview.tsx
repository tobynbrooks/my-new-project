import { useState } from 'react';

interface VideoPreviewProps {
  preview: string;
  frames: string[];
}

export default function VideoPreview({ preview, frames }: VideoPreviewProps) {
  const [showFrames, setShowFrames] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  return (
    <div className="relative w-full h-full">
      {showFrames && frames.length > 0 ? (
        // Frame viewer
        <div className="relative w-full h-full">
          <img 
            src={frames[currentFrame]} 
            alt={`Frame ${currentFrame + 1}`}
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 flex justify-between items-center">
            <button
              onClick={() => setCurrentFrame(prev => Math.max(0, prev - 1))}
              disabled={currentFrame === 0}
              className="text-white px-2 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-white text-sm">
              Frame {currentFrame + 1} of {frames.length}
            </span>
            <button
              onClick={() => setCurrentFrame(prev => Math.min(frames.length - 1, prev + 1))}
              disabled={currentFrame === frames.length - 1}
              className="text-white px-2 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        // Video preview
        <>
          <video
            src={preview}
            className="w-full h-full object-contain"
            controls
            muted
            playsInline
          />
          {frames.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50">
              <button
                onClick={() => {
                  setShowFrames(!showFrames);
                  setCurrentFrame(0);
                }}
                className="w-full text-white text-sm hover:underline"
              >
                {showFrames ? 'Show Video' : `View ${frames.length} Frames`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
