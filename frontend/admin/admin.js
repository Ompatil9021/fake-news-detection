// This function is for the dropdown icon in the header
async function checkAdminAndSetupProfile() {
    try {
        const response = await fetch('http://localhost:5000/check_auth', { method: 'GET', credentials: 'include' });
        const result = await response.json();

        // Security Check: If not logged in or not an admin, deny access
        if (!result.logged_in || !result.is_admin) {
            document.querySelector('main').innerHTML = `
                <div class="admin-panel" style="text-align:center;">
                    <h1>Access Denied</h1>
                    <p>You must be an admin to view this page.</p>
                    <a href="/index.html" class="button-link">Go to Homepage</a>
                </div>`;
            return; // Stop further execution
        }

        // If admin, setup the profile icon and fetch reviews
        setupUserProfile(result.username, result.is_admin);
        // This is now cleaner. It just calls the function once.
        await fetchAndDisplayReviews();
        await fetchAndDisplayAllPosts(); // Add this line

    } catch (error) {
         document.querySelector('main').innerHTML = `<h1>Error</h1><p>Could not connect to the server.</p>`;
    }
}
function createSatisfactionChart(reviews) {
    const ctx = document.getElementById('satisfactionChart').getContext('2d');
    
    // Count the ratings
    const ratings = { 'Good': 0, 'Average': 0, 'Bad': 0 };
    reviews.forEach(review => {
        if (ratings.hasOwnProperty(review.review_rating)) {
            ratings[review.review_rating]++;
        }
    });

    // Create the chart
    new Chart(ctx, {
        type: 'doughnut', // You can also use 'pie' or 'bar'
        data: {
            labels: ['Good', 'Average', 'Bad'],
            datasets: [{
                label: 'Review Ratings',
                data: [ratings.Good, ratings.Average, ratings.Bad],
                backgroundColor: [
                    'rgba(40, 167, 69, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(220, 53, 69, 0.7)'
                ],
                borderColor: [
                    '#28a745',
                    '#ffc107',
                    '#dc3545'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#a0a0b0' // Text color for legend
                    }
                }
            }
        }
    });
}

