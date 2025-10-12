window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('http://localhost:5000/check_auth', { method: 'GET', credentials: 'include' });
        const result = await response.json();
        if (result.logged_in) {
            document.getElementById('app-container').style.display = 'block';
            setupUserProfile(result.username, result.is_admin);
            setupTextAnalysis();
            setupMediaAnalysis();
            setupTabs();
        } else {
            document.getElementById('guest-container').style.display = 'block';
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        document.getElementById('guest-container').style.display = 'block';
    }
});

function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            tabLinks.forEach(innerLink => innerLink.classList.remove('active'));
            link.classList.add('active');
            tabContents.forEach(content => {
                content.id === tabId ? content.classList.add('active') : content.classList.remove('active');
            });
        });
    });
}

function setupUserProfile(username, isAdmin) {
    const profileSection = document.getElementById('profile-section');
    const firstLetter = username.charAt(0).toUpperCase();
    const profileIcon = document.createElement('div');
    profileIcon.className = 'profile-icon';
    profileIcon.textContent = firstLetter;
    
    if (isAdmin) {
        const adminBtnContainer = document.getElementById('admin-button-container');
        if(adminBtnContainer) {
            adminBtnContainer.innerHTML = `<a href="/admin/dashboard.html" class="admin-button">Go to Admin Dashboard</a>`;
        }
    }

    const dropdown = document.createElement('div');
    let dropdownHtml = `<div class="profile-dropdown"><a href="/profile.html">Profile</a>`;
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

function setupTextAnalysis() {
    const analyzeButton = document.getElementById('analyze-text-button');
    const textInput = document.getElementById('text-input');
    const resultContainer = document.getElementById('result-container');
    analyzeButton.addEventListener('click', async () => {
        const textToAnalyze = textInput.value;
        if (!textToAnalyze.trim()) { resultContainer.innerHTML = '<p style="color:red;">Please enter some text.</p>'; return; }
        resultContainer.innerHTML = '<div class="spinner"></div>';
        try {
            const response = await fetch('http://localhost:5000/analyze-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToAnalyze }),
                credentials: 'include',
            });
            const result = await response.json();
            if (response.ok) {
                // Parse dataset_result as JSON and display cleanly
                let datasetLabel = '', datasetConf = '';
                let showNA = false;
                let aiVerdict = '';
                try {
                    const datasetObj = typeof result.dataset_result === 'string' ? JSON.parse(result.dataset_result) : result.dataset_result;
                    if (datasetObj && typeof datasetObj === 'object') {
                        if ('label' in datasetObj) datasetLabel = datasetObj.label;
                        if ('confidence' in datasetObj) datasetConf = `Confidence: ${datasetObj.confidence}`;
                        if (!datasetLabel && !datasetConf) showNA = true;
                    } else {
                        showNA = true;
                    }
                } catch (e) {
                    showNA = true;
                }
                // Extract Gemini verdict (True/False/Fake/Real)
                const verdictMatch = result.analysis.match(/Verdict:\s*(\w+)/i);
                if (verdictMatch) aiVerdict = verdictMatch[1].toLowerCase();
                // Compare for disagreement
                let disagree = false;
                if (!showNA && aiVerdict && datasetLabel) {
                    // Normalize values
                    const aiTrue = ["true", "real", "partiallytrue"].includes(aiVerdict.replace(/\s/g, ''));
                    const dsTrue = ["true", "real", "partiallytrue"].includes(datasetLabel.toLowerCase().replace(/\s/g, ''));
                    if (aiTrue !== dsTrue) disagree = true;
                }
                resultContainer.innerHTML = `
                ${disagree ? `<div style="background:#ffefc7;color:#a67c00;padding:10px 16px;border-radius:6px;margin-bottom:12px;font-weight:bold;">⚠️ Warning: The AI and dataset model disagree on this news. Please review carefully.</div>` : ''}
                <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                  <div style="flex:1; min-width:220px; border-right:1px solid #eee; padding-right:12px;">
                    <strong>Gemini AI Analysis:</strong>
                    <pre>${result.analysis}</pre>
                  </div>
                  <div style="flex:1; min-width:180px; padding-left:12px;">
                    <strong>Dataset Model Result:</strong>
                    <pre>${showNA ? 'Label: N/A' : `Label: ${datasetLabel}${datasetConf ? `\n${datasetConf}` : ''}`}</pre>
                  </div>
                </div>`;
                showReviewForm(result.post_id, resultContainer);
            } else { resultContainer.innerHTML = `<p style="color:red;">Error: ${result.error}</p>`; }
        } catch (error) { resultContainer.innerHTML = `<p style="color:red;">A network error occurred.</p>`; }
    });
}

function setupMediaAnalysis() {
    const mediaButton = document.getElementById('analyze-media-button');
    const fileInput = document.getElementById('file-input');
    const promptInput = document.getElementById('media-prompt-input');
    const resultContainer = document.getElementById('result-container');
    mediaButton.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const prompt = promptInput.value;
        if (!file) { resultContainer.innerHTML = '<p style="color:red;">Please select a file.</p>'; return; }
        if (!prompt.trim()) { resultContainer.innerHTML = '<p style="color:red;">Please enter an instruction.</p>'; return; }
        resultContainer.innerHTML = '<div class="spinner"></div>';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prompt', prompt);
        try {
            const response = await fetch('http://localhost:5000/analyze-media', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            const result = await response.json();
            if (response.ok) {
                resultContainer.innerHTML = `<strong>AI Analysis:</strong><pre>${result.analysis}</pre>`;
                showReviewForm(result.post_id, resultContainer);
            } else { resultContainer.innerHTML = `<p style="color:red;">Error: ${result.error}</p>`; }
        } catch (error) { resultContainer.innerHTML = `<p style="color:red;">A network error occurred.</p>`; }
    });
}

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