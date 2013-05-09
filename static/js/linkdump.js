String.prototype.capitalize = function () {
    return this.replace(/^./, function (char) {
        return char.toUpperCase();
    });
};


MainLinkToggleFactory = {

    mainTabs: ['home', 'linkEdit', 'bulkImport', 'about'],

    create: function (target) {
        console.log ('creating function for ', target);
        return function (t, tabs) {

            console.log ('executing creationg', t, tabs);
            return function () {
                console.log ('clicked on ', t, 'knows', tabs);
                for (i in tabs) {

                    var el = $('#canvas' + tabs [i].capitalize ());

                    if (t == tabs [i]) {
                        el.removeClass ('hidden');
                        continue;
                    }
                    el.addClass ('hidden');
                }
            }
        } (target, this.mainTabs);
    }
}

$('#mainLinkHome').click (MainLinkToggleFactory.create ('home'));
$('#mainLinkLinkEdit').click (MainLinkToggleFactory.create ('linkEdit'));
$('#mainLinkBulkImport').click (MainLinkToggleFactory.create ('bulkImport'));
$('#mainLinkAbout').click (MainLinkToggleFactory.create ('about'));

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

    var resolvedUrls = $('#resolvedUrlsTableBody');
    resolvedUrls.empty();

    $('#bulkImportSubmitProgress').removeClass ('hidden');
    $('#bulkImportSubmit').addClass ('hidden');

    console.log (d.find ('input[name=ql]').val());
    var p = {
        q: d.find ('textarea[name=qu]').parent().hasClass ('hidden') ?
            d.find ('input[name=ql]').val()
            : d.find ('textarea[name=qu]').val(),
        mode: 'check'
    };

    $.ajax ({
        type: 'POST',
        url: 'perform_bulk_import',
        data: p
    }).complete (function (data) {

        console.log ('received', data);

        $('#bulkImportSubmitProgress').addClass ('hidden');
        $('#bulkImportSubmit').removeClass ('hidden');

        var r = $.parseJSON (data.responseText);

        if (!r.urls || r.urls.length < 1) {
            return;
        }

        $ ('#resolvedUrls').removeClass ('hidden');

        var tb = resolvedUrls ;// $('#resolvedUrlsTableBody');
        if (!tb) {
            console.log ('no table');
            return;
        }

        $.each (r.urls, function (idx, val) {
            var existing = r.existing.indexOf (val) > -1;
            var hint = existing ? '<span class="label label-important">duplicated</span>' : '<span class="label" id="label">Include</span>';
;
            console.log ('existing? ', hint, val);

            var tr = $('<tr></tr>'); //+ hint + val + '</span></li>');
            var td = $('<td></td>');
            td.append (hint)

            if (!existing) {
                td.click (LinkSelectionToggleFactory.create (val, td));
            }

            tr.append (td);
            td = $('<td class="urlPlaceholder"></td>');
            td.text(val);
            tr.append (td);
            console.log (tr);
            tb.append (tr);
            console.log (tb);
        });
        console.log (tb);

        if (r.urls.length > 0) {
            $('#formConfirmBulkImportConfirm').removeAttr("disabled").addClass ("btn-primary");
        }

    }).error (DEFAULT_ERROR_HANDLER);

});



$('#formConfirmBulkImportConfirm').click (function () {

    var urls = [];
    $.each ($('#resolvedUrlsTableBody').find ('tr'), function (idx, val) {
        console.log ('val', val);
        var tr = $(val);
        if (tr.find ('span').hasClass ('label-success')) {
            console.log ('found', tr);
            urls.push (tr.find ('td.urlPlaceholder').text ());
        }
    });

    if (urls.length > 0) {

        var q = $ ('#formConfirmResolvedUrls');
        q.val (urls.join (' '));
        console.log (q.val());
        $('#formConfirmBulkImport').submit ();
    }
});

LinkSelectionToggleFactory = {

    create: function (url, el) {
        return function (data) {
            var s = el.find ('span');
            if (s.hasClass ('label-success')) {
                s.removeClass ('label-success');
                s.text ('Include');
            } else {
                s.addClass ('label-success');
                s.text ('Included');
            }
        }
    }
};

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

// disable form submission from enter (usually on inputs)
$('.noEnterSubmit').keypress(function(e){
    if ( e.which == 13 ) return false;
    //or...
    if ( e.which == 13 ) e.preventDefault();
});
