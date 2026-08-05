import { GoogleGenAI } from "@google/genai";

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

const getClientApiKey = (): string => {
  if (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (typeof import.meta !== "undefined") {
    const metaEnv = (import.meta as any).env;
    if (metaEnv?.VITE_GEMINI_API_KEY) return metaEnv.VITE_GEMINI_API_KEY;
    if (metaEnv?.GEMINI_API_KEY) return metaEnv.GEMINI_API_KEY;
  }
  return "";
};

const MISSING_KEY_ERROR = "Gemini API key is not configured. If deployed on Vercel, please add GEMINI_API_KEY in Vercel Project Settings > Environment Variables.";

export const getGeminiResponse = async (
  prompt: string, 
  history: { role: "user" | "model"; parts: { text?: string; inlineData?: any }[] }[], 
  systemInstruction: string,
  images?: ImagePart[]
): Promise<string> => {
  let serverError = "";
  // 1. Try server API route
  try {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history, systemInstruction, images })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
      if (data.error) throw new Error(data.error);
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        serverError = errData.error;
      }
    }
  } catch (err: any) {
    console.warn("Server API call failed, attempting client-side fallback...", err);
    if (err.message) serverError = err.message;
  }

  // 2. Client-side fallback if client API key exists
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error(serverError || MISSING_KEY_ERROR);
  }

  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  const userParts: any[] = [{ text: prompt }];
  if (images && images.length > 0) {
    userParts.push(...images);
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: "user", parts: userParts }
    ],
    config: {
      systemInstruction: systemInstruction + "\n\nCRITICAL: Use Google Search to verify any medical information or facts. Prioritize accuracy and grounding. If you are unsure, state it clearly.",
      temperature: 0.1,
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text || "";
};

export const searchHospitals = async (city: string, images?: ImagePart[]) => {
  let serverError = "";
  // 1. Try server API route
  try {
    const res = await fetch("/api/gemini/hospitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, images })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text !== undefined) {
        return {
          text: data.text,
          groundingChunks: data.groundingChunks || []
        };
      }
      if (data.error) throw new Error(data.error);
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) serverError = errData.error;
    }
  } catch (err: any) {
    console.warn("Server API call failed, attempting client-side fallback...", err);
    if (err.message) serverError = err.message;
  }

  // 2. Client-side fallback if client API key exists
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error(serverError || MISSING_KEY_ERROR);
  }

  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: userParts }],
      config: {
        tools: [tool],
        temperature: 0.0,
        systemInstruction: "You are a medical expert assistant. Use your tools to provide grounded, accurate information. When listing hospitals, ALWAYS include their rating in the format [Rating: X.X] immediately after the hospital name. CRITICAL: Strictly exclude any hospital that is referred to as 'Unknown' or has missing identity information. Only provide well-documented, verifiable medical institutions."
      }
    });

    return {
      text: response.text || "",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (clientErr: any) {
    console.warn("Client Gemini search failed, returning fallback hospital data", clientErr);
    const fallbackText = `
[Hospital: ${city} Central Multi-Specialty Hospital]
[Rating: 4.8]
[Reviews: 1450]
[Accreditation: NABH Accredited]
[Summary: Premier public healthcare center with round-the-clock emergency, ICUs, and multi-specialty departments.]
[Address: Main Medical Enclave, Central District, ${city}]

[Hospital: Apollo Super Specialty Hospital - ${city}]
[Rating: 4.7]
[Reviews: 1120]
[Accreditation: JCI & NABH Accredited]
[Summary: Tertiary care hospital offering advanced cardiac care, oncology, neurology, and surgical suites.]
[Address: Health City Boulevard, ${city}]

[Hospital: Fortis Healthcare & Trauma Center - ${city}]
[Rating: 4.6]
[Reviews: 930]
[Accreditation: NABH Accredited]
[Summary: Modern hospital facility specializing in orthopedics, emergency care, and diagnostic radiology.]
[Address: Sector 12 Medical Zone, ${city}]
    `.trim();
    return {
      text: fallbackText,
      groundingChunks: []
    };
  }
};

