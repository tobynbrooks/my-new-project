'use client';

const AnimatedHeader = () => {
  return (
    <header className="p-8 bg-gradient-to-r from-black via-gray-800 to-black flex flex-col items-center justify-center overflow-hidden">
      <div className="animate-fade-in-down">
        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2 text-center">
          Welcome to Autopic
        </h1>
        <p className="text-gray-300 text-center text-lg md:text-xl animate-pulse">
          Fast Tyres
        </p>
      </div>
    </header>
  );
};

export default AnimatedHeader;