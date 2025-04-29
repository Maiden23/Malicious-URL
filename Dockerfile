# Use an official lightweight Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy all project files to the container
COPY . .

# Install system dependencies (optional, for pandas, scikit-learn, etc.)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port FastAPI will run on
EXPOSE 8000

# Start the FastAPI app using uvicorn
CMD ["uvicorn", "app_lr:app", "--host", "0.0.0.0", "--port", "8000"]
