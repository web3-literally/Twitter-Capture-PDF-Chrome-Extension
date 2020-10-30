var PROCESS_STATUS = 0; // 0: FREE, 1: WORKING
var PING_COUNT = 0;
var CURRENT_PROCESS_ID = 0;
var PAYMENT_URL = "http://52.68.239.201";

function AddProcessFromDailySchedule() {
    chrome.storage.sync.get('twitter_capture_daily_account', function (result) {
        var daily_account_list = result['twitter_capture_daily_account'];
        if (!daily_account_list) {
            daily_account_list = [];
        }


        chrome.storage.sync.get('twitter_capture_process', function (result) {
            var process_list = result['twitter_capture_process'];
            if (!process_list) {
                process_list = [];
            }

            for (var i = 0; i < daily_account_list.length; i++) {
                var daily_account = daily_account_list[i];
                var currentDate = new Date();

                var account_name = daily_account.account_name;
                var layout_index = daily_account.layout_index;
                var until_date = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
                currentDate.setDate(currentDate.getDate() - 1);
                var from_date = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;

                var process = {
                    id: new Date().getTime() + i,
                    account_name: account_name,
                    layout_index: layout_index,
                    from_date: from_date,
                    until_date: until_date,
                    status: "Waiting"
                }

                process_list.push(process);
            }

            chrome.storage.sync.set({'twitter_capture_process': process_list}, function () {
                console.log("Capture Process Added From Daily Schedule Successfully!");
            });
        });
    });
}

function StartProcess() {
    chrome.storage.sync.get('twitter_capture_process', function (result) {
        var process_list = result['twitter_capture_process'];
        if (!process_list || process_list.length == 0) {
            return;
        }

        chrome.storage.sync.get('twitter_capture_payment_id', function (result) {
            var sessionId = result['twitter_capture_payment_id'];
            if (sessionId) {
                fetch(PAYMENT_URL + '/checkout-session?sessionId=' + sessionId)
                    .then(function (result) {
                        return result.json();
                    })
                    .then(function (reply) {
                        if (reply.status == "success" && reply.data.payment_status == "paid") {
                            /************************************ START PROCESS ***********************************/
                            var process = process_list[0];

                            var process_id = process.id;
                            var account_name = process.account_name;
                            var layout_index = process.layout_index;
                            var from_date = process.from_date;
                            var until_date = process.until_date;

                            process['status'] = "Processing";
                            process_list[0] = process;

                            chrome.storage.sync.set({'twitter_capture_process': process_list}, function () {
                                var searchUrl = "https://twitter.com/search?q=from:" + account_name + "%20since:" + from_date + "%20until:" + until_date + "&src=typed_query&f=live";
                                chrome.windows.create({
                                    url: searchUrl,
                                    width: 200,
                                    height: 165,
                                    focused: false
                                }, window => {
                                    PROCESS_STATUS = 1;
                                    CURRENT_PROCESS_ID = process_id;
                                    var payload = {
                                        command: "StartCapture",
                                        process_id: process_id,
                                        user_id: account_name,
                                        from_date: from_date,
                                        to_date: until_date,
                                        layout_index: layout_index
                                    }
                                    setTimeout(function () {
                                        chrome.tabs.sendMessage(window.tabs[0].id, payload);
                                        console.log(`Started New Process Successfully! ID: ${CURRENT_PROCESS_ID}`);
                                    }, 3000);
                                });
                            });
                            /************************************* END PROCESS **********************************/
                        } else {
                            removeAllProcess();
                        }
                    })
                    .catch(function (err) {
                        console.log('Error when fetching Checkout session', err);
                        removeAllProcess();
                    });
            } else {
                removeAllProcess();
            }
        });
    });
}

function removeProcess(id) {
    chrome.storage.sync.get('twitter_capture_process', function (result) {
        var process_list = result['twitter_capture_process'];
        if (!process_list) {
            return;
        }

        for (var i = process_list.length - 1; i >= 0; i--) {
            if (process_list[i].id == id || process_list[i].id == undefined) {
                process_list.splice(i, 1);
            }
        }
        chrome.storage.sync.set({'twitter_capture_process': process_list}, function () {
            console.log("Process Removed Successfully!");
        });
    });
}

function removeAllProcess() {
    chrome.storage.sync.set({'twitter_capture_process': []}, function () {
        console.log("Total Process Removed Successfully!");
    });
}

setInterval(() => {
    if (PING_COUNT == 0) PROCESS_STATUS = 0;
    PING_COUNT = 0;

    var currentDate = new Date();
    if (currentDate.getHours() == 1 && currentDate.getMinutes() == 0 && currentDate.getSeconds() >= 0 && currentDate.getSeconds() < 10) {
        chrome.storage.sync.get('twitter_capture_payment_id', function (result) {
            var sessionId = result['twitter_capture_payment_id'];
            if (sessionId) {
                fetch(PAYMENT_URL + '/checkout-session?sessionId=' + sessionId)
                    .then(function (result) {
                        return result.json();
                    })
                    .then(function (reply) {
                        if (reply.status == "success" && reply.data.payment_status == "paid") {
                            AddProcessFromDailySchedule();
                        }
                    })
                    .catch(function (err) {
                        console.log('Error when fetching Checkout session', err);
                    });
            }
        });
    }

    if (PROCESS_STATUS == 0) {
        StartProcess();
    }

    console.log(currentDate);
}, 10000);

chrome.runtime.onConnect.addListener(function (port) {
    if (port.name == "Process_Connection") {
        port.onMessage.addListener(function (msg) {
            if (msg.ping == "Ping_Packet") {
                PING_COUNT++;
            }
            if (msg.ping == "Complete") {
                PING_COUNT = 0;
                removeProcess(CURRENT_PROCESS_ID);
                CURRENT_PROCESS_ID = 0;
            }
        });
    }
});