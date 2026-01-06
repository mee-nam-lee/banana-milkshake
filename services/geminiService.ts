
import { GoogleGenAI, Modality } from "@google/genai";
import type { AdCopy, ImageData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


const MAX_RETRIES = 3;

/**
 * Parses a raw error from the Gemini API and throws a user-friendly error.
 * @param error The original error object.
 * @param context A string describing the operation that failed (used for logging).
 * @throws {Error} A new error with a user-friendly message.
 */
const handleGeminiError = (error: unknown, context: string): never => {
  let finalMessage = "We have encountered problems in generating your assets. An unexpected error occurred. Please try again.";

  if (error instanceof Error) {
    const rawMessage = error.message;
    const jsonMatch = rawMessage.match(/{.*}/s);

    if (jsonMatch) {
      try {
        const parsedError = JSON.parse(jsonMatch[0]).error;
        if (parsedError && parsedError.message) {
          const errorCode = parsedError.status || 'N/A';
          const keyMessage = parsedError.message;
          
          if (errorCode === 'RESOURCE_EXHAUSTED') {
             finalMessage = `We have encountered problems in generating your assets. Error: API Quota Exceeded (out of tokens). For details, visit https://ai.google.dev/gemini-api/docs/rate-limits`;
          } else if (keyMessage.toLowerCase().includes('safety')) {
            finalMessage = `We have encountered problems in generating your assets. Error Code: SAFETY_VIOLATION. Message: Request blocked due to content policy.`;
          } else {
            finalMessage = `We have encountered problems in generating your assets. Error Code: ${errorCode}. Message: ${keyMessage}`;
          }
        }
      } catch (e) {
        console.warn('Could not parse JSON from error message.', e);
        // Fallback to generic message if parsing fails
      }
    } else {
        // Not a standard Google API error format, but could be a network error etc.
        finalMessage = `We have encountered problems in generating your assets: ${rawMessage}`
    }
  }
  throw new Error(finalMessage);
};

/**
 * Wraps an async function with retry logic.
 * @param apiCall The async function to call.
 * @param context A string describing the operation for error logging.
 * @returns The result of the apiCall.
 */
const withRetries = async <T>(apiCall: () => Promise<T>, context: string): Promise<T> => {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await apiCall();
        } catch (error) {
            console.error(`Attempt ${i + 1}/${MAX_RETRIES} failed for ${context}:`, error);
            if (i === MAX_RETRIES - 1) {
                handleGeminiError(error, context);
            }
        }
    }
    // This is unreachable because handleGeminiError always throws, but it satisfies TypeScript.
    throw new Error(`Operation failed for ${context} after ${MAX_RETRIES} attempts.`);
};


