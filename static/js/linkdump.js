String.prototype.capitalize = function () {
    return this.replace(/^./, function (char) {
        return char.toUpperCase();
    });
};

var FACTORIES = {

    SearchResultLinkEdit: {

        create: function (id) {
            return function () {
                console.log('to edit link', id);
                FACTORIES.MainLinkToggle.create('linkEdit', null)();
                APP.loadLinkToEdit(id);
            }
        }
    },


    LinkSelectionToggle: {

        create: function (url, el) {
            return function (data) {
                var s = el.find('span');
                if (s.hasClass('label-success')) {
                    s.removeClass('label-success');
                    s.text('Include');
                } else {
                    s.addClass('label-success');
                    s.text('Included');
                }
            }
        }
    },


    MainLinkToggle: {

        mainTabs: ['home', 'linkEdit', 'bulkImport', 'about'],

        create: function (target, additionalFcn) {
            return function (t, tabs, addition) {

                return function () {
                    for (var i in tabs) {
                        var el = $('#canvas' + tabs[i].capitalize());
                        var src = $('#mainLink' + tabs[i].capitalize()).parent();
                        if (t == tabs [i]) {
                            el.removeClass('hidden');
                            src.addClass('active');
                            continue;
                        }
                        el.addClass('hidden');
                        src.removeClass('active');

                        if (addition != null) {
                            addition.call();
                        }
                    }
                }
            }(target, this.mainTabs, additionalFcn);
        }
    }
};

var APP = {
    loadLinkToEdit: function (id) {

        var form = $('#formLinkEdit');
        console.log('link to edit', id);
        
        $('#linkMetaInfo').addClass('hidden');

        form.find('input[name=url]').val('');
        form.find('textarea[name=notes]').val('');
        $('#control-group-url').removeClass('warning');
        $('#control-group-url .help-inline').addClass('hidden');
        form.find('input[name=link_id]').remove();

        if (id == null) {
            $('#linkEditSaveData').addClass('hidden');
            console.log('nothing to be done, bye');
            return;
        }

        $('#linkEditSaveData').removeClass('hidden');

        form.append('<input type="hidden" name="link_id" value="' + id + '">');

        $.ajax({
            type: 'POST',
            url: 'link/edit_link',
            data: {l_id: id}
        }).complete(function (data) {
                var d = $.parseJSON(data.responseText).link;
                console.log('complete load link', d);

                if (!form.find('input[name=link_id]')) {
                    console.log('adding link_id');

                    form.append('<input type="hidden" name="link_id" value="' + d[0] + '">');
                    $('#linkMetaInfo').removeClass('hidden');

                }


                form.find('input[name=url]').val(d[1]);
                form.find('textarea[name=notes]').val(d[2]);
            }
        );
    }
};


$('#mainLinkHome').click(FACTORIES.MainLinkToggle.create('home', null));

$('#mainLinkLinkEdit').click(FACTORIES.MainLinkToggle.create('linkEdit', function () {
    APP.loadLinkToEdit(null);
}));

$('#mainLinkBulkImport').click(FACTORIES.MainLinkToggle.create('bulkImport', null));

$('#mainLinkAbout').click(FACTORIES.MainLinkToggle.create('about', null));

DEFAULT_ERROR_HANDLER = function () {
    alert('there was an error saving. check server logs');
};

$('#formLinkEditSubmit').click(function () {

    $('#formLinkEditSubmitProgress').removeClass('hidden');
    var f = $('#formLinkEditSubmit');
    f.addClass('hidden');

    console.log('loading for edit');
    var formLinkEdit = $('#formLinkEdit');

    $('#control-group-url').removeClass('warning');
    $('#control-group-url .help-inline').addClass('hidden');

    var formData = $(formLinkEdit);
    formData.url = encodeURI(formData.url);

    $.ajax({
        type: 'POST',
        url: 'link/save_link',
        data: formData.serialize()
    }).complete(function (form) {
            return function (d) {

                console.log('received result');

                $('#formLinkEditSubmitProgress').addClass('hidden');
                $('#formLinkEditSubmit').removeClass('hidden');

                var r = $.parseJSON(d.responseText);
                console.log('r', r);

                var isEdit = $('#formLinkEdit').find('input[name=link_id]').length > 0;
                if (!isEdit && r.exists) {
                    // case when we are trying to insert a link that is already in the db
                    // FIXME: return proper status from backend
                    $('#control-group-url').addClass('warning');
                    $('#control-group-url .help-inline').removeClass('hidden');
                    return;

                }

                if (isEdit) {
                    $('#formConfirmBulkImport .btn').removeAttr("disabled");
                } else {
                    form.append('<input type="hidden" name="link_id" value="' + r.link_id + '">');
                }

                $('#linkMetaInfo').removeClass('hidden');

            }
        }(formLinkEdit)
        ).error(DEFAULT_ERROR_HANDLER);

});

$('#linkEditSaveData').click(function () {

    var form = $('#formLinkEdit');
    var link_id = form.find('input[name=link_id]').val()
    $.ajax({
        type: 'GET',
        url: 'link/fetch_and_save_link_data',
        data: {link_id: link_id}
    }).complete(function (r) {
            console.log(r);
        }).
        error(DEFAULT_ERROR_HANDLER);
});

