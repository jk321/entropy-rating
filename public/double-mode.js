let imagePairs = [];
let ratedPairs = [];
let countdownDuration = 5000; // Countdown duration in milliseconds
let countdownInterval = null;
let sessionLimit = 20;
let sessionCount = 0;

// Define a calibration combination
let calibrationPair = {
    imageLeft: { shelfmark: "NK III H 8, 128v", url: "https://raw.githubusercontent.com/jk321/entropy-rating/refs/heads/main/set-2/NK_III_H_8_f128v.jpg" },
    imageRight: { shelfmark: "NK XXIII G 57, 043r", url: "https://raw.githubusercontent.com/jk321/entropy-rating/refs/heads/main/set-2/NK_XXIII_G_57_f043r.jpg" },
    shown: false // Track if it has been shown
};

function generateSessionID() {
    return Math.random().toString(36).substr(2, 9); // Example: "q1w2e3r4t"
}

let sessionID = null; // Unique session ID
let isSessionComplete = false; // Tracks whether the session is completed

window.addEventListener('beforeunload', () => {
    if (!isSessionComplete && sessionID) {
        notifyIncompleteSession();
    }
});

async function notifyIncompleteSession() {
    try {
        await fetch('/mark-session-incomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionID }),
        });
    } catch (error) {
        console.error("Error notifying incomplete session:", error);
    }
}

