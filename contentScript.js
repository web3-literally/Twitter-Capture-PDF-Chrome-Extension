'use strict';

var layout_index = 1;
var image_index = 0;
var total_index = 0;
var scroll_YOffest = 0;
var port = chrome.runtime.connect({ name: "Process_Connection" });

let ele = document.createElement('link');
ele.setAttribute('href', chrome.runtime.getURL('resources/injection.css'));
ele.setAttribute('rel', "stylesheet");
document.body.appendChild(ele);

let alert = document.createElement('div');
alert.id = 'tweet-capture-pending';
alert.className = 'init';
alert.innerHTML = 'Getting the captures. Please wait for a while.';
document.body.appendChild(alert);


//////////////////////////////////////////////////////////////////////////////////
function toInt32(bytes) {
    return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
}

function getDimensions(data) {
    return {
        width: toInt32(data.slice(16, 20)),
        height: toInt32(data.slice(20, 24))
    };
}

var base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(data) {
    var result = [];
    var current = 0;

    for (var i = 0, c; c = data.charAt(i); i++) {
        if (c === '=') {
            if (i !== data.length - 1 && (i !== data.length - 2 || data.charAt(i + 1) !== '=')) {
                throw new SyntaxError('Unexpected padding character.');
            }

            break;
        }

        var index = base64Characters.indexOf(c);

        if (index === -1) {
            throw new SyntaxError('Invalid Base64 character.');
        }

        current = (current << 6) | index;

        if (i % 4 === 3) {
            result.push(current >> 16, (current & 0xff00) >> 8, current & 0xff);
            current = 0;
        }
    }

    if (i % 4 === 1) {
        throw new SyntaxError('Invalid length for a Base64 string.');
    }

    if (i % 4 === 2) {
        result.push(current >> 4);
    } else if (i % 4 === 3) {
        current <<= 6;
        result.push(current >> 16, (current & 0xff00) >> 8);
    }

    return result;
}

function getPngDimensions(dataUri) {
    if (dataUri.substring(0, 22) !== 'data:image/png;base64,') {
        throw new Error('Unsupported data URI format');
    }

    // 32 base64 characters encode the necessary 24 bytes
    return getDimensions(base64Decode(dataUri.substr(22, 32)));
}