$('#bulkImportSubmit').click(function () {

    var d = $('#formBulkImport');

    var resolvedUrls = $('#resolvedUrlsTableBody');
    resolvedUrls.empty();

    $('#bulkImportSubmitProgress').removeClass('hidden');
    $('#bulkImportSubmit').addClass('hidden');

    console.log(d.find('input[name=ql]').val());
    var p = {
        q: d.find('textarea[name=qu]').parent().hasClass('hidden') ?
            d.find('input[name=ql]').val()
            : d.find('textarea[name=qu]').val(),
        mode: 'check'
    };

    $.ajax({
        type: 'POST',
        url: 'perform_bulk_import',
        data: p
    }).complete(function (data) {

            console.log('received', data);

            $('#bulkImportSubmitProgress').addClass('hidden');
            $('#bulkImportSubmit').removeClass('hidden');

            var r = $.parseJSON(data.responseText);

            if (!r.urls || r.urls.length < 1) {
                return;
            }

            $('#resolvedUrls').removeClass('hidden');

            var tb = resolvedUrls;
            if (!tb) {
                console.log('no table');
                return;
            }

            $.each(r.urls, function (idx, val) {
                var existing = r.existing.indexOf(val) > -1;
                var hint = existing ? '<span class="label label-important">duplicated</span>' : '<span class="label" id="label">Include</span>';
                ;
                console.log('existing? ', hint, val);

                var tr = $('<tr></tr>'); //+ hint + val + '</span></li>');
                var td = $('<td></td>');
                td.append(hint)

                if (!existing) {
                    td.click(FACTORIES.LinkSelectionToggle.create(val, td));
                }

                tr.append(td);
                td = $('<td class="urlPlaceholder"></td>');
                td.text(val);
                tr.append(td);
                tb.append(tr);
            });
            console.log(tb);

            if (r.urls.length > 0) {
                $('#formConfirmBulkImportConfirm').removeAttr("disabled").addClass("btn-primary");
            }

        }
    ).error(DEFAULT_ERROR_HANDLER);

});

$('#formConfirmBulkImportConfirm').click(function () {

    var urls = [];
    $.each($('#resolvedUrlsTableBody').find('tr'), function (idx, val) {
        var tr = $(val);
        if (tr.find('span').hasClass('label-success')) {
            urls.push(tr.find('td.urlPlaceholder').text());
        }
    });

    var q = $('#formConfirmResolvedUrls');
    q.val(urls.join(' '));

    if (urls.length > 0) {

        $.ajax({
            type: 'POST',
            url: 'perform_bulk_import',
            data: {
                q: q.val(),
                mode: 'perform'
            }
        }).complete(function (data) {
                console.log(data);
                console.log($.parseJSON(data.responseText));
            }
        ).error(DEFAULT_ERROR_HANDLER);
    }
})
;

$('#formMainSearch').submit(function () {
    var f = $('#formMainSearch');
    var fv = f.find('input[name=q]').val();
    fv = fv == '' ? '*' : fv;

    var q = f.serialize();

    var tpl = $('#tplSearchResult');
    var placeholder = $('#searchResultsPlaceholder');
    var res = tpl.clone();
    res.removeAttr('id');
    res.removeClass('hidden');
    res.addClass('span9');

    res.find('.searchMainResultProgress').removeClass('hidden');
    res.find('.searchMainResult').addClass('hidden');

    res.find('.searchTermsPlaceholder').text('Search: ' + fv);


    placeholder.append(res);

    var el = $('<li><a>' + fv + '</a></li>');

    res.find('.btnCloseSearch').click(function (tabRef) {
        return function () {
            console.log('click?');
            $(this).parent().parent().remove();
            tabRef.remove();
        }
    }(el));

    var hideOtherResults = function (resultDiv, li) {
        return function () {
            $('#searchResultsPlaceholder').find('div').addClass('hidden').removeClass('span9 pull-left');
            $('#searchesList').find('li').removeClass('active');
            resultDiv.removeClass('hidden').addClass('span9 pull-left');

            el.addClass('active');
        }
    }(res, el);

    hideOtherResults();

    el.click(hideOtherResults);

    $('#searchesList').append(el);

    $.ajax({
        type: 'POST',
        url: 'search',
        data: q
    }).success(
            function (resultDiv) {
                return function (data) {

                    var links = $.parseJSON(data).links;

                    resultDiv.find('.searchMainResultProgress').addClass('hidden');
                    resultDiv.find('.searchMainResult').removeClass('hidden');

                    var tb = resultDiv.find('.resultTableBody');
                    tb.find('tr').remove();

                    for (var i in links) {

                        var tr = $('<tr></tr>');
                        var td = $('<td></td>');

                        var a = '<small><a href="' + links[i][1] + '">' + links[i][1] + '</a></small>';
                        td.append($(a));
                        a = $('<small><a class="pull-right">Edit</a></small>');

                        a.click(FACTORIES.SearchResultLinkEdit.create(links[i][0], null));

                        td.append(a);
                        tr.append(td);

                        tr.append('<td><small>' + links[i][2] + '</small></td>');
                        tb.append(tr);

                    }
                }
            }(res)).error(DEFAULT_ERROR_HANDLER);

    return false;
});

var toggleBulkInputTextarea = function (e, data) {

    var t = $(this).val();
    var toShow;
    var toHide;
    var contentElement;

    if (t.indexOf(' ') > -1 && t.trim().indexOf(' ') > -1) {
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
    if (!toShowEl.hasClass('hidden')) {
        return;
    }

    var toHideEl = $(toHide);

    var v = toShowEl.find(targetElement)
    var src = toHideEl.find(contentElement);

    v.val(src.val());

    toHideEl.addClass('hidden');
    toShowEl.removeClass('hidden');

    v.focus();
    setCursorPosition(v[0], src[0].selectionStart);
}

$('#inputTabLink input[name=ql]').keyup(toggleBulkInputTextarea);
$('#inputTabInput textarea[name=qu]').keyup(toggleBulkInputTextarea);


setCursorPosition = function (el, pos) {
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
$('.noEnterSubmit').keypress(function (e) {
    if (e.which == 13) return false;
});
