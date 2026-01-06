
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500">
            🍌 Banana Milkshake
            </h1>
            <p className="text-sm text-gray-500 mt-1">A Nano Banana powered app to help you create image ads in seconds!</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right text-xs text-gray-400">
                Questions?
                <br />
                Reach out to <a href="mailto:raynerseah@google.com" className="text-[#4285F4] hover:underline">raynerseah@google.com</a>
                <br />
                For more information, visit <a href="http://go/banana-milkshake" target="_blank" rel="noopener noreferrer" className="text-[#4285F4] hover:underline">go/banana-milkshake</a>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;