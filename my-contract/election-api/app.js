const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const electionRoutes = require('./routes/election');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());





// Routes
app.use('/api', electionRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});