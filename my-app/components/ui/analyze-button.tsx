import { Button } from '@/components/ui/button';
import { ViewData, AnalysisState } from '@/lib/types';
import { handleAnalyze } from '@/lib/video-utils';
import { Dispatch, SetStateAction } from 'react';

interface AnalyzeButtonProps {
  media: ViewData;
  isAnalyzing: boolean;
  setIsAnalyzing: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setAnalysis: Dispatch<SetStateAction<AnalysisState>>;
}

const AnalyzeButton = ({
  media,
  isAnalyzing,
  setIsAnalyzing,
  setError,
  setAnalysis
}: AnalyzeButtonProps) => {
  return (
    <Button
      onClick={() => handleAnalyze(media, setIsAnalyzing, setError, setAnalysis)}
      disabled={!media.treadView.file || isAnalyzing}
      className="w-full bg-blue-600 hover:bg-blue-700"
    >
      <div className="flex items-center justify-center gap-2">
        {isAnalyzing ? (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            <span>Processing...</span>
          </>
        ) : (
          <span>Analyze Tyre</span>
        )}
      </div>
    </Button>
  );
};

export default AnalyzeButton;