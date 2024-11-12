'use client';

import { useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import AnimatedHeader from '../components/ui/animatedheader';

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<string>('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', image);
      
      const response = await fetch('/API/askllm', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setResults(data.analysis);
    } catch (error) {
      console.error('Error analyzing image:', error);
      setResults('Error analyzing image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <AnimatedHeader />
      
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold text-center">Tyre Analysis</h1>
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Tire preview"
                      className="object-contain w-full h-full rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Upload className="w-8 h-8" />
                      <span>Upload tire image</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => document.querySelector('input[type="file"]')?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <Button
                onClick={() => document.querySelector('input[type="file"]')?.click()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!image || isAnalyzing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Tire'}
            </Button>
          </div>

          {results && (
            <div className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">Analysis Results</h2>
              <p className="text-gray-700">{results}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="p-4 bg-gradient-to-r from-black via-gray-800 to-black">
        <p className="text-white font-bold text-center">© 2024 Autopic</p>
      </footer>
    </div>
  );
}