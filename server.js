const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Middleware (Security & Data Parsing)
app.use(cors({
    origin: '*', // Allow connections from anywhere
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json()); // Allow server to read JSON data

// 2. In-Memory Database (Resets when server restarts)
// Ideally, you would use MongoDB here, but this works perfectly for a demo.
let orders = []; 

// 3. ROUTES (The API Logic)

// GET: Admin panel asks "Give me all orders"
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// GET: Track page asks "Where is Order TM-1234?"
app.get('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.order_id === req.params.id);
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ message: "Order not found" });
    }
});

// POST: Order page sends "Here is a new order"
app.post('/api/orders', (req, res) => {
    const newOrder = req.body;
    orders.push(newOrder); // Save it to our list
    console.log("New Order Received:", newOrder.order_id);
    res.status(201).json({ message: "Order Saved", order: newOrder });
});

// PATCH: Admin updates status "Mark as Dispatched"
app.patch('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.order_id === req.params.id);
    if (order) {
        order.status = req.body.status; // Update status
        res.json({ message: "Status Updated", order: order });
    } else {
        res.status(404).json({ message: "Order not found" });
    }
});

// DELETE: Admin deletes an order
app.delete('/api/orders/:id', (req, res) => {
    orders = orders.filter(o => o.order_id !== req.params.id);
    res.json({ message: "Order Deleted" });
});

// 4. Start the Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});