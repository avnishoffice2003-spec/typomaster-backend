const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// --- CONFIGURATION ---
const GOOGLE_KEYFILE = './googlekey.json'; 
const DRIVE_FOLDER_ID = '1UzNYyjqfOuSFXv1hShiIkxyvZp_zidCZ'; // Your Verified ID

// --- MIDDLEWARE (Optimized for Large Files) ---
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' })); // Allow large JSON
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// --- MULTER SETUP (50MB Limit) ---
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // Increased to 100MB
});

// --- GOOGLE AUTH ---
const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_KEYFILE,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

// --- HELPER: ROBUST UPLOAD FUNCTION ---
const uploadToDrive = async (fileObject, fileName) => {
    try {
        console.log(`Starting upload for: ${fileName}`);
        const driveService = google.drive({ version: 'v3', auth });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileObject.buffer);

        const response = await driveService.files.create({
            resource: { name: fileName, parents: [DRIVE_FOLDER_ID] },
            media: { mimeType: fileObject.mimetype, body: bufferStream },
            fields: 'id'
        });
        console.log(`Upload Complete. ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error("GOOGLE DRIVE ERROR:", error.message);
        throw error; // Pass error up to be caught
    }
};

// --- ROUTES ---

let orders = [];

app.get('/api/orders', (req, res) => res.json(orders));

app.post('/api/orders', upload.single('idProof'), async (req, res) => {
    try {
        const orderData = JSON.parse(req.body.orderData);
        let fileId = "No File";
        if (req.file) {
            const newName = `${orderData.order_id}_ID_PROOF${path.extname(req.file.originalname)}`;
            fileId = await uploadToDrive(req.file, newName);
        }
        const finalOrder = { ...orderData, driveFileId: fileId, videoFileId: "Pending" };
        orders.push(finalOrder);
        res.status(201).json({ message: "Order Saved", order: finalOrder });
    } catch (error) {
        console.error("ORDER ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- VIDEO ROUTE (With Better Error Handling) ---
app.post('/api/orders/video', upload.single('video'), async (req, res) => {
    try {
        console.log("Receiving Video Request...");
        const orderId = req.body.orderId || "UNKNOWN_ORDER";
        
        if (!req.file) {
            console.error("No video file found in request");
            return res.status(400).json({ message: "No video file received" });
        }

        console.log(`File received: ${req.file.size} bytes`);
        const newName = `${orderId}_KYC_VIDEO.webm`; 
        const fileId = await uploadToDrive(req.file, newName);
        
        const order = orders.find(o => o.order_id === orderId);
        if (order) order.videoFileId = fileId;

        res.json({ message: "Video Uploaded", fileId: fileId });

    } catch (error) {
        console.error("CRITICAL VIDEO ERROR:", error);
        // This is the error appearing in your browser. Now we log it.
        res.status(500).json({ error: error.message, details: "Check Server Logs" });
    }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
// ... existing code ...

// COPY AND PASTE THIS AT THE VERY END OF SERVER.JS
async function testDriveConnection() {
    console.log("---------------------------------------");
    console.log("🔍 STARTUP TEST: Checking Google Drive Access...");
    try {
        const driveService = google.drive({ version: 'v3', auth });
        const res = await driveService.files.create({
            resource: { name: 'SERVER_TEST_FILE.txt', parents: [DRIVE_FOLDER_ID] },
            media: { mimeType: 'text/plain', body: 'If you see this, the connection is PERFECT!' },
            fields: 'id'
        });
        console.log("✅ SUCCESS! The Robot can WRITE to the folder.");
        console.log("✅ Test File Created with ID:", res.data.id);
    } catch (error) {
        console.error("❌ CRITICAL ERROR: The Robot CANNOT write to the folder.");
        console.error("❌ Error Message:", error.message);
        
        if (error.message.includes('quota')) {
            console.error("👉 FIX: You shared the folder, but the ROBOT is trying to use its OWN drive.");
            console.error("👉 CAUSE: The Folder ID '" + DRIVE_FOLDER_ID + "' might be wrong.");
        }
        if (error.message.includes('File not found')) {
            console.error("👉 FIX: The Folder ID does not exist. Check the ID again.");
        }
    }
    console.log("---------------------------------------");
}

// Run the test immediately when server starts
testDriveConnection();