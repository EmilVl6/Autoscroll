chrome.commands && chrome.commands.onCommand && chrome.commands.onCommand.addListener(function(command) {
    if (!chrome.runtime || !chrome.runtime.id) {
        console.log('Extension context invalidated, skipping command');
        return;
    }
    
    console.log('Shortcut detected:', command);
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
        if (!tabs || !tabs[0]) {
            console.log('No active tab found for shortcut');
            return;
        }
        
        var activeTab = tabs[0];
        var direction = '';
        
        if (command === "scroll-up") {
            console.log("Detected shortcut: scroll-up (Alt+Shift+U)");
            direction = 'up';
        } else if (command === "scroll-down") {
            console.log("Detected shortcut: scroll-down (Alt+Shift+D)");
            direction = 'down';
        }
        
        if (direction) {
            chrome.storage.sync.get(['scrollSpeed'], function(result) {
                if (chrome.runtime.lastError) {
                    console.log('Storage access error in background script (handled):', chrome.runtime.lastError.message);
                    const speed = 50;
                    sendScrollMessage(activeTab, direction, speed);
                    return;
                }
                
                const speed = result.scrollSpeed || 50;
                sendScrollMessage(activeTab, direction, speed);
            });
        }
    });
});

function sendScrollMessage(activeTab, direction, speed) {
    if (!chrome.runtime || !chrome.runtime.id) {
        console.log('Extension context invalidated, skipping message');
        return;
    }
    
    chrome.tabs.sendMessage(activeTab.id, {
        "message": direction,
        "sliderValue": speed
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.log('Shortcut message error (handled):', chrome.runtime.lastError.message);
            
            if (chrome.runtime.lastError.message.includes('Could not establish connection')) {
                console.log('Injecting content script for shortcut...');
                
                if (!chrome.runtime || !chrome.runtime.id) {
                    return;
                }
                
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['scroll.js']
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.log('Cannot inject on this page type (handled):', chrome.runtime.lastError.message);
                        notifyPopupOfShortcutError('Cannot scroll on this type of page, sorry :(');
                    } else {
                        setTimeout(() => {
                            if (!chrome.runtime || !chrome.runtime.id) {
                                return;
                            }
                            
                            chrome.tabs.sendMessage(activeTab.id, {
                                "message": direction,
                                "sliderValue": speed
                            }, function(retryResponse) {
                                if (chrome.runtime.lastError) {
                                    console.log('Retry failed (handled):', chrome.runtime.lastError.message);
                                    notifyPopupOfShortcutError('Cannot scroll on this page, sorry :(');
                                } else if (retryResponse && retryResponse.success) {
                                    notifyPopupOfShortcutAction(direction, retryResponse);
                                } else if (retryResponse && !retryResponse.success) {
                                    notifyPopupOfShortcutError('Cannot scroll on this page, sorry :(');
                                }
                            });
                        }, 200);
                    }
                });
            } else {
                notifyPopupOfShortcutError('Cannot scroll on this page, sorry :(');
            }
        } else if (response && response.success) {
            console.log('Shortcut action successful:', response);
            notifyPopupOfShortcutAction(direction, response);
        } else if (response && !response.success) {
            console.log('Shortcut action failed (handled):', response);
            notifyPopupOfShortcutError('Cannot scroll on this page, sorry :(');
        }
    });
}

function notifyPopupOfShortcutAction(direction, response) {
    if (!chrome.runtime || !chrome.runtime.id) {
        console.log('Extension context invalidated, cannot notify popup');
        return;
    }
    
    chrome.runtime.sendMessage({
        action: 'shortcutUsed',
        direction: direction,
        response: response
    }).catch(err => {
        console.log('Could not notify popup of shortcut action (popup may be closed)');
    });
}

function notifyPopupOfShortcutError(errorMessage) {
    if (!chrome.runtime || !chrome.runtime.id) {
        console.log('Extension context invalidated, cannot notify popup of error');
        return;
    }
    
    chrome.runtime.sendMessage({
        action: 'shortcutError',
        message: errorMessage
    }).catch(err => {
        console.log('Could not notify popup of shortcut error (popup may be closed)');
    });
}

