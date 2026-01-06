
import React from 'react';

interface ResultsDisplayProps {
  images: string[];
  onRegenerate: (index: number) => void;
  onEdit: (index: number) => void;
  regeneratingIndex: number | null;
}

const GeneratedAd: React.FC<{
  src: string;
  index: number;
  onRegenerate: () => void;
  onEdit: () => void;
  isRegenerating: boolean;
  isAnyRegenerating: boolean;
}> = ({ src, index, onRegenerate, onEdit, isRegenerating, isAnyRegenerating }) => {
  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `nano-banana-ad-option-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="group relative border border-gray-200 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105 hover:z-20 bg-white hover:ring-4 hover:ring-offset-2 hover:ring-offset-white hover:ring-blue-400">
      <img src={src} alt={`Generated Ad ${index + 1}`} className={`w-full h-auto transition-opacity duration-300 ${isRegenerating ? 'opacity-30' : ''}`} />

      {isRegenerating && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-sm text-slate-600 mt-3 font-semibold">Regenerating...</p>
        </div>
      )}

      <div className={`absolute inset-0 bg-black bg-opacity-0 ${!isAnyRegenerating ? 'group-hover:bg-opacity-60' : ''} transition-all flex items-center justify-center space-x-2 px-2`}>
        <button
          onClick={downloadImage}
          disabled={isAnyRegenerating}
          className="opacity-0 group-hover:opacity-100 transform group-hover:translate-y-0 translate-y-4 transition-all bg-[#4285F4] text-white font-semibold py-2 px-3 rounded-full flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
        <button
          onClick={onEdit}
          disabled={isAnyRegenerating}
          className="opacity-0 group-hover:opacity-100 transform group-hover:translate-y-0 translate-y-4 transition-all bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-2 px-3 rounded-full flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
            Edit
        </button>
        <button
          onClick={onRegenerate}
          disabled={isAnyRegenerating}
          className="opacity-0 group-hover:opacity-100 transform group-hover:translate-y-0 translate-y-4 transition-all bg-white text-gray-800 font-semibold py-2 px-3 rounded-full flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 10M20 20l-1.5-1.5A9 9 0 013.5 14" /></svg>
          Regenerate
        </button>
      </div>
    </div>
  );
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ images, onRegenerate, onEdit, regeneratingIndex }) => {
  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#34A853] via-[#4285F4] to-[#EA4335]">Your Ad Options Are Ready!</h2>
      <p className="text-center text-gray-600 mb-8">Here are three distinct, high-resolution ad variations. Hover over an image to download, edit or regenerate.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <GeneratedAd 
            key={`${index}-${image.substring(image.length - 10)}`}
            src={image} 
            index={index} 
            onRegenerate={() => onRegenerate(index)}
            onEdit={() => onEdit(index)}
            isRegenerating={regeneratingIndex === index}
            isAnyRegenerating={regeneratingIndex !== null}
          />
        ))}
      </div>
    </div>
  );
};

export default ResultsDisplay;
