import React from 'react';
import { Check, AlertTriangle, Gauge as GaugeIcon } from 'lucide-react';
import type { TyreAnalysis } from '@/lib/types';
import { Gauge } from "@/components/ui/gauge";

interface TreadAnalysisResultProps {
  analysis: TyreAnalysis;
}

const TreadAnalysisResult: React.FC<TreadAnalysisResultProps> = ({ analysis }) => {
 if (!analysis) return null;


 const getWearPercentage = (wearString: string | undefined) => {
   if (!wearString) return 0;
   const match = wearString.match(/(\d+)/);
   if (!match) return 0;
   return parseFloat(match[1]);
 };


 const checkUnevenWear = () => {
   if (!analysis.wearPattern) return false;
  
   const wearPercentages = [
     getWearPercentage(analysis.wearPattern.center),
     getWearPercentage(analysis.wearPattern.innerEdge),
     getWearPercentage(analysis.wearPattern.outerEdge)
   ];
  
   const maxWear = Math.max(...wearPercentages);
   const minWear = Math.min(...wearPercentages);
  
   // Check if difference is 20% or more
   return (maxWear - minWear) >= 20;
 };


 const getLowestRemainingTread = () => {
   if (!analysis.wearPattern) return 100;
  
   const wearPercentages = [
     getWearPercentage(analysis.wearPattern.center),
     getWearPercentage(analysis.wearPattern.innerEdge),
     getWearPercentage(analysis.wearPattern.outerEdge)
   ];
  
   const highestWear = Math.max(...wearPercentages);
   return 100 - highestWear;
 };


 const lowestRemainingTread = getLowestRemainingTread();


 const isUnevenWear = checkUnevenWear();


 return (
   <div className="max-w-md mx-auto flex flex-col gap-4">
     {/* Gauge Card */}
     <div className="bg-white rounded-lg p-6 shadow-lg">
       <h2 className="text-2xl font-bold text-center mb-4">Tyre Inspection Report</h2>
       <Gauge
         value={lowestRemainingTread}
         label="Tread Remaining"
       />
     </div>


     {/* Action Card */}
     <div className="bg-white rounded-lg p-6 shadow-lg">
       <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
         <AlertTriangle className="w-5 h-5 text-amber-500" />
         Recommended Action
       </h3>
       <div className="text-center">
         {analysis.safety?.needsReplacement ? (
           <>
             <div className="text-red-600 font-bold text-xl">
               Inspect and Replace Soon
             </div>
             <div className="text-gray-600 mt-2">
               {analysis.recommendations?.explanation || 'Based on tread analysis'}
             </div>
           </>
         ) : (
           <>
             <div className="text-green-600 font-bold text-xl">
               Check in 3 months
             </div>
             <div className="text-gray-600 mt-2">
               Tread depth within acceptable range
             </div>
           </>
         )}
       </div>
     </div>


     {/* Stats Cards */}
     <div className="grid grid-cols-2 gap-4">
       <div className="bg-white rounded-lg p-6 shadow-lg text-center">
         <div className="text-3xl font-bold">
           {analysis.recommendations?.replacementTimeline === 'soon' ? '5000' : '10000'}
         </div>
         <div className="text-gray-600">miles left</div>
       </div>
       <div className="bg-white rounded-lg p-6 shadow-lg text-center">
         <div className="flex justify-center mb-2">
           <AlertTriangle className="w-8 h-8 text-amber-500" />
         </div>
         <div className="text-gray-600">
           {isUnevenWear ? 'Uneven wear' : 'Even wear'}
         </div>
       </div>
     </div>


     {/* Tread Depth Card */}
     <div className="bg-white rounded-lg p-6 shadow-lg">
       <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
         <GaugeIcon className="w-5 h-5" />
         Tread Depth
       </h3>
       <div className="space-y-4">
         {[
           { label: 'Inner Edge', key: 'innerEdge' },
           { label: 'Centre', key: 'center' },
           { label: 'Outer Edge', key: 'outerEdge' }
         ].map(({ label, key }) => {
           const wearPercentage = getWearPercentage(analysis.wearPattern?.[key as keyof typeof analysis.wearPattern]);
           const remainingPercentage = 100 - wearPercentage;
          
           return (
             <div key={key} className="relative">
               <div className="flex justify-between mb-1">
                 <span className="text-sm font-medium">{label}</span>
                 <span className="text-sm text-gray-600">
                   {remainingPercentage}% Remaining
                 </span>
               </div>
               <div className="h-2 bg-gray-200 rounded-full">
                 <div
                   className="h-2 bg-blue-600 rounded-full"
                   style={{ width: `${remainingPercentage}%` }}
                 />
               </div>
             </div>
           );
         })}
       </div>
     </div>
   </div>
 );
};

export default TreadAnalysisResult;
