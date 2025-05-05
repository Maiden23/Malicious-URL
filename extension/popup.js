// --- Preprocessing ---
function makeTokens(url) {
    url = url.toLowerCase().trim();
    url = url.replace(/\[\.\]/g, '.'); // Normalize obfuscation

    // Parse URL
    let parser = document.createElement('a');
    parser.href = url;
    let path = parser.pathname || '';
    let hostname = parser.hostname || '';

    // Extract subdomain, domain, suffix
    let parts = hostname.split('.');
    let suffix = parts.pop();
    let main_domain = parts.length ? parts.pop() : '';
    let subdomain = parts.join('.');

    let full_domain = [subdomain, main_domain, suffix].filter(Boolean).join('.');
    let base_domain = [main_domain, suffix].filter(Boolean).join('.');

    // Tokenize
    let tokens = (subdomain + ' ' + main_domain + ' ' + path)
        .split(/[\/\.\-]/)
        .filter(t => t && !["com", "net", "org", "www", suffix].includes(t));

    // Trusted/suspicious logic
    const trusted_domains = [
        "google.com", "mail.google.com", "paypal.com",
        "facebook.com", "microsoft.com", "apple.com",
        "gmail.com", "chatgpt.com", "github.com"
    ];
    const trusted_brands = [
        "paypal", "google", "amazon", "facebook",
        "microsoft", "apple", "gmail", "chatgpt"
    ];
    const suspicious_keywords = [
        "login", "secure", "verify", "account", "update",
        "bank", "free", "offer", "password", "support"
    ];

    if (!trusted_domains.includes(base_domain) && !trusted_domains.includes(full_domain)) {
        if (trusted_brands.some(brand => subdomain.includes(brand))) {
            tokens.push("fake_brand");
        }
        if (suspicious_keywords.some(word => path.includes(word))) {
            tokens.push("suspicious_path");
        }
    }

    return Array.from(new Set(tokens)).join(' ');
}

// --- Vectorizer ---
function vectorize(text, vocabulary, idf) {
    let tf = {};
    let tokens = text.split(' ');
    tokens.forEach(token => {
        if (vocabulary.hasOwnProperty(token)) {
            tf[token] = (tf[token] || 0) + 1;
        }
    });

    let vec = new Array(Object.keys(vocabulary).length).fill(0);
    Object.keys(tf).forEach(token => {
        let idx = vocabulary[token];
        vec[idx] = (tf[token] / tokens.length) * idf[idx];
    });
    return vec;
}

// --- Logistic Regression ---
function sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
}

function predictLogReg(vec, coef, intercept) {
    let z = vec.reduce((sum, v, i) => sum + v * coef[i], 0) + intercept;
    let prob = sigmoid(z);
    let label = prob > 0.6 ? "malicious" : "benign";
    return { label, prob };
}

let vectorizer, model;

// Fallback mini-model for testing if the JSON files are missing
const FALLBACK_VECTORIZER = {
    vocabulary: { "google": 0, "login": 1, "account": 2, "secure": 3, "suspicious_path": 4, "fake_brand": 5 },
    idf: [1.5, 2.5, 2.0, 2.5, 3.0, 3.0]
};

const FALLBACK_MODEL = {
    coef: [0.1, 0.8, 0.5, 0.9, 2.5, 3.0],
    intercept: -0.5
};

const loadModelAndVectorizer = async () => {
    try {
        console.log("Loading model files...");
        
        // Try to load from the extension directory
        try {
            const vectorizerResp = await fetch(chrome.runtime.getURL('models/vectorizer.json'));
            if (!vectorizerResp.ok) {
                throw new Error(`Failed to load vectorizer.json: ${vectorizerResp.status}`);
            }
            
            const modelResp = await fetch(chrome.runtime.getURL('models/logreg_model.json'));
            if (!modelResp.ok) {
                throw new Error(`Failed to load logreg_model.json: ${modelResp.status}`);
            }
            
            vectorizer = await vectorizerResp.json();
            model = await modelResp.json();
            
            console.log("Models loaded successfully!");
        } catch (error) {
            console.warn("Could not load model files:", error.message);
            console.warn("Using fallback mini-model for basic detection");
            
            // Use fallback mini-model
            vectorizer = FALLBACK_VECTORIZER;
            model = FALLBACK_MODEL;
        }
        
        console.log("Vectorizer has vocabulary with", Object.keys(vectorizer.vocabulary).length, "features");
        console.log("Model has coefficients with", model.coef?.length || 0, "features");
    } catch (error) {
        console.error("Error loading models:", error);
        throw error;
    }
};