async function loadDoubleMode() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div id="images-container">
            <img id="image-left" src="" alt="Image Left" />
            <img id="image-right" src="" alt="Image Right" />
        </div>
    `;

    const images = await fetchImages();

    if (!images || images.length < 2) {
        appContent.innerHTML = `<p><strong>Not enough images available for Double Mode.</strong></p>`;
        return;
    }

    if (imagePairs.length === 0) {
        generateUniquePairs(images);
    }

    sessionCount = 0;
    sessionID = generateSessionID();
    calibrationPair.shown = false; // Reset calibration pair for the session
    calibrationPair.randomSlot = Math.floor(Math.random() * sessionLimit); // Assign random slot
    updateLeftForRating(); // Initialize the "Left for rating" counter
    displayRandomPair();
}


function generateUniquePairs(images) {
    for (let i = 0; i < images.length; i++) {
        for (let j = i + 1; j < images.length; j++) {
            const pair = [images[i], images[j]];

            // Skip adding the calibration pair to random pairs
            if (
                (pair[0].shelfmark === calibrationPair.imageLeft.shelfmark &&
                    pair[1].shelfmark === calibrationPair.imageRight.shelfmark) ||
                (pair[0].shelfmark === calibrationPair.imageRight.shelfmark &&
                    pair[1].shelfmark === calibrationPair.imageLeft.shelfmark)
            ) {
                continue;
            }

            imagePairs.push(pair);
        }
    }
}

function displayRandomPair() {
    clearInterval(countdownInterval);

    // If the session limit is reached, end the session
    if (sessionCount >= sessionLimit) {
        endSession();
        return;
    }

    // Ensure the calibration pair is shown exactly once at a random position
    const isCalibrationTurn =
        !calibrationPair.shown && sessionCount === calibrationPair.randomSlot;

    if (isCalibrationTurn) {
        calibrationPair.shown = true;
        showPair(calibrationPair.imageLeft, calibrationPair.imageRight, true);
        return;
    }

    // Get unrated pairs
    const unratedPairs = imagePairs.filter(pair => !isPairRated(pair));

    // If no unrated pairs are left, end the session
    if (unratedPairs.length === 0) {
        endSession();
        return;
    }

    // Select a random unrated pair and display it
    const randomPair = unratedPairs[Math.floor(Math.random() * unratedPairs.length)];
    showPair(randomPair[0], randomPair[1], false);
}


function showPair(imageLeft, imageRight, isCalibration) {
    const leftImageElement = document.getElementById('image-left');
    const rightImageElement = document.getElementById('image-right');

    leftImageElement.src = imageLeft.url;
    leftImageElement.dataset.shelfmark = imageLeft.shelfmark;

    rightImageElement.src = imageRight.url;
    rightImageElement.dataset.shelfmark = imageRight.shelfmark;

    let remainingTime = countdownDuration; // Initialize remaining time in milliseconds

    // Add click event listeners for images
    leftImageElement.onclick = async () => {
        clearInterval(countdownInterval); // Stop countdown
        await ratePair(imageLeft, imageRight, 'left', true, remainingTime, isCalibration);
        sessionCount++;
        updateLeftForRating(); // Update the "Left for rating" counter
        displayRandomPair();
    };

    rightImageElement.onclick = async () => {
        clearInterval(countdownInterval); // Stop countdown
        await ratePair(imageLeft, imageRight, 'right', true, remainingTime, isCalibration);
        sessionCount++;
        updateLeftForRating(); // Update the "Left for rating" counter
        displayRandomPair();
    };

    // Start the countdown
    startCountdown(() => {
        sessionCount++;
        updateLeftForRating(); // Update the "Left for rating" counter
        ratePair(imageLeft, imageRight, null, false, 0, isCalibration);
        displayRandomPair();
    }, (timeLeft) => {
        remainingTime = timeLeft; // Update remaining time as countdown proceeds
    });
}

function updateLeftForRating() {
    const remainingCountElement = document.getElementById('remaining-count');
    const totalCountElement = document.getElementById('total-count');

    const remainingPairs = sessionLimit - sessionCount;
    remainingCountElement.textContent = remainingPairs;
    totalCountElement.textContent = sessionLimit;
}

function isPairRated(pair) {
    return ratedPairs.some(
        rated =>
            (rated[0].url === pair[0].url && rated[1].url === pair[1].url) ||
            (rated[0].url === pair[1].url && rated[1].url === pair[0].url)
    );
}

async function ratePair(imageLeft, imageRight, choice, entropyRated, timeRemaining = 0, isCalibration = false) {
    ratedPairs.push([imageLeft, imageRight]);

    const payload = {
        sessionID,
        entropyRated,
        isCalibration,
        user: username, // Assume `username` is globally available
        timestamp: new Date().toISOString(),
    };

    if (entropyRated) {
        const thinkingTime = countdownDuration - timeRemaining; // Calculate thinking time in milliseconds
        const winner = choice === 'left' ? imageLeft : imageRight;
        const loser = choice === 'left' ? imageRight : imageLeft;

        payload.thinkingTime = thinkingTime;
        payload.winnerHigherEntropy = {
            shelfmark: winner.shelfmark,
            url: winner.url,
            position: choice === 'left' ? "left" : "right", // Indicate winner's position
        };
        payload.loserLowerEntropy = {
            shelfmark: loser.shelfmark,
            url: loser.url,
            position: choice === 'left' ? "right" : "left", // Indicate loser's position
        };
    } else {
        payload.folio1 = {
            shelfmark: imageLeft.shelfmark,
            url: imageLeft.url,
            position: "left", // Folio1 is always the left image
        };
        payload.folio2 = {
            shelfmark: imageRight.shelfmark,
            url: imageRight.url,
            position: "right", // Folio2 is always the right image
        };
    }

    try {
        await fetch('/save-rating/double', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Error saving rating:", error);
    }
}


function startCountdown(callback, updateRemainingTime) {
    const timerElement = document.getElementById('countdown-timer');
    let timeLeft = countdownDuration;

    function formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const millis = Math.floor((milliseconds % 1000) / 10); // Display centiseconds
        return `${seconds}:${millis.toString().padStart(2, '0')}`;
    }

    timerElement.textContent = formatTime(timeLeft);

    countdownInterval = setInterval(() => {
        timeLeft -= 10;

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            callback();
        } else {
            timerElement.textContent = formatTime(timeLeft);
            updateRemainingTime(timeLeft);
        }
    }, 10);
}

function endSession() {
    clearInterval(countdownInterval);
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="all-rated-popup">
            <p><strong>Session Complete!</strong></p>
        </div>
    `;
    isSessionComplete = true;
}

async function fetchImages() {
    try {
        const response = await fetch('/images.json');
        const data = await response.json();
        return data.images || [];
    } catch (error) {
        console.error("Error fetching images:", error);
        return [];
    }
}
