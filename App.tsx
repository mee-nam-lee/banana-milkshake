
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { AdCopy, ImageData } from './types';
import { generateAds, generateLifestyleImage, getCopySuggestion, generateSingleAd, styleVariations, editAd } from './services/geminiService';
import Header from './components/Header';
import FileInput from './components/FileInput';
import CopyInput from './components/CopyInput';
import Loader from './components/Loader';
import ErrorAlert from './components/ErrorAlert';
import ResultsDisplay from './components/ResultsDisplay';
import OutputPlaceholder from './components/OutputPlaceholder';

const App: React.FC = () => {
  const [productImage, setProductImage] = useState<ImageData | null>(null);
  const [styleImage, setStyleImage] = useState<ImageData | null>(null);
  const [logoImage, setLogoImage] = useState<ImageData | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  
  const [imageForAd, setImageForAd] = useState<ImageData | null>(null);
  
  const [lifestylePrompt, setLifestylePrompt] = useState<string>('');
  const [lifestyleReferenceImage, setLifestyleReferenceImage] = useState<ImageData | null>(null);
  const [generatedLifestyleImage, setGeneratedLifestyleImage] = useState<ImageData | null>(null);
  const [isGeneratingLifestyle, setIsGeneratingLifestyle] = useState<boolean>(false);
  
  const [adCopy, setAdCopy] = useState<AdCopy>({ headline: '', description: '', cta: '' });
  const [isSuggestingCopy, setIsSuggestingCopy] = useState({ headline: false, description: false, cta: false });
  const [skipAdCopy, setSkipAdCopy] = useState<boolean>(false);

  const [generatedAds, setGeneratedAds] = useState<string[]>([]);
  const [isGeneratingAds, setIsGeneratingAds] = useState<boolean>(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // New state for editing with history
  const [editingAd, setEditingAd] = useState<{ index: number; originalData: string; history: string[] } | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const aspectRatioOptions = useMemo(() => [
    { category: 'Landscape', ratios: ['21:9', '16:9', '4:3', '3:2', '5:4'] },
    { category: 'Square', ratios: ['1:1'] },
    { category: 'Portrait', ratios: ['9:16', '3:4', '2:3', '4:5'] },
  ], []);
  
  useEffect(() => {
    setImageForAd(productImage);
    if (!productImage) {
      setGeneratedLifestyleImage(null);
    }
  }, [productImage]);

  const isFormValid = useMemo(() => {
    const copyIsValid = skipAdCopy || (adCopy.headline && adCopy.description);
    return imageForAd && styleImage && logoImage && copyIsValid;
  }, [imageForAd, styleImage, logoImage, adCopy, skipAdCopy]);

  const handleCopyChange = (field: keyof AdCopy, value: string) => {
    setAdCopy(prev => ({ ...prev, [field]: value }));
  };

  const handleCopySuggestion = useCallback(async (field: keyof AdCopy) => {
    if (!adCopy[field] || isSuggestingCopy[field]) return;
    setIsSuggestingCopy(prev => ({ ...prev, [field]: true }));
    setError(null);
    try {
      const suggestion = await getCopySuggestion(field, adCopy[field]);
      setAdCopy(prev => ({ ...prev, [field]: suggestion }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSuggestingCopy(prev => ({ ...prev, [field]: false }));
    }
  }, [adCopy, isSuggestingCopy]);
  
  const handleGenerateLifestyle = async () => {
    if (!productImage || !lifestylePrompt.trim()) {
      setError("Please provide a product image and a prompt for the lifestyle image.");
      return;
    }
    setIsGeneratingLifestyle(true);
    setError(null);
    setGeneratedLifestyleImage(null);
    try {
        const result = await generateLifestyleImage(productImage, lifestylePrompt, '1:1', lifestyleReferenceImage);
        setGeneratedLifestyleImage(result);
        setImageForAd(result); // Auto-select the newly generated image
    } catch (e) {
        setError((e as Error).message);
    } finally {
        setIsGeneratingLifestyle(false);
    }
  };
  
  const downloadImage = (imageData: ImageData, fileName: string) => {
    const link = document.createElement('a');
    link.href = `data:${imageData.mimeType};base64,${imageData.data}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (!isFormValid || !imageForAd || !styleImage || !logoImage || regeneratingIndex !== null) {
      setError("Please fill out all required fields and upload all required images.");
      return;
    }

    setIsGeneratingAds(true);
    setLoadingMessage("Prepping the blender...");
    setError(null);
    setGeneratedAds([]);

    try {
      setLoadingMessage("Blending your ad milkshake... this may take a minute.");
      const finalAdCopy = skipAdCopy ? { headline: '', description: '', cta: '' } : adCopy;
      const ads = await generateAds(imageForAd, styleImage, logoImage, finalAdCopy, aspectRatio);
      setGeneratedAds(ads);

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGeneratingAds(false);
      setLoadingMessage('');
    }
  };
  
  const handleRegenerateAd = async (index: number) => {
    if (isGeneratingAds || regeneratingIndex !== null || !imageForAd || !styleImage || !logoImage) {
        return;
    }

    setRegeneratingIndex(index);
    setError(null);

    try {
        const finalAdCopy = skipAdCopy ? { headline: '', description: '', cta: '' } : adCopy;
        const creativeDirection = styleVariations[index];
        if (!creativeDirection) {
            throw new Error(`Invalid creative direction index: ${index}`);
        }

        const newAd = await generateSingleAd(
            imageForAd,
            styleImage,
            logoImage,
            finalAdCopy,
            creativeDirection,
            aspectRatio
        );

        setGeneratedAds(prevAds => {
            const newAds = [...prevAds];
            newAds[index] = newAd;
            return newAds;
        });

    } catch (e) {
      setError((e as Error).message);
    } finally {
        setRegeneratingIndex(null);
    }
  };

  // New handlers for editing
  const handleSelectAdForEdit = (index: number) => {
      const adData = generatedAds[index];
      setEditingAd({ 
        index, 
        originalData: adData, 
        history: [adData] 
      });
  };

  const handleCancelEdit = () => {
      setEditingAd(null);
      setEditPrompt('');
      setError(null);
  };

  const handleApplyEdit = async () => {
      if (!editingAd || !editPrompt.trim()) return;

      setIsEditing(true);
      setError(null);

      try {
          const currentImage = editingAd.history[editingAd.history.length - 1];
          const newAdData = await editAd(currentImage, editPrompt);

          // Update the main ads list
          const updatedAds = [...generatedAds];
          updatedAds[editingAd.index] = newAdData;
          setGeneratedAds(updatedAds);
          
          // Update the editing state with the new image for sequential edits
          setEditingAd(prev => prev ? { ...prev, history: [...prev.history, newAdData] } : null);
          setEditPrompt(''); // Clear prompt on success

      } catch (e) {
          setError((e as Error).message);
      } finally {
          setIsEditing(false);
      }
  };
  
  const handleUndoEdit = () => {
    if (!editingAd || editingAd.history.length <= 1) return;

    const newHistory = editingAd.history.slice(0, -1);
    const previousAdData = newHistory[newHistory.length - 1];

    const updatedAds = [...generatedAds];
    updatedAds[editingAd.index] = previousAdData;
    setGeneratedAds(updatedAds);

    setEditingAd(prev => prev ? { ...prev, history: newHistory } : null);
  };

  const handleRevertToOriginal = () => {
    if (!editingAd || editingAd.history.length <= 1) return;

    const originalAdData = editingAd.originalData;

    const updatedAds = [...generatedAds];
    updatedAds[editingAd.index] = originalAdData;
    setGeneratedAds(updatedAds);

    setEditingAd(prev => prev ? { ...prev, history: [originalAdData] } : null);
  };

  const isLifestyleImageInUse = useMemo(() => {
      return generatedLifestyleImage && imageForAd?.data === generatedLifestyleImage.data;
  }, [imageForAd, generatedLifestyleImage]);
  
  const isOriginalImageInUse = useMemo(() => {
     return productImage && imageForAd?.data === productImage.data;
  }, [imageForAd, productImage]);

  const lifestylePromptLabel = lifestyleReferenceImage
    ? "Describe how to place your product into the reference image"
    : "Describe the lifestyle scene you want to create without any references";
  const lifestylePromptPlaceholder = lifestyleReferenceImage
    ? "e.g., Replace the model's dress with the sweater in the product reference."
    : "e.g., An Asian man in his 50s drinking from the product in a gym.";

  return (
    <div className="bg-gray-50 min-h-screen text-slate-800">
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* Left Panel: Inputs */}
          <div className="lg:col-span-2">
            <div className="p-1 bg-gradient-to-br from-blue-100 via-green-100 to-yellow-100 rounded-3xl shadow-2xl">
              <div className="bg-white p-6 sm:p-8 rounded-[22px]">
                <div className="space-y-8">
                  {/* Image Inputs */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 border-b-4 border-[#4285F4] pb-2 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1-1m6-3l-2 2" /></svg>
                        Add ingredients
                      </h2>
                      <p className="text-sm text-gray-500 mt-2">Provide key assets for your image ads</p>
                    </div>
                    <FileInput id="product-image" label="1. Product Photo" onFileChange={setProductImage} required isSelected={isOriginalImageInUse} />
                    <FileInput id="style-image" label="2. Brand Style Guide / Ad Template" onFileChange={setStyleImage} required />
                    <FileInput id="logo-image" label="3. Brand Logo" onFileChange={setLogoImage} required note="Transparent PNG recommended for best results." />

                    {productImage && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200 transition-all duration-300 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 text-center">🍌 Upsize your order? 🍌</h3>
                        <p className="text-sm text-gray-500 text-center -mt-2 mb-2">Optional step: Turn your product photo into a lifestyle image. You may skip this step if you prefer to use your uploaded product photo as it is.</p>

                        <FileInput id="lifestyle-reference-image" label="Lifestyle Image Reference (Optional)" onFileChange={setLifestyleReferenceImage} note="Upload a base image to place your product into." />
                        
                        <p className="p-3 text-xs bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-r-lg">
                          <strong>Important:</strong> For commercial use, you must obtain legal clearance for reference images containing any person's likeness.
                        </p>

                        <div>
                          <label htmlFor="lifestyle-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                            {lifestylePromptLabel}
                          </label>
                          <textarea
                            id="lifestyle-prompt"
                            value={lifestylePrompt}
                            onChange={(e) => setLifestylePrompt(e.target.value)}
                            placeholder={lifestylePromptPlaceholder}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#34A853] focus:border-[#34A853] transition bg-gray-100 hover:bg-gray-200/50 text-gray-900 placeholder:text-gray-500"
                            rows={3}
                          />
                        </div>

                        <button 
                          onClick={handleGenerateLifestyle} 
                          disabled={isGeneratingLifestyle || !lifestylePrompt.trim()}
                          className="w-full flex items-center justify-center gap-2 bg-[#34A853] text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                        >
                          {isGeneratingLifestyle ? (
                             <>
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                              <span>Upsizing...</span>
                             </>
                          ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                             <span>Upsize with Lifestyle Image!</span>
                          )}
                        </button>
                        
                        {generatedLifestyleImage && (
                          <div className={`mt-4 p-3 rounded-lg border-2 ${isLifestyleImageInUse ? 'border-[#4285F4]' : 'border-transparent'}`}>
                             {isLifestyleImageInUse && <div className="text-xs font-bold text-white bg-[#4285F4] rounded-full px-3 py-1 mb-2 inline-block">Selected for Ad</div>}
                             <img src={`data:${generatedLifestyleImage.mimeType};base64,${generatedLifestyleImage.data}`} alt="Generated lifestyle" className="w-full rounded-md shadow-sm" />
                             <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                 {!isLifestyleImageInUse && <button onClick={() => setImageForAd(generatedLifestyleImage)} className="bg-blue-100 text-blue-800 font-semibold py-2 px-3 rounded-md hover:bg-blue-200 transition">Use this for Ads</button>}
                                 <button onClick={() => downloadImage(generatedLifestyleImage, 'lifestyle-image.png')} className="bg-gray-100 text-gray-800 font-semibold py-2 px-3 rounded-md hover:bg-gray-200 transition">Download</button>
                             </div>
                             {isLifestyleImageInUse && <button onClick={() => setImageForAd(productImage)} className="text-xs text-center w-full mt-2 text-gray-500 hover:underline">Revert to Original</button>}
                          </div>
                        )}
                      </div>
                     )}
                  </div>

                  {/* Copy Inputs */}
                  <div className="space-y-6">
                    <div>
                       <h2 className="text-2xl font-bold text-gray-900 border-b-4 border-[#FABC05] pb-2 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[#FABC05]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                         Add spices
                       </h2>
                       <p className="text-sm text-gray-500 mt-2">Spice up your ads with engaging copy. Gemini can fine tune your copy for added pizzazz.</p>
                    </div>

                    <div className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center h-5">
                            <input
                                id="skip-copy"
                                name="skip-copy"
                                type="checkbox"
                                checked={skipAdCopy}
                                onChange={(e) => setSkipAdCopy(e.target.checked)}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded bg-white"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="skip-copy" className="font-medium text-gray-800">
                                Skip ad copy
                            </label>
                            <p className="text-gray-500 text-xs mt-1"><strong>Recommended if the intended copy is not in English, Bahasa Malaysia or Bahasa Indonesia.</strong> The app will generate ads with negative spaces for you to manually overlay your own copy.</p>
                        </div>
                    </div>
                    
                    {!skipAdCopy && (
                      <>
                        <CopyInput
                          id="headline"
                          label="Headline"
                          value={adCopy.headline}
                          onChange={(e) => handleCopyChange('headline', e.target.value)}
                          onSuggest={() => handleCopySuggestion('headline')}
                          isSuggesting={isSuggestingCopy.headline}
                          maxLength={35}
                          required
                        />
                        <CopyInput
                          id="description"
                          label="Description"
                          value={adCopy.description}
                          onChange={(e) => handleCopyChange('description', e.target.value)}
                          onSuggest={() => handleCopySuggestion('description')}
                          isSuggesting={isSuggestingCopy.description}
                          isTextarea
                          required
                        />
                        <CopyInput
                          id="cta"
                          label="Call to Action (CTA)"
                          value={adCopy.cta}
                          onChange={(e) => handleCopyChange('cta', e.target.value)}
                          onSuggest={() => handleCopySuggestion('cta')}
                          isSuggesting={isSuggestingCopy.cta}
                          maxLength={25}
                        />
                      </>
                    )}
                  </div>

                  {/* Aspect Ratio */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 border-b-4 border-[#EA4335] pb-2 flex items-center gap-3">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[#EA4335]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                         Any takeaway request?
                      </h2>
                      <p className="text-sm text-gray-500 mt-2">Choose your desired image ad aspect ratio.</p>
                    </div>
                    <div className="space-y-4">
                      {aspectRatioOptions.map(({ category, ratios }) => (
                        <div key={category}>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">{category}</h4>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {ratios.map(ratio => {
                                const [w, h] = ratio.split(':').map(Number);
                                const maxDim = 28; // in px
                                let previewWidth, previewHeight;
                                if (w > h) {
                                    previewWidth = maxDim;
                                    previewHeight = maxDim * (h / w);
                                } else if (h > w) {
                                    previewHeight = maxDim;
                                    previewWidth = maxDim * (w / h);
                                } else {
                                    previewWidth = maxDim;
                                    previewHeight = maxDim;
                                }
                                const previewStyle = { width: `${previewWidth}px`, height: `${previewHeight}px` };

                                return (
                                    <button
                                        key={ratio}
                                        onClick={() => setAspectRatio(ratio)}
                                        type="button"
                                        aria-pressed={aspectRatio === ratio}
                                        className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center text-center h-20 ${aspectRatio === ratio ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-gray-300 hover:border-blue-400'}`}
                                    >
                                        <div className="w-10 h-10 flex items-center justify-center">
                                            <div style={previewStyle} className="bg-gray-400 rounded-sm"></div>
                                        </div>
                                        <span className="text-xs font-semibold mt-2 text-gray-700">{ratio}</span>
                                    </button>
                                );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="mt-10 pt-6 border-t">
                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid || isGeneratingAds || regeneratingIndex !== null}
                    className="w-full flex items-center justify-center bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white font-bold py-4 px-6 rounded-lg hover:from-[#3367D6] hover:to-[#2c9f67] disabled:bg-none disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg disabled:shadow-none text-lg"
                  >
                    {isGeneratingAds ? 'Blending...' : (regeneratingIndex !== null ? 'Regenerating option...' : 'Blend me some ads!')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Outputs */}
          <div className="lg:col-span-3 lg:sticky top-28">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg min-h-[70vh] flex flex-col justify-center items-center">
              {isGeneratingAds && <Loader message={loadingMessage} />}
              {!isGeneratingAds && error && <ErrorAlert message={error} onClose={() => setError(null)} />}
              
              {!isGeneratingAds && !error && editingAd !== null && (
                  <div className="w-full">
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="text-2xl font-bold text-gray-800">Edit Ad Option #{editingAd.index + 1}</h2>
                          <button
                              onClick={handleCancelEdit}
                              className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                          >
                              &larr; Back to Results
                          </button>
                      </div>
                      <div className="relative mb-4 border rounded-lg overflow-hidden shadow-md">
                          <img src={editingAd.history[editingAd.history.length - 1]} alt={`Editing ad option ${editingAd.index + 1}`} className="w-full h-auto" />
                          {isEditing && (
                              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                                  <p className="text-sm text-slate-600 mt-3 font-semibold">Applying edits...</p>
                              </div>
                          )}
                      </div>
                      <div className="space-y-3">
                          <div>
                              <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-700 mb-1">Describe your edit:</label>
                              <textarea
                                  id="edit-prompt"
                                  value={editPrompt}
                                  onChange={(e) => setEditPrompt(e.target.value)}
                                  placeholder="Shift the logo and text copy to the right by 15px"
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] transition bg-gray-50"
                                  rows={3}
                                  disabled={isEditing}
                              />
                          </div>
                          <div className="p-3 text-xs bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-r-lg">
                            <p><strong>Beta mode:</strong> The post-editing feature may occasionally not work as intended. Try to be as specific as possible for best results. For example: Tighter close-up on the product, while retaining the position and size of the logo and text copy.</p>
                          </div>
                          <button
                              onClick={handleApplyEdit}
                              disabled={!editPrompt.trim() || isEditing || isGeneratingAds || regeneratingIndex !== null}
                              className="w-full flex items-center justify-center bg-gradient-to-r from-[#FABC05] to-[#F29900] text-white font-bold py-3 px-6 rounded-lg hover:from-[#f29d0b] hover:to-[#da8600] disabled:bg-none disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
                          >
                              {isEditing ? 'Applying...' : 'Apply Edit'}
                          </button>
                           <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={handleUndoEdit}
                                    disabled={isEditing || editingAd.history.length <= 1}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
                                    Undo Last Edit
                                </button>
                                <button
                                    onClick={handleRevertToOriginal}
                                    disabled={isEditing || editingAd.history.length <= 1}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition"
                                >
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
                                    Revert to Original
                                </button>
                            </div>
                      </div>
                  </div>
              )}

              {!isGeneratingAds && !error && editingAd === null && generatedAds.length > 0 && (
                <ResultsDisplay 
                  images={generatedAds} 
                  onRegenerate={handleRegenerateAd} 
                  onEdit={handleSelectAdForEdit} 
                  regeneratingIndex={regeneratingIndex} 
                />
              )}
              
              {!isGeneratingAds && !error && editingAd === null && generatedAds.length === 0 && <OutputPlaceholder />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;