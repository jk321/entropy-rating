let username = null; // Username persists only for the current session
let ratedImages = []; // Tracks rated images for the session

// Ensure the username is provided and displayed on each page load
window.onload = () => {
    showLoginModal();
};

// Show the login modal
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.style.display = 'flex';
}

// Submit the username, save it, and display it
function submitUsername() {
    username = document.getElementById('username-input').value.trim();
    if (username) {
        displayUsername(username);
        document.getElementById('login-modal').style.display = 'none';

        // Default to Single Mode after login
        loadSingleMode();

        // Ensure the toggle reflects the current mode
        const toggle = document.getElementById('mode-toggle');
        toggle.checked = false; // Single Mode is unchecked
        updateModeLabel(false);
    } else {
        alert('Please enter a valid username.');
    }
}

// Display the username in the UI
function displayUsername(username) {
    const userInfo = document.getElementById('user-info');
    userInfo.innerHTML = `<strong>User: <strong>${username}</strong>`;
}

// Toggle between modes
function toggleMode() {
    const toggle = document.getElementById('mode-toggle');

    // Update instructions based on mode
    const instructions = document.getElementById('instructions');
    if (toggle.checked) {
        instructions.innerHTML = "<p>Compare the two folios shown. Click on the one you believe has <strong>higher</strong> entropy.</p>";
        loadDoubleMode(); // Load Double Mode when toggle is ON
    } else {
        instructions.innerHTML = "<p>Evaluate the entropy of the displayed folio and provide a rating.</p>";
        loadSingleMode(); // Load Single Mode when toggle is OFF
    }
}

// Ensure instructions are displayed for Single Mode by default
window.onload = () => {
    showLoginModal();
    const instructions = document.getElementById('instructions');
    instructions.innerHTML = "<p>Evaluate the entropy of the displayed folio and provide a rating.</p>"; // Default to Single Mode
};


// Load Single Mode
async function loadSingleMode() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div id="single-container">
            <img id="single-image" src="" alt="Image" />
            <div id="rating-buttons" class="button-container"></div>
        </div>
    `;
    const images = await fetchImages();

    const imageElement = document.getElementById('single-image');
    const buttonsContainer = document.getElementById('rating-buttons');

    function displayRandomImage() {
        const unratedImages = images.filter(img => !ratedImages.includes(img.url));
    
        if (unratedImages.length === 0) {
            showAllRatedPopup(false); // Single Mode popup
            return;
        }
    
        const randomImage = unratedImages[Math.floor(Math.random() * unratedImages.length)];
        imageElement.src = randomImage.url;
        imageElement.dataset.shelfmark = randomImage.shelfmark;
    }
    

    for (let i = 1; i <= 5; i++) {
        const button = document.createElement('button');
        button.innerText = i;
        button.onclick = async () => {
            const shelfmark = imageElement.dataset.shelfmark;
            const url = imageElement.src;
            ratedImages.push(url);
            await rateImage(shelfmark, url, i);
            displayRandomImage();
        };
        buttonsContainer.appendChild(button);
    }

    displayRandomImage();
}

// Show popup when all images are rated
// Show popup when all images/combinations are rated
function showAllRatedPopup(isDoubleMode = false) {
    const appContent = document.getElementById('app-content');
    const message = isDoubleMode
        ? `<strong>All image combinations have been rated for this session!</strong>`
        : `<strong>All images have been rated for this session!</strong>`;

    appContent.innerHTML = `
        <div class="all-rated-popup">
            <p>${message}</p>
        </div>
    `;
}


// Load Double Mode (placeholder function for integration)
async function loadDoubleMode() {
    console.log('Double Mode Loaded');
}

// Fetch images from the server
async function fetchImages() {
    const response = await fetch('/images.json');
    const data = await response.json();
    return data.images;
}

// Rate an image
async function rateImage(shelfmark, url, rating) {
    if (!username) {
        showLoginModal();
        return;
    }

    const timestamp = new Date().toISOString(); // Generate the current timestamp

    await fetch('/save-rating/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shelfmark, url, rating, user: username, timestamp }),
    });
}
