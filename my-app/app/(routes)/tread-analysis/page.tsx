'use client';


import { useState, useRef } from 'react';
import { Camera, Upload, Ruler, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedHeader from '@/components/ui/animatedheader';
import { TyreSize, SafetyInfo, Explanations, TyreAnalysis, TireImage, ViewType, AnalysisState, ViewData, TireMedia } from '@/lib/types';
import { extractVideoFrames, handleAnalyze } from '@/lib/video-utils';
import TreadAnalysisResult from '@/components/ui/analysis-results/tread-analysis-results';


interface MediaPreviewProps {
  viewType: ViewType;
  media: TireMedia;
}

export default function TreadAnalysis() {
  const [media, setMedia] = useState<ViewData>({
    treadView: { 
      file: null, 
      preview: '', 
      type: 'image',
      frames: []
    }
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    treadView: null
  });
  const [error, setError] = useState<string | null>(null);
  
  const treadFileInputRef = useRef<HTMLInputElement>(null);

  // Handles when a user uploads a new image or video
  // - Accepts both image and video files
  // - For videos: extracts frames using extractVideoFrames
  // - For images: creates a preview URL
  // - Updates the media state with the new file info
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, viewType: ViewType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.group('📤 Media Upload');
    console.log('File type:', file.type);
    console.log('View type:', viewType);

    try {
      const isVideo = file.type.startsWith('video/');
      console.log('Is video:', isVideo);

      if (isVideo) {
        console.log('Starting video frame extraction...');
        const frames = await extractVideoFrames(file);
        console.log(`Extracted ${frames.length} frames`);

        setMedia((prev: ViewData) => ({
          ...prev,
          [viewType]: {
            file,
            preview: URL.createObjectURL(file),
            type: 'video',
            frames
          }
        }));
      } else {
        setMedia((prev: ViewData) => ({
          ...prev,
          [viewType]: {
            file,
            preview: URL.createObjectURL(file),
            type: 'image'
          }
        }));
      }
    } catch (error) {
      console.error('Media upload error:', error);
      setError('Error processing media file');
    } finally {
      console.groupEnd();
    }
  };

  // Media preview component
  // - Shows uploaded image or video in the UI
  // - Handles both image and video previews
  // - Includes frame preview for videos
  // - Shows loading state while media loads
  const MediaPreview: React.FC<MediaPreviewProps> = ({ viewType, media }) => {
    const [showFrames, setShowFrames] = useState(false);

    // Add debug info for displayed images
    const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.target as HTMLImageElement;
      console.log(`UI Display Image Details:`, {
        width: img.naturalWidth,
        height: img.naturalHeight,
        displayWidth: img.width,
        displayHeight: img.height,
      });
    };

    if (isAnalyzing) return (
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span>Processing video...</span>
      </div>
    );

    if (!media.preview) return (
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <Activity className="w-8 h-8" />
        <span>Upload {viewType === ViewType.TREAD_VIEW ? 'tread' : 'sidewall'}</span>
        <span className="text-sm text-gray-400">Image or Videos</span>
      </div>
    );

    return (
      <div className="relative w-full h-full">
        {media.type === 'video' ? (
          <>
            <video
              src={media.preview}
              className="object-contain w-full h-full rounded-lg"
              controls
            />
            {/* Toggle button for frames */}
            <button
              onClick={() => setShowFrames(!showFrames)}
              className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm"
            >
              {showFrames ? 'Hide Frames' : 'Show Frames'}
            </button>
            
            {/* Frames display */}
            {showFrames && media.frames && media.frames.length > 0 && (
              <div className="absolute inset-0 bg-white overflow-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                  {media.frames.map((frame: string, index: number) => (
                    <div key={index} className="relative">
                      <img 
                        src={frame} 
                        alt={`Frame ${index}`}
                        className="w-full rounded border border-gray-200"
                        onLoad={handleImageLoad}
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        Frame {index}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={media.preview}
            alt={`Tire ${viewType}`}
            className="object-contain w-full h-full rounded-lg"
            onLoad={handleImageLoad}
          />
        )}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
          {viewType === ViewType.TREAD_VIEW ? 'Tread' : 'Sidewall'} View
        </div>
      </div>
    );
  };

  return (
    <div>
      <AnimatedHeader />
      
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-2xl mx-auto space-y-8 p-4">
          <h1 className="text-3xl font-bold text-center">Tyre Analysis</h1>
          
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                <Activity className="w-5 h-5" />
                Tread Analysis
              </h2>
              <p className="text-sm text-gray-600">Upload a clear image of the tyre tread pattern for wear and condition analysis</p>
            </div>
            
            <div className="flex justify-center">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <div className="flex items-center justify-center w-80 h-80 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative">
                  <MediaPreview viewType={ViewType.TREAD_VIEW} media={media.treadView} />
                </div>
                <input
                  ref={treadFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={(e) => handleMediaUpload(e, ViewType.TREAD_VIEW)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => treadFileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <Button
                onClick={() => treadFileInputRef.current?.click()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={() => handleAnalyze(media, setIsAnalyzing, setError, setAnalysis)}
            disabled={!media.treadView.file || isAnalyzing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyse Tyre'}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* New Analysis Results Component */}
          {analysis.treadView && (
            <TreadAnalysisResult analysis={analysis.treadView} />
          )}
        </div>
      </div>
    </div>
  );
}