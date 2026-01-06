import React from 'react';

interface ErrorAlertProps {
  message: string;
  onClose: () => void;
}

const LinkifiedText: React.FC<{ text: string }> = ({ text }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Ensure the message is always a string to prevent split errors
    const safeText = String(text || '');
    const parts = safeText.split(urlRegex);

    return (
        <>
            {parts.map((part, i) =>
                urlRegex.test(part) ? (
                    <a href={part} key={i} target="_blank" rel="noopener noreferrer" className="underline hover:text-red-900">
                        {part}
                    </a>
                ) : (
                    part
                )
            )}
        </>
    );
};

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onClose }) => {
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 w-full max-w-2xl" role="alert">
      <div className="flex">
        <div className="py-1">
            <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <div className="flex-grow">
          <p className="font-bold">Error</p>
          <p className="text-sm break-words"><LinkifiedText text={message} /></p>
        </div>
        <button onClick={onClose} className="ml-auto -mx-1.5 -my-1.5 bg-red-100 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-200 inline-flex h-8 w-8" aria-label="Dismiss">
            <span className="sr-only">Dismiss</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
        </button>
      </div>
    </div>
  );
};

export default ErrorAlert;