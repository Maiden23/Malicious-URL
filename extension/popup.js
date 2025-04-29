chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentUrl = tabs[0].url;

    fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: currentUrl })
    })
    .then(async (response) => {
        if (!response.ok) {
            throw new Error("HTTP status " + response.status);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid content type: " + contentType);
        }

        const data = await response.json();
        console.log("API returned:", data);

        if (!data.url || !data.prediction || data.probability === undefined) {
            throw new Error("Malformed API response");
        }

        document.getElementById("status").textContent =
            `URL: ${data.url}\nPrediction: ${data.prediction.toUpperCase()} (${data.probability.toFixed(2)})`;
    })
    .catch((error) => {
        document.getElementById("status").textContent = "Invalid response from API.";
        console.error("Error:", error);
    });
});
