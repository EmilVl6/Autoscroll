var direction = '';
var scaling = 40;
var speed = 50;
var mapSpeed = 15;
var intervalId = null;
var isScrolling = false;
var scrollTarget = null;
var scrollMethod = 'window';
var currentDirection = 0;
var atEdgeCheckInProgress = false;
var atEdgeTimeout = null;
var lastKnownScrollHeight = 0;

function detectScrollTarget() {
  console.log('Detecting scroll target...');
  
  const initialScrollY = window.scrollY;
  window.scrollBy(0, 1);
  if (window.scrollY !== initialScrollY) {
    window.scrollBy(0, -1);
    console.log('Using window scroll');
    return { element: window, method: 'window' };
  }
  
  const scrollableElements = [];
  const allElements = document.querySelectorAll('*');
  
  for (let el of allElements) {
    const style = window.getComputedStyle(el);
    const hasOverflow = style.overflowY === 'scroll' || style.overflowY === 'auto';
    const hasHeight = el.scrollHeight > el.clientHeight;
    
    if (hasOverflow && hasHeight && el.scrollHeight > 100) {
      const initialScroll = el.scrollTop;
      el.scrollTop += 1;
      if (el.scrollTop !== initialScroll) {
        el.scrollTop = initialScroll;
        scrollableElements.push({
          element: el,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          ratio: el.scrollHeight / el.clientHeight
        });
      }
    }
  }
  
  if (scrollableElements.length > 0) {
    scrollableElements.sort((a, b) => b.ratio - a.ratio);
    console.log('Using scrollable container:', scrollableElements[0].element);
    return { element: scrollableElements[0].element, method: 'element' };
  }
  
  const commonSelectors = [
    'main', '[role="main"]', '.main-content', '#main',
    '.content', '.page-content', '.container',
    'body > div:first-child',
    '[data-scroll]', '[data-scrollable]'
  ];
  
  for (let selector of commonSelectors) {
    const el = document.querySelector(selector);
    if (el && el.scrollHeight > el.clientHeight) {
      const initialScroll = el.scrollTop;
      el.scrollTop += 1;
      if (el.scrollTop !== initialScroll) {
        el.scrollTop = initialScroll;
        console.log('Using common selector:', selector);
        return { element: el, method: 'element' };
      }
    }
  }
  
  const docEl = document.documentElement;
  if (docEl.scrollHeight > docEl.clientHeight) {
    const initialScroll = docEl.scrollTop;
    docEl.scrollTop += 1;
    if (docEl.scrollTop !== initialScroll) {
      docEl.scrollTop = initialScroll;
      console.log('Using document.documentElement');
      return { element: docEl, method: 'documentElement' };
    }
  }
  
  console.log('Using scroll events fallback');
  return { element: window, method: 'events' };
}