async function fetchAndDisplayReviews() {
    const container = document.getElementById('reviews-table-container');
    try {
        const response = await fetch('http://localhost:5000/admin/reviews', {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json();
            container.innerHTML = `<p style="color:red;">Error: ${errorData.error}</p>`;
            return;
        }

        const reviews = await response.json();
        allReviewsData = reviews;

        createSatisfactionChart(reviews); // Create the chart with the data

        if (reviews.length === 0) {
            container.innerHTML = '<p>No user reviews have been submitted yet.</p>';
            return;
        }

        let tableHtml = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Rating</th>
                        <th>Review Comment</th>
                        <th>Reviewed By</th>
                        <th>Original Post</th>
                        <th>Original Author</th>
                        <th>Gemini AI Analysis</th>
                        <th>Dataset Model Result</th>
                    </tr>
                </thead>
                <tbody>
        `;

        reviews.forEach((review, index) => {
            // Parse dataset result
            let datasetLabel = '', datasetConf = '';
            console.log('Review dataset result:', review.original_dataset_result); // Debug log
            try {
                const datasetObj = JSON.parse(review.original_dataset_result);
                if (datasetObj.label) datasetLabel = datasetObj.label;
                if (datasetObj.confidence) datasetConf = `Confidence: ${datasetObj.confidence}`;
            } catch (e) {
                console.log('Error parsing dataset result:', e); // Debug log
                datasetLabel = review.original_dataset_result || 'N/A';
            }
            tableHtml += `
                <tr data-index="${index}">
                    <td><span class="rating-badge rating-${review.review_rating.toLowerCase()}">${review.review_rating}</span></td>
                    <td>${review.review_content || '<em>No comment</em>'}</td>
                    <td>${review.reviewed_by_user}</td>
                    <td><div class="cell-content">${review.original_post_content}</div></td>
                    <td>${review.original_post_author}</td>
                    <td><div class="cell-content">${review.original_ai_analysis}</div></td>
                    <td><div class="cell-content">Label: ${datasetLabel}<br>${datasetConf}</div></td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        container.innerHTML = tableHtml;

        setupModal();

    } catch (error) {
        container.innerHTML = `<p style="color:red;">Failed to fetch or display reviews.</p>`;
        console.error("Fetch Error:", error);
    }
}
async function fetchAndDisplayAllPosts() {
    const container = document.getElementById('all-posts-table-container');
    try {
        const response = await fetch('http://localhost:5000/admin/posts', {
            method: 'GET', credentials: 'include',
        });
        const posts = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p style="color:red;">Error: ${posts.error}</p>`;
            return;
        }
        if (posts.length === 0) {
            container.innerHTML = '<p>No posts have been submitted yet.</p>';
            return;
        }

        let tableHtml = `<table class="admin-table"><thead><tr>
                            <th>Author</th>
                            <th>Submission Content</th>
                            <th>Gemini AI Analysis</th>
                            <th>Dataset Model Result</th>
                        </tr></thead><tbody>`;
        posts.forEach(post => {
            // Parse dataset result
            let datasetLabel = '', datasetConf = '';
            console.log('Post dataset result:', post.dataset_result); // Debug log
            try {
                const datasetObj = JSON.parse(post.dataset_result);
                if (datasetObj.label) datasetLabel = datasetObj.label;
                if (datasetObj.confidence) datasetConf = `Confidence: ${datasetObj.confidence}`;
            } catch (e) {
                console.log('Error parsing post dataset result:', e); // Debug log
                datasetLabel = post.dataset_result || 'N/A';
            }
            tableHtml += `
                <tr>
                    <td>${post.post_author}</td>
                    <td><div class="cell-content">${post.post_content}</div></td>
                    <td><div class="cell-content">${post.ai_analysis}</div></td>
                    <td><div class="cell-content">Label: ${datasetLabel}<br>${datasetConf}</div></td>
                </tr>
            `;
        });
        tableHtml += '</tbody></table>';
        container.innerHTML = tableHtml;

    } catch (error) {
        container.innerHTML = `<p style="color:red;">Failed to fetch posts.</p>`;
    }
}
function setupModal() {
    const modal = document.getElementById('review-modal');
    const closeButton = document.querySelector('.modal-close-button');
    const tableContainer = document.getElementById('reviews-table-container');

    if (!modal || !closeButton || !tableContainer) return; // Safety check

    closeButton.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) { modal.style.display = 'none'; }
    });

    tableContainer.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.index) return;
        const reviewIndex = parseInt(row.dataset.index, 10);
        const reviewData = allReviewsData[reviewIndex];
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="modal-body-section"><h4>Original Post</h4><pre>${reviewData.original_post_content}</pre></div>
            <div class="modal-body-section"><h4>Gemini AI Analysis</h4><pre>${reviewData.original_ai_analysis}</pre></div>
            <div class="modal-body-section"><h4>Dataset Model Result</h4><pre>${reviewData.original_dataset_result}</pre></div>
        `;
        modal.style.display = 'flex';
    });
}
// This is the same setupUserProfile function from our other JS files
function setupUserProfile(username, isAdmin) {
    const profileSection = document.getElementById('profile-section');
    const firstLetter = username.charAt(0).toUpperCase();
    const profileIcon = document.createElement('div');
    profileIcon.className = 'profile-icon';
    profileIcon.textContent = firstLetter;
    let dropdownHtml = `<div class="profile-dropdown"><a href="/profile.html">Profile</a>`;
    if (isAdmin) { dropdownHtml += `<a href="/admin/dashboard.html">Admin Dashboard</a>`; }
    dropdownHtml += `<button id="logout-button">Logout</button></div>`;
    const dropdown = document.createElement('div');
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

// Run the initial check when the page loads
document.addEventListener('DOMContentLoaded', checkAdminAndSetupProfile);