(async function() {
    const currentUrl = window.location.href;

    try {
        const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl })
    });
    const data = await response.json();

    if (data.prediction === "malicious") {
        const warningBanner = document.createElement("div");
        warningBanner.textContent = "⚠️ Warning: This site may be malicious!";
        warningBanner.style.position = "fixed";
        warningBanner.style.top = "0";
        warningBanner.style.left = "0";
        warningBanner.style.width = "100%";
        warningBanner.style.backgroundColor = "red";
        warningBanner.style.color = "white";
        warningBanner.style.padding = "10px";
        warningBanner.style.textAlign = "center";
        warningBanner.style.zIndex = "9999";
        document.body.prepend(warningBanner);
        }
    } catch (error) {
        console.error("Error contacting API:", error);
    }
})();
