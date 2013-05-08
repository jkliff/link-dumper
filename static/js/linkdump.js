DEFAULT_ERROR_HANDLER = function () {
    alert ('there was an error saving. check server logs');
};


$('#formLinkEditSubmit').click (function () {
    console.log ('submit form', $('#formLinkEdit').serialize ());
    console.log ('form link', $('#formLinkEdit'));

    $.ajax({
        type: 'POST',
        url: 'save_link',
        data: $('#formLinkEdit').serialize ()
    }).complete(function(d) {

        var r = $.parseJSON (d.responseText);

        if (r.exists) {
            console.log ('replace info');
            $('#control-group-url').addClass ('warning');
            $('#control-group-url .help-inline').removeClass ('hidden');

            
        } else {

            console.log ('done saving link');
            $('#formConfirmBulkImport .btn').removeAttr("disabled");

        }
    }).error (DEFAULT_ERROR_HANDLER);
});

$('#bulkImportSubmit').click (function () {
    console.log ('bulk import submit', $('#formBulkImport').serialize ());

    var d = $('#formBulkImport');
    var resolvedUrls = $('#resolvedUrlList');
    resolvedUrls.empty();
    $('#bulkImportSubmitProgress').removeClass ('hidden');
    $('#bulkImportSubmit').addClass ('hidden');

    d.mode = 'check';
    $.ajax ({
        type: 'POST',
        url: 'perform_bulk_import',
        data: d.serialize ()
    }).complete (function (data) {
        console.log ('got data: ', data);

        $('#bulkImportSubmitProgress').addClass ('hidden');
        $('#bulkImportSubmit').removeClass ('hidden');

        var r = $.parseJSON (data.responseText);
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
