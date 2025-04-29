# Malicious URL Detection using TF-IDF + XGBoost

This project implements a machine learning pipeline to detect malicious and phishing URLs using NLP techniques. It processes raw URLs, vectorizes them using TF-IDF, balances the dataset with SMOTE, and classifies using XGBoost, achieving over 94% accuracy.

---

## Overview

Phishing and malicious websites pose a serious threat to online users. This project focuses on detecting such threats based on URL patterns, without depending on third-party APIs or browsing history.

---

## Dataset

- **Source**: [malicious_phish.csv](https://www.kaggle.com/datasets/siddharthkumar25/malicious-and-benign-urls?resource=download)
- **Labels**:
  - `0`: benign
  - `1`: malicious

---

## Features

- Tokenization of URL into subdomain, domain, and path
- Detection of phishing keywords and fake brand usage
- TF-IDF vectorization of tokenized URLs
- Data balancing with SMOTE
- Classification using XGBoost

---

##  Requirements

Install dependencies with:

```bash
pip install requirements.txt
```

##  How to Use
# Preprocess and Train

```bash
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from imblearn.over_sampling import SMOTE
import xgboost as xgb

# Load dataset
df = pd.read_csv("urldata.csv")

# Clean and tokenize URLs, then vectorize using TF-IDF
# Apply SMOTE to balance dataset
# Train XGBoost classifier
```
# Predict from URL

```bash
predict("http://anuoluwapoegbedayo.org/secure/zigi.securities/")
# Output: ('malicious', 1)
```

RUN the DOCKERFILE for all the dependencies and backend FASTAPI
```bash
docker build -t url-checker-api .
docker run -d -p 8000:8000 --name url-checker-container url-checker-api
```


##  Model Performance
Test Accuracy: 94.36%

Balanced training data using SMOTE

Handles over 400k URLs efficiently

```bash
>>> predict("https://paypal.support.free-offer.com")
```
Output: ('malicious', 1)



##  WEB EXTENSION 

FASTAPI for backend where it acts as intermediate between ml model and url to check if its legit or not.
RUN the Dockerfile and the extension