// Helper to convert File to base64
export const fileToBase64 = (file: File): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const data = result.split(',')[1];
      resolve({ data, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const getCopySuggestion = (
  copyType: keyof AdCopy,
  currentCopy: string
): Promise<string> => {
  const limits = {
    headline: 35,
    description: 200, // A reasonable limit for description refinement
    cta: 25,
  };
  const limit = limits[copyType];

  const prompt = `You are an expert ad copywriter. Refine the following ad ${copyType} to be more concise and engaging, while staying true to the original intent. The new ${copyType} must be under ${limit} characters. Do not add any extra commentary, just return the refined text. Original ${copyType}: "${currentCopy}"`;
  
  const model = 'gemini-2.5-flash';

  return withRetries(async () => {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text.trim().replace(/"/g, ''); // Clean up quotes
  }, `copy suggestion for ${copyType}`);
};

export const editAd = (
  baseImage: string, // data URL string
  prompt: string,
): Promise<string> => { // returns a new data URL string
  const model = 'gemini-3-pro-image-preview';
  
  const editPrompt = `
**Persona:** You are an expert AI Graphic Designer performing a precise edit on an existing image. You are not creating a new image from scratch.

**Task:** Modify the provided ad image *only* as described in the user's instructions. You must follow the instructions literally.

**CRITICAL RULES:**
1.  **Minimal Change:** Change *only* what is explicitly requested. Preserve all other parts of the image, including quality, composition, and existing text (unless the instruction is to change that text).
2.  **Literal Interpretation:** Do not add your own creative elements or interpretations. If the instruction is "make the logo 10% bigger," do exactly that and nothing else.
3.  **Preserve Quality:** The output image must maintain the same resolution and quality as the input image. Avoid introducing artifacts or blurriness.

**User Instructions:** "${prompt}"
  `;

  // Extract base64 and mimeType from data URL
  const match = baseImage.match(/^data:(image\/.+);base64,(.+)$/);
  if (!match) {
    return Promise.reject(new Error("Invalid base image data URL format."));
  }
  const mimeType = match[1];
  const data = match[2];

  const imagePart = {
    inlineData: { data, mimeType },
  };

  const contents = {
    parts: [
      imagePart,
      { text: editPrompt }
    ]
  };

  return withRetries(async () => {
    const response = await ai.models.generateContent({
        model,
        contents,
        config: { 
            responseModalities: [Modality.IMAGE],
        }
    });

    const generatedImagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (generatedImagePart && generatedImagePart.inlineData) {
        return `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`;
    }
    throw new Error("Model response did not contain a valid image part for the edit.");
  }, `ad editing with prompt: "${prompt}"`);
};

export const generateLifestyleImage = (
    productImage: ImageData,
    prompt: string,
    aspectRatio: string,
    referenceImage: ImageData | null
): Promise<ImageData> => {
    const model = 'gemini-3-pro-image-preview';

    let fullPrompt: string;
    let contents: { parts: ({ text: string } | { inlineData: ImageData })[] };

    if (referenceImage) {
        // New logic for when a reference image is provided
        fullPrompt = `
        **Persona:** You are an expert photo editor and retoucher with a mastery of photorealistic image composition.

        **Primary Objective:** Seamlessly and realistically integrate the user's "Product Photo" into the provided "Lifestyle Image Reference". The final output must look like a single, authentic photograph.

        **Assets:**
        - **Product Photo:** The product to be integrated.
        - **Lifestyle Image Reference:** The base image, including the model, pose, and environment.

        **User Instructions:** "${prompt}"

        **Execution Plan:**
        1.  **Analyze and Isolate:** Carefully identify the primary product in the "Product Photo". Isolate the product completely.
        2.  **Integrate and Composite:** Place the product into the "Lifestyle Image Reference" according to the user's instructions. The product should be intelligently reintepreted so that it is placed seamlessly within the "Lifestyle Image Reference" This might involve replacing an existing attire, having a model hold the product, or placing it naturally within the scene.
        3.  **Maintain Realism (CRITICAL):** The integration must be flawless. Adjust lighting, shadows, reflections, and perspective of the product to perfectly match the "Lifestyle Image Reference". The original model's face, pose, and the overall environment of the reference image must be preserved.
        4.  **Final Polish:** The final image should be a high-resolution, photorealistic composition that fulfills the user's request. The edit should be undetectable.

        **Critical Rules:**
        - The "Lifestyle Image Reference" is the canvas. DO NOT change the model's face, pose, or the background environment unless absolutely necessary to accommodate the product as per the user's instructions.
        - **PRODUCT INTEGRITY (CRITICAL):** The product from the "Product Photo" MUST be integrated as-is. DO NOT alter, redraw, or modify its shape, color, design, labels, or any other details. It must be a perfect, unaltered representation of the original.
        - **No Labels:** Do not render any text labels from this prompt (e.g., "Product Photo", "Lifestyle Image Reference") onto the final image.
        `;
        contents = {
            parts: [
                { text: '**Product Photo:**' },
                { inlineData: { data: productImage.data, mimeType: productImage.mimeType } },
                { text: '\n\n**Lifestyle Image Reference:**' },
                { inlineData: { data: referenceImage.data, mimeType: referenceImage.mimeType } },
                { text: `\n\n**Instructions:**\n${fullPrompt}` }
            ]
        };

    } else {
        // Existing logic for generating a new scene
        fullPrompt = `
        **Persona:** You are an expert photo editor and retoucher.

        **Primary Objective:** Seamlessly place the product from the user-provided image into a new, photorealistic lifestyle scene based on the user's prompt.

        **User Prompt:** "${prompt}"

        **Execution Plan:**
        1.  **Isolate the Product:** Identify the primary product in the provided image. Carefully and cleanly extract it from its original background.
        2.  **Create the Scene:** Generate a new background scene that is bright, vibrant, and professionally shot, strictly following the user's prompt. The scene should be stylish and modern.
        3.  **Composite:** Place the isolated product into the new scene. Ensure the lighting, shadows, and perspective on the product match the new environment perfectly, making the final image look like a single, authentic photograph.
        4.  **Final Polish:** The product must be the clear focal point. Use a tight shot or a close-up if necessary to ensure it is featured prominently. The final output must be a high-resolution, professional lifestyle photo.

        **Critical Rule:** The product itself must remain completely unaltered. Do not change its shape, color, labels, or any other details. It must be an exact, unmodified copy of the product from the user's image.`;
        contents = {
            parts: [
                { inlineData: { data: productImage.data, mimeType: productImage.mimeType } },
                { text: fullPrompt }
            ]
        };
    }


    return withRetries(async () => {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: { 
                responseModalities: [Modality.IMAGE],
            }
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
            return {
                data: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            };
        }
        throw new Error("No image was generated in the lifestyle creation step.");

    }, "lifestyle image generation");
};

export const styleVariations = [
    "**Image-Centric Focus:** The Product/Lifestyle Photo is the undisputed hero. Create a clean, minimalist layout where the image dominates. Prioritize a full-bleed approach, seamlessly extending the photo (outpainting) to fill the entire canvas if it's a lifestyle shot. All other elements (text, logo) must be positioned with subtlety to support the image, not compete with it. The final feel should be premium and uncluttered.",
    "**Bold Typographic Focus:** Create a dynamic, modern, and asymmetrical layout where typography is a key artistic element. The design should be a balanced interplay between the Product/Lifestyle Photo (ASSET 1) and large, impactful text. Instead of just filling space, use color blocks from the brand palette intelligently as design accents or to create a clear separation and hierarchy between text and image areas. The result should feel energetic and deliberate, not random.",
    `**High-Fidelity Template Adaptation:** Your primary goal is to recreate the "Brand Style Guide/Ad Template" (ASSET 2) using the provided new assets.
    1.  Analyze the template's layout: the positioning, scale, and alignment of its core components (image areas, text area, logo placement).
    2.  **CRITICAL** Construct a new ad that mirrors this *structure and style*, but is replaced entirely with the new assets (ASSET 1 + ASSET 3 + user provided Ad Copy). REMOVE AND DO NOT INCLUDE any original text or ad copy, logo or images from the template (ASSET 2).
    3.  The final ad should still feel like it perfectly fits within the brand's established design system.`
];

export const generateSingleAd = (
  productImage: ImageData,
  styleImage: ImageData,
  logoImage: ImageData,
  adCopy: AdCopy,
  creativeDirection: string,
  aspectRatio: string
): Promise<string> => {
  const model = 'gemini-3-pro-image-preview';
  
  const hasCopy = adCopy.headline.trim() !== '';

  const prompt = `
# ROLE & GOAL
You are an expert AI Art Director. Your goal is to create one professional, high-quality digital image ad using the provided assets and instructions. The final ad should have an aspect ratio of ${aspectRatio}.

# ASSETS
You will be provided with three images and optional text copy.
- **ASSET 1: Product/Lifestyle Photo:** The main visual for the ad.
- **ASSET 2: Brand Style Guide/Ad Template:** A reference for style ONLY.
- **ASSET 3: Brand Logo:** The official brand logo.
- **Ad Copy:**
${hasCopy ? [
      `  - Headline: "${adCopy.headline}"`,
      `  - Description: "${adCopy.description}"`,
      adCopy.cta.trim() && `  - Call to Action (CTA): "${adCopy.cta}"`,
    ].filter(Boolean).join('\n')
    : '  - Skipped. The user will add their own text later.'
}

# CREATIVE DIRECTION
For this specific ad, follow this direction: ${creativeDirection}

# EXECUTION RULES
Follow these rules meticulously.

### 1. How to Use the Style Guide (ASSET 2)
- **USE ONLY THE STYLE:** Extract and use only the stylistic elements from ASSET 2:
    - Color palette
    - Typography (font styles, weights)
    - General layout and design ideas (shapes, patterns).
- **DO NOT USE THE CONTENT (CRITICAL):** You are strictly forbidden from using any of the original *content* from ASSET 2. All of the following must be completely removed and ignored:
    - **Any logos.**
    - **Any text and ad copy.**
    - **Any existing products.**
    - **Any images.**
- The final ad must be a new creation inspired only by the *style* of ASSET 2.

### 2. Image Integration (ASSET 1)
- **If ASSET 1 is a Product Photo (on a simple background):** Cleanly isolate the product and place it into your new ad composition.
- **If ASSET 1 is a Lifestyle Photo:** Your goal is to create a visually engaging lifestyle ad that promotes the product within the photo by using one of the two methods below:
  - ** Method 1:** Outpainting.** Seamlessly extend the photo's actual content (outpainting) to fill the relevant space or entire canvas. Make it look like one continuous photo.
  - ** Method 2:** If outpainting is not feasible or looks unnatural with the provided Brand Guide/Ad Template (ASSET 2), you may creatively isolate the key person along with the product, and use graphical elements, colors, and textures inspired by the "Brand Style Guide/Ad Template" (ASSET 2) to create a cohesive, well-designed ad.
- **PRODUCT INTEGRITY (CRITICAL):** The product featured in ASSET 1 must not be altered in any way. Do not change its shape, color, design, or any other details. It must appear in the ad exactly as it does in the source image.

### 3. Logo Integration (ASSET 3)
- **CRITICAL RULE:** Treat ASSET 3 (the Brand Logo) as an immutable digital asset. It MUST be placed directly onto the final ad without ANY modification.
- **DO NOT RE-DRAW, RE-INTERPRET, OR TRACE THE LOGO.** You are strictly forbidden from altering the logo's pixels. This includes its colors, shape, proportions, and design elements. It must be a perfect copy.
- **VISIBILITY IS KEY (CRITICAL):** Place the logo in a professional, standard location (e.g., a corner). The logo **must** be clearly legible. To ensure this, it must have high contrast against its immediate background. If the logo has light-colored elements (like white text) that might blend into a light background, you MUST place it on a darker area of the ad.
- Ensure the logo is legible but not dominant, occupying roughly 5-10% of the ad area.

### 4. Text Integration
${hasCopy ? `
- Render the provided ad copy using the typography found in the "Brand Style Guide" (ASSET 2).
- If a copy element like 'Description' is not provided in the list above, do not invent one or create a placeholder for it.
- Ensure all text is perfectly legible with high contrast against its background.
- Use only the exact ad copy provided. Do not add, omit, or change any words.
` : `
- **Create Natural Negative Space:** Since ad copy is skipped, design a visually complete ad with clean, uncluttered areas where text and ad copy could be added in later. This space should be an organic part of the design.
- **NO PLACEHOLDERS (CRITICAL):** Do not create any shapes that look like text placeholders (e.g., empty boxes or rectangles). Also, do not attempt to add your own text since no copy is explicitely provided. The ad must look like a polished, text-free visual, that is ready for the end user to add their own copy at a later stage.
`}

# FINAL QUALITY CHECK
Before finishing, verify:
1.  **No Obstruction:** No text, graphical elements, or logos cover any human faces or the product in the final image ad.
2.  **Professional Finish:** The ad is clean, sharp, and high-resolution. It should look like a digital image ad that is professionally designed with well composed and placed visual elements.
3.  **NO solid borders:** The ad MUST NOT have any odd solid borders at the sides or top/bottom.
4.  **Asset Integrity:** The brand logo (ASSET 3) is an exact, pixel-for-pixel copy of the provided asset and has not been distorted or re-drawn. The product within the main photo (ASSET 1) is also **completely unaltered**, appearing exactly as it does in the source image.
5.  **No Asset Labels (CRITICAL):** The text labels "ASSET 1", "ASSET 2", "ASSET 3", and their descriptions from this prompt MUST NOT appear on the final image.
6.  **Rule Compliance:** You have followed all the execution rules above.
`;

  const contents = {
    parts: [
      { text: '**ASSET 1: "Product/Lifestyle Photo"**' },
      { inlineData: { data: productImage.data, mimeType: productImage.mimeType } },
      { text: '\n\n**ASSET 2: "Brand Style Guide/Ad Template"**' },
      { inlineData: { data: styleImage.data, mimeType: styleImage.mimeType } },
      { text: '\n\n**ASSET 3: "Brand Logo"**' },
      { inlineData: { data: logoImage.data, mimeType: logoImage.mimeType } },
      { text: prompt }
    ]
  };

  return withRetries(async () => {
    const response = await ai.models.generateContent({
        model,
        contents,
        config: { 
            responseModalities: [Modality.IMAGE],
        }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    // Throw an error to trigger retry or the final user-friendly error
    throw new Error("Model response did not contain a valid image part.");
  }, `ad generation with style '${creativeDirection}'`);
};


export const generateAds = async (
  productImage: ImageData,
  styleImage: ImageData,
  logoImage: ImageData,
  adCopy: AdCopy,
  aspectRatio: string
): Promise<string[]> => {
  try {
    const adPromises = styleVariations.map(variation => 
      generateSingleAd(productImage, styleImage, logoImage, adCopy, variation, aspectRatio)
    );

    const results = await Promise.all(adPromises);
    return results;
  } catch (error) {
     // The error is already parsed and user-friendly from handleGeminiError.
     // We just need to re-throw it for the UI to catch.
     console.error("A critical error occurred during ad generation:", error);
     throw error;
  }
};
