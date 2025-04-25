from fastapi import FastAPI
import xgboost as xgb
import pandas as pd
import pickle
from pydantic import BaseModel
from functools import lru_cache
from urllib.parse import urlparse
from tld import get_tld
from tldextract import extract
import tldextract
import re
from sklearn.feature_extraction.text import TfidfVectorizer
app = FastAPI()

# Load the trained XGBoost model
model = xgb.Booster()
model.load_model("malicious.json")
# Cache to store vectorized URLs
#@lru_cache(maxsize=1000)  # Adjust size based on memory availability
def vectorize_url(url: str):
    vectorizer = TfidfVectorizer()
    return vectorizer.fit_transform([url])

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

@app.post("/predict/")
def predict(url: str):

    sample_url = pd.Series([url])

    sample_feature = sample_url.apply(makeTokens).tolist() 

    sample_feature = pd.DataFrame(sample_feature)
    print(sample_feature)

    sample_feature = vectorize_url(sample_feature[0])
    # Make prediction
    prediction = model.predict(sample_feature)  

    return {"prediction": prediction[0]} 

predict("https://www.google.com")