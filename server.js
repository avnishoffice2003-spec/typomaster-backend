const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
// Allow Netlify Frontend to talk to this Backend
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// THIS GETS THE KEY FROM RENDER SETTINGS
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 1. HEALTH CHECK (To see if server is alive)
app.get('/', (req, res) => {
    res.send('🦄 Typomaster AI Engine is Running!');
});

// 2. AI DRAFT GENERATOR
app.post('/generate-ai-draft', async (req, res) => {
    try {
        const { serviceType, details } = req.body;
        console.log(`🤖 AI is drafting a ${serviceType}...`);

        // A. The Instruction for AI
        const prompt = `
        Act as a Senior Legal Expert in India. Write a professional ${serviceType}.
        Details: ${JSON.stringify(details)}
        Rules:
        1. Use formal legal language suitable for Indian courts.
        2. Do not use placeholders like [Date], use today's date.
        3. Return ONLY the document text. No "Here is your draft" intro.
        `;

        // B. Ask AI
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const draftText = response.text();

        // C. Send back to Website
        res.json({ status: "success", draft: draftText });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ status: "error", message: "AI Failed. Check Server Logs." });
    }
});

// 3. START SERVER
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});