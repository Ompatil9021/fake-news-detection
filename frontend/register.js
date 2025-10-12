const registerForm = document.getElementById('register-form');
const messageContainer = document.getElementById('message-container');

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    messageContainer.textContent = 'Registering...';
    messageContainer.style.color = 'black';

    try {
        const response = await fetch('http://localhost:5000/register', { // CHANGED HERE
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, email: email, password: password }),
            credentials: 'include',
        });

        const result = await response.json();

        if (response.ok) {
            messageContainer.textContent = result.message;
            messageContainer.style.color = 'green';
            registerForm.reset();
        } else {
            messageContainer.textContent = `Error: ${result.message}`;
            messageContainer.style.color = 'red';
        }
    } catch (error) {
        messageContainer.textContent = 'An error occurred. Please try again later.';
        messageContainer.style.color = 'red';
        console.error('Registration error:', error);
    }
});