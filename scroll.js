var direction = '';
var scaling = 40;
var speed = 50;
var mapSpeed = 15;
var intervalId = null;
var isScrolling = false;

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log('scroll.js received message:', request);
    direction = request.message;
    if (typeof request.sliderValue !== 'undefined') {
      speed = request.sliderValue;
    }
    mapSpeed = (speed - 1) * ((scaling-1)/99) + 1;

    if(isScrolling == true){
      isScrolling = false;
      clearInterval(intervalId);
      intervalId = null;
    }
    else{
    isScrolling = true;
    if (direction === 'up') {
      scroll(-1);
    } else if (direction === 'down') {
      scroll(1);
    }
  }
  }
);

function scroll(direction){
  intervalId = setInterval(function () {
    chrome.storage.sync.get(['reboundAtEdge'], (result) => {
      const rebound = !!result.reboundAtEdge;
      const atTop = (window.scrollY === 0);
      const atBottom = (window.innerHeight + Math.ceil(window.scrollY)) >= Math.ceil(document.documentElement.scrollHeight);
      if (rebound) {
        if (direction === 1 && atBottom) {
          direction = -1;
        } else if (direction === -1 && atTop) {
          direction = 1;
        }
      }
      window.scrollBy(0, mapSpeed * direction);
    });
  }, (scaling+1) - mapSpeed);
}
