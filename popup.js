document.addEventListener("DOMContentLoaded", function() {
    var speed = document.getElementById("speed");
    var speedLabel = document.getElementById("speedLabel");
    var slider = document.getElementById("myRange");
    var btnu = document.getElementById("scrollU");
    var btnd = document.getElementById("scrollD");
    
    let activeScrollDirection = null;

    function showTemporaryMessage(message) {
        let messageEl = document.getElementById('tempMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'tempMessage';
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            if (messageEl) {
                messageEl.style.display = 'none';
            }
        }, 3000);
    }

    function getSpeedLabel(value) {
        if (value <= 20) return " (Very Slow)";
        if (value <= 40) return " (Slow)";
        if (value <= 60) return " (Medium)";
        if (value <= 80) return " (Fast)";
        return " (Very Fast)";
    }

    function updateSpeedDisplay() {
        speed.innerHTML = slider.value;
        speedLabel.innerHTML = getSpeedLabel(parseInt(slider.value));
    }

    function updateButtonStates() {
        btnu.classList.remove('scrolling');
        btnd.classList.remove('scrolling');
        
        if (activeScrollDirection === 'up') {
            btnu.classList.add('scrolling');
            btnu.textContent = 'Stop Scrolling Up';
            btnd.textContent = 'Scroll Down';
        } else if (activeScrollDirection === 'down') {
            btnd.classList.add('scrolling');
            btnd.textContent = 'Stop Scrolling Down';
            btnu.textContent = 'Scroll Up';
        } else {
            btnu.textContent = 'Scroll Up';
            btnd.textContent = 'Scroll Down';
        }
    }

    function popupScroll(direction) {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
            if (!tabs || !tabs[0]) {
                return;
            }
            
            var activeTab = tabs[0];
            
            const restrictedPages = [
                'chrome://',
                'chrome-extension://',
                'moz-extension://',
                'edge://',
                'about:',
                'file://'
            ];
            
            const isRestrictedPage = restrictedPages.some(prefix => 
                activeTab.url && activeTab.url.startsWith(prefix)
            );
            
            if (isRestrictedPage) {
                showTemporaryMessage('Cannot scroll on this type of page, sorry :(');
                return;
            }
            
            const previousDirection = activeScrollDirection;
            
            chrome.tabs.sendMessage(activeTab.id, {
                "message": direction, 
                "sliderValue": slider.value
            }, function(response) {
                if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message || 'Unknown error';
                    
                    activeScrollDirection = null;
                    
                    if (errorMsg.includes('Could not establish connection')) {
                        if (!chrome.runtime || !chrome.runtime.id) {
                            return;
                        }
                        
                        chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            files: ['scroll.js']
                        }, function() {
                            if (chrome.runtime.lastError) {
                                const injectError = chrome.runtime.lastError.message;
                                
                                if (injectError.includes('chrome://') || 
                                    injectError.includes('extensions gallery') ||
                                    injectError.includes('cannot be scripted')) {
                                    showTemporaryMessage('Cannot scroll on this page type, sorry :(');
                                } else {
                                    showTemporaryMessage('Failed to load extension on this page, sorry :(');
                                }
                                updateButtonStates();
                            } else {
                                setTimeout(() => {
                                    if (!chrome.runtime || !chrome.runtime.id) {
                                        return;
                                    }
                                    
                                    chrome.tabs.sendMessage(activeTab.id, {
                                        "message": direction, 
                                        "sliderValue": slider.value
                                    }, function(retryResponse) {
                                        if (chrome.runtime.lastError) {
                                            activeScrollDirection = null;
                                            showTemporaryMessage('Extension failed to start, sorry :(');
                                        } else if (retryResponse && retryResponse.success) {
                                            if (retryResponse.action === 'started') {
                                                activeScrollDirection = direction;
                                            } else if (retryResponse.action === 'stopped') {
                                                activeScrollDirection = null;
                                            } else if (retryResponse.action === 'direction_changed') {
                                                activeScrollDirection = direction;
                                            }
                                        } else {
                                            activeScrollDirection = null;
                                        }
                                        updateButtonStates();
                                    });
                                }, 200);
                            }
                        });
                    } else {
                        showTemporaryMessage('Cannot scroll on this page, sorry :(');
                    }
                } else if (response && response.success) {
                    if (response.action === 'started') {
                        activeScrollDirection = direction;
                    } else if (response.action === 'stopped') {
                        activeScrollDirection = null;
                    } else if (response.action === 'direction_changed') {
                        activeScrollDirection = direction;
                    }
                } else if (response && !response.success) {
                    activeScrollDirection = null;
                    showTemporaryMessage(response.error || 'Cannot scroll on this page, sorry :(');
                } else {
                    activeScrollDirection = null;
                }
                updateButtonStates();
            });
        });
    }

    btnu.addEventListener('click', function() {
        popupScroll('up');
    });
    
    btnd.addEventListener('click', function() {
        popupScroll('down');
    });
    
    let saveSpeedTimeout;
    
    slider.addEventListener('input', function() {
        updateSpeedDisplay();
        
        if (saveSpeedTimeout) {
            clearTimeout(saveSpeedTimeout);
        }
        
        saveSpeedTimeout = setTimeout(() => {
            chrome.storage.sync.set({ scrollSpeed: parseInt(slider.value) });
        }, 500);
    });
    
    chrome.storage.sync.get(['scrollSpeed'], function(result) {
        if (chrome.runtime.lastError) {
            updateSpeedDisplay();
            updateButtonStates();
            return;
        }
        
        if (result.scrollSpeed) {
            slider.value = result.scrollSpeed;
        }
        updateSpeedDisplay();
        
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'getScrollState'}, function(response) {
                    if (chrome.runtime.lastError) {
                        updateButtonStates();
                        return;
                    }
                    if (response && response.success && response.isScrolling) {
                        activeScrollDirection = response.direction;
                    }
                    updateButtonStates();
                });
            } else {
                updateButtonStates();
            }
        });
    });
    
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.action === 'scrollStopped') {
            activeScrollDirection = null;
            updateButtonStates();
        } else if (message.action === 'scrollResumed') {
            activeScrollDirection = message.direction;
            updateButtonStates();
        } else if (message.action === 'reboundDirection') {
            activeScrollDirection = message.newDirection;
            updateButtonStates();
        } else if (message.action === 'shortcutUsed') {
            if (message.response.action === 'started') {
                activeScrollDirection = message.direction;
            } else if (message.response.action === 'stopped') {
                activeScrollDirection = null;
            } else if (message.response.action === 'direction_changed') {
                activeScrollDirection = message.direction;
            }
            
            updateButtonStates();
        } else if (message.action === 'shortcutError') {
            showTemporaryMessage(message.message);
        }
    });
});