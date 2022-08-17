function readTextFile(file, callback) {
    fetch(chrome.runtime.getURL('/setting.json'))
    .then((response) => {
        response.json().then((fileSetting) => {
            Object.keys(fileSetting).forEach(key => {
                setting[key] = fileSetting[key];
            });
        });
    });
}

async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let tabs = await chrome.tabs.query(queryOptions);
    return tabs[0];
}

// chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
// });

// chrome.webNavigation.onBeforeNavigate.addListener(
//     (tab) => {}
// );

chrome.webNavigation.onCompleted.addListener(
    (tab) => {
        autoLogin(tab);
    }
);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
});

function autoLogin(tab) {
    if (
        getDomain(setting.targetSite) !== getDomain(tab.url) ||
        (
            getPath(tab.url) !== '/login/' &&
            getPath(tab.url) !== '/login'
        )
    ) {
        return;
    }

    let formData = new FormData();
    formData.append('accunix_username', setting.account);
    formData.append('password', setting.password);

    fetch(setting.targetSite + 'api/login', {
        method: 'POST',
        body: formData,
    })
        .then(response => {
            response.json().then(response => {
                let token = response.token;
                let redirect = setting.targetSite + 'home';
                chrome.scripting.executeScript({
                    args: [token, redirect],
                    func: (token, redirect) => {
                        console.log('document.referrer: ' + document.referrer);

                        localStorage.setItem('login', token);
                        localStorage.setItem('checkLogin', token);
                        localStorage.setItem('userEventEndTime', Date.now());

                        let path = document.referrer ? new URL(document.referrer).pathname : null;
                        if (
                            document.referrer &&
                            path !== '/login' &&
                            path !== '/login/'
                        ) {
                            window.location.href = document.referrer;
                            return;
                        }

                        window.location.href = redirect;
                    },
                    target: { tabId: tab.tabId },
                }, (results) => {
                });
            });
        })
        .catch(error => alertUser(tab.tabId, 'login api error', error))
}

function getDomain(url) {
    return url.replace('http://','').replace('https://','').split(/[/?#]/)[0];
}

function alertUser(tabId, msg, error = null) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (msg) => {
            alert(msg);

            return 'error';
        },
        args: [msg],
    }, () => {});

    if (error) {
        console.log('alert user error');
        console.log(error);
    }
}

function getPath(url) {
    return new URL(url).pathname;
}

// script
readTextFile();

// variable
let setting = {
    loginPath: '/login/',
};

let targetDomain = '';