from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import xgboost as xgb
import numpy as np
import joblib
import re
from urllib.parse import urlparse
import tldextract
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd

# Load the model
model = xgb.Booster()
model.load_model("malicious.json")  

# load the vectorizer
vectorizer = joblib.load("vectorizer.pkl")

class URLRequest(BaseModel):
    url: str
    
suspicious_keywords = ["login", "secure", "verify", "account", "update", "bank", "free", "offer", "password", "support"]
trusted_brands = ["paypal", "google", "amazon", "facebook", "microsoft", "apple"]

def makeTokens(url):
    url = url.lower().strip()
    url = re.sub(r"\[\.\]", ".", url)  # Normalize [.] obfuscation

    parsed_url = urlparse(url)
    ext = tldextract.extract(url)

    subdomain, main_domain, suffix = ext.subdomain, ext.domain, ext.suffix
    path = parsed_url.path

    # Tokenize subdomain, domain, and path
    tokens = re.split(r'[/.\-]', subdomain + " " + main_domain + " " + path)
    tokens = [t for t in tokens if t and t not in ["com", "net", "org", "www", suffix]]

    # Flag if subdomain contains a trusted brand but is not the official domain
    if main_domain not in trusted_brands and any(brand in subdomain for brand in trusted_brands):
        tokens.append("fake_brand")

    # Flag URLs containing phishing keywords
    if any(word in path for word in suspicious_keywords):
        tokens.append("suspicious_path")

    return " ".join(set(tokens))

app = FastAPI()

@app.get('/')
def read_root():
    return {"message": "Welcome to the URL classification API!"}

@app.get('/{url:path}')
def read_item(url: str):
    return {"url": url}

@app.post('/predict')
def predict(request: URLRequest):
    url = request.url
    tokenized = makeTokens(url)
    print("Tokens:", tokenized)  # Add this for debugging

    df = pd.DataFrame({'url': [tokenized]})
    vectorized = vectorizer.transform(df['url'])
    dmatrix = xgb.DMatrix(vectorized)

    predicted_probabilities = model.predict(dmatrix)
    predicted_label = "malicious" if predicted_probabilities[0] > 0.3 else "benign"

    return {
        "url": url,
        "tokens": tokenized,  # Add this to see what the model saw
        "prediction": predicted_label,
        "probability": float(predicted_probabilities[0])
    }