//////////////////////////////////////////////////////////////////////////////////

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function startCapture(user_id, from_date, to_date) {
    alert.className = 'show';

    var article_id_list = [];
    var doc = new jsPDF("p", "pt", "a3");
    var page_width = doc.internal.pageSize.width;
    var page_height = doc.internal.pageSize.height;

    var scrollHeight = 0;
    while (true) {
        var articles = $('article');
        var article_count = articles.length;
        var saved_index = 0;
        var article_total_height = 0;
        for (var article of articles) {
            var article_id = 0;
            try {
                var pieces = $(article).find("a[href*='/status/']").attr("href").split("/");
                article_id = pieces[pieces.length - 1];
                if (article_id_list.includes(article_id)) {
                    saved_index++;
                    continue;
                }
            } catch (error) {
                console.log(error);
            }

            if (article_id) article_id_list.push(article_id);

            total_index++;
            // console.log(total_index);
            article_total_height += $(article).height();

            await domtoimage.toPng(article).then(function(imgData) {
                var dimensions = getPngDimensions(imgData);
                var image_width = 0;
                var image_height = 0;
                var x = 0;
                var y = 0;

                if (layout_index == 1) {
                    image_width = dimensions.width;
                    image_height = dimensions.height;
                    x = (page_width - image_width) / 2;
                    y = (page_height - image_height) / 2;

                    doc.addImage(imgData, 'PNG', x, y, image_width, image_height);
                    doc.addPage();
                } else if (layout_index == 2) {
                    if (dimensions.height > (page_height - 30) / 2)
                        image_height = (page_height - 30) / 2;
                    else
                        image_height = dimensions.height;

                    image_width = dimensions.width / dimensions.height * image_height;
                    x = (page_width - image_width) / 2;

                    if (image_index == 0) {
                        y = 10;
                    } else if (image_index == 1) {
                        y = (page_height + 10) / 2;
                    }
                    doc.addImage(imgData, 'PNG', x, y, image_width, image_height);
                    image_index++;
                    if (image_index >= 2) {
                        image_index = 0;
                        doc.addPage();
                    }
                } else if (layout_index == 3) {
                    if (dimensions.width > (page_width - 30) / 2)
                        image_width = (page_width - 30) / 2;
                    else
                        image_width = dimensions.width;

                    image_height = dimensions.height / dimensions.width * image_width;

                    if (image_height > (page_height - 30) / 2) {
                        image_height = (page_height - 30) / 2;
                        image_width = dimensions.width / dimensions.height * image_height;
                    }

                    if (image_index == 0) {
                        x = 10;
                        y = 10;
                    } else if (image_index == 1) {
                        x = (page_width + 10) / 2;
                        y = 10;
                    } else if (image_index == 2) {
                        x = 10;
                        y = (page_height + 10) / 2;
                    } else if (image_index == 3) {
                        x = (page_width + 10) / 2;
                        y = (page_height + 10) / 2;
                    }

                    doc.addImage(imgData, 'PNG', x, y, image_width, image_height);
                    image_index++;
                    if (image_index >= 4) {
                        image_index = 0;
                        doc.addPage();
                    }
                } else if (layout_index == 4) {
                    if (dimensions.width > (page_width - 30) / 2)
                        image_width = (page_width - 30) / 2;
                    else
                        image_width = dimensions.width;

                    image_height = dimensions.height / dimensions.width * image_width;

                    if (image_height > (page_height - 40) / 3) {
                        image_height = (page_height - 40) / 3;
                        image_width = dimensions.width / dimensions.height * image_height;
                    }

                    if (image_index == 0) {
                        x = 10;
                        y = 10;
                    } else if (image_index == 1) {
                        x = (page_width + 10) / 2;
                        y = 10;
                    } else if (image_index == 2) {
                        x = 10;
                        y = (page_height) / 3 + 5;
                    } else if (image_index == 3) {
                        x = (page_width + 10) / 2;
                        y = (page_height) / 3 + 5;
                    } else if (image_index == 4) {
                        x = 10;
                        y = (page_height) / 3 * 2 + 5;
                    } else if (image_index == 5) {
                        x = (page_width + 10) / 2;
                        y = (page_height) / 3 * 2 + 5;
                    }
                    doc.addImage(imgData, 'PNG', x, y, image_width, image_height);
                    image_index++;
                    if (image_index >= 6) {
                        image_index = 0;
                        doc.addPage();
                    }
                }

                saved_index++;
                if (doc.output().length >= 100000000) {
                    doc.save(`Twitter-Capture-${user_id}-${from_date}-${to_date}.pdf`);
                    doc = new jsPDF("p", "pt", "a3");
                }
            }).catch(function(error) {
                console.log('oops, something went wrong!', error);
                saved_index++;
            });
        }

        while (saved_index < article_count) {
            await sleep(1000);
        }

        scrollHeight = document.body.scrollHeight;
        // if (article_total_height > 0)
        //     scroll_YOffest += article_total_height;
        // else
        //     scroll_YOffest += document.body.clientHeight;
        scroll_YOffest += document.body.clientHeight;

        window.scrollTo(0, scroll_YOffest);
        await sleep(5000);
        if (scroll_YOffest >= scrollHeight && scrollHeight == document.body.scrollHeight) {
            doc.save(`Twitter-Capture-${user_id}-${from_date}-${to_date}.pdf`);
            doc = new jsPDF("p", "pt", "a3");
            alert.className = '';
            port.postMessage({ ping: "Complete" });

            setTimeout(function() {
                window.close();
            }, 5000);
            break;
        }
    }
}

chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {
    var process_id = message.process_id;
    console.log(process_id);
    var user_id = message.user_id;
    var from_date = message.from_date;
    var to_date = message.to_date;
    layout_index = message.layout_index;
    if (message.command == "StartCapture") {
        setInterval(function() {
            port.postMessage({ ping: "Ping_Packet" });
        }, 1000);
        await startCapture(user_id, from_date, to_date);
    }
});