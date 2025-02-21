const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// JSONBin configuration
const JSONBIN_API_KEY = '$2a$10$WWJZAd9FY4XjoOVyMtIRauSZjVfF/T2jRCL/QHY0QOIO8zm/VU.y2'; // API key
const SINGLE_MODE_BIN_ID = '6783b580e41b4d34e4762a1f'; // Single Mode Bin ID
const DOUBLE_MODE_BIN_ID = '67ac5163acd3cb34a8decbef'; // Double Mode Bin ID
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// Helper function to fetch data from JSONBin
async function fetchFromJSONBin(binID) {
    try {
        const response = await axios.get(`${JSONBIN_BASE_URL}/${binID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
            },
        });
        return response.data.record || {};
    } catch (error) {
        console.error("Error fetching data from JSONBin:", error.message);
        throw new Error("Failed to fetch data from JSONBin.");
    }
}

// Helper function to update JSONBin
async function updateJSONBin(binID, data) {
    try {
        await axios.put(`${JSONBIN_BASE_URL}/${binID}`, data, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error("Error updating JSONBin:", error.message);
        throw new Error("Failed to update JSONBin.");
    }
}

// Serve images.json
app.get('/images.json', (req, res) => {
    res.sendFile(__dirname + '/images.json');
});

// Save Single Mode ratings
app.post('/save-rating/single', async (req, res) => {
    const { shelfmark, url, rating, user, timestamp } = req.body;

    if (!shelfmark || !url || !rating || !user || !timestamp) {
        return res.status(400).send("Missing required fields.");
    }

    const newRating = { shelfmark, url, rating, user, timestamp };

    try {
        const data = await fetchFromJSONBin(SINGLE_MODE_BIN_ID);
        data.ratings = data.ratings || [];
        data.ratings.push(newRating);

        await updateJSONBin(SINGLE_MODE_BIN_ID, data);
        res.status(200).send("Rating saved.");
    } catch (error) {
        console.error("Error saving Single Mode rating:", error.message);
        res.status(500).send("Failed to save rating.");
    }
});

// Save Double Mode ratings
app.post('/save-rating/double', async (req, res) => {
    const {
        sessionID,
        entropyRated,
        isCalibration = false,
        user,
        timestamp,
        winnerHigherEntropy,
        loserLowerEntropy,
        folio1,
        folio2,
        thinkingTime,
        sessionLimit = 4,
    } = req.body;

    if (!sessionID || entropyRated === undefined || !user || !timestamp) {
        return res.status(400).send("Missing required fields.");
    }

    if (entropyRated && (thinkingTime === undefined || thinkingTime < 0)) {
        return res.status(400).send("Invalid or missing thinkingTime.");
    }

    try {
        const data = await fetchFromJSONBin(DOUBLE_MODE_BIN_ID);
        data.sessions = data.sessions || [];

        let session = data.sessions.find(s => s.sessionID === sessionID);
        if (!session) {
            session = {
                sessionID,
                user,
                timestamp,
                completed: false,
                combinations: [],
            };
            data.sessions.push(session);
        }

        const combination = {
            entropyRated,
            isCalibration,
        };

        if (entropyRated) {
            combination.thinkingTime = thinkingTime;
            combination.winnerHigherEntropy = winnerHigherEntropy;
            combination.loserLowerEntropy = loserLowerEntropy;
        } else {
            combination.folio1 = folio1;
            combination.folio2 = folio2;
        }

        session.combinations.push(combination);

        if (session.combinations.length >= sessionLimit) {
            session.completed = true;
        }

        await updateJSONBin(DOUBLE_MODE_BIN_ID, data);
        res.status(200).send("Rating saved.");
    } catch (error) {
        console.error("Error saving Double Mode rating:", error.message);
        res.status(500).send("Failed to save rating.");
    }
});

// Mark session as incomplete
app.post('/mark-session-incomplete', async (req, res) => {
    const { sessionID } = req.body;

    if (!sessionID) {
        return res.status(400).send("Missing sessionID.");
    }

    try {
        const data = await fetchFromJSONBin(DOUBLE_MODE_BIN_ID);
        data.sessions = data.sessions || [];

        const session = data.sessions.find(s => s.sessionID === sessionID);
        if (session) {
            session.completed = false;
        }

        await updateJSONBin(DOUBLE_MODE_BIN_ID, data);
        res.status(200).send("Session marked as incomplete.");
    } catch (error) {
        console.error("Error marking session incomplete:", error.message);
        res.status(500).send("Failed to mark session as incomplete.");
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
