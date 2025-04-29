chrome.action.onClicked.addListener((tab) => {
    let url = tab.url;
    alert("This URL is: " + url);
    });

