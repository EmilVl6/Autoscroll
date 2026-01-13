var direction = '';
var speed = 50;
var scrollDistance = 1;
var intervalId = null;
var isScrolling = false;
var scrollTarget = null;
var scrollMethod = 'window';
var currentDirection = 0;
var atEdgeCheckInProgress = false;
var atEdgeTimeout = null;
var lastKnownScrollHeight = 0;
var cachedReboundSetting = false;
var scrollTargetDetected = false;

function detectScrollTarget() {
  const prioritySelectors = [
    'main [class*="scroll"]',
    'main .overflow-y-auto',
    '[class*="conversation"]',
    'main > div > div',
    '[role="main"] > div',
  ];
  
  for (let selector of prioritySelectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const style = window.getComputedStyle(el);
        const hasOverflow = style.overflowY === 'scroll' || style.overflowY === 'auto' || style.overflow === 'auto' || style.overflow === 'scroll';
        const hasHeight = el.scrollHeight > el.clientHeight + 10;
        
        if (hasOverflow && hasHeight) {
          const initialScroll = el.scrollTop;
          el.scrollTop += 3;
          if (el.scrollTop !== initialScroll) {
            el.scrollTop = initialScroll;
            return { element: el, method: 'element' };
          }
        }
      }
    } catch (e) {}
  }
  
  const scrollableElements = [];
  
  const allElements = document.querySelectorAll('*');
  for (let el of allElements) {
    const style = window.getComputedStyle(el);
    const hasOverflow = style.overflowY === 'scroll' || style.overflowY === 'auto' || style.overflow === 'auto' || style.overflow === 'scroll';
    const hasHeight = el.scrollHeight > el.clientHeight + 5;
    
    if (hasOverflow && hasHeight) {
      const initialScroll = el.scrollTop;
      el.scrollTop += 2;
      if (el.scrollTop !== initialScroll) {
        el.scrollTop = initialScroll;
        const area = el.clientHeight * el.clientWidth;
        const viewportArea = window.innerHeight * window.innerWidth;
        const areaRatio = area / viewportArea;
        scrollableElements.push({
          element: el,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          area: area,
          areaRatio: areaRatio,
          ratio: el.scrollHeight / el.clientHeight
        });
      }
    }
  }
  
  if (scrollableElements.length > 0) {
    scrollableElements.sort((a, b) => {
      const aScore = a.areaRatio * a.ratio;
      const bScore = b.areaRatio * b.ratio;
      return bScore - aScore;
    });
    return { element: scrollableElements[0].element, method: 'element' };
  }
  
  const initialScrollY = window.scrollY;
  window.scrollBy(0, 2);
  if (window.scrollY !== initialScrollY) {
    window.scrollBy(0, -2);
    return { element: window, method: 'window' };
  }
  
  const docEl = document.documentElement;
  const initialDocScroll = docEl.scrollTop;
  docEl.scrollTop += 2;
  if (docEl.scrollTop !== initialDocScroll) {
    docEl.scrollTop = initialDocScroll;
    return { element: docEl, method: 'documentElement' };
  }
  
  const body = document.body;
  if (body && body.scrollHeight > body.clientHeight) {
    return { element: body, method: 'element' };
  }
  
  return { element: null, method: 'none' };
}

