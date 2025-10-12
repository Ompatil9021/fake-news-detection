// This function runs when the profile page loads
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('http://localhost:5000/get_user_profile', {
            method: 'GET',
            credentials: 'include',
        });
        if (response.ok) {
            const data = await response.json();
            populateProfileData(data);
            setupUserProfile(data.username, data.is_admin); // Pass is_admin status
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Failed to load profile data:', error);
        window.location.href = 'login.html';
    }
});

function populateProfileData(data) {
    document.getElementById('profile-username').textContent = data.username;
    document.getElementById('profile-email').textContent = data.email;
    document.getElementById('profile-page-icon').textContent = data.username.charAt(0).toUpperCase();
    const historyContainer = document.getElementById('history-container');
    if (data.posts.length === 0) {
        historyContainer.innerHTML = '<p class="muted-text">You have no submissions yet.</p>';
        return;
    }
    historyContainer.innerHTML = '';
    data.posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'history-item';

        // Parse dataset result
        let datasetLabel = '', datasetConf = '';
        try {
            const datasetObj = JSON.parse(post.dataset_result);
            if (datasetObj.label) datasetLabel = datasetObj.label;
            if (datasetObj.confidence) datasetConf = `Confidence: ${datasetObj.confidence}`;
        } catch (e) {
            datasetLabel = post.dataset_result || 'N/A';
        }

        postElement.innerHTML = `
            <div class="history-content">
                <strong>Your Submission:</strong>
                <p>${post.content}</p>
            </div>
           
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
                <div style="flex:1;min-width:180px;border-right:1px solid #eee;padding-right:12px;">
                    <strong>Gemini AI Analysis:</strong>
                    <pre>${post.analysis_result}</pre>
                </div>
                <div style="flex:1;min-width:150px;padding-left:12px;">
                    <strong>Dataset Model Result:</strong>
                    <pre>Label: ${datasetLabel}\n${datasetConf}</pre>
                </div>
            </div>
        `;
        historyContainer.appendChild(postElement);
        showReviewForm(post.id, postElement);
    });
}

// --- THIS IS THE UPDATED FUNCTION ---
function setupUserProfile(username, isAdmin) {
    const profileSection = document.getElementById('profile-section');
    const firstLetter = username.charAt(0).toUpperCase();
    const profileIcon = document.createElement('div');
    profileIcon.className = 'profile-icon';
    profileIcon.textContent = firstLetter;
    
    const dropdown = document.createElement('div');
    // Build the dropdown HTML
    let dropdownHtml = `
        <div class="profile-dropdown">
            <a href="/profile.html">Profile</a>`;

    // If the user is an admin, add the dashboard link
    if (isAdmin) {
        dropdownHtml += `<a href="/admin/dashboard.html">Admin Dashboard</a>`;
    }

    dropdownHtml += `<button id="logout-button">Logout</button></div>`;
    dropdown.innerHTML = dropdownHtml;

    profileIcon.addEventListener('click', () => {
        const drop = dropdown.querySelector('.profile-dropdown');
        drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
    });

    profileSection.appendChild(profileIcon);
    profileSection.appendChild(dropdown);

    document.getElementById('logout-button').addEventListener('click', async () => {
        await fetch('http://localhost:5000/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/login.html';
    });
}

// Copied from main.js to be used here as well
function showReviewForm(postId, container) {
    const formHtml = `
        <div class="review-form-container">
            <hr>
            <p>Rate this analysis:</p>
            <div class="review-options" id="rating-${postId}">
                <input type="radio" id="good-${postId}" name="rating-${postId}" value="Good">
                <label for="good-${postId}">👍 Good</label>
                <input type="radio" id="average-${postId}" name="rating-${postId}" value="Average">
                <label for="average-${postId}">🤔 Average</label>
                <input type="radio" id="bad-${postId}" name="rating-${postId}" value="Bad">
                <label for="bad-${postId}">👎 Bad</label>
            </div>
            <textarea id="review-content-${postId}" placeholder="Add an optional comment..."></textarea>
            <button id="submit-review-${postId}">Submit Review</button>
            <p id="review-message-${postId}" class="review-message"></p>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', formHtml);
    document.getElementById(`submit-review-${postId}`).addEventListener('click', async () => {
        const rating = document.querySelector(`input[name="rating-${postId}"]:checked`);
        const content = document.getElementById(`review-content-${postId}`).value;
        const messageEl = document.getElementById(`review-message-${postId}`);

        if (!rating) {
            messageEl.textContent = 'Please select a rating.';
            messageEl.style.color = 'red';
            return;
        }

        const response = await fetch('http://localhost:5000/submit_review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, rating: rating.value, content: content }),
            credentials: 'include',
        });
        if (response.ok) {
            container.querySelector('.review-form-container').innerHTML = '<p style="color:green;">Thank you! Your feedback was submitted.</p>';
        } else {
            messageEl.textContent = 'Failed to submit review.';
            messageEl.style.color = 'red';
        }
    });
}
