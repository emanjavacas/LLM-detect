const { div, li, ul, span, button, h5, form, input, p } = van.tags;

function Card() {

    class FileList {
        constructor (files) { this.files = files }
        add (filename, sessionId, status) {
            this.files.push({ filename: filename, sessionId: sessionId, status: van.state(status)});
            return new FileList(this.files);
        }
        updateStatus(sessionId, status) {
            const file = this.files.find(f => f.sessionId === sessionId);
            if (file) {
                file.status = van.state(status);
            }
            return new FileList(this.files);
        }

    }

    const filelist = van.state(new FileList([]));

    function addFileToList(filename, sessionId, status) {
        console.log('addFileToList', filename, sessionId, status);
        filelist.val = filelist.val.add(filename, sessionId, status);
    }

    function updateFileStatus(sessionId, status) {
        filelist.val = filelist.val.updateStatus(sessionId, status);
        console.log('updateFileStatus', sessionId, status);
    }

    const UPLOADING = 'Uploading...';
    const PROCESSING = 'Processing...';
    const READY = 'Ready to download!';

    function uploadFileInChunks(file, sessionId) {
        const chunkSize = 1 * 1024 * 1024; // 1MB
        const totalChunks = Math.ceil(file.size / chunkSize);
        let currentChunk = 0;

        function readAndUploadNextChunk() {
            const start = currentChunk * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const blob = file.slice(start, end);

            const reader = new FileReader();
            reader.onload = function (e) {
                const formData = new FormData();
                formData.append('file', new Blob([e.target.result], { type: file.type }), file.name);
                formData.append('chunk', currentChunk);
                formData.append('total_chunks', totalChunks);
                formData.append('session_id', sessionId);
                $.ajax({
                    url: '/upload',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function () {
                        console.log(`Chunk ${currentChunk} of ${file.name} uploaded`);
                        if (currentChunk === totalChunks - 1) {
                            updateFileStatus(sessionId, PROCESSING);
                        } else {
                            currentChunk++;
                            readAndUploadNextChunk();
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error(`Error uploading chunk ${currentChunk} of ${file.name}: ${error}`);
                    }
                });
            }
            reader.onerror = function () {
                console.error(`Error reading chunk ${currentChunk} of ${file.name}`);
            }
            reader.readAsArrayBuffer(blob);
        } 
        readAndUploadNextChunk();
    }

    function onSubmit(e) {
        e.preventDefault();                
        const files = $('#fileInput')[0].files;
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const sessionId = uuidv4();
                addFileToList(files[i].name, sessionId, UPLOADING);
                setCookie(sessionId, files[i].name, 1);
                // create WebSocket
                const ws = new WebSocket(`ws://${window.location.host}/ws/${sessionId}`);
                ws.onmessage = function(e) {
                    const data = JSON.parse(e.data);
                    if (data.status == "done") {
                        console.log("File ready for download");
                        updateFileStatus(sessionId, READY);
                    }
                }
                uploadFileInChunks(files[i], sessionId);
            }
        }
        $('#fileInput').val('');
    }

    function createListItem(file) {
        console.log('createListItem', file);
        const statusClasses = {
            UPLOADING: 'bg-warning text-dark',
            PROCESSING: 'bg-info',
            READY: 'bg-success'};
        const statusClass = statusClasses[file.status.val] || 'bg-seconday';
        const listItem = li({ class: 'list-group-item' },
            span(file.filename), 
            file.status.val == READY ? 
                button({ id: `btn-${file.sessionId}`, 
                    class: "btn btn-sm btn-primary float-end",
                    onclick: () => downloadFile(file.sessionId) }, "Download") :
                button({ id: `btn-${file.sessionId}`, class: "btn btn-sm btn-primary float-end disabled" }, "Download"),
            div(span({ id: `status-${file.sessionId}`, class: statusClass }, file.status.val)))
        return listItem
    }

    return div({ class: "card" }, 
        div({ class: "card-header" }, "AI Detection Service"),
        div({ class: "card-body" },
            h5({ class: "card-title" }, "File Upload"),
            p({ class: "card-text" }, "Upload a text file for further analysis."),
            form({ class: "input-group", id:"uploadForm", onsubmit: onSubmit },
                input({ type: "file", class: "form-control", id: "fileInput", multiple: true }),
                button({ class: "btn btn-outline-secondary", type: "submit" }, "Upload"))),
        div({class:"row"},
            ul({ class: "list-group list-group-flush", id: "fileList" },
            () => filelist.val.files.map(createListItem))))
}
      
        // const existingSessionIds = document.cookie.split(";").map(cookie => cookie.split('=')[0].trim());
        // existingSessionIds.forEach(sessionId => {
        //     const filename = getCookie(sessionId);
        //     if (filename) {
        //         addFileToList(filename, sessionId, PROCESSING);
        //         const ws = new WebSocket(`ws://${window.location.host}/ws/{sessionId}`);
        //         ws.onmessage = function(e) {
        //             console.log("File ready for download");
        //             $(`#btn-${sessionId}`).removeClass("disabled");
        //             updateFileStatus(sessionId, READY)
        //         }
        //     }
        // })

$(document).ready(function() {
    van.add($("#entryPoint"), Card())
});


// utility functions
function downloadFile(sessionId) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = `/download-file?session_id=${sessionId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function trimFilename(fname, length) {
    if (fname.length > length)  {
        return fname.substring(0, length-3) + "...";
    } else {
        return fname;
    }
}

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "="  + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(cname) == 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return "";
}
