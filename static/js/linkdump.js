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
    }).complete(function() {
        console.log ('done saving link');
    }).error (DEFAULT_ERROR_HANDLER);
});

$('#bulkImportSubmit').click (function () {
    console.log ('bulk import submit', $('#formBulkImport').serialize ());

    var d = $('#formBulkImport');
    d.mode = 'check';
    $.ajax ({
        type: 'POST',
        url: 'perform_bulk_import',
        data: d.serialize ()
    }).complete (function (data) {
        console.log ('got data: ', data);

        var r = $.parseJSON (data.responseText);
        var q = $ ('#formConfirmBulkImport [name=q]');
        q.val (r.urls.join (' '));

        $.each (r.urls, function (idx, val) {
            $('#resolvedUrls').append ('<li>' + val+ '</li>');
            console.log ('add', val);
        });

        if (r.urls.length > 0) {
            $('#formConfirmBulkImport .btn').removeAttr("disabled");
        }

    }).error (DEFAULT_ERROR_HANDLER);

});
