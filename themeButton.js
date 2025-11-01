const sent = document.getElementById('sent');
const sped = document.getElementById('speed');
const speedLabel = document.getElementById('speedLabel');
const logoButton = document.getElementById('logo');
const logoImage = document.getElementById('logoImage');
const helpImage = document.getElementById('helpImage');
const settingsImage = document.getElementById('settingsImage');
const body = document.body;
const h1Element = document.querySelector('h1');

const imageData = [
    {
        srcl: "UI & Design Elements/Autoscroll_Logo_128.png",
        srch: "UI & Design Elements/Help_Button_White.png",
        srcs: "UI & Design Elements/Settings_Button_White.png",
        bgColor: "#fa5a00",
        textColor: "rgb(255, 255, 255) 52%, rgb(255, 127, 39) 60%, rgb(0, 0, 0) 61%",
        txt: "#000000"
    },
    {
        srcl: "UI & Design Elements/Autoscroll_Logo_128_White.png",
        srch: "UI & Design Elements/Help_Button.png",
        srcs: "UI & Design Elements/Settings_Button.png",
        bgColor: "#ffffff",
        textColor: "rgb(255, 90, 0) 52%, rgb(255, 255, 255) 60%, rgb(0, 0, 0) 61%",
        txt: "#000000"
    },
    {
        srcl: "UI & Design Elements/Autoscroll_Logo_128_Black.png",
        srch: "UI & Design Elements/Help_Button_White_Outline.png",
        srcs: "UI & Design Elements/Settings_Button_White_Outline.png",
        bgColor: "#000000",
        textColor: "rgb(250, 90, 0) 52%, rgb(255, 255, 255) 60%, rgb(255, 255, 255) 61%",
        txt: "#ffffff"
    },
    {
        srcl: "UI & Design Elements/Autoscroll_Logo_128_Gray.png",
        srch: "UI & Design Elements/Help_Button.png",
        srcs: "UI & Design Elements/Settings_Button.png",
        bgColor: "#757575",
        textColor: "rgb(250, 90, 40) 52%, rgb(224, 246, 255) 60%, rgb(0, 0, 0) 61%",
        txt: "#000000"
    },
    {
        srcl: "UI & Design Elements/Autoscroll_Logo_128_Light_Gray.png",
        srch: "UI & Design Elements/Help_Button_White.png",
        srcs: "UI & Design Elements/Settings_Button_White.png",
        bgColor: "#8a8a8a",
        textColor: "rgb(0, 0, 0) 52%, rgb(224, 246, 255) 60%, rgb(0, 0, 0) 61%",
        txt: "#000000"
    }
];

let currentImageIndex = 0;

logoButton.addEventListener('click', () => {
    currentImageIndex = (currentImageIndex + 1) % imageData.length;
    const currentData = imageData[currentImageIndex];

    logoImage.src = currentData.srcl;
    helpImage.src = currentData.srch;
    settingsImage.src = currentData.srcs;
    body.style.backgroundColor = currentData.bgColor;
    const variableColor = currentData.textColor;
    h1Element.style.background = `linear-gradient(to right, rgba(255, 215, 255, 0) 0%, rgba(225, 255, 255, 0) 20%, rgba(255, 255, 255, 0) 61%), linear-gradient(${variableColor})`;
    h1Element.style.backgroundClip = 'text';

    sped.style.color=currentData.txt;
    sent.style.color=currentData.txt;
    speedLabel.style.color=currentData.txt;
});