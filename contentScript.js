'use strict';

let ele = document.createElement('link');
ele.setAttribute('href', chrome.runtime.getURL('resources/injection.css'));
ele.setAttribute('rel', "stylesheet");
document.body.appendChild(ele);

let alert = document.createElement('div');
alert.id = 'tweet-capture-pending';
alert.className = 'init';
alert.innerHTML = 'The twitter is capturing now. Please wait for a while.';
document.body.appendChild(alert);

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function startCapture(user_id, from_date, to_date) {
    alert.className = 'show';

    var article_id_list = [];
    var doc = new jsPDF("p", "pt", "a4");
    var page_width = doc.internal.pageSize.width;
    var page_height = doc.internal.pageSize.height;

    var scrollHeight = 0;
    while (true) {
        var articles = $('article');

        var article_count = articles.length;
        var saved_index = 0;
        for (var article of articles) {
            var pieces = $(article).find("a[href*='/status/']").attr("href").split("/");
            var article_id = pieces[pieces.length - 1];
            if (article_id_list.includes(article_id)) continue;
            article_id_list.push(article_id);
            console.log(article_id);

            domtoimage.toPng(article).then(function(imgData) {
                var h1 = 50;
                doc.addImage(imgData, 'PNG', 10, h1);
                doc.addPage();
                saved_index++;
            }).catch(function(error) {
                console.log('oops, something went wrong!', error);
                saved_index++;
            });
            await sleep(1000);
        }


        scrollHeight = document.body.scrollHeight;
        window.scrollTo(0, scrollHeight);
        await sleep(5000);
        if (scrollHeight == document.body.scrollHeight) {
            doc.save(`Twitter-Capture-${user_id}-${from_date}-${to_date}.pdf`);
            alert.className = '';
            break;
        }
    }

    // var articles = $('article');
    // var doc = new jsPDF("p", "pt", "a4");
    // var page_width = doc.internal.pageSize.width;
    // var page_height = doc.internal.pageSize.height;

    // var article_count = articles.length;
    // var saved_index = 0;
    // for (var article of articles) {
    //     domtoimage.toPng(article).then(function(imgData) {
    //         var h1 = 50;
    //         doc.addImage(imgData, 'PNG', 10, h1);
    //         doc.addPage();
    //         saved_index++;
    //         if (saved_index >= article_count) {
    //             doc.save('Twitter-Capture.pdf');
    //             alert.className = '';
    //         }
    //     }).catch(function(error) {
    //         console.log('oops, something went wrong!', error);
    //         saved_index++;
    //         if (saved_index >= article_count) {
    //             doc.save('Twitter-Capture.pdf');
    //             alert.className = '';
    //         }
    //     });
    // }
}

chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {
    var user_id = message.user_id;
    var from_date = message.from_date;
    var to_date = message.to_date;
    if (message.command == "StartCapture") await startCapture(user_id, from_date, to_date);
});