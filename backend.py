from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.linear_model import LogisticRegression
import joblib
import re
from urllib.parse import urlparse
import tldextract
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Load the model and vectorizer
model = joblib.load("logistic_model.pkl")
vectorizer = joblib.load("vectorizer.pkl")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://kafeaacdjldlfooakjmgkfcoliakmlbl"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: str

suspicious_keywords = [
    "login", "secure", "verify", "account", "update",
    "bank", "free", "offer", "password", "support"
]

trusted_brands = [
    "paypal", "google", "amazon", "facebook",
    "microsoft", "apple", "gmail", "chatgpt"
]

trusted_domains = [
    "google.com", "mail.google.com", "paypal.com",
    "facebook.com", "microsoft.com", "apple.com",
    "gmail.com", "chatgpt.com", "github.com"
]

def makeTokens(url):
    url = url.lower().strip()
    url = re.sub(r"\[\.\]", ".", url)  # Normalize obfuscation

    parsed_url = urlparse(url)
    ext = tldextract.extract(url)

    subdomain, main_domain, suffix = ext.subdomain, ext.domain, ext.suffix
    path = parsed_url.path

    full_domain = f"{subdomain}.{main_domain}.{suffix}".strip(".")
    base_domain = f"{main_domain}.{suffix}"

    # Tokenize the URL
    tokens = re.split(r'[/.\-]', subdomain + " " + main_domain + " " + path)
    tokens = [t for t in tokens if t and t not in ["com", "net", "org", "www", suffix]]

    # Flag suspicious if not trusted
    if base_domain not in trusted_domains and full_domain not in trusted_domains:
        if any(brand in subdomain for brand in trusted_brands):
            tokens.append("fake_brand")
        if any(word in path for word in suspicious_keywords):
            tokens.append("suspicious_path")

    return " ".join(set(tokens))

@app.get("/")
def read_root():
    return {"message": "Welcome to the URL classification API USING LR!"}

@app.post("/predict")
def predict(request: URLRequest):
    url = request.url
    print(f"Received URL: {url}")
    
    ext = tldextract.extract(url)
    full_domain = f"{ext.subdomain}.{ext.domain}.{ext.suffix}".strip(".")
    base_domain = f"{ext.domain}.{ext.suffix}"
    
    if base_domain in trusted_domains or full_domain in trusted_domains:
        return {
            "url": url,
            "prediction": "benign",
            "probability": 0.0 # Trusted domains are always benign
        }

    # Preprocess
    tokenized = makeTokens(url)
    df = pd.DataFrame({'url': [tokenized]})
    vectorized = vectorizer.transform(df['url'])

    # Predict
    predicted_probabilities = model.predict_proba(vectorized)[:, 1]
    predicted_label = "malicious" if predicted_probabilities[0] > 0.6 else "benign"
    probability = float(predicted_probabilities[0])  # Ensure native float

    return {
        "url": url,
        "prediction": predicted_label,
        "probability": probability
    }


if __name__ == "__main__":
    uvicorn.run(app_lr, host="127.0.0.1",port=8000)