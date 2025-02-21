let imagePairs = [];
let ratedPairs = [];
let lastShownImages = []; // Track URLs of last shown images
let countdownDuration = 5000; // Countdown duration in milliseconds
let countdownInterval = null;
let sessionLimit = 20;
let sessionCount = 0;

// Define a calibration combination
let calibrationPair = {
    imageLeft: { shelfmark: "NK XXIII D 157, 101v", url: "https://raw.githubusercontent.com/jk321/entropy-rating/refs/heads/main/pilot-set/NK_XXIII_D_157_f101v.jpg" },
    imageRight: { shelfmark: "NK Teplá MS D 13, 054", url: "https://raw.githubusercontent.com/jk321/entropy-rating/refs/heads/main/pilot-set/NK_Tepla_MS_D_13_054.jpg" },
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
    lastShownImages = []; // Reset last shown images
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
        lastShownImages = [calibrationPair.imageLeft.url, calibrationPair.imageRight.url];
        showPair(calibrationPair.imageLeft, calibrationPair.imageRight, true);
        return;
    }

    // Get unrated pairs
    let unratedPairs = imagePairs.filter(pair => !isPairRated(pair));

    // If there are last shown images, filter out pairs containing them
    if (lastShownImages.length > 0) {
        unratedPairs = unratedPairs.filter(pair => 
            !lastShownImages.includes(pair[0].url) && 
            !lastShownImages.includes(pair[1].url)
        );
    }

    // If no valid pairs are left after filtering
    if (unratedPairs.length === 0) {
        // Try again without the consecutive image restriction
        unratedPairs = imagePairs.filter(pair => !isPairRated(pair));
        
        // If still no pairs, end session
        if (unratedPairs.length === 0) {
            endSession();
            return;
        }
    }

    // Select a random unrated pair and display it
    const randomPair = unratedPairs[Math.floor(Math.random() * unratedPairs.length)];
    
    // Update last shown images
    lastShownImages = [randomPair[0].url, randomPair[1].url];
    
    showPair(randomPair[0], randomPair[1], false);
}

function showPair(imageLeft, imageRight, isCalibration) {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div id="images-container">
            <img id="image-left" src="" alt="Image Left" />
            <img id="image-right" src="" alt="Image Right" />
        </div>
    `;

    const leftImageElement = document.getElementById('image-left');
    const rightImageElement = document.getElementById('image-right');

    leftImageElement.src = imageLeft.url;
    leftImageElement.dataset.shelfmark = imageLeft.shelfmark;

    rightImageElement.src = imageRight.url;
    rightImageElement.dataset.shelfmark = imageRight.shelfmark;

    let remainingTime = countdownDuration;

    async function handleImageClick(clickedImage, otherImage, choice) {
        clearInterval(countdownInterval);
        
        // Add flash overlay to clicked image
        const overlay = document.createElement('div');
        overlay.className = 'flash-overlay';
        overlay.style.position = 'fixed';
        
        const rect = clickedImage.getBoundingClientRect();
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        
        document.body.appendChild(overlay);
        
        // Wait for flash animation
        await new Promise(resolve => setTimeout(resolve, 300));
        overlay.remove();

        // Add fade-out to both images
        clickedImage.classList.add('fade-out');
        otherImage.classList.add('fade-out');

        // Wait for fade-out before proceeding
        await new Promise(resolve => setTimeout(resolve, 400));

        await ratePair(imageLeft, imageRight, choice, true, remainingTime, isCalibration);
        sessionCount++;
        updateLeftForRating();
        displayRandomPair();
    }

    // Add click event listeners for images
    leftImageElement.onclick = () => handleImageClick(leftImageElement, rightImageElement, 'left');
    rightImageElement.onclick = () => handleImageClick(rightImageElement, leftImageElement, 'right');

    // Start the countdown
    startCountdown(async () => {
        clearInterval(countdownInterval);

        // Add red flash overlay to both images
        for (let image of [leftImageElement, rightImageElement]) {
            const overlay = document.createElement('div');
            overlay.className = 'flash-overlay-timeout';
            overlay.style.position = 'fixed';
            
            const rect = image.getBoundingClientRect();
            overlay.style.top = `${rect.top}px`;
            overlay.style.left = `${rect.left}px`;
            overlay.style.width = `${rect.width}px`;
            overlay.style.height = `${rect.height}px`;
            
            document.body.appendChild(overlay);
        }

        // Wait for flash animation
        await new Promise(resolve => setTimeout(resolve, 300));
        document.querySelectorAll('.flash-overlay-timeout').forEach(el => el.remove());

        // Add fade-out to both images
        leftImageElement.classList.add('fade-out');
        rightImageElement.classList.add('fade-out');

        // Wait for fade-out before proceeding
        await new Promise(resolve => setTimeout(resolve, 400));

        sessionCount++;
        updateLeftForRating();
        ratePair(imageLeft, imageRight, null, false, 0, isCalibration);
        displayRandomPair();
    }, (timeLeft) => {
        remainingTime = timeLeft;
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
