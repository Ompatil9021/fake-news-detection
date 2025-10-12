// The only change is http://localhost:5000 instead of 127.0.0.1
const loginForm = document.getElementById('login-form');
const messageContainer = document.getElementById('message-container');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    messageContainer.textContent = 'Logging in...';
    messageContainer.style.color = 'black';

    try {
        const response = await fetch('http://localhost:5000/login', { // CHANGED HERE
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password }),
            credentials: 'include',
        });

        const result = await response.json();

        if (response.ok) {
            messageContainer.textContent = result.message;
            messageContainer.style.color = 'green';
            window.location.href = 'index.html';
        } else {
            messageContainer.textContent = `Error: ${result.message}`;
            messageContainer.style.color = 'red';
        }
    } catch (error) {
        messageContainer.textContent = 'An error occurred. Please try again later.';
        messageContainer.style.color = 'red';
        console.error('Login error:', error);
    }
});