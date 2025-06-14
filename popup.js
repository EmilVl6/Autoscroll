document.addEventListener("DOMContentLoaded", function() {
    var speed = document.getElementById("speed");
    var slider = document.getElementById("myRange");
    var btnu = document.getElementById("scrollU");
    var btnd = document.getElementById("scrollD");

    function popupScroll(direction) {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
            var activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, {"message": direction, "sliderValue": slider.value});
            console.log("Message sent:", activeTab.id, {"message": direction, "sliderValue": slider.value});
        });
    }

    btnu.addEventListener('click', function() {
        console.log('Scroll Up button clicked');
        popupScroll('up');
    });
    btnd.addEventListener('click', function() {
        console.log('Scroll Down button clicked');
        popupScroll('down');
    });
    setInterval(function(){speed.innerHTML=slider.value;},10);
});
