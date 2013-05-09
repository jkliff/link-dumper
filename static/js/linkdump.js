
DEFAULT_ERROR_HANDLER = function () {
    alert ('there was an error saving. check server logs');
};


$('#formLinkEditSubmit').click (function () {

    $('#formLinkEditSubmitProgress').removeClass ('hidden');
    $('#formLinkEditSubmit').addClass ('hidden');

    $.ajax({
        type: 'POST',
        url: 'save_link',
        data: $('#formLinkEdit').serialize ()
    }).complete(function(d) {

        $('#formLinkEditSubmitProgress').addClass ('hidden');
        $('#formLinkEditSubmit').removeClass ('hidden');

        var r = $.parseJSON (d.responseText);

        if (r.exists) {
            $('#control-group-url').addClass ('warning');
            $('#control-group-url .help-inline').removeClass ('hidden');

        } else {

            $('#formConfirmBulkImport .btn').removeAttr("disabled");

        }
    }).error (DEFAULT_ERROR_HANDLER);
});

$('#bulkImportSubmit').click (function () {

    var d = $('#formBulkImport');

    var resolvedUrls = $('#resolvedUrlList');
    resolvedUrls.empty();
    $('#bulkImportSubmitProgress').removeClass ('hidden');
    $('#bulkImportSubmit').addClass ('hidden');

    var p = {
        q: d.ql && d.ql != null? d.ql : d.qu,
        mode: 'check'
    };

    $.ajax ({
        type: 'POST',
        url: 'perform_bulk_import',
        data: $(p).serialize ()
    }).complete (function (data) {

        $('#bulkImportSubmitProgress').addClass ('hidden');
        $('#bulkImportSubmit').removeClass ('hidden');

        var r = $.parseJSON (data.responseText);

        if (!r.urls) return;

        // fixme: read data to be sent from variable
        var q = $ ('#formConfirmBulkImport [name=q]');

        q.val (r.urls.join (' '));

        $ ('#resolvedUrls').removeClass ('hidden');

        $.each (r.urls, function (idx, val) {
            var existing = r.existing.indexOf (val) > -1;
            var hint = existing ? '<span class="label label-important">duplicated</span> ' : '';
;
            console.log ('existing? ', hint, val);
            resolvedUrls.append ('<li class="">' + hint + val + '</li>');
        });

        if (r.urls.length > 0) {
            $('#formConfirmBulkImport .btn').removeAttr("disabled").addClass ("btn-primary");
        }

    }).error (DEFAULT_ERROR_HANDLER);

});

$('#formMainSearch').submit (function () {
    var q = $('#formMainSearch').serialize();

    $('#searchMainResultProgress').removeClass ('hidden');
    $('#searchMainResult').addClass ('hidden');

    $.ajax ({
        type: 'POST',
        url: 'search',
        data: q
    }).success(function (data) {

        $('#searchMainResultProgress').addClass ('hidden');
        $('#searchMainResult').removeClass ('hidden');

        var links = $.parseJSON (data).links;

        var tb = $('#resultTableBody');
        tb.find ('tr').remove();

        for (i in links) {

            tb.append ('<tr><td><a href="' + links[i][1] + '">' + links[i][1] + '</a> <a class="pull-right" href="edit_link?l_id=' + links[i][0] + '">Edit</a></td><td>' +  links[i][2] + '</td><tr>');

        }

    }).error (DEFAULT_ERROR_HANDLER);

    return false;
});

var toggleBulkInputTextarea = function (e, data) {

    var t = $(this).val ();
    var toShow;
    var toHide;
    var contentElement;

    if (t.indexOf (' ') > -1 && t.trim ().indexOf (' ') > -1) {
        toShow = '#inputTabInput';
        toHide = '#inputTabLink';
        targetElement = 'textarea[name=qu]';
        contentElement = 'input[name=ql]';

    } else {
        toShow = '#inputTabLink';
        toHide = '#inputTabInput';
        contentElement = 'textarea[name=qu]';
        targetElement = 'input[name=ql]';
    }

    var toShowEl = $(toShow);

    // if is already the visible element, bye
    if (!toShowEl.hasClass ('hidden')) {
        return;
    }

    var toHideEl = $(toHide);

    var v = toShowEl.find (targetElement)
    var src = toHideEl.find(contentElement);

    v.val (src.val());

    toHideEl.addClass ('hidden');
    toShowEl.removeClass ('hidden');

    v.focus ();
    setCursorPosition (v[0], src[0].selectionStart);
}

$('#inputTabLink input[name=ql]').keyup (toggleBulkInputTextarea);
$('#inputTabInput textarea[name=qu]').keyup (toggleBulkInputTextarea);


setCursorPosition = function(el, pos) {
    if (el.setSelectionRange) {
        el.setSelectionRange(pos, pos);
    } else if (el.createTextRange) {
        var range = el.createTextRange();
        range.collapse(true);
        range.moveEnd('character', pos);
        range.moveStart('character', pos);
        range.select();
    }
}
