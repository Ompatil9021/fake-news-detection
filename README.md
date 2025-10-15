# Fake News Detection System

A comprehensive fake news detection system that combines Gemini AI API with a trained machine learning model to provide dual analysis of news articles.

## Features

- **Dual Analysis**: Both Gemini AI and trained dataset model results
- **User Authentication**: Login/Register system with admin dashboard
- **Side-by-Side Results**: Compare AI and dataset model predictions
- **Admin Dashboard**: View all submissions and user feedback
- **Review System**: Users can rate analysis quality

## Setup Instructions

### Prerequisites

- Python 3.12 (required for PyTorch compatibility)
- Git
- Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ompatil9021/fake-news-detection.git
   cd fake-news-detection
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   py -3.12 -m pip install -r requirements.txt
   ```

3. **Download large files:**
   The following large files are excluded from Git due to size limits:
   - `backend/ml_model/saved_model/model.safetensors` (703 MB)
   - `backend/ml_model/dataset/Fake.csv` (59 MB)
   - `backend/ml_model/dataset/True.csv` (51 MB)
   
   **To get these files:**
   - Download from the original source or
   - Train the model using `backend/ml_model/train_transformer.py`
  
#USE THIS LINK TO DOWNLOAD ZIP FILE LINK GET DIRECT ALL CODE:
   ```bash
   https://drive.google.com/file/d/1MDPvyS_Hc5FjEcZqA8j0Rc96uGFoK2zd/view?usp=sharing
   ```

4. **Set up environment variables:**
   Create a `.env` file in the `backend` directory:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=models/gemini-2.5-flash
   ```

5. **Run the application:**

   go to backend folder

   ```bash
   python -m flask run

   ```

   Go to Frontend folder
   ```bash
   python -m http.server 8000
   ```

   Go to browser
   ```
   http://localhost:8000/login.html
   ```

7. **Access the application:**
   - Main app: http://localhost:5000
   - Admin dashboard: http://localhost:5000/admin/dashboard.html

## Project Structure

```
fake-news-detection/
├── backend/
│   ├── app.py                 # Flask application
│   ├── requirements.txt       # Python dependencies
│   ├── ml_model/
│   │   ├── infer.py          # Model inference script
│   │   ├── train_transformer.py # Model training script
│   │   ├── dataset/          # Training data (excluded from Git)
│   │   └── saved_model/      # Trained model (excluded from Git)
│   └── instance/             # SQLite database
└── frontend/
    ├── index.html            # Main application page
    ├── login.html            # Login page
    ├── register.html         # Registration page
    ├── profile.html          # User profile page
    ├── admin/
    │   ├── dashboard.html    # Admin dashboard
    │   └── admin.js         # Admin functionality
    └── style.css            # Styling

```

## How It Works

1. **User submits text** for analysis
2. **Gemini API** provides fact-checking analysis with verdict and explanation
3. **Dataset model** provides binary classification (Real/Fake) with confidence score
4. **Results displayed side-by-side** for comparison
5. **Warning shown** if models disagree
6. **Users can rate** the analysis quality

## Technologies Used

- **Backend**: Flask, Python 3.12
- **ML Model**: PyTorch, Transformers, DeBERTa-v3-base
- **AI API**: Google Gemini 2.5 Flash
- **Frontend**: HTML, CSS, JavaScript
- **Database**: SQLite
- **Authentication**: Flask-Login

## API Endpoints

- `POST /analyze-text` - Analyze text with both models
- `POST /analyze-media` - Analyze media files with Gemini
- `GET /admin/reviews` - Get all user reviews (admin only)
- `GET /admin/posts` - Get all submissions (admin only)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Contact

For questions or support, please contact: ompatil902123@gmail.com
