let username = null; // Username persists only for the current session

// Show login modal on page load
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
        // Start double mode
        loadDoubleMode();
    } else {
        alert('Please enter a valid username.');
    }
}

// Display the username in the UI
function displayUsername(username) {
    const userInfo = document.getElementById('user-info');
    userInfo.innerHTML = `<strong>User: </strong>${username}`;
}

// Add event listener for Enter key in username input when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('username-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitUsername();
        }
    });
});