import React from 'react';
import type { AdCopy } from '../types';

interface CopyInputProps {
  id: keyof AdCopy;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSuggest: () => void;
  maxLength?: number;
  isTextarea?: boolean;
  required?: boolean;
  isSuggesting?: boolean;
}


const CopyInput: React.FC<CopyInputProps> = ({
  id,
  label,
  value,
  onChange,
  onSuggest,
  maxLength,
  isTextarea = false,
  required = false,
  isSuggesting = false,
}) => {
  const InputComponent = isTextarea ? 'textarea' : 'input';

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {maxLength && (
          <span className={`text-sm ${value.length > maxLength ? 'text-red-500' : 'text-gray-500'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <InputComponent
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] transition bg-gray-100 hover:bg-gray-200/50 text-gray-900 placeholder:text-gray-500"
          rows={isTextarea ? 4 : undefined}
        />
        <button
          type="button"
          onClick={onSuggest}
          disabled={!value || isSuggesting}
          title="Get AI suggestion"
          className="p-2 h-10 w-10 flex-shrink-0 flex items-center justify-center bg-[#FABC05] text-yellow-900 rounded-full hover:bg-[#F29900] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isSuggesting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-900"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default CopyInput;