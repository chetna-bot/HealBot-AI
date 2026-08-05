import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export const getGeminiResponse = async (
  prompt: string, 
  history: { role: "user" | "model"; parts: { text?: string; inlineData?: any }[] }[], 
  systemInstruction: string,
  images?: ImagePart[]
) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  const userParts: any[] = [{ text: prompt }];
  if (images && images.length > 0) {
    userParts.push(...images);
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: "user", parts: userParts }
    ],
    config: {
      systemInstruction: systemInstruction + "\n\nCRITICAL: Use Google Search to verify any medical information or facts. Prioritize accuracy and grounding. If you are unsure, state it clearly.",
      temperature: 0.1, // Lower temperature for more factual responses
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text;
};

export const searchHospitals = async (city: string, images?: ImagePart[]) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  let prompt = `Find a list of well-known, established, and registered hospitals in ${city}. 
  CRITICAL: Do NOT include any "Unknown" hospitals or institutions with missing names. ONLY include hospitals that are clearly identified and verified.
  Prioritize hospitals that are Government Registered, NABH Accredited, or JCI Accredited. 
  For each hospital, provide:
  - Full Name
  - Address
  - Contact details
  - Actual Rating (out of 5 stars from Google)
  - Total number of reviews
  - Accreditation status (e.g., NABH, JCI, Government Registered)
  - A very brief summary of user reviews (one sentence)
  
  Use the following strict format for each entry in your response text to ensure reliability:
  [Hospital: Name]
  [Rating: X.X]
  [Reviews: Count]
  [Accreditation: Status]
  [Summary: Review summary]
  [Maps: URL]
  [Address: Full address]
  
  Only include hospitals that are verified medical institutions. Avoid small unverified private clinics or entries with "Unknown" details.`;
  let tool: any = { googleMaps: {} };

  if (images && images.length > 0) {
    // If images are present, we use googleSearch for better medical identification
    // and ask it to find hospitals as well.
    tool = { googleSearch: {} };
    prompt = `
      You are a medical imaging expert. Analyze the attached medical images/videos with extreme precision.
      
      STEP 1: VISUAL ANALYSIS
      Describe exactly what is visible in the image. Be objective and clinical.
      
      STEP 2: CONDITION IDENTIFICATION
      Identify the most likely medical conditions or the specific medical specialty required.
      
      STEP 3: REGISTERED HOSPITAL SEARCH
      Find specialized, registered, and authorized hospitals in ${city} for this medical need. 
      CRITICAL: Do NOT include any "Unknown" or unverified hospitals. ONLY list established, reputable medical institutions.
      Prioritize accredited institutions (NABH/JCI).
      
      STEP 4: OUTPUT
      - Provide analysis.
      - List hospitals in this EXACT format:
        [Hospital: Name]
        [Rating: X.X]
        [Reviews: Count]
        [Accreditation: Status]
        [Summary: Short Summary]
        [Maps: URL]
        [Address: Full Address]
      
      CRITICAL: State clearly that this is an AI analysis and not a professional diagnosis.
    `;
  }

  const userParts: any[] = [{ text: prompt }];
  if (images && images.length > 0) {
    images.forEach(img => {
      userParts.push({ inlineData: img.inlineData });
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", // Switch to Flash for better performance
    contents: [{ role: "user", parts: userParts }],
    config: {
      tools: [tool],
      temperature: 0.0,
      systemInstruction: "You are a medical expert assistant. Use your tools to provide grounded, accurate information. When listing hospitals, ALWAYS include their rating in the format [Rating: X.X] immediately after the hospital name. CRITICAL: Strictly exclude any hospital that is referred to as 'Unknown' or has missing identity information. Only provide well-documented, verifiable medical institutions."
    }
  });

  return {
    text: response.text,
    groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const analyzeMedicalReport = async (fileData: string, mimeType: string) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  const prompt = `
    You are a strict Medical Document Retrieval and Grounding Specialist. Your task is to extract information from the provided medical report with ZERO hallucination.
    
    CRITICAL INSTRUCTIONS:
    1. EXCLUSIVITY: You MUST ONLY use information explicitly written in the attached report. 
    2. NO EXTERNAL KNOWLEDGE: Do NOT use any external medical knowledge to add details not found in the report.
    3. ZERO HALLUCINATION: If a value or finding is not explicitly stated, do NOT guess it. State "Data not provided in report".
    4. LITERAL EXTRACTION: Extract the exact names of parameters and their values as they appear.
    
    STEP 1: Report Type Identification
    State the exact title or type of report found at the top of the document.
    
    STEP 2: Data Extraction (Key Findings)
    List every parameter, its observed value, and its reference range ONLY if written in the document. 
    Explain what the value indicates based ONLY on the standard context provided within the report itself (e.g., if it says it is 'High', explain it is High).
    
    STEP 3: Text Grounded Summary
    Provide a summary that reflects only the conclusions actually written by the laboratory or doctor in the report.
    
    STEP 4: OUTPUT FORMAT (Strict Markdown)
    
    ### [Report Title found in document]
    
    ### Key Findings (Directly from Report)
    - **[Parameter Name]**: [Value] [Units] (Reference Range: [Range])
    - ...
    
    ### Literal Summary
    [Summarize the written status as stated in the text]
    
    ### Document Findings & Notes
    - [Note 1: e.g., "Sample collected on [Date]"]
    - [Note 2: e.g., "Verified by [Doctor Name]"]
    
    CRITICAL: End with this exact disclaimer: "This analysis is a literal extraction of your medical report provided for informational purposes. No AI can replace a professional medical consultation. Please share this with your doctor."
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ 
      role: "user", 
      parts: [
        { text: prompt },
        { 
          inlineData: {
            data: fileData, // base64 encoded data
            mimeType: mimeType
          } 
        }
      ] 
    }],
    config: {
      temperature: 0.0, // Set to 0 for deterministic/literal extraction
    }
  });

  return response.text;
};
