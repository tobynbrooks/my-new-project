"use client"


interface GaugeProps {
 value: number;
 min?: number;
 max?: number;
 label?: string;
}


export function Gauge({ value, min = 0, max = 100, label }: GaugeProps) {
 const percentage = ((value - min) / (max - min)) * 100;
 const angle = (percentage * 180) / 100;


 return (
   <div className="relative w-48 h-24 mx-auto">
     <svg viewBox="0 0 100 50" className="w-full h-full">
       {/* Static colored arc */}
       <path
         d="M 10 45 A 40 40 0 0 1 90 45"
         fill="none"
         stroke="url(#gradient)"
         strokeWidth="10"
       />
      
       {/* Needle */}
       <line
         x1="50"
         y1="45"
         x2="50"
         y2="15"
         stroke="black"
         strokeWidth="2"
         transform={`rotate(${angle - 90}, 50, 45)`}
       />
       <circle cx="50" cy="45" r="3" fill="black" />
      
       {/* Gradient definition - red to green */}
       <defs>
         <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
           <stop offset="0%" stopColor="#ef4444" />
           <stop offset="50%" stopColor="#eab308" />
           <stop offset="100%" stopColor="#22c55e" />
         </linearGradient>
       </defs>
     </svg>
     {label && (
       <div className="absolute inset-0 flex flex-col items-center justify-center">
         <span className="text-2xl font-bold">{value}%</span>
         <span className="text-sm text-gray-500">{label}</span>
       </div>
     )}
   </div>
 );
}

export default Gauge;