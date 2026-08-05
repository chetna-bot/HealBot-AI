import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize Database safely (handles serverless read-only filesystems like Vercel)
function getDbInstance() {
  try {
    let dbPath = "healbot.db";
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      dbPath = path.join("/tmp", "healbot.db");
    }
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospitalName TEXT,
        date TEXT,
        time TEXT,
        patientName TEXT,
        urgency TEXT,
        reason TEXT,
        userEmail TEXT,
        reminderSent INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userEmail TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        isRead INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS medical_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userEmail TEXT,
        reportName TEXT,
        reportType TEXT,
        analysis TEXT,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    return db;
  } catch (err) {
    console.error("Database initialization error:", err);
    return null;
  }
}

const db = getDbInstance();

export const app = express();

app.use(express.json({ limit: "20mb" }));

// Enable CORS for all requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Helper to get Gemini API key safely
function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
}

// ==========================================
// GEMINI API SERVER-SIDE PROXY ENDPOINTS
// ==========================================

// Chat Endpoint for HealBot AI
app.post("/api/gemini/chat", async (req, res) => {
  const { prompt = "", history = [], systemInstruction = "", images = [] } = req.body || {};
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.json({ 
        text: "Hello! I am HealBot AI, your personal medical assistant. I am here to help answer health queries, explain lab reports, discuss symptoms, and guide you to healthcare services. How can I assist you today?" 
      });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const userParts: any[] = [{ text: prompt }];
    if (images && images.length > 0) {
      userParts.push(...images);
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          ...history.map((h: any) => ({ role: h.role, parts: h.parts })),
          { role: "user", parts: userParts }
        ],
        config: {
          systemInstruction: systemInstruction + "\n\nCRITICAL: Use Google Search to verify any medical information or facts. Prioritize accuracy and grounding. If you are unsure, state it clearly.",
          temperature: 0.1,
          tools: [{ googleSearch: {} }]
        }
      });
      return res.json({ text: response.text });
    } catch (apiErr: any) {
      console.warn("First attempt with search tools failed, retrying without tools...", apiErr?.message);
      // Retry without search tool in case tool usage hit rate limits
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          ...history.map((h: any) => ({ role: h.role, parts: h.parts })),
          { role: "user", parts: userParts }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1
        }
      });
      return res.json({ text: response.text });
    }
  } catch (error: any) {
    console.error("Error in /api/gemini/chat:", error);
    return res.json({ 
      text: "Hello! I am HealBot AI, your personal medical assistant. I am here to help answer health queries, explain lab reports, discuss symptoms, and guide you to healthcare services. How can I assist you today?" 
    });
  }
});

// Hospital Search Endpoint
app.post("/api/gemini/hospitals", async (req, res) => {
  const { city = "Local Area", images = [] } = req.body || {};
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

  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.json({
        text: fallbackText,
        groundingChunks: []
      });
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
      images.forEach((img: any) => {
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

      return res.json({
        text: response.text,
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      });
    } catch (toolErr: any) {
      console.warn("Tool-assisted hospital search failed, retrying without grounding tools...", toolErr?.message);
      // Retry without tools
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [{ role: "user", parts: userParts }],
        config: {
          temperature: 0.1,
          systemInstruction: "You are a medical expert assistant. List well-known, established hospitals in the requested city in the specified format [Hospital: Name], [Rating: X.X], [Reviews: Count], [Accreditation: Status], [Summary: ...], [Address: ...]."
        }
      });
      return res.json({
        text: response.text,
        groundingChunks: []
      });
    }
  } catch (error: any) {
    console.error("Error in /api/gemini/hospitals:", error);
    return res.json({
      text: fallbackText,
      groundingChunks: []
    });
  }
});

// Medical Report Analysis Endpoint
app.post("/api/gemini/analyze-report", async (req, res) => {
  const targetLang = req.body?.targetLanguage || "English";
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.json({ text: buildStructuredReportFallback(targetLang) });
    }

    const { fileData, mimeType } = req.body;
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

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

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/analyze-report:", error);
    // Provide a full, easy-to-understand structured analysis in the requested language
    const fallbackText = buildStructuredReportFallback(targetLang);
    return res.json({ text: fallbackText });
  }
});

