'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Ruler, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import AnimatedHeader from '../components/ui/animatedheader';
import { TyreSize, SafetyInfo, Explanations, TyreAnalysis, TireImage, ViewType, AnalysisState, ViewData, TireMedia } from '../lib/types';
import { extractVideoFrames, handleAnalyze } from '@/lib/video-utils';

interface MediaPreviewProps {
  viewType: ViewType;
  media: TireMedia;
}

export default function Home() {
  const [media, setMedia] = useState<ViewData>({
    treadView: { file: null, preview: '', type: 'image' },
    sidewallView: { file: null, preview: '', type: 'image' }
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    treadView: null,
    sidewallView: null
  });
  const [error, setError] = useState<string | null>(null);
  
  const treadFileInputRef = useRef<HTMLInputElement>(null);
  const sidewallFileInputRef = useRef<HTMLInputElement>(null);

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

        setMedia(prev => ({
          ...prev,
          [viewType]: {
            file,
            preview: URL.createObjectURL(file),
            type: 'video',
            frames
          }
        }));
      } else {
        setMedia(prev => ({
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

  // Renders the analysis results in the UI
  // - Different display for tread vs sidewall views
  // - Shows safety indicators with color coding
  // - Displays detailed explanations for each aspect
  // - Includes warnings for unclear images
  // - Formats tire specifications in a readable way
  const renderAnalysisResult = (viewType: ViewType) => {
    const currentAnalysis = analysis[viewType];

    // Log raw LLM response for both view types
    if (currentAnalysis) {
      console.group(`🔍 Raw LLM Response for ${viewType === 'treadView' ? 'Tread' : 'Sidewall'}`);
      console.log('Timestamp:', new Date().toISOString());
      console.log('View Type:', viewType);
      console.log('Full Response:');
      console.log(JSON.stringify(currentAnalysis, null, 2));
      console.groupEnd();
    }

    if (!currentAnalysis) return null;

    return viewType === 'treadView' ? (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Tread Analysis Results
        </h2>
        <div className="space-y-3 text-gray-700">
          <div>
            <div className="flex justify-between items-center">
              <p className="font-medium">Sufficient Tread:</p>
              <span className={`px-2 py-1 rounded ${
                currentAnalysis?.safety?.sufficientTread ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {currentAnalysis?.safety?.sufficientTread ? 'Yes' : 'No'}
              </span>
            </div>
              <p className="text-sm mt-1">{currentAnalysis?.explanations?.tread}</p>

          </div>

          <div>
            <div className="flex justify-between items-center">
              <p className="font-medium">Uneven Wear:</p>
              <span className={`px-2 py-1 rounded ${
                !currentAnalysis?.safety?.unevenWear ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {currentAnalysis?.safety?.unevenWear ? 'Yes' : 'No'}
              </span>
            </div>
            <p className="text-sm mt-1">{currentAnalysis?.explanations?.wear}</p>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <p className="font-medium">Safe to Drive:</p>
              <span className={`px-2 py-1 rounded ${
                currentAnalysis?.safety?.isSafeToDrive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {currentAnalysis?.safety?.isSafeToDrive ? 'Yes' : 'No'}
              </span>
            </div>
            <p className="text-sm mt-1">{currentAnalysis?.explanations?.safety}</p>
          </div>
        </div>
      </div>
    ) : (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Ruler className="w-5 h-5" />
          Sidewall Analysis Results
        </h2>

          {/* Add image clarity warning when tire size data is not available */}
          {!currentAnalysis.tyreSize.isImageClear && (
          <div className="text-amber-600 bg-amber-50 p-2 rounded mb-4">
          Warning: Image quality is not clear enough for accurate tire size analysis
          </div>
        )}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Tire Specifications</h3>
          <div className="grid grid-cols-1 gap-4 text-gray-700">
            <div>
              <p className="font-medium">Full Size:</p>
              <p>{currentAnalysis?.tyreSize?.fullSize || 'Not visible'}</p>
            </div>
            <div>
              <p className="font-medium">Width:</p>
              <p>{currentAnalysis?.tyreSize?.width ? `${currentAnalysis?.tyreSize?.width}mm` : 'Not visible'}</p>
            </div>
            <div>
              <p className="font-medium">Aspect Ratio:</p>
              <p>{currentAnalysis?.tyreSize?.aspectRatio || 'Not visible'}</p>
            </div>
            <div>
              <p className="font-medium">Wheel Diameter:</p>
              <p>{currentAnalysis?.tyreSize?.wheelDiameter ? `${currentAnalysis?.tyreSize?.wheelDiameter}"` : 'Not visible'}</p>
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center">
            <p className="font-medium">Visible Damage:</p>
            <span className={`px-2 py-1 rounded ${
              !currentAnalysis?.safety?.visibleDamage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {currentAnalysis?.safety?.visibleDamage ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    );
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
        <span>Upload {viewType === 'treadView' ? 'tread' : 'sidewall'}</span>
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
                  {media.frames.map((frame, index) => (
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
          {viewType === 'treadView' ? 'Tread' : 'Sidewall'} View
        </div>
      </div>
    );
  };

  return (
    <div>
      <AnimatedHeader />
      
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-4xl mx-auto space-y-8 p-4">
          <h1 className="text-3xl font-bold text-center">Tyre Analysis</h1>
          
          {/* Image Upload Section */}
          {/* Image Upload Section - Two Columns */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Tread View */}
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
                  <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative">
                    <MediaPreview viewType="treadView" media={media.treadView} />
                  </div>
                  <input
                    ref={treadFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    capture="environment"
                    onChange={(e) => handleMediaUpload(e, 'treadView')}
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
                  Upload Tread
                </Button>
                <Button
                  onClick={() => treadFileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Video Tread
                </Button>
              </div>
            </div>

            {/* Sidewall View */}
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Ruler className="w-5 h-5" />
                  Sidewall Analysis
                </h2>
                <p className="text-sm text-gray-600">Upload a clear image of the tyre sidewall to analyze size and specifications</p>
              </div>
              <div className="flex justify-center">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative">
                    <MediaPreview viewType="sidewallView" media={media.sidewallView} />
                  </div>
                  <input
                    ref={sidewallFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    capture="environment"
                    onChange={(e) => handleMediaUpload(e, 'sidewallView')}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => sidewallFileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Sidewall
                </Button>
                <Button
                  onClick={() => sidewallFileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Photo Sidewall
                </Button>
              </div>
            </div>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={() => handleAnalyze(media, setIsAnalyzing, setError, setAnalysis)}
            disabled={!media.treadView.file && !media.sidewallView.file || isAnalyzing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyse Tyre Views'}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Analysis Results */}
          <div className="grid md:grid-cols-2 gap-8">
            {renderAnalysisResult('treadView')}
            {renderAnalysisResult('sidewallView')}
          </div>
        </div>
      </div>
    </div>
  );
}