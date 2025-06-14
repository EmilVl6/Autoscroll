const helpButton = document.getElementById('help');
const settingsButton = document.getElementById('settings');

helpButton.addEventListener('click', () => {
    window.open('https://www.autoscroll.org/', '_blank');
});

settingsButton.addEventListener('click', () => {
    window.location.href = "settings.html";
    chrome.action.setPopup({
        popup: "settings.html"
    })
});