const backButton = document.getElementById('back');
const bmacButton = document.getElementById('bmac');
const formButton = document.getElementById('forms');
const reboundCheckbox = document.getElementById('reboundEdge');

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
    window.open('https://forms.gle/Zzjt6YXViG1Uoeoe8', '_blank');
});

reboundCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ reboundAtEdge: reboundCheckbox.checked });
});

chrome.storage.sync.get(['reboundAtEdge'], (result) => {
    reboundCheckbox.checked = !!result.reboundAtEdge;
});