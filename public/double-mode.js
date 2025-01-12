let imagePairs = []; // List of unique image pairs
let ratedPairs = []; // Tracks rated pairs for the session

// Load Double Mode
async function loadDoubleMode() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div id="images-container">
            <img id="image-left" src="" alt="Image Left" />
            <img id="image-right" src="" alt="Image Right" />
        </div>
    `;

    const images = await fetchImages();

    // Ensure valid images are available
    if (!images || images.length < 2) {
        appContent.innerHTML = `<p><strong>Not enough images available for Double Mode.</strong></p>`;
        return;
    }

    // Generate unique image pairs if not already done
    if (imagePairs.length === 0) {
        generateUniquePairs(images);
    }

    // Display the first random pair
    displayRandomPair();
}

// Generate all unique pairs of images
function generateUniquePairs(images) {
    for (let i = 0; i < images.length; i++) {
        for (let j = i + 1; j < images.length; j++) {
            imagePairs.push([images[i], images[j]]);
        }
    }
}

// Display a random unrated pair
function displayRandomPair() {
    const unratedPairs = imagePairs.filter(pair => !isPairRated(pair));

    if (unratedPairs.length === 0) {
        showAllRatedPopup(true); // Double Mode popup
        return;
    }

    const randomPair = unratedPairs[Math.floor(Math.random() * unratedPairs.length)];
    const [imageLeft, imageRight] = randomPair;

    const leftImageElement = document.getElementById('image-left');
    const rightImageElement = document.getElementById('image-right');

    leftImageElement.src = imageLeft.url;
    leftImageElement.dataset.shelfmark = imageLeft.shelfmark;

    rightImageElement.src = imageRight.url;
    rightImageElement.dataset.shelfmark = imageRight.shelfmark;

    leftImageElement.onclick = async () => {
        await ratePair(imageLeft, imageRight, 'left');
        displayRandomPair();
    };

    rightImageElement.onclick = async () => {
        await ratePair(imageLeft, imageRight, 'right');
        displayRandomPair();
    };
}


// Check if a pair has been rated
function isPairRated(pair) {
    return ratedPairs.some(
        rated =>
            (rated[0].url === pair[0].url && rated[1].url === pair[1].url) ||
            (rated[0].url === pair[1].url && rated[1].url === pair[0].url)
    );
}

// Rate a pair and add it to the rated list
async function ratePair(imageLeft, imageRight, choice) {
    // Add the pair to the rated list
    ratedPairs.push([imageLeft, imageRight]);

    // Determine winner and loser based on the choice
    const winner = choice === 'left' ? imageLeft : imageRight;
    const loser = choice === 'left' ? imageRight : imageLeft;

    // Prepare the payload for the server
    const payload = {
        winnerHigherEntropy: {
            shelfmark: winner.shelfmark,
            url: winner.url,
        },
        loserLowerEntropy: {
            shelfmark: loser.shelfmark,
            url: loser.url,
        },
        user: username, // Assume `username` is globally available
        timestamp: new Date().toISOString(),
    };

    // Send the rating to the server
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

// Show popup when all pairs are rated
// Show popup when all images/combinations are rated
function showAllRatedPopup(isDoubleMode = false) {
    const appContent = document.getElementById('app-content');
    const message = isDoubleMode
        ? `<strong>All combinations have been rated!</strong>`
        : `<strong>All images have been rated!</strong>`;

    appContent.innerHTML = `
        <div class="all-rated-popup">
            <p>${message}</p>
        </div>
    `;
}


// Fetch images from the server
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
