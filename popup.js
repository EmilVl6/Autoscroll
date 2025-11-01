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
        
        console.log('Button states updated. Active direction:', activeScrollDirection);
    }

    function popupScroll(direction) {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
            if (!tabs || !tabs[0]) {
                console.error('No active tab found');
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
                console.log('Cannot scroll on restricted page:', activeTab.url);
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
                    console.log('Error sending message (handled):', errorMsg);
                    
                    activeScrollDirection = null;
                    
                    if (errorMsg.includes('Could not establish connection')) {
                        console.log('Content script not loaded, attempting to inject...');
                        
                        if (!chrome.runtime || !chrome.runtime.id) {
                            console.log('Extension context invalidated, skipping injection');
                            return;
                        }
                        
                        chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            files: ['scroll.js']
                        }, function() {
                            if (chrome.runtime.lastError) {
                                const injectError = chrome.runtime.lastError.message;
                                console.error('Content script injection failed:', injectError);
                                
                                if (injectError.includes('chrome://') || 
                                    injectError.includes('extensions gallery') ||
                                    injectError.includes('cannot be scripted')) {
                                    console.log('Page cannot be scripted (expected behavior)');
                                    showTemporaryMessage('Cannot scroll on this page type, sorry :(');
                                } else {
                                    console.log('Failed to inject content script (handled):', injectError);
                                    showTemporaryMessage('Failed to load extension on this page, sorry :(');
                                }
                                updateButtonStates();
                            } else {
                                console.log('Content script injected successfully, retrying message...');
                                
                                setTimeout(() => {
                                    if (!chrome.runtime || !chrome.runtime.id) {
                                        console.log('Extension context invalidated, skipping retry');
                                        return;
                                    }
                                    
                                    chrome.tabs.sendMessage(activeTab.id, {
                                        "message": direction, 
                                        "sliderValue": slider.value
                                    }, function(retryResponse) {
                                        if (chrome.runtime.lastError) {
                                            console.log('Retry failed (handled):', chrome.runtime.lastError.message);
                                            activeScrollDirection = null;
                                            showTemporaryMessage('Extension failed to start, sorry :(');
                                        } else if (retryResponse && retryResponse.success) {
                                            console.log('Retry successful:', retryResponse);
                                            if (retryResponse.action === 'started') {
                                                activeScrollDirection = direction;
                                            } else if (retryResponse.action === 'stopped') {
                                                activeScrollDirection = null;
                                            } else if (retryResponse.action === 'direction_changed') {
                                                activeScrollDirection = direction;
                                            } else if (retryResponse.action === 'ignored') {
                                                console.log('Action ignored on retry:', retryResponse.reason);
                                            }
                                        } else {
                                            console.warn('No response on retry');
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
                    console.log('Message sent successfully:', response);
                    
                    if (response.action === 'started') {
                        activeScrollDirection = direction;
                    } else if (response.action === 'stopped') {
                        activeScrollDirection = null;
                    } else if (response.action === 'direction_changed') {
                        activeScrollDirection = direction;
                        console.log('Direction changed to:', response.direction);
                    } else if (response.action === 'ignored') {
                        console.log('Action ignored:', response.reason);
                    }
                } else {
                    console.warn('No response or unsuccessful response');
                    activeScrollDirection = null;
                }
                updateButtonStates();
            });
            
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
    
    let saveSpeedTimeout;
    
    slider.addEventListener('input', function() {
        updateSpeedDisplay();
        
        if (saveSpeedTimeout) {
            clearTimeout(saveSpeedTimeout);
        }
        
        saveSpeedTimeout = setTimeout(() => {
            chrome.storage.sync.set({ scrollSpeed: parseInt(slider.value) }, function() {
                if (chrome.runtime.lastError) {
                    console.log('Failed to save speed setting:', chrome.runtime.lastError.message);
                }
            });
        }, 500);
    });
    
    chrome.storage.sync.get(['scrollSpeed'], function(result) {
        if (chrome.runtime.lastError) {
            console.log('Storage access error (extension context may be invalidated):', chrome.runtime.lastError.message);
            updateSpeedDisplay();
            updateButtonStates();
            return;
        }
        
        if (result.scrollSpeed) {
            slider.value = result.scrollSpeed;
        }
        updateSpeedDisplay();
        updateButtonStates();
    });
    
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.action === 'scrollStopped') {
            console.log('Scrolling stopped automatically:', message.reason, 'was direction:', message.direction);
            activeScrollDirection = null;
            updateButtonStates();
        } else if (message.action === 'reboundDirectionChange') {
            console.log('Rebound direction change:', message.oldDirection, '→', message.newDirection);
            activeScrollDirection = message.newDirection;
            updateButtonStates();
        } else if (message.action === 'shortcutUsed') {
            console.log('Shortcut used:', message.direction, 'response:', message.response);
            
            if (message.response.action === 'started') {
                activeScrollDirection = message.direction;
            } else if (message.response.action === 'stopped') {
                activeScrollDirection = null;
            } else if (message.response.action === 'direction_changed') {
                activeScrollDirection = message.direction;
            } else if (message.response.action === 'ignored') {
                console.log('Shortcut action ignored:', message.response.reason);
            }
            
            updateButtonStates();
        } else if (message.action === 'shortcutError') {
            console.log('Shortcut error:', message.message);
            showTemporaryMessage(message.message);
        }
    });
});
