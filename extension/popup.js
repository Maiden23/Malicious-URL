// popup.js

// Fetch the URL of the current tab and send it to FastAPI
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentUrl = tabs[0].url; // Get the current URL
    document.getElementById("result").innerText = "Classifying...";

    // Make an API request to your FastAPI server
    fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: currentUrl })
    })
    .then(response => response.json())
    .then(data => {
        // Show the result
        document.getElementById("result").innerText = `URL: ${data.url}\nPrediction: ${data.prediction}\nProbability: ${data.probability}`;
    })
    .catch(error => {
        console.error("Error:", error);
        document.getElementById("result").innerText = "Error classifying URL";
    });
});
