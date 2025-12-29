const express = require('express');
const cors = require('cors');
const multer = require('multer'); // Handles file uploads
const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Configuration
const GOOGLE_KEYFILE = './googlekey.json'; // The file you downloaded
const DRIVE_FOLDER_ID = '1UzNYyjqfOuSFXv1hShiIkxyvZp_zidCZ'; // <--- PASTE FOLDER ID HERE

// 2. Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// 3. Multer Setup (Stores file in RAM temporarily)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Limit to 5MB to prevent crashing
});

// 4. Google Drive Connection
const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_KEYFILE,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

// 5. Helper Function: Upload to Drive
const uploadToDrive = async (fileObject, fileName) => {
    const driveService = google.drive({ version: 'v3', auth });
    
    // Convert Buffer to Stream
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);

    const fileMetadata = {
        name: fileName,
        parents: [DRIVE_FOLDER_ID]
    };
    
    const media = {
        mimeType: fileObject.mimetype,
        body: bufferStream
    };

    const response = await driveService.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    });
    return response.data.id;
};

// --- ROUTES ---

// DATABASE (Memory)
let orders = [];

// GET Orders
app.get('/api/orders', (req, res) => res.json(orders));
app.get('/api/orders/:id', (req, res) => {
    const o = orders.find(x => x.order_id === req.params.id);
    if(o) res.json(o); else res.status(404).json({msg:"Not found"});
});

// POST: Create Order WITH FILE (The Magic Route)
// 'idProof' is the name of the input field in HTML
app.post('/api/orders', upload.single('idProof'), async (req, res) => {
    try {
        console.log("Receiving Order...");
        
        // 1. Extract Text Data (Multer puts text in req.body)
        const orderData = JSON.parse(req.body.orderData); // We will send JSON stringified
        
        // 2. Handle File Upload (If exists)
        let fileId = "No File";
        if (req.file) {
            console.log("Uploading file to Drive...");
            // Rename file: "TM-1234_ID_PROOF.jpg"
            const newName = `${orderData.order_id}_ID_PROOF${path.extname(req.file.originalname)}`;
            fileId = await uploadToDrive(req.file, newName);
            console.log("File Uploaded ID:", fileId);
        }

        // 3. Save Order
        const finalOrder = {
            ...orderData,
            driveFileId: fileId,
            status: "Order Placed"
        };
        
        orders.push(finalOrder);
        res.status(201).json({ message: "Order & File Saved", order: finalOrder });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on ${PORT}`));