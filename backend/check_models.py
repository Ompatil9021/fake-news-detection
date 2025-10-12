import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load the environment variables from your .env file
load_dotenv()

try:
    # Configure the API key from your .env file
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY was not found in your .env file.")
    else:
        genai.configure(api_key=api_key)

        print("Searching for available models...\n")
        
        found_models = False
        # List all models and check if they support the 'generateContent' method we need
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"Found a usable model: {m.name}")
                found_models = True
        
        if not found_models:
            print("\nCould not find any models that support content generation.")
            print("This strongly suggests an issue with your API key or Google Cloud project setup.")

except Exception as e:
    print(f"\nAn error occurred while trying to connect to the API: {e}")