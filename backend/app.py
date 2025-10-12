import os
import google.generativeai as genai
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, login_user, current_user, logout_user, login_required, UserMixin
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import mimetypes
from functools import wraps

# --- Initialization and Config ---
load_dotenv()
app = Flask(__name__)
if not os.path.exists('uploads'): os.makedirs('uploads')
app.config['UPLOAD_FOLDER'] = 'uploads'
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = 'a_very_secret_key_for_sessions'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    # Allow model selection via environment variable for flexibility
    preferred_model = os.getenv('GEMINI_MODEL', 'models/gemini-2.5-flash')
    try:
        model = genai.GenerativeModel(preferred_model)
        print(f"Using Gemini model: {preferred_model}")
    except Exception as _e:
        print(f"Failed to initialize model '{preferred_model}': {_e}")
        try:
            # Print available models to help debugging
            available = genai.list_models()
            print("Available models:")
            for m in available:
                try:
                    # some model entries might be simple dicts or objects
                    name = m.name if hasattr(m, 'name') else (m.get('name') if isinstance(m, dict) else str(m))
                    print(" -", name)
                except Exception:
                    print(" -", m)
        except Exception as le:
            print(f"Could not list models: {le}")
        model = None
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    model = None

# --- Flask-Login & Admin Setup ---
login_manager = LoginManager(app)
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function

# --- Database Models (Review model is updated) ---
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    posts = db.relationship('Post', backref='author', lazy=True)
    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    reviews = db.relationship('Review', backref='author', lazy=True)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    analysis_result = db.Column(db.Text, nullable=True)
    dataset_result = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reviews = db.relationship('Review', backref='post', lazy=True, cascade="all, delete-orphan")

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=True) # Comment is now optional
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)

# --- API Routes ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    user_exists = User.query.filter_by(username=data['username']).first()
    email_exists = User.query.filter_by(email=data['email']).first()
    if user_exists: return jsonify({"message": "Username already exists"}), 409
    if email_exists: return jsonify({"message": "Email already exists"}), 409
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(username=data['username'], email=data['email'], password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully!"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt.check_password_hash(user.password, data['password']):
        login_user(user)
        return jsonify({"message": "Login successful!", "username": user.username}), 200
    else:
        return jsonify({"message": "Login failed. Check email and password."}), 401

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logout successful!"}), 200

@app.route('/check_auth')
def check_auth():
    if current_user.is_authenticated:
        return jsonify({ "logged_in": True, "username": current_user.username, "is_admin": current_user.is_admin }), 200
    else:
        return jsonify({"logged_in": False}), 200

@app.route('/analyze-text', methods=['POST'])
@login_required
def analyze_text():
    data = request.get_json()
    text_to_analyze = data.get('text')
    if not text_to_analyze: return jsonify({"error": "No text provided"}), 400
    prompt = f"""
    You are an AI fact-checker. Your task is to analyze the user's text and determine the factual accuracy of its core claim.
    You MUST format your entire response exactly as follows, with no extra text or conversational pleasantries:

    Verdict: [One of: True, False, Misleading, Partially True]
    Explanation: [A brief, direct, one-paragraph explanation of the facts.]

    Do not deviate from this format. Your response must begin with "Verdict:".

    User's text to analyze:
    ---
    {text_to_analyze}
    ---
    """
    try:
        # Gemini AI result
        response = model.generate_content(prompt)
        analysis = response.text
        # Dataset model result (call infer.py)
        import subprocess, json, re
        infer_path = os.path.join(os.path.dirname(__file__), 'ml_model', 'infer.py')
        dataset_result = None
        try:
            import ast
            infer_proc = subprocess.run([
                'py', '-3.12', infer_path, text_to_analyze
            ], capture_output=True, text=True, timeout=60)
            output = infer_proc.stdout.strip()
            print("infer.py raw output:", output)
            if infer_proc.stderr:
                print("infer.py stderr:", infer_proc.stderr)
            # Extract dict from output (even if there are warnings or logs)
            match = re.search(r'\{.*\}', output, re.DOTALL)
            if match:
                dict_str = match.group(0)
                try:
                    # Try JSON first
                    dataset_result = json.dumps(json.loads(dict_str))
                except Exception:
                    # Fallback: parse Python dict and convert to JSON
                    try:
                        dataset_result = json.dumps(ast.literal_eval(dict_str))
                    except Exception:
                        # If both fail, try to clean up the string and parse
                        cleaned_str = dict_str.replace("'", '"')
                        dataset_result = json.dumps(json.loads(cleaned_str))
            else:
                dataset_result = '{"error": "Malformed output from dataset model."}'
        except Exception as e:
            dataset_result = '{"error": "Exception running dataset model: ' + str(e) + '"}'
        new_post = Post(content=text_to_analyze, analysis_result=analysis, dataset_result=dataset_result, author=current_user)
        db.session.add(new_post)
        db.session.commit()
        return jsonify({"analysis": analysis, "dataset_result": dataset_result, "post_id": new_post.id})
    except Exception as e:
        print(f"Gemini API call failed: {e}")
        return jsonify({"error": "Failed to get analysis from Gemini API."}), 503

@app.route('/analyze-media', methods=['POST'])
@login_required
def analyze_media():
    if 'file' not in request.files: return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No selected file"}), 400
    prompt = request.form.get('prompt', 'Analyze this file.')
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        try:
            gemini_file = genai.upload_file(path=filepath)
            while gemini_file.state.name == "PROCESSING":
                time.sleep(2)
                gemini_file = genai.get_file(gemini_file.name)
            if gemini_file.state.name == "FAILED": return jsonify({"error": "File processing failed."}), 500
            response = model.generate_content([prompt, gemini_file])
            analysis = response.text
            new_post = Post(content=f"Media file: {filename}", analysis_result=analysis, author=current_user)
            db.session.add(new_post)
            db.session.commit()

            # --- ADDED FOR DEBUGGING ---
            print(f"DEBUG: Successfully saved media post ID {new_post.id} for user '{current_user.username}'")

            os.remove(filepath)
            genai.delete_file(gemini_file.name)
            return jsonify({"analysis": analysis, "post_id": new_post.id})
        except Exception as e:
            if os.path.exists(filepath): os.remove(filepath)
            print(f"Gemini media analysis failed: {e}")
            return jsonify({"error": "Failed to analyze media file."}), 500

@app.route('/get_user_profile')
@login_required
def get_user_profile():
    # --- ADDED FOR DEBUGGING ---
    print(f"\nDEBUG: Fetching profile for user '{current_user.username}'...")

    posts = Post.query.filter_by(author=current_user).order_by(Post.id.desc()).all()

    # --- ADDED FOR DEBUGGING ---
    print(f"DEBUG: Found {len(posts)} posts in the database for this user.")
    for p in posts:
        print(f"  - Post ID {p.id}: {p.content[:50]}...") # Print first 50 chars of content

    posts_data = [{
        "id": post.id,
        "content": post.content,
        "analysis_result": post.analysis_result,
        "dataset_result": post.dataset_result
    } for post in posts]
    return jsonify({"username": current_user.username, "email": current_user.email, "is_admin": current_user.is_admin, "posts": posts_data})

@app.route('/submit_review', methods=['POST'])
@login_required
def submit_review():
    data = request.get_json()
    post_id = data.get('post_id')
    rating = data.get('rating')
    content = data.get('content', '') # Content is optional
    if not post_id or not rating:
        return jsonify({"error": "Post ID and a rating are required."}), 400
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "Post not found."}), 404
    new_review = Review(rating=rating, content=content, post_id=post.id, author=current_user)
    db.session.add(new_review)
    db.session.commit()
    return jsonify({"message": "Review submitted successfully!"}), 201

@app.route('/admin/reviews')
@admin_required
def get_admin_reviews():
    reviews = Review.query.order_by(Review.id.desc()).all()
    reviews_data = []
    for review in reviews:
        reviews_data.append({
            'review_id': review.id,
            'review_rating': review.rating,
            'review_content': review.content,
            'reviewed_by_user': review.author.username,
            'original_post_content': review.post.content,
            'original_post_author': review.post.author.username,
            'original_ai_analysis': review.post.analysis_result,
            'original_dataset_result': review.post.dataset_result
        })
    return jsonify(reviews_data)
# --- NEW: Admin Route to get ALL posts ---
@app.route('/admin/posts')
@admin_required
def get_all_posts():
    posts = Post.query.order_by(Post.id.desc()).all()
    posts_data = []
    for post in posts:
        posts_data.append({
            'post_id': post.id,
            'post_content': post.content,
            'post_author': post.author.username,
            'ai_analysis': post.analysis_result,
            'dataset_result': post.dataset_result
        })
    return jsonify(posts_data)
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)