function smartScroll(direction, distance) {
  if (!scrollTarget) {
    const detected = detectScrollTarget();
    scrollTarget = detected.element;
    scrollMethod = detected.method;
  }
  
  try {
    switch (scrollMethod) {
      case 'window':
        window.scrollBy(0, distance * direction);
        break;
        
      case 'element':
      case 'documentElement':
        scrollTarget.scrollTop += distance * direction;
        break;
        
      case 'events':
        const scrollEvent = new WheelEvent('wheel', {
          deltaY: distance * direction,
          deltaMode: 0,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(scrollEvent);
        
        const keyEvent = new KeyboardEvent('keydown', {
          key: direction > 0 ? 'ArrowDown' : 'ArrowUp',
          code: direction > 0 ? 'ArrowDown' : 'ArrowUp',
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(keyEvent);
        break;
    }
  } catch (error) {
    console.error('Smart scroll failed:', error);
    window.scrollBy(0, distance * direction);
  }
}

function isAtScrollLimit(direction) {
  try {
    switch (scrollMethod) {
      case 'window':
        if (direction < 0) {
          return window.scrollY <= 5;
        } else {
          const scrollHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          const scrollTop = window.scrollY;
          const bottomPosition = windowHeight + scrollTop;
          const isAtBottom = bottomPosition >= (scrollHeight - 5);
          
          console.log('Bottom check:', {
            scrollHeight,
            windowHeight, 
            scrollTop,
            bottomPosition,
            threshold: scrollHeight - 5,
            isAtBottom
          });
          
          return isAtBottom;
        }
        
      case 'element':
      case 'documentElement':
        if (direction < 0) {
          return scrollTarget.scrollTop <= 5;
        } else {
          const isAtBottom = (scrollTarget.scrollTop + scrollTarget.clientHeight) >= (scrollTarget.scrollHeight - 5);
          console.log('Element bottom check:', {
            scrollTop: scrollTarget.scrollTop,
            clientHeight: scrollTarget.clientHeight,
            scrollHeight: scrollTarget.scrollHeight,
            isAtBottom
          });
          return isAtBottom;
        }
        
      case 'events':
        return false;
    }
  } catch (error) {
    console.error('Error checking scroll limits:', error);
    return false;
  }
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    try {
      console.log('scroll.js received message:', request);
      direction = request.message;
      if (typeof request.sliderValue !== 'undefined') {
        speed = request.sliderValue;
      }
      mapSpeed = (speed - 1) * ((scaling-1)/99) + 1;

      const requestedDirection = direction === 'up' ? -1 : 1;
      const atEdgeForDirection = isAtScrollLimit(requestedDirection);
      
      if(isScrolling && currentDirection === requestedDirection) {
        console.log('Stopping scroll - same direction clicked');
        isScrolling = false;
        currentDirection = 0;
        clearInterval(intervalId);
        intervalId = null;
        sendResponse({success: true, action: 'stopped'});
      } else if (isScrolling && currentDirection !== requestedDirection) {
        if (atEdgeForDirection) {
          console.log('Ignoring direction change - already at edge for requested direction');
          sendResponse({success: true, action: 'ignored', reason: 'at_edge'});
        } else {
          console.log('Changing direction from', currentDirection > 0 ? 'down' : 'up', 'to', requestedDirection > 0 ? 'down' : 'up');
          currentDirection = requestedDirection;
          sendResponse({success: true, action: 'direction_changed', direction: direction, method: scrollMethod});
        }
      } else {
        if (atEdgeForDirection) {
          console.log('Ignoring scroll start - at edge for requested direction');
          sendResponse({success: true, action: 'ignored', reason: 'at_edge'});
        } else {
          scrollTarget = null;
          scrollMethod = 'window';
          currentDirection = requestedDirection;
          isScrolling = true;
          
          const oppositeDirection = -requestedDirection;
          const nearOppositeEdge = isAtScrollLimit(oppositeDirection);
          if (nearOppositeEdge) {
            console.log('Near opposite edge, giving small nudge away from edge');
            window.scrollBy(0, requestedDirection * 3);
          }
          
          startScrolling();
          sendResponse({success: true, action: 'started', direction: direction, method: scrollMethod});
        }
      }
    } catch (error) {
      console.error('Error in scroll.js message handler:', error);
      sendResponse({success: false, error: error.message});
    }
  }
);

function startScrolling() {
  try {
    intervalId = setInterval(function () {
      chrome.storage.sync.get(['reboundAtEdge'], (result) => {
        try {
          const rebound = !!result.reboundAtEdge;
          const atLimit = isAtScrollLimit(currentDirection);

          try {
            if (scrollTarget && scrollTarget !== window && !document.contains(scrollTarget)) {
              console.log('Scroll target was removed from DOM; resetting scrollTarget');
              scrollTarget = null;
              scrollMethod = 'window';
            }
          } catch (err) {
          }

          if (atLimit) {
            if (rebound) {
              const oldDirection = currentDirection;
              currentDirection = -currentDirection;
              console.log('Rebound: reversed direction from', oldDirection > 0 ? 'down' : 'up', 'to', currentDirection > 0 ? 'down' : 'up');

              chrome.runtime.sendMessage({
                action: 'reboundDirectionChange',
                newDirection: currentDirection > 0 ? 'down' : 'up',
                oldDirection: oldDirection > 0 ? 'down' : 'up'
              }).catch(err => {
                console.log('Could not notify popup of rebound:', err.message);
              });

            } else {
              if (!atEdgeCheckInProgress) {
                atEdgeCheckInProgress = true;
                lastKnownScrollHeight = (function () {
                  try {
                    switch (scrollMethod) {
                      case 'window': return document.documentElement.scrollHeight || document.body.scrollHeight || 0;
                      case 'element':
                      case 'documentElement': return scrollTarget ? (scrollTarget.scrollHeight || 0) : (document.documentElement.scrollHeight || 0);
                      default: return document.documentElement.scrollHeight || 0;
                    }
                  } catch (e) { return document.documentElement.scrollHeight || 0; }
                })();

                atEdgeTimeout = setTimeout(() => {
                  atEdgeCheckInProgress = false;
                  try {
                    const newHeight = (function () {
                      try {
                        switch (scrollMethod) {
                          case 'window': return document.documentElement.scrollHeight || document.body.scrollHeight || 0;
                          case 'element':
                          case 'documentElement': return scrollTarget ? (scrollTarget.scrollHeight || 0) : (document.documentElement.scrollHeight || 0);
                          default: return document.documentElement.scrollHeight || 0;
                        }
                      } catch (e) { return document.documentElement.scrollHeight || 0; }
                    })();

                    if (newHeight > lastKnownScrollHeight + 30) {
                      console.log('New content detected while at edge (height increased from', lastKnownScrollHeight, 'to', newHeight, '), continuing scroll');
                    } else {
                      console.log('No new content detected after waiting, stopping scroll');
                      isScrolling = false;
                      currentDirection = 0;
                      clearInterval(intervalId);
                      intervalId = null;

                      chrome.runtime.sendMessage({
                        action: 'scrollStopped',
                        reason: 'reachedEdge',
                        direction: currentDirection > 0 ? 'down' : 'up'
                      }).catch(err => {
                        console.log('Could not notify popup:', err.message);
                      });
                      return;
                    }
                  } catch (error) {
                    console.error('Error during edge re-check:', error);
                    isScrolling = false;
                    currentDirection = 0;
                    clearInterval(intervalId);
                    intervalId = null;
                  }
                }, 1500);
              }
            }
          }
          
          requestAnimationFrame(() => {
            smartScroll(currentDirection, mapSpeed);
          });
          
        } catch (error) {
          console.error('Error in scroll function:', error);
          isScrolling = false;
          currentDirection = 0;
          clearInterval(intervalId);
          intervalId = null;
        }
      });
    }, (scaling+1) - mapSpeed);
  } catch (error) {
    console.error('Error starting scroll:', error);
    isScrolling = false;
    currentDirection = 0;
  }
}
