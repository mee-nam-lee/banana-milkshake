import React from 'react';

const OutputPlaceholder: React.FC = () => {
  return (
    <div className="text-center text-gray-500 p-8 h-full flex flex-col justify-center items-center">
      <svg className="mx-auto h-24 w-24 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
      <h3 className="mt-4 text-xl font-bold text-gray-800">Your Ad Showcase</h3>
      <p className="mt-1 text-sm">Generated ads will appear here once you're ready.</p>
    </div>
  );
};

export default OutputPlaceholder;