// Helper function to render emoji properly
function getEmoji(type) {
    switch(type) {
        case 'warning':
            return '<span class="emoji">&#x26A0;&#xFE0F;</span>'; // ⚠️ 
        case 'check':
            return '<span class="emoji">&#x2705;</span>'; // ✅
        case 'question':
            return '<span class="emoji">&#x2753;</span>'; // ❓
        case 'error':
            return '<span class="emoji">&#x274C;</span>'; // ❌
        case 'scan':
            return '<span class="emoji">&#x1F50D;</span>'; // 🔍
        default:
            return '<span class="emoji">&#x1F50D;</span>'; // 🔍
    }
}

// Format display of the URL nicely
function formatUrl(url) {
    const MAX_LENGTH = 40;
    
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const path = urlObj.pathname;
        
        let displayUrl = domain;
        if (path && path !== '/') {
            const shortenedPath = path.length > 20 ? path.substring(0, 17) + '...' : path;
            displayUrl += shortenedPath;
        }
        
        if (displayUrl.length > MAX_LENGTH) {
            displayUrl = displayUrl.substring(0, MAX_LENGTH - 3) + '...';
        }
        
        return displayUrl;
    } catch (e) {
        return url.length > MAX_LENGTH ? url.substring(0, MAX_LENGTH - 3) + '...' : url;
    }
}

function getSeverityLabel(probability) {
    if (probability < 0.4) return "Low Risk";
    if (probability < 0.7) return "Medium Risk";
    return "High Risk";
}

// Main function to analyze URL
chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
    const statusElem = document.getElementById("status");
    
    // Show loading status with animation
    statusElem.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            ${getEmoji('scan')}
            <div style="margin-top: 8px;">Analyzing URL safety...</div>
        </div>
    `;
    statusElem.classList.remove("status-safe", "status-malicious", "status-unknown");
    statusElem.classList.add("status-unknown");
    
    try {
        await loadModelAndVectorizer();

        const currentUrl = tabs[0].url;
        console.log("Analyzing URL:", currentUrl);
        
        const tokens = makeTokens(currentUrl);
        console.log("Tokenized result:", tokens);
        
        // Special case for trusted domains
        const trusted_domains = [
            "google.com", "mail.google.com", "paypal.com",
            "facebook.com", "microsoft.com", "apple.com",
            "gmail.com", "chatgpt.com", "github.com"
        ];
        
        // Extract domain for quick trusted check
        let parser = document.createElement('a');
        parser.href = currentUrl;
        let hostname = parser.hostname || '';
        
        if (trusted_domains.some(domain => hostname.includes(domain))) {
            // Trusted domain - no need to run model
            statusElem.classList.remove("status-unknown", "status-malicious");
            statusElem.classList.add("status-safe");
            
            statusElem.innerHTML = `
                <div class="url-display">${formatUrl(currentUrl)}</div>
                <div class="prediction">${getEmoji('check')} Safe Website</div>
                <div><span class="probability">Trusted Domain</span></div>
            `;
            return;
        }
        
        const vecArr = vectorize(tokens, vectorizer.vocabulary, vectorizer.idf);
        console.log("Vectorized with", vecArr.length, "features");
        
        const result = predictLogReg(vecArr, model.coef, model.intercept);
        console.log("Prediction result:", result);

        // Update UI with emoji and color based on result
        statusElem.classList.remove("status-safe", "status-malicious", "status-unknown");
        
        let statusContent = '';
        
        if (result.label.toLowerCase() === "malicious") {
            statusElem.classList.add("status-malicious");
            
            // Format content for malicious result
            statusContent = `
                <div class="url-display">${formatUrl(currentUrl)}</div>
                <div class="prediction">${getEmoji('warning')} Potentially Unsafe</div>
                <div><span class="probability">${getSeverityLabel(result.prob)} (${(result.prob * 100).toFixed(0)}%)</span></div>
            `;
        } else {
            statusElem.classList.add("status-safe");
            
            // Format content for safe result
            statusContent = `
                <div class="url-display">${formatUrl(currentUrl)}</div>
                <div class="prediction">${getEmoji('check')} Safe Website</div>
                <div><span class="probability">${(1 - result.prob) * 100 > 90 ? "Very Safe" : "Probably Safe"} (${((1 - result.prob) * 100).toFixed(0)}%)</span></div>
            `;
        }
        
        statusElem.innerHTML = statusContent;
    } catch (err) {
        console.error("Extension error:", err);
        statusElem.classList.remove("status-safe", "status-malicious", "status-unknown");
        statusElem.classList.add("status-unknown");
        
        statusElem.innerHTML = `
            <div class="prediction">${getEmoji('error')} Error</div>
            <div>${err.message || "Failed to analyze URL"}</div>
            <div style="font-size: 12px; margin-top: 8px; color: var(--text-light);">Check console for details</div>
        `;
    }
});
