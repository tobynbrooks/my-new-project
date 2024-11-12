'use client';

import { useState } from 'react';
import { Camera, Upload, Ruler, Activity } from 'lucide-react'; // Added Ruler and Activity icons
import { Button } from '../components/ui/button';
import AnimatedHeader from '../components/ui/animatedheader';
import { useRef } from 'react';

interface TireAnalysis {
  tireSize: {
    width: string | null;
    aspectRatio: string | null;
    wheelDiameter: string | null;
    fullSize: string | null;
  };
  safety: {
    isSafeToDrive: boolean;
    visibleDamage: boolean;
    sufficientTread: boolean;
    unevenWear: boolean;
    needsReplacement: boolean;
  };
  explanations: {
    safety: string;
    damage: string;
    tread: string;
    wear: string;
    replacement: string;
  };
}

interface TireImage {
  file: File | null;
  preview: string;
}

export default function Home() {
  const [images, setImages] = useState<{ [key: string]: TireImage }>({
    treadView: { file: null, preview: '' },
    sidewallView: { file: null, preview: '' }
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ [key: string]: TireAnalysis | null }>({
    treadView: null,
    sidewallView: null
  });
  const [error, setError] = useState<string | null>(null);
  
  const treadFileInputRef = useRef<HTMLInputElement>(null);
  const sidewallFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, viewType: 'treadView' | 'sidewallView') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({
          ...prev,
          [viewType]: {
            file: file,
            preview: reader.result as string
          }
        }));
      };
      reader.readAsDataURL(file);
      
      setAnalysis(prev => ({
        ...prev,
        [viewType]: null
      }));
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    const hasAtLeastOneImage = images.treadView.file || images.sidewallView.file;
    if (!hasAtLeastOneImage) return;
    
    setIsAnalyzing(true);
    setError(null);

    try {
      const analysisResults: { [key: string]: TireAnalysis | null } = {
        treadView: null,
        sidewallView: null
      };

      for (const [key, image] of Object.entries(images)) {
        if (image.file) {
          const formData = new FormData();
          formData.append('image', image.file);
          // Add a view type parameter to help the API understand which analysis to perform
          formData.append('viewType', key);
          
          const response = await fetch('/API/askllm', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Error analyzing ${key}: ${response.status}`);
          }

          const data = await response.json();
          analysisResults[key] = data;
        }
      }

      setAnalysis(analysisResults);
    } catch (error) {
      console.error('Error analyzing images:', error);
      setError(error instanceof Error ? error.message : 'Error analyzing images. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <AnimatedHeader />
      
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-4xl mx-auto space-y-8 p-4">
          <h1 className="text-3xl font-bold text-center">Tire Analysis</h1>
          
          {/* Image Upload Section - Two Columns */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Tread View */}
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Activity className="w-5 h-5" />
                  Tread Analysis
                </h2>
                <p className="text-sm text-gray-600">Upload a clear image of the tire tread pattern for wear and condition analysis</p>
              </div>
              <div className="flex justify-center">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative">
                    {images.treadView.preview ? (
                      <>
                        <img
                          src={images.treadView.preview}
                          alt="Tire tread view"
                          className="object-contain w-full h-full rounded-lg"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                          Tread View
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Activity className="w-8 h-8" />
                        <span>Upload tread image</span>
                        <span className="text-sm text-gray-400">For wear analysis</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={treadFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleImageUpload(e, 'treadView')}
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
                  Photo Tread
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
                <p className="text-sm text-gray-600">Upload a clear image of the tire sidewall to analyze size and specifications</p>
              </div>
              <div className="flex justify-center">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative">
                    {images.sidewallView.preview ? (
                      <>
                        <img
                          src={images.sidewallView.preview}
                          alt="Tire sidewall view"
                          className="object-contain w-full h-full rounded-lg"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                          Sidewall View
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Ruler className="w-8 h-8" />
                        <span>Upload sidewall image</span>
                        <span className="text-sm text-gray-400">For size analysis</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={sidewallFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleImageUpload(e, 'sidewallView')}
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
            onClick={handleAnalyze}
            disabled={!images.treadView.file && !images.sidewallView.file || isAnalyzing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Tire Views'}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Analysis Results - Two Columns */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Tread Analysis */}
            {analysis.treadView && (
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
                        analysis.treadView.safety.sufficientTread ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {analysis.treadView.safety.sufficientTread ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{analysis.treadView.explanations.tread}</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Uneven Wear:</p>
                      <span className={`px-2 py-1 rounded ${
                        !analysis.treadView.safety.unevenWear ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {analysis.treadView.safety.unevenWear ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{analysis.treadView.explanations.wear}</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Safe to Drive:</p>
                      <span className={`px-2 py-1 rounded ${
                        analysis.treadView.safety.isSafeToDrive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {analysis.treadView.safety.isSafeToDrive ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{analysis.treadView.explanations.safety}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sidewall Analysis */}
            {analysis.sidewallView && (
              <div className="p-4 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Ruler className="w-5 h-5" />
                  Sidewall Analysis Results
                </h2>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Tire Specifications</h3>
                  <div className="grid grid-cols-1 gap-4 text-gray-700">
                    <div>
                      <p className="font-medium">Full Size:</p>
                      <p>{analysis.sidewallView.tireSize.fullSize || 'Not visible'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Width:</p>
                      <p>{analysis.sidewallView.tireSize.width ? `${analysis.sidewallView.tireSize.width}mm` : 'Not visible'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Aspect Ratio:</p>
                      <p>{analysis.sidewallView.tireSize.aspectRatio || 'Not visible'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Wheel Diameter:</p>
                      <p>{analysis.sidewallView.tireSize.wheelDiameter ? `${analysis.sidewallView.tireSize.wheelDiameter}"` : 'Not visible'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center">
                    <p className="font-medium">Visible Damage:</p>
                    <span className={`px-2 py-1 rounded ${
                      !analysis.sidewallView.safety.visibleDamage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {analysis.sidewallView.safety.visibleDamage ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}