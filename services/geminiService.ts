import { GoogleGenAI } from "@google/genai";
import { MnemonicResult, LANGUAGE_MAP } from "../types";

const getAiClient = (apiKey?: string) => {
  // Use user-provided key or fallback to environment variable
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("Gemini API Key is missing. Please enter it in the settings.");
  }
  return new GoogleGenAI({ apiKey: key });
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errStr = error ? error.toString() + JSON.stringify(error) : "";
    const isQuotaError = errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED");
    
    if (isQuotaError && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const getSystemInstruction = (targetLangCode: string) => {
  const langName = LANGUAGE_MAP[targetLangCode] || "the target language";

  return `
You are a world-class memory expert using the "Keyword Mnemonic Method". 
You teach Turkish speakers ${langName} vocabulary.

CRITICAL MEMORY RULE: 
The stories MUST be **ABSURD, BIZARRE, ILLOGICAL, FUNNY, or SHOCKING**. 
The human brain forgets boring logic but remembers weird, colorful, and exaggerated visualizations immediately.

- ❌ BAD (Boring): "The voter drank water."
- ✅ GOOD (Absurd): "A giant VOTER wearing a clown suit jumps into a pool of 'Su' (Water) and splashes everyone."

STRICT RULES:
1. PHONETIC LINK: Find a Turkish word (Keyword) that sounds almost exactly like the PRONUNCIATION of the target word.
2. PURE TARGET WORD: Output ONLY the target word in its native script. 
   - ABSOLUTELY NO pronunciation, IPA, transliteration, or parentheses.
   - Example for Arabic: If word is 'Book', output 'كتاب'. NOT 'كتاب (Kitab)' or 'Kitab'.
3. NO LABELS: Do not use labels like "Meaning:", "Story:", etc.

FORMAT (Exactly 5 lines):
[Turkish Meaning]
[Target Word in ${langName} (Native Script Only - NO LATIN CHARACTERS)]
[TURKISH KEYWORD IN UPPERCASE]
[Turkish Story - Make it ABSURD, VISUAL, and WEIRD]
[English Image Generation Prompt - Describe the ABSURD scene in high detail]

Generate for:
`;
};

const parseMnemonicResponse = (text: string, targetLang: string): MnemonicResult => {
    let cleanedText = text
        .replace(/```(json|text)?/g, '')
        .replace(/```/g, '')
        .replace(/^(Here is|Sure|I can generate|The mnemonic is).+:/i, '')
        .trim();

    const lines = cleanedText.trim().split('\n')
      .filter(l => l.trim() !== '')
      .map(l => l.replace(/^(Line\s*\d+:|Meaning:|Word:|Target:|Keyword:|Story:|Prompt:)\s*/i, '').trim());

    if (lines.length < 5) throw new Error("AI response format invalid. Please retry.");

    // Clean up target word: remove text in parentheses or brackets
    let rawTarget = lines[1];
    let cleanTarget = rawTarget.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();

    // Strict cleanup for non-Latin languages (Arabic, etc.)
    // If target language is Arabic (ar), remove any [a-zA-Z] characters to prevent pronunciation guides
    if (targetLang === 'ar') {
        cleanTarget = cleanTarget.replace(/[a-zA-Z]/g, '').trim();
    }

    return {
      meaning: lines[0],
      targetWord: cleanTarget,
      keyword: lines[2],
      story: lines[3],
      imagePrompt: lines[4],
      targetLangCode: targetLang,
    };
};

export const generateMnemonicText = async (
  inputString: string, 
  activeLangCode: string,
  apiKey?: string
): Promise<MnemonicResult> => {
  try {
    let processingWord = inputString.trim();
    let targetLang = activeLangCode;
    const slashMatch = inputString.match(/^\/([a-z]{2})\s+(.+)$/i);
    if (slashMatch) {
      const code = slashMatch[1].toLowerCase();
      if (LANGUAGE_MAP[code]) {
        targetLang = code;
        processingWord = slashMatch[2].trim();
      }
    }

    const systemInstruction = getSystemInstruction(targetLang);

    // --- Gemini Text Generation ---
    const response = await withRetry(async () => {
      const ai = getAiClient(apiKey);
      return await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate for: ${processingWord}`,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.9, // Higher temperature for more creative/absurd stories
        },
      });
    });

    if (!response.candidates || response.candidates.length === 0) {
       throw new Error("Generation blocked by safety settings or returned no content.");
    }

    const text = response.text || "";
    if (!text) throw new Error("Empty response from AI.");

    return parseMnemonicResponse(text, targetLang);

  } catch (error: any) {
    const errStr = error ? (error.message || JSON.stringify(error)) : "";
    if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("QUOTA_EXHAUSTED");
    }
    console.warn("Text Gen Error Details:", error);
    throw error;
  }
};

export const generateMnemonicImage = async (
    prompt: string, 
    apiKey?: string
): Promise<string> => {
  // Helper to generate Pollinations URL
  const getPollinationsUrl = (p: string) => {
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(p);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
  };

  try {
    // 1. Try Gemini Image Generation
    // Note: Gemini 2.5 Flash Image often requires paid billing or specific region access.
    // We attempt it, but aggressively catch errors to ensure the user ALWAYS gets an image.
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
        },
      },
    });

    // Check for image part
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part && part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
    
    // If we get a response but no image data, fall back.
    throw new Error("No image data in Gemini response");

  } catch (error) {
    // 2. Fallback to Pollinations
    // This ensures "Not working creator image" is solved by always providing a backup.
    console.warn("Gemini Image Gen failed (likely quota/model access), switching to Pollinations.", error);
    return getPollinationsUrl(prompt);
  }
};