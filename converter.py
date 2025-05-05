import joblib
import json

# Load your vectorizer and model
vectorizer = joblib.load("vectorizer.pkl")
model = joblib.load("logistic_model.pkl")

# Export vectorizer
vectorizer_data = {
    "vocabulary": vectorizer.vocabulary_,
    "idf": vectorizer.idf_.tolist()
}
with open("vectorizer.json", "w") as f:
    json.dump(vectorizer_data, f)

# Export model
model_data = {
    "coef": model.coef_[0].tolist(),
    "intercept": model.intercept_[0].tolist()
}
with open("logreg_model.json", "w") as f:
    json.dump(model_data, f)