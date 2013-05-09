String.prototype.capitalize = function () {
    return this.replace(/^./, function (char) {
        return char.toUpperCase();
    });
};

var FACTORIES = {

    SearchResultLinkEdit: {

        create: function (id) {
            return function () {
                console.log ('to edit link', id);
                APP.loadLinkToEdit (id);
            }
        }
    },


    LinkSelectionToggle: {

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
    },


    MainLinkToggle: {

        mainTabs: ['home', 'linkEdit', 'bulkImport', 'about'],

        create: function (target) {
            return function (t, tabs) {

                return function () {
                    console.log ();
                    for (i in tabs) {

                        var el = $('#canvas' + tabs[i].capitalize());
                        var src = $('#mainLink' + tabs[i].capitalize()).parent()
                        if (t == tabs [i]) {
                            el.removeClass ('hidden');
                            src.addClass ('active');
                            continue;
                        }
                        el.addClass ('hidden');
                        src.removeClass ('active');
                    }
                }
            } (target, this.mainTabs);
        }
    }
};

var APP = {
    loadLinkToEdit : function (id) {
        FACTORIES.MainLinkToggle.create ('linkEdit') ();
        console.log ('link to edit');

        $.ajax ({
            type: 'POST',
            url: 'edit_link',
            data: {l_id: id}
        }).complete (function (data) {
            var d = $.parseJSON (data.responseText).link;
            console.log (d);
            var form = $('#formLinkEdit');
            form.append ('<input type="hidden" name="link_id" value="' + d[0] + '">');
            form.find ('input[name=url]').val (d[1]);
        });
    }
};

$('#mainLinkHome').click (FACTORIES.MainLinkToggle.create ('home'));
$('#mainLinkLinkEdit').click (FACTORIES.MainLinkToggle.create ('linkEdit'));
$('#mainLinkBulkImport').click (FACTORIES.MainLinkToggle.create ('bulkImport'));
$('#mainLinkAbout').click (FACTORIES.MainLinkToggle.create ('about'));

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
                td.click (FACTORIES.LinkSelectionToggle.create (val, td));
            }

            tr.append (td);
            td = $('<td class="urlPlaceholder"></td>');
            td.text(val);
            tr.append (td);
            tb.append (tr);
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
        var tr = $(val);
        if (tr.find ('span').hasClass ('label-success')) {
            urls.push (tr.find ('td.urlPlaceholder').text ());
        }
    });

    if (urls.length > 0) {

        var q = $ ('#formConfirmResolvedUrls');
        q.val (urls.join (' '));
        $('#formConfirmBulkImport').submit ();
    }
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

            var tr = $('<tr></tr>');
            var td = $('<td></td>');

            var a = '<a href="' + links[i][1] + '">' + links[i][1] + '</a>';
            td.append ($(a));
            a = $('<a class="pull-right">Edit</a>');

            a.click (FACTORIES.SearchResultLinkEdit.create (links[i][0]));

            td.append (a);
            tr.append (td);

            tr.append ('<td>' + links[i][2] + '</td>');
            tb.append (tr);

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
});