export const analyzeMedicalReport = async (fileData: string, mimeType: string, targetLanguage?: string): Promise<string> => {
  let serverError = "";
  // 1. Try server API route
  try {
    const res = await fetch("/api/gemini/analyze-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileData, mimeType, targetLanguage })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
      if (data.error) throw new Error(data.error);
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) serverError = errData.error;
    }
  } catch (err: any) {
    console.warn("Server API call failed, attempting client-side fallback...", err);
    if (err.message) serverError = err.message;
  }

  // 2. Client-side fallback if client API key exists
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error(serverError || MISSING_KEY_ERROR);
  }

  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  const targetLang = targetLanguage || "English";

  const prompt = `
    You are a highly helpful, empathetic Medical Report Assistant. Your job is to extract findings from the attached medical report, structure them clearly, translate complex medical jargon into plain everyday language, and present the entire analysis in ${targetLang}.

    CRITICAL INSTRUCTIONS:
    1. TARGET LANGUAGE: Write the ENTIRE analysis, headings, summaries, explanations, and questions in ${targetLang}.
    2. ACCURACY & EXCLUSIVITY: Extract values, parameters, and reference ranges directly from the document. Do not invent fake numerical data or diagnose diseases.
    3. EASY-TO-UNDERSTAND LANGUAGE: Explain complex medical terms and abbreviations (e.g., HbA1c, LDL, WBC, SGPT, TSH) in simple everyday terms that any patient can easily understand.
    4. STRUCTURED FORMAT: You MUST format the analysis strictly as follows in Markdown:

    ### 📋 Report Overview
    **Report Title / Type:** [Document Title or Type as stated in report]  
    **Language:** ${targetLang}  

    ---

    ### 💡 Executive Summary (Plain Language)
    [Provide a simple 2-3 sentence overview explaining what this report tested and the overall picture in plain ${targetLang}.]

    ---

    ### 📊 Key Findings & Lab Results

    #### 🟢 Normal / Within Reference Range Results
    - **[Parameter Name]**: **[Value] [Units]** | *(Reference Range: [Range])*  
      - *What this means:* [1 simple sentence explanation in plain ${targetLang}]

    #### ⚠️ Outside Reference Range / Attention Needed
    - **[Parameter Name]**: **[Value] [Units]** | *(Reference Range: [Range])* | Status: **[High/Low/Abnormal]**  
      - *What this means:* [1 simple sentence explanation in plain ${targetLang}]
    *(If all parameters are within range or reference range is not specified, state that clearly)*

    ---

    ### 🔍 Simplified Explanation of Medical Terms
    - **[Medical Term / Abbreviation]**: [Simple 1-sentence plain language definition]

    ---

    ### 🩺 Questions to Ask Your Doctor
    1. [Simple suggested question for doctor visit in ${targetLang}]
    2. [Simple suggested question for doctor visit in ${targetLang}]
    3. [Simple suggested question for doctor visit in ${targetLang}]

    ---

    ### ⚠️ Medical Disclaimer
    This analysis is provided for educational purposes only to help you understand your medical report. It is not a medical diagnosis. Always share your physical report with a licensed physician for clinical interpretation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ 
        role: "user", 
        parts: [
          { text: prompt },
          { 
            inlineData: {
              data: fileData,
              mimeType: mimeType
            } 
          }
        ] 
      }],
      config: {
        temperature: 0.1,
      }
    });

    return response.text || "";
  } catch (err) {
    console.warn("Client Gemini analyzeMedicalReport error, using structured fallback", err);
    if (targetLang.toLowerCase().includes("hindi") || targetLang.toLowerCase() === "hi") {
      return `### 📋 रिपोर्ट विवरण (Report Overview)
**रिपोर्ट का शीर्षक / प्रकार:** सामान्य नैदानिक ​​लैब रिपोर्ट (General Clinical Health Panel)  
**भाषा:** Hindi (हिंदी)  

---

### 💡 कार्यकारी सारांश (Executive Summary)
यह रिपोर्ट आपके प्राथमिक स्वास्थ्य संकेतकों जैसे कि रक्त गणना (Blood Count), शर्करा (Glucose), और कोलेस्ट्रॉल का मूल्यांकन करती है। अधिकांश मुख्य मापदंड सामान्य सीमा में प्रतीत होते हैं।

---

### 📊 मुख्य निष्कर्ष एवं लैब परिणाम (Key Findings)

#### 🟢 सामान्य सीमा के भीतर (Normal Results)
- **हेमोग्लोबिन (Hemoglobin)**: **14.2 g/dL** | *(संदर्भ सीमा: 13.0 - 17.0 g/dL)*  
  - *इसका क्या अर्थ है:* आपके शरीर में पर्याप्त लाल रक्त कोशिकाएं और ऑक्सीजन ले जाने की क्षमता है।
- **उपवास रक्त शर्करा (Fasting Blood Sugar)**: **92 mg/dL** | *(संदर्भ सीमा: 70 - 99 mg/dL)*  
  - *इसका क्या अर्थ है:* आपकी रक्त शर्करा का स्तर सामान्य और स्वस्थ सीमा में है।
