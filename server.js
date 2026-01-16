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
const DRIVE_FOLDER_ID = '1UzNYyjqfOuSFXv1hShilkxyvZp_zidCZ'; 

// --- MIDDLEWARE ---
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// --- MULTER SETUP ---
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
});

// --- GOOGLE AUTH ---
const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_KEYFILE,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

// --- UPLOAD HELPER ---
const uploadToDrive = async (fileObject, fileName) => {
    try {
        console.log(`Starting upload for: ${fileName}`);
        const driveService = google.drive({ version: 'v3', auth });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileObject.buffer);

        const response = await driveService.files.create({
            requestBody: { name: fileName, parents: [DRIVE_FOLDER_ID] },
            media: { mimeType: fileObject.mimetype, body: bufferStream },
            fields: 'id'
        });
        console.log(`Upload Complete. ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error("GOOGLE DRIVE ERROR:", error.message);
        throw error;
    }
};

// --- ROUTES ---

// 1. Health Check
app.get('/', (req, res) => res.send('Typomaster Server is Live! 🚀'));

// 2. Orders Route
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

// 3. VIDEO UPLOAD ROUTE
app.post('/api/orders/video', upload.single('video'), async (req, res) => {
    try {
        console.log("Receiving Video Request...");
        const orderId = req.body.orderId || "UNKNOWN_ORDER";
        
        if (!req.file) {
            return res.status(400).json({ message: "No video file received" });
        }

        const newName = `${orderId}_KYC_VIDEO.webm`; 
        const fileId = await uploadToDrive(req.file, newName);
        
        // Update order status if found
        const order = orders.find(o => o.order_id === orderId);
        if (order) order.videoFileId = fileId;

        res.json({ message: "Video Uploaded", fileId: fileId });

    } catch (error) {
        console.error("VIDEO ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

// STARTUP TEST
async function testDriveConnection() {
    console.log("---------------------------------------");
    console.log("🔍 STARTUP TEST: Checking Connection...");
    try {
        const driveService = google.drive({ version: 'v3', auth });
        await driveService.files.create({
            resource: { name: 'SERVER_CONNECTION_TEST.txt', parents: [DRIVE_FOLDER_ID] },
            media: { mimeType: 'text/plain', body: 'If you see this, it works!' },
            fields: 'id'
        });
        console.log("✅ SUCCESS! Connected to Drive.");
    } catch (error) {
        console.error("❌ ERROR: ", error.message);
    }
    console.log("---------------------------------------");
}
// NEW STARTUP TEST (Identity Check)
async function testDriveConnection() {
    console.log("---------------------------------------");
    console.log("🔍 DIAGNOSIS STARTING...");
    try {
        // 1. Check who is logged in
        const key = require(GOOGLE_KEYFILE);
        console.log("🤖 I AM LOGGED IN AS:", key.client_email);
        console.log("📂 TRYING TO OPEN FOLDER ID:", DRIVE_FOLDER_ID);

        // 2. Try to create file
        const driveService = google.drive({ version: 'v3', auth });
        await driveService.files.create({
            resource: { name: 'IDENTITY_TEST.txt', parents: [DRIVE_FOLDER_ID] },
            media: { mimeType: 'text/plain', body: 'Checking if ID matches Email.' },
            fields: 'id'
        });
        console.log("✅ SUCCESS! Connected to Drive.");
    } catch (error) {
        console.error("❌ ERROR: ", error.message);
        console.log("⚠️ CHECK: Does the email above match the one in your Drive Share settings?");
    }
    console.log("---------------------------------------");
}
testDriveConnection();

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
// Final Restart





