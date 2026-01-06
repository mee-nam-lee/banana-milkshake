import React, { useState, useRef } from 'react';
import type { ImageData } from '../types';
import { fileToBase64 } from '../services/geminiService';

interface FileInputProps {
  id: string;
  label: string;
  onFileChange: (imageData: ImageData | null) => void;
  required?: boolean;
  isSelected?: boolean;
  note?: string;
}

const FileInput: React.FC<FileInputProps> = ({ id, label, onFileChange, required = false, isSelected = false, note }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      const imageData = await fileToBase64(file);
      onFileChange(imageData);
    } else {
      setPreview(null);
      setFileName('');
      onFileChange(null);
    }
  };
  
  const handleRemoveImage = () => {
      setPreview(null);
      setFileName('');
      onFileChange(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const borderStyle = isSelected ? 'border-[#4285F4] border-2 ring-4 ring-blue-500/20' : 'border-gray-300 border-2 border-dashed';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {note && <p className="text-xs text-gray-500">{note}</p>}
      <div className={`mt-1 flex flex-col justify-center items-center px-6 pt-5 pb-6 ${borderStyle} rounded-md transition-all`}>
        {isSelected && <div className="text-xs font-bold text-white bg-[#4285F4] rounded-full px-3 py-1 mb-2 -mt-1">Selected for Ad</div>}
        <div className="space-y-1 text-center">
          {preview ? (
            <div>
              <img src={preview} alt="Preview" className="mx-auto h-24 w-24 object-contain rounded-md" />
              <p className="text-xs text-gray-500 mt-2 truncate max-w-xs">{fileName}</p>
              <button onClick={handleRemoveImage} className="text-xs text-red-500 hover:text-red-700 mt-1">Remove</button>
            </div>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-[#4285F4] opacity-60" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor={id} className="relative cursor-pointer bg-white rounded-md font-medium text-[#4285F4] hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload a file</span>
                  <input id={id} name={id} type="file" ref={fileInputRef} className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileInput;