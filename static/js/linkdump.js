$('#formLinkEditSubmit').click (function () {
    console.log ('submit form', $('#formLinkEdit').serialize ());
    console.log ('form link', $('#formLinkEdit'));

    $.ajax({
        type: 'POST',
        url: 'save_link',
        data: $('#formLinkEdit').serialize ()
    }).complete(function() {
        console.log ('done saving link');
    }).error (function () {
        alert ('there was an error saving. check server logs');
    });
});
