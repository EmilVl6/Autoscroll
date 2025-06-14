chrome.commands && chrome.commands.onCommand && chrome.commands.onCommand.addListener(function(command) {
    console.log('Shortcut detected:', command);
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
        var activeTab = tabs[0];
        if (command === "scroll-up") {
            console.log("Detected shortcut: scroll-up (Alt+Shift+U)");
            chrome.tabs.sendMessage(activeTab.id, {"message": "up"});
        } else if (command === "scroll-down") {
            console.log("Detected shortcut: scroll-down (Alt+Shift+D)");
            chrome.tabs.sendMessage(activeTab.id, {"message": "down"});
        }
    });
});

