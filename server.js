require('dotenv').config(); // Load secrets
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// 2. Database (Memory)
let orders = [];

// 3. Email Configuration (The Unicorn Feature)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Reads from .env
        pass: process.env.EMAIL_PASS  // Reads from .env
    }
});

// 4. Routes

// GET: Fetch All Orders
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// GET: Fetch Single Order
app.get('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.order_id === req.params.id);
    if (order) res.json(order);
    else res.status(404).json({ message: "Not Found" });
});

// POST: Create Order & Send Email
app.post('/api/orders', (req, res) => {
    const newOrder = req.body;
    orders.push(newOrder);
    
    console.log("New Order:", newOrder.order_id);

    // --- EMAIL LOGIC START ---
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Sends to YOU (The Admin)
        subject: `🔥 New Order: ${newOrder.order_id} - ${newOrder.clientName}`,
        html: `
            <h2>New Legal Service Order Received</h2>
            <p><strong>Order ID:</strong> ${newOrder.order_id}</p>
            <p><strong>Client:</strong> ${newOrder.clientName}</p>
            <p><strong>Service:</strong> ${newOrder.services}</p>
            <p><strong>Amount Paid:</strong> ${newOrder.amountPaid}</p>
            <p><strong>Address:</strong> ${newOrder.address}</p>
            <br>
            <a href="https://shiny-crepe-63501e.netlify.app/admin" style="background:#d4af37; color:black; padding:10px 20px; text-decoration:none; border-radius:5px;">Open Admin Panel</a>
        `
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.log("Email Error:", err);
        else console.log("Email Sent:", info.response);
    });
    // --- EMAIL LOGIC END ---

    res.status(201).json({ message: "Order Saved & Email Sent", order: newOrder });
});

// PATCH: Update Status
app.patch('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.order_id === req.params.id);
    if (order) {
        order.status = req.body.status;
        res.json({ message: "Updated", order: order });
    } else {
        res.status(404).json({ message: "Not Found" });
    }
});

// DELETE: Remove Order
app.delete('/api/orders/:id', (req, res) => {
    orders = orders.filter(o => o.order_id !== req.params.id);
    res.json({ message: "Deleted" });
});

app.listen(PORT, () => {
    console.log(`Unicorn Server running on port ${PORT}`);
});