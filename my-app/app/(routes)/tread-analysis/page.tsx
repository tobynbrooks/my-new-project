'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedHeader from '@/components/ui/animatedheader';
import { ViewType, AnalysisState, ViewData } from '@/lib/types';
import { extractVideoFrames } from '@/lib/video-utils';
import AnalyzeButton from '@/components/ui/analyze-button';
import TreadAnalysisResult from '@/components/ui/analysis-results/tread-analysis-results';
import VideoPreview from '@/components/ui/video-preview';

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
        // Create a compressed preview for images
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          const maxDimension = 1024;

          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedPreview = canvas.toDataURL('image/jpeg', 0.7);

          setMedia(prev => ({
            ...prev,
            [viewType]: {
              file,
              preview: compressedPreview,
              type: 'image',
              frames: []
            }
          }));
        };

        img.src = URL.createObjectURL(file);
      }
    } catch (error) {
      console.error('Media upload error:', error);
      setError('Error processing media file');
    } finally {
      console.groupEnd();
    }
  };

  const renderPreview = () => {
    if (!media.treadView.preview) {
      return <Upload className="w-12 h-12 text-gray-400" />;
    }

    if (media.treadView.type === 'video') {
      const frames = media.treadView.frames || [];
      return (
        <VideoPreview 
          preview={media.treadView.preview}
          frames={frames}
        />
      );
    }

    return (
      <img 
        src={media.treadView.preview} 
        alt="Tyre preview" 
        className="w-full h-full object-contain"
      />
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
              <p className="text-sm text-gray-600">
                Upload a clear image of the tyre tread pattern for wear and condition analysis
              </p>
            </div>
            
            <div className="flex justify-center">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <div className="flex items-center justify-center w-80 h-80 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative">
                  {renderPreview()}
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

          {/* Analyze Button - should only appear once */}
          <AnalyzeButton 
            media={media}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
            setError={setError}
            setAnalysis={setAnalysis}
          />

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Analysis Results */}
          {analysis.treadView && (
            <TreadAnalysisResult analysis={analysis.treadView} />
          )}
        </div>
      </div>
    </div>
  );
}