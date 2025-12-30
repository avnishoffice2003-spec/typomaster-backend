const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Configuration
// ... imports ...

const GOOGLE_KEYFILE = './googlekey.json'; 
const DRIVE_FOLDER_ID = '1UzNYyjqfOuSFXv1hShiIkxyvZp_zidCZ'; // Your ID from the logs

// --- UPDATED DEBUG SECTION ---
console.log("---------------------------------------");
console.log("DEBUG CHECK: Folder ID is:", DRIVE_FOLDER_ID);

try {
    const keyData = require(GOOGLE_KEYFILE);
    console.log("DEBUG CHECK: The Robot Email is:", keyData.client_email); 
    // ^^^ THIS WILL TELL YOU THE EXACT EMAIL TO SHARE ^^^
} catch (e) {
    console.log("DEBUG CHECK: Could not read email from key file");
}
console.log("---------------------------------------");
// -----------------------------

// ... rest of code ...

// 2. Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// 3. Multer (File Handling)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// 4. Google Drive Auth
const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_KEYFILE,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

// 5. Helper: Upload to Drive
const uploadToDrive = async (fileObject, fileName) => {
    const driveService = google.drive({ version: 'v3', auth });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);

    const response = await driveService.files.create({
        resource: { name: fileName, parents: [DRIVE_FOLDER_ID] },
        media: { mimeType: fileObject.mimetype, body: bufferStream },
        fields: 'id'
    });
    return response.data.id;
};

// --- ROUTES ---

// In-Memory Database
let orders = [];

// GET Orders
app.get('/api/orders', (req, res) => res.json(orders));

// POST: Create Order (Step 1: ID Proof)
app.post('/api/orders', upload.single('idProof'), async (req, res) => {
    try {
        console.log("Receiving Order...");
        const orderData = JSON.parse(req.body.orderData);
        
        let fileId = "No File";
        if (req.file) {
            console.log("Uploading ID Proof...");
            const newName = `${orderData.order_id}_ID_PROOF${path.extname(req.file.originalname)}`;
            fileId = await uploadToDrive(req.file, newName);
        }

        const finalOrder = { ...orderData, driveFileId: fileId, videoFileId: "Pending" };
        orders.push(finalOrder);
        
        res.status(201).json({ message: "Order Saved", order: finalOrder });
    } catch (error) {
        console.error("Order Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Upload Video (Step 2: Video KYC)
app.post('/api/orders/video', upload.single('video'), async (req, res) => {
    try {
        console.log("Receiving Video...");
        const orderId = req.body.orderId;
        
        if (req.file) {
            console.log(`Uploading Video for ${orderId}...`);
            const newName = `${orderId}_KYC_VIDEO.webm`; 
            const fileId = await uploadToDrive(req.file, newName);
            
            // Update the order status
            const order = orders.find(o => o.order_id === orderId);
            if (order) order.videoFileId = fileId;

            console.log("Video Upload Success:", fileId);
            res.json({ message: "Video Uploaded", fileId: fileId });
        } else {
            console.log("No video file received");
            res.status(400).json({ message: "No video file received" });
        }
    } catch (error) {
        console.error("Video Error:", error); // Check Render Logs for this!
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));