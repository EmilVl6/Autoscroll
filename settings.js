const backButton = document.getElementById('back');
const bmacButton = document.getElementById('bmac');
const formButton = document.getElementById('forms');
const reboundCheckbox = document.getElementById('reboundEdge');
const backButtonImg = document.querySelector('#back img');
const supportText = document.querySelector('.support-text');

const themeData = [
    { bgColor: "#fa5a00", logoSrc: "UI & Design Elements/Autoscroll_Logo_128.png", textColor: "white" },
    { bgColor: "#ffffff", logoSrc: "UI & Design Elements/Autoscroll_Logo_128_White.png", textColor: "#1a1a1a" },
    { bgColor: "#000000", logoSrc: "UI & Design Elements/Autoscroll_Logo_128_Black.png", textColor: "white" },
    { bgColor: "#757575", logoSrc: "UI & Design Elements/Autoscroll_Logo_128_Gray.png", textColor: "white" },
    { bgColor: "#8a8a8a", logoSrc: "UI & Design Elements/Autoscroll_Logo_128_Light_Gray.png", textColor: "white" }
];

chrome.storage.sync.get(['themeIndex'], (result) => {
    if (result.themeIndex !== undefined) {
        const theme = themeData[result.themeIndex];
        document.body.style.backgroundColor = theme.bgColor;
        backButtonImg.src = theme.logoSrc;
        supportText.style.color = theme.textColor;
    }
});

backButton.addEventListener('click', () => {
    window.location.href = "popup.html";
    chrome.action.setPopup({
        popup: "popup.html"
    })
});

bmacButton.addEventListener('click', () => {
    window.open('https://buymeacoffee.com/emilv16', '_blank');
});

formButton.addEventListener('click', () => {
    const url = 'https://9cv7ofgnsad.typeform.com/to/nqLkVkJT';
    window.open(url, '_blank');
});

reboundCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ reboundAtEdge: reboundCheckbox.checked });
});

chrome.storage.sync.get(['reboundAtEdge'], (result) => {
    reboundCheckbox.checked = !!result.reboundAtEdge;
});