const express = require('express');
const axios = require('axios'); // For HTTP requests
const app = express();

app.use(express.json());
app.use(express.static('public'));

// JSONBin configuration
const JSONBIN_API_KEY = '$2a$10$WWJZAd9FY4XjoOVyMtIRauSZjVfF/T2jRCL/QHY0QOIO8zm/VU.y2'; // Replace with your actual API key
const SINGLE_MODE_BIN_ID = '6783b580e41b4d34e4762a1f'; // Replace with your Single Mode Bin ID
const DOUBLE_MODE_BIN_ID = '6783b55ce41b4d34e4762a15'; // Replace with your Double Mode Bin ID

// JSONBin API URLs
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

async function fetchBinData(binId) {
    try {
        const response = await axios.get(`${JSONBIN_BASE_URL}/${binId}`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
            },
        });
        return response.data.record; // JSONBin stores data inside "record"
    } catch (error) {
        console.error('Error fetching data from JSONBin:', error);
        throw new Error('Could not fetch data from JSONBin');
    }
}

async function updateBinData(binId, updatedData) {
    try {
        await axios.put(`${JSONBIN_BASE_URL}/${binId}`, updatedData, {
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY,
            },
        });
    } catch (error) {
        console.error('Error updating JSONBin:', error);
        throw new Error('Could not update JSONBin');
    }
}

// Serve images.json (local file or static data)
app.get('/images.json', (req, res) => {
    res.sendFile(`${__dirname}/images.json`); // Ensure images.json exists in your root directory
});

// Save Single Mode ratings
app.post('/save-rating/single', async (req, res) => {
    const { shelfmark, url, rating, user, timestamp } = req.body;

    if (!shelfmark || !url || !rating || !user || !timestamp) {
        return res.status(400).send("Missing required fields.");
    }

    try {
        // Fetch existing ratings
        const data = await fetchBinData(SINGLE_MODE_BIN_ID);
        const ratings = data.ratings || [];

        // Add the new rating
        ratings.push({ shelfmark, url, rating, user, timestamp });

        // Update the bin with the new ratings
        await updateBinData(SINGLE_MODE_BIN_ID, { ratings });

        res.status(200).send("Rating saved.");
    } catch (error) {
        res.status(500).send("Error saving rating.");
    }
});

// Save Double Mode ratings
app.post('/save-rating/double', async (req, res) => {
    const { winnerHigherEntropy, loserLowerEntropy, user, timestamp } = req.body;

    if (!winnerHigherEntropy || !loserLowerEntropy || !user || !timestamp) {
        return res.status(400).send("Missing required fields.");
    }

    try {
        // Fetch existing ratings
        const data = await fetchBinData(DOUBLE_MODE_BIN_ID);
        const ratings = data.ratings || [];

        // Add the new rating
        ratings.push({ winnerHigherEntropy, loserLowerEntropy, user, timestamp });

        // Update the bin with the new ratings
        await updateBinData(DOUBLE_MODE_BIN_ID, { ratings });

        res.status(200).send("Rating saved.");
    } catch (error) {
        res.status(500).send("Error saving rating.");
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
