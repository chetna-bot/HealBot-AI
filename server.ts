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
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your Vercel Project Settings (Settings -> Environment Variables) or in your .env file." });
    }

    const { prompt, history = [], systemInstruction = "", images = [] } = req.body;
    const ai = new GoogleGenAI({ apiKey });

    const userParts: any[] = [{ text: prompt }];
    if (images && images.length > 0) {
      userParts.push(...images);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (error: any) {
    console.error("Error in /api/gemini/chat:", error);
    return res.status(500).json({ error: error.message || "Failed to communicate with AI service." });
  }
});

// Hospital Search Endpoint
app.post("/api/gemini/hospitals", async (req, res) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your Vercel Project Settings (Settings -> Environment Variables) or in your .env file." });
    }

    const { city, images = [] } = req.body;
    const ai = new GoogleGenAI({ apiKey });

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (error: any) {
    console.error("Error in /api/gemini/hospitals:", error);
    return res.status(500).json({ error: error.message || "Failed to search hospitals." });
  }
});

// Medical Report Analysis Endpoint
app.post("/api/gemini/analyze-report", async (req, res) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your Vercel Project Settings (Settings -> Environment Variables) or in your .env file." });
    }

    const { fileData, mimeType } = req.body;
    const ai = new GoogleGenAI({ apiKey });

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
              data: fileData,
              mimeType: mimeType
            } 
          }
        ] 
      }],
      config: {
        temperature: 0.0,
      }
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/analyze-report:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze medical report." });
  }
});

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