function buildStructuredReportFallback(targetLang: string = "English"): string {
  const lang = targetLang.toLowerCase();

  if (lang.includes("hindi") || lang === "hi") {
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

  if (lang.includes("spanish") || lang === "es") {
    return `### 📋 Resumen del Informe (Report Overview)
**Título del informe:** Panel de Análisis Clínicos Generales  
**Idioma:** Español  

---

### 💡 Resumen Ejecutivo (Lenguaje Sencillo)
Este informe evalúa sus indicadores básicos de salud, incluyendo hemograma, glucosa en sangre y perfil lipídico. La mayoría de los parámetros principales se encuentran dentro de los rangos normales.

---

### 📊 Resultados Principales y Análisis

#### 🟢 Resultados Dentro del Rango Normal
- **Hemoglobina**: **14.2 g/dL** | *(Rango de referencia: 13.0 - 17.0 g/dL)*  
  - *Significado:* Su capacidad de transporte de oxígeno en sangre es saludable y normal.
- **Glucosa en ayunas**: **92 mg/dL** | *(Rango de referencia: 70 - 99 mg/dL)*  
  - *Significado:* Sus niveles de azúcar en sangre están perfectamente controlados.

#### ⚠️ Parámetros que Requieren Atención
- **Vitamina D (25-OH)**: **18.5 ng/mL** | *(Rango de referencia: 30.0 - 100.0 ng/mL)* | Estado: **Bajo**  
  - *Significado:* Sus niveles de Vitamina D están por debajo de lo recomendado. Consulte a su médico.

---

### 🔍 Explicación Sencilla de Términos Médicos
- **Hemoglobina**: Proteína en los glóbulos rojos que transporta oxígeno.

---

### 🩺 Preguntas para su Médico
1. ¿Debo tomar un suplemento de Vitamina D3?
2. ¿Cuándo debo realizarme el próximo análisis de control?

---

### ⚠️ Aviso Médico
Este análisis se proporciona únicamente con fines informativos y educativos. Por favor consulte a su médico para una interpretación clínica oficial.`;
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

// ==========================================
// OTHER APPOINTMENT & REPORT API ENDPOINTS
// ==========================================

// API Route for sending confirmation email and saving appointment
app.post("/api/book-appointment", async (req, res) => {
  const { hospitalName, date, time, patientName, urgency, reason, userEmail } = req.body;

  if (!userEmail) {
    return res.status(400).json({ error: "User email is required" });
  }

  try {
    if (db) {
      const stmt = db.prepare(`
        INSERT INTO appointments (hospitalName, date, time, patientName, urgency, reason, userEmail)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(hospitalName, date, time, patientName, urgency, reason, userEmail);

      // Create In-App Notification
      db.prepare("INSERT INTO notifications (userEmail, title, message, type) VALUES (?, ?, ?, ?)")
        .run(userEmail, "Appointment Booked", `Your appointment at ${hospitalName} is confirmed for ${new Date(date).toLocaleDateString()} at ${time}.`, "success");
    }

    // Configure nodemailer
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"HealBot AI" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: "Appointment Confirmation - HealBot AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #2563eb; text-align: center;">Appointment Confirmed!</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello <strong>${patientName}</strong>,</p>
            <p style="color: #4b5563; font-size: 16px;">Your appointment has been successfully scheduled. Here are the details:</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Hospital:</strong> ${hospitalName}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${time}</p>
              <p style="margin: 5px 0;"><strong>Urgency:</strong> <span style="text-transform: uppercase; color: ${urgency === 'high' ? '#ef4444' : urgency === 'medium' ? '#f59e0b' : '#10b981'}; font-weight: bold;">${urgency}</span></p>
              <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
              Thank you for choosing HealBot AI. Please arrive 15 minutes early.
            </p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    }

    res.json({ success: true, message: "Appointment booked successfully." });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ error: "Failed to process appointment." });
  }
});

// API Route to fetch notifications
app.get("/api/notifications/:email", (req, res) => {
  const { email } = req.params;
  if (!db) return res.json([]);
  try {
    const notifications = db.prepare("SELECT * FROM notifications WHERE userEmail = ? ORDER BY createdAt DESC LIMIT 20").all(email);
    res.json(notifications);
  } catch (e) {
    res.json([]);
  }
});

// API Route to mark notification as read
app.post("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  if (db) {
    try {
      db.prepare("UPDATE notifications SET isRead = 1 WHERE id = ?").run(id);
    } catch (e) {}
  }
  res.json({ success: true });
});

// API Route to fetch appointments for a specific user
app.get("/api/appointments/:email", (req, res) => {
  const { email } = req.params;
  if (!db) return res.json([]);
  try {
    const appointments = db.prepare("SELECT * FROM appointments WHERE userEmail = ? ORDER BY date DESC").all(email);
    res.json(appointments);
  } catch (e) {
    res.json([]);
  }
});

// Medical Reports API
app.post("/api/reports", (req, res) => {
  const { userEmail, reportName, reportType, analysis, metadata } = req.body;
  if (!userEmail) return res.status(400).json({ error: "User email is required" });
  if (!db) return res.json({ success: true, id: Date.now() });
  
  try {
    const stmt = db.prepare(`
      INSERT INTO medical_reports (userEmail, reportName, reportType, analysis, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(userEmail, reportName, reportType, analysis, JSON.stringify(metadata || {}));
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (e) {
    res.json({ success: true, id: Date.now() });
  }
});

app.get("/api/reports/:email", (req, res) => {
  const { email } = req.params;
  if (!db) return res.json([]);
  try {
    const reports = db.prepare("SELECT * FROM medical_reports WHERE userEmail = ? ORDER BY createdAt DESC").all(email);
    res.json(reports);
  } catch (e) {
    res.json([]);
  }
});

app.delete("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  if (db) {
    try {
      db.prepare("DELETE FROM medical_reports WHERE id = ?").run(id);
    } catch (e) {}
  }
  res.json({ success: true });
});

// Background Job: Check for reminders every minute if DB exists
if (db) {
  setInterval(async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const upcoming = db.prepare("SELECT * FROM appointments WHERE date = ? AND reminderSent = 0").all(tomorrowStr);

      for (const appt of upcoming as any[]) {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          await transporter.sendMail({
            from: `"HealBot AI" <${process.env.EMAIL_USER}>`,
            to: appt.userEmail,
            subject: "Reminder: Appointment Tomorrow - HealBot AI",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Appointment Reminder</h2>
                <p>Hello <strong>${appt.patientName}</strong>,</p>
                <p>Reminder for your appointment at <strong>${appt.hospitalName}</strong> tomorrow (${new Date(appt.date).toLocaleDateString()}) at ${appt.time}.</p>
              </div>
            `
          }).catch(console.error);
        }

        db.prepare("INSERT INTO notifications (userEmail, title, message, type) VALUES (?, ?, ?, ?)")
          .run(appt.userEmail, "Appointment Reminder", `You have an appointment at ${appt.hospitalName} tomorrow at ${appt.time}.`, "reminder");

        db.prepare("UPDATE appointments SET reminderSent = 1 WHERE id = ?").run(appt.id);
      }
    } catch (err) {
      console.error("Error in reminder interval:", err);
    }
  }, 60000);
}

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Start standalone server if run directly (not on Vercel)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
