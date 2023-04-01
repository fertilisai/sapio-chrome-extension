// https://stackoverflow.com/questions/11684454/getting-the-source-html-of-the-current-page-from-chrome-extension

function getActiveTab() {
    var message = document.querySelector('#message');

    chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
        var activeTab = tabs[0];
        var activeTabId = activeTab.id;

        return chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            injectImmediately: true,  // uncomment this to make it execute straight away, other wise it will wait for document_idle
            func: DOMtoString,
            args: ['body']  // you can use this to target what element to get the html for
        });

    }).then(function (results) {
        message.innerText = results[0].result;
        console.log('success');
    }).catch(function (error) {
        console.log(error.message);
        // message.innerText = 'There was an error injecting script : \n' + error.message;
    });
};

//window.onload = getActiveTab;

function DOMtoString(selector) {
    if (selector) {
        selector = document.querySelector(selector);
        if (!selector) return "ERROR: querySelector failed to find node"
    } else {
        selector = document.documentElement;
    }
    return selector.outerHTML;
};