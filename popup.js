'use strict';

$(document).ready(function() {
    $('#btn-start-capture').click(function() {
        var user_id = $('#user-id').val();
        var from_date = $('#from-date').val();
        var to_date = $('#to-date').val();

        if (!user_id || !from_date || !to_date) {
            $('.input-warning').removeClass('d-none');
            $('.input-warning p').html("Please input all field correctly.");
        } else if (new Date(from_date) > new Date(to_date)) {
            $('.input-warning').removeClass('d-none');
            $('.input-warning p').html("'to date' should be over than 'from date'.");
        } else {
            $('.input-warning').addClass('d-none');

            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (!tabs[0].url.includes('https://twitter.com')) {
                    $('.input-warning').removeClass('d-none');
                    $('.input-warning p').html("This Extension should be executed on <a href='https://twitter.com'>Twitter.com.</a>");
                    return;
                }

                $('#btn-start-capture').html('<span class="spinner-border spinner-border-sm"></span>Loading..');
                var searchUrl = "https://twitter.com/search?q=from:" + user_id + "%20since:" + from_date + "%20until:" + to_date + "&src=typed_query&f=live";
                chrome.tabs.update(tabs[0].id, { url: searchUrl });
                var payload = {
                    command: "StartCapture",
                    user_id: user_id,
                    from_date: from_date,
                    to_date: to_date
                }
                setTimeout(function() {
                    chrome.tabs.sendMessage(tabs[0].id, payload);
                    $('#btn-start-capture').html('<span class="spinner-grow spinner-grow-sm"></span>Capturing..');
                    window.close();
                }, 3000);
            });
        }
    });
});