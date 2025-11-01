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
    const url = 'https://9cv7ofgnsad.typeform.com/to/nqLkVkJT';
    console.log('Opening feedback form:', url);
    window.open(url, '_blank');
});

reboundCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ reboundAtEdge: reboundCheckbox.checked });
});

chrome.storage.sync.get(['reboundAtEdge'], (result) => {
    reboundCheckbox.checked = !!result.reboundAtEdge;
});