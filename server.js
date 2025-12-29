const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Middleware
app.use(cors({
    origin: '*', // Allow connections from anywhere
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// 2. Database (In-Memory)
let orders = [];

// 3. Routes

// GET: Fetch All Orders
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// GET: Fetch Single Order
app.get('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.order_id === req.params.id);
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ message: "Order not found" });
    }
});

// POST: Create Order (No Email, just Save)
app.post('/api/orders', (req, res) => {
    const newOrder = req.body;
    orders.push(newOrder);
    console.log("New Order Received:", newOrder.order_id);
    res.status(201).json({ message: "Order Saved", order: newOrder });
});

// PATCH: Update Status
app.patch('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.order_id === req.params.id);
    if (order) {
        order.status = req.body.status;
        res.json({ message: "Status Updated", order: order });
    } else {
        res.status(404).json({ message: "Order not found" });
    }
});

// DELETE: Delete Order
app.delete('/api/orders/:id', (req, res) => {
    orders = orders.filter(o => o.order_id !== req.params.id);
    res.json({ message: "Order Deleted" });
});

// 4. Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});