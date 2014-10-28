
var modal = (function () {
    var 
				method = {},
				$overlay,
				$modal,
				$content;

    // Center the modal in the viewport
    method.center = function () {
        var top, left;

        top = (Math.max($(window).height() - $modal.outerHeight(), 0) / 2) -100;
        left = (Math.max($(window).width() - $modal.outerWidth(), 0) / 2) -100;

        $modal.css({
            top: top + $(window).scrollTop(),
            left: left + $(window).scrollLeft()
        });
    };

    // Open the modal
    method.open = function (settings) {
        $content.empty().append(settings.content);

        $modal.css({
            width: settings.width || 'auto',
            height: settings.height || 'auto'
        });

        method.center();
        $(window).bind('resize.modal', method.center);
        $modal.show();
        $overlay.show();
    };

    // Close the modal
    method.close = function () {
        $modal.hide();
        $overlay.hide();
        $content.empty();
        $(window).unbind('resize.modal');
    };

    // Generate the HTML and add it to the document
    $overlay = $('<div id="overlay"></div>');
    $modal = $('<div id="modal"></div>');
    $content = $('<div id="content"></div>');

    $modal.hide();
    $overlay.hide();
    $modal.append($content);

    $(document).ready(function () {
        $('body').append($overlay, $modal);
    });

    return method;
} ());

$(document).ajaxSend(function (event, request, settings) {
    modal.open({ content: '<img src=/images/ajax-loader.gif />' });
});

$(document).ajaxComplete(function (event, request, settings) {
    modal.close();
});
