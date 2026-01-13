chrome.commands && chrome.commands.onCommand && chrome.commands.onCommand.addListener(function(command) {
    if (!chrome.runtime || !chrome.runtime.id) {
        return;
    }
    
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
        if (!tabs || !tabs[0]) {
            return;
        }
        
        var activeTab = tabs[0];
        var direction = '';
        
        if (command === "scroll-up") {
            direction = 'up';
        } else if (command === "scroll-down") {
            direction = 'down';
        }
        
        if (direction) {
            chrome.storage.sync.get(['scrollSpeed'], function(result) {
                if (chrome.runtime.lastError) {
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
        return;
    }
    
    chrome.tabs.sendMessage(activeTab.id, {
        "message": direction,
        "sliderValue": speed
    }, function(response) {
        if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message.includes('Could not establish connection')) {
                if (!chrome.runtime || !chrome.runtime.id) {
                    return;
                }
                
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['scroll.js']
                }, function() {
                    if (chrome.runtime.lastError) {
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
            notifyPopupOfShortcutAction(direction, response);
        } else if (response && !response.success) {
            notifyPopupOfShortcutError('Cannot scroll on this page, sorry :(');
        }
    });
}

function notifyPopupOfShortcutAction(direction, response) {
    if (!chrome.runtime || !chrome.runtime.id) {
        return;
    }
    
    chrome.runtime.sendMessage({
        action: 'shortcutUsed',
        direction: direction,
        response: response
    }).catch(err => {
    });
}

function notifyPopupOfShortcutError(errorMessage) {
    if (!chrome.runtime || !chrome.runtime.id) {
        return;
    }
    
    chrome.runtime.sendMessage({
        action: 'shortcutError',
        message: errorMessage
    }).catch(err => {
    });
}