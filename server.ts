import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

// Initialize Database
const db = new Database("healbot.db");

// Create tables if they don't exist
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending confirmation email and saving appointment
  app.post("/api/book-appointment", async (req, res) => {
    const { hospitalName, date, time, patientName, urgency, reason, userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "User email is required" });
    }

    // Save to database
    const stmt = db.prepare(`
      INSERT INTO appointments (hospitalName, date, time, patientName, urgency, reason, userEmail)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(hospitalName, date, time, patientName, urgency, reason, userEmail);

    // Configure nodemailer
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

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
      }

      // Create In-App Notification for successful booking
      db.prepare("INSERT INTO notifications (userEmail, title, message, type) VALUES (?, ?, ?, ?)")
        .run(userEmail, "Appointment Booked", `Your appointment at ${hospitalName} is confirmed for ${new Date(date).toLocaleDateString()} at ${time}.`, "success");

      res.json({ success: true, message: "Appointment booked and confirmation sent." });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send confirmation email." });
    }
  });

  // API Route to fetch notifications
  app.get("/api/notifications/:email", (req, res) => {
    const { email } = req.params;
    const notifications = db.prepare("SELECT * FROM notifications WHERE userEmail = ? ORDER BY createdAt DESC LIMIT 20").all(email);
    res.json(notifications);
  });

  // API Route to mark notification as read
  app.post("/api/notifications/:id/read", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE notifications SET isRead = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // API Route to fetch appointments for a specific user
  app.get("/api/appointments/:email", (req, res) => {
    const { email } = req.params;
    const appointments = db.prepare("SELECT * FROM appointments WHERE userEmail = ? ORDER BY date DESC").all(email);
    res.json(appointments);
  });

  // Medical Reports API
  app.post("/api/reports", (req, res) => {
    const { userEmail, reportName, reportType, analysis, metadata } = req.body;
    if (!userEmail) return res.status(400).json({ error: "User email is required" });
    
    const stmt = db.prepare(`
      INSERT INTO medical_reports (userEmail, reportName, reportType, analysis, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(userEmail, reportName, reportType, analysis, JSON.stringify(metadata || {}));
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.get("/api/reports/:email", (req, res) => {
    const { email } = req.params;
    const reports = db.prepare("SELECT * FROM medical_reports WHERE userEmail = ? ORDER BY createdAt DESC").all(email);
    res.json(reports);
  });

  app.delete("/api/reports/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM medical_reports WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Background Job: Check for reminders every minute
  setInterval(async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find appointments for tomorrow that haven't had a reminder sent
    const upcoming = db.prepare("SELECT * FROM appointments WHERE date = ? AND reminderSent = 0").all(tomorrowStr);

    for (const appt of upcoming as any[]) {
      console.log(`Sending reminder for appointment ${appt.id} to ${appt.userEmail}`);

      // 1. Send Email Reminder
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"HealBot AI" <${process.env.EMAIL_USER}>`,
        to: appt.userEmail,
        subject: "Reminder: Appointment Tomorrow - HealBot AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #2563eb; text-align: center;">Appointment Reminder</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello <strong>${appt.patientName}</strong>,</p>
            <p style="color: #4b5563; font-size: 16px;">This is a reminder for your appointment scheduled for tomorrow.</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Hospital:</strong> ${appt.hospitalName}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(appt.date).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${appt.time}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
              We look forward to seeing you. Please arrive 15 minutes early.
            </p>
          </div>
        `,
      };

      try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          await transporter.sendMail(mailOptions);
        }

        // 2. Create In-App Notification
        db.prepare("INSERT INTO notifications (userEmail, title, message, type) VALUES (?, ?, ?, ?)")
          .run(appt.userEmail, "Appointment Reminder", `You have an appointment at ${appt.hospitalName} tomorrow at ${appt.time}.`, "reminder");

        // 3. Mark as sent
        db.prepare("UPDATE appointments SET reminderSent = 1 WHERE id = ?").run(appt.id);
      } catch (error) {
        console.error("Error sending reminder:", error);
      }
    }
  }, 60000); // Run every minute

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

startServer();