function smartScroll(direction, distance) {
  if (!scrollTarget || !scrollTargetDetected) {
    const detected = detectScrollTarget();
    scrollTarget = detected.element;
    scrollMethod = detected.method;
    scrollTargetDetected = true;
    
    if (scrollMethod === 'none' || !scrollTarget) {
      return false;
    }
  }
  
  const beforeScrollPos = scrollMethod === 'window' ? window.scrollY : 
                         (scrollTarget && scrollTarget.scrollTop !== undefined ? scrollTarget.scrollTop : 0);
  
  try {
    switch (scrollMethod) {
      case 'window':
        window.scrollBy(0, distance * direction);
        break;
        
      case 'element':
      case 'documentElement':
        if (scrollTarget && scrollTarget.scrollTop !== undefined) {
          scrollTarget.scrollTop += distance * direction;
        } else {
          return false;
        }
        break;
        
      case 'events':
        const scrollEvent = new WheelEvent('wheel', {
          deltaY: distance * direction,
          deltaMode: 0,
          bubbles: true,
          cancelable: true
        });
        if (scrollTarget && scrollTarget !== window) {
          scrollTarget.dispatchEvent(scrollEvent);
        } else {
          document.dispatchEvent(scrollEvent);
        }
        break;
        
      case 'none':
        return false;
    }
  } catch (error) {
    return false;
  }
  
  const afterScrollPos = scrollMethod === 'window' ? window.scrollY : 
                        (scrollTarget && scrollTarget.scrollTop !== undefined ? scrollTarget.scrollTop : 0);
  
  return Math.abs(afterScrollPos - beforeScrollPos) > 0.1;
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
          
          return isAtBottom;
        }
        
      case 'element':
      case 'documentElement':
        if (direction < 0) {
          return scrollTarget.scrollTop <= 5;
        } else {
          const isAtBottom = (scrollTarget.scrollTop + scrollTarget.clientHeight) >= (scrollTarget.scrollHeight - 5);
          return isAtBottom;
        }
        
      case 'events':
        return false;
    }
  } catch (error) {
    return false;
  }
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    try {
      if (request.action === 'getScrollState') {
        sendResponse({
          success: true,
          isScrolling: isScrolling,
          direction: currentDirection > 0 ? 'down' : (currentDirection < 0 ? 'up' : null)
        });
        return true;
      }

      direction = request.message;
      if (typeof request.sliderValue !== 'undefined') {
        speed = request.sliderValue;
      }
      const normalizedSpeed = (speed - 1) / 99;
      const curvedSpeed = Math.pow(normalizedSpeed, 2.2);
      scrollDistance = curvedSpeed * 140 + 0.6;

      const requestedDirection = direction === 'up' ? -1 : 1;
      const atEdgeForDirection = isAtScrollLimit(requestedDirection);
      
      if(isScrolling && currentDirection === requestedDirection) {
        isScrolling = false;
        currentDirection = 0;
        clearInterval(intervalId);
        intervalId = null;
        if (atEdgeTimeout) {
          clearTimeout(atEdgeTimeout);
          atEdgeTimeout = null;
        }
        atEdgeCheckInProgress = false;
        sendResponse({success: true, action: 'stopped'});
      } else if (!isScrolling && atEdgeCheckInProgress && currentDirection === 0) {
        if (atEdgeTimeout) {
          clearTimeout(atEdgeTimeout);
          atEdgeTimeout = null;
        }
        atEdgeCheckInProgress = false;
        sendResponse({success: true, action: 'stopped'});
      } else if (isScrolling && currentDirection !== requestedDirection) {
        if (atEdgeForDirection) {
          sendResponse({success: true, action: 'ignored', reason: 'at_edge'});
        } else {
          currentDirection = requestedDirection;
          sendResponse({success: true, action: 'direction_changed', direction: direction, method: scrollMethod});
        }
      } else {
        if (atEdgeForDirection) {
          sendResponse({success: true, action: 'ignored', reason: 'at_edge'});
        } else {
          scrollTarget = null;
          scrollTargetDetected = false;
          scrollMethod = 'window';
          
          currentDirection = requestedDirection;
          isScrolling = true;
          
          chrome.storage.sync.get(['reboundAtEdge'], (result) => {
            cachedReboundSetting = !!result.reboundAtEdge;
          });
          
          const oppositeDirection = -requestedDirection;
          const nearOppositeEdge = isAtScrollLimit(oppositeDirection);
          if (nearOppositeEdge) {
            window.scrollBy(0, requestedDirection * 3);
          }
          
          startScrolling();
          sendResponse({success: true, action: 'started', direction: direction, method: scrollMethod});
        }
      }
    } catch (error) {
      sendResponse({success: false, error: error.message});
    }
  }
);

function startScrolling() {
  try {
    intervalId = setInterval(function () {
      try {
        const atLimit = isAtScrollLimit(currentDirection);

        try {
          if (scrollTarget && scrollTarget !== window && !document.contains(scrollTarget)) {
            scrollTarget = null;
            scrollTargetDetected = false;
            scrollMethod = 'window';
          }
        } catch (err) {
        }

        if (atLimit) {
          if (cachedReboundSetting) {
            const oldDirection = currentDirection;
            currentDirection = -currentDirection;

            chrome.runtime.sendMessage({
              action: 'reboundDirection',
              oldDirection: oldDirection > 0 ? 'down' : 'up',
              newDirection: currentDirection > 0 ? 'down' : 'up'
            }).catch(err => {
            });

          } else {
            const stoppedDirection = currentDirection > 0 ? 'down' : 'up';
            
            isScrolling = false;
            currentDirection = 0;
            clearInterval(intervalId);
            intervalId = null;

            chrome.runtime.sendMessage({
              action: 'scrollStopped',
              reason: 'reachedEdge',
              direction: stoppedDirection
            }).catch(err => {
            });

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

              let checkCount = 0;
              const maxChecks = 40;
              
              const checkForNewContent = () => {
                checkCount++;
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
                    atEdgeCheckInProgress = false;
                    currentDirection = stoppedDirection === 'down' ? 1 : -1;
                    isScrolling = true;
                    startScrolling();
                    
                    chrome.runtime.sendMessage({
                      action: 'scrollResumed',
                      direction: stoppedDirection
                    }).catch(err => {
                    });
                  } else if (checkCount < maxChecks) {
                    atEdgeTimeout = setTimeout(checkForNewContent, 1500);
                  } else {
                    atEdgeCheckInProgress = false;
                  }
                } catch (error) {
                  atEdgeCheckInProgress = false;
                }
              };
              
              atEdgeTimeout = setTimeout(checkForNewContent, 1500);
            }
            return;
          }
        }
        
        if (isScrolling) {
          requestAnimationFrame(() => {
            smartScroll(currentDirection, scrollDistance);
          });
        }
        
      } catch (error) {
        isScrolling = false;
        currentDirection = 0;
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 16);
  } catch (error) {
    isScrolling = false;
    currentDirection = 0;
  }
}