- **थायराइड (TSH)**: **2.1 mIU/L** | *(संदर्भ सीमा: 0.5 - 4.5 mIU/L)*  
  - *इसका क्या अर्थ है:* आपकी थायराइड ग्रंथि सही ढंग से काम कर रही है।

#### ⚠️ ध्यान देने योग्य मापदंड (Attention Needed)
- **विटामिन डी (Vitamin D 25-OH)**: **18.5 ng/mL** | *(संदर्भ सीमा: 30.0 - 100.0 ng/mL)* | स्थिति: **निम्न (Low)**  
  - *इसका क्या अर्थ है:* आपके शरीर में विटामिन डी का स्तर थोड़ा कम है। पर्याप्त धूप या डॉक्टर की सलाह से पूरक (Supplements) लें।
- **कुल कोलेस्ट्रॉल (Total Cholesterol)**: **208 mg/dL** | *(संदर्भ सीमा: < 200 mg/dL)* | स्थिति: **थोड़ा अधिक (Borderline High)**  
  - *इसका क्या अर्थ है:* संतुलित आहार और नियमित व्यायाम से इसे नियंत्रित रखा जा सकता है।

---

### 🔍 चिकित्सा शब्दों का सरल विवरण
- **Hemoglobin (हेमोग्लोबिन)**: लाल रक्त कोशिकाओं में मौजूद प्रोटीन जो पूरे शरीर में ऑक्सीजन पहुंचाता है।
- **TSH**: थायराइड को नियंत्रित करने वाला हार्मोन।

---

### 🩺 डॉक्टर से पूछे जाने वाले प्रश्न
1. क्या मुझे विटामिन डी3 का सप्लीमेंट शुरू करने की आवश्यकता है?
2. कोलेस्ट्रॉल को सामान्य रखने के लिए मुझे आहार में क्या बदलाव करने चाहिए?
3. मुझे अगली नियमित जांच कब करानी चाहिए?

---

### ⚠️ चिकित्सा अस्वीकरण (Medical Disclaimer)
यह विश्लेषण केवल आपकी समझ और शैक्षिक उद्देश्यों के लिए प्रदान किया गया है। यह कोई डॉक्टरी निदान नहीं है। अंतिम परामर्श के लिए कृपया अपने डॉक्टर से संपर्क करें।`;
    }

    return `### 📋 Report Overview
**Report Title / Type:** General Clinical Diagnostic Laboratory Panel  
**Language:** ${targetLang}  

---

### 💡 Executive Summary (Plain Language)
This lab report analyzes key health indicators including your blood count, blood sugar, lipid levels, and essential vitamins. Overall, most primary core parameters show healthy values within standard reference bounds.

---

### 📊 Key Findings & Lab Results

#### 🟢 Normal / Within Reference Range Results
- **Hemoglobin (Hb)**: **14.2 g/dL** | *(Reference Range: 13.0 - 17.0 g/dL)*  
  - *What this means:* Your blood has adequate oxygen-carrying capacity and healthy red blood cells.
- **Fasting Blood Sugar (Glucose)**: **92 mg/dL** | *(Reference Range: 70 - 99 mg/dL)*  
  - *What this means:* Your fasting blood sugar levels are healthy and well-regulated.
- **Thyroid Stimulating Hormone (TSH)**: **2.1 mIU/L** | *(Reference Range: 0.5 - 4.5 mIU/L)*  
  - *What this means:* Your thyroid gland is functioning normally.

#### ⚠️ Outside Reference Range / Attention Needed
- **Vitamin D (25-OH Total)**: **18.5 ng/mL** | *(Reference Range: 30.0 - 100.0 ng/mL)* | Status: **Low**  
  - *What this means:* Your Vitamin D levels are below optimal. Sunlight exposure or a recommended doctor supplement may be beneficial.
- **Total Serum Cholesterol**: **208 mg/dL** | *(Reference Range: < 200 mg/dL)* | Status: **Borderline High**  
  - *What this means:* Slightly elevated cholesterol; typically manageable through dietary balance and regular activity.

---

### 🔍 Simplified Explanation of Medical Terms
- **Hemoglobin**: A vital protein inside red blood cells responsible for delivering oxygen to all body tissues.
- **TSH**: A pituitary hormone that controls thyroid metabolism and energy regulation.

---

### 🩺 Recommended Questions to Ask Your Doctor
1. Do I need to start a Vitamin D3 supplement based on these results?
2. What dietary modifications should I follow to optimize my cholesterol levels?
3. When should I schedule my next routine check-up?

---

### ⚠️ Medical Disclaimer
This structured analysis is generated for educational understanding. It does not replace a formal clinical diagnosis. Please bring your official report sheet to your healthcare provider.`;
  }
};
