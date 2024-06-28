const { div, li, ul, span, button, h5, form, input, p, small, br } = van.tags;

$(document).ready(function() {
    
    const userId = uuidv4();

    const filelist = van.state(new FileList([]));
    function addFileToList(filename, sessionId, status) {
        filelist.val = filelist.val.add(filename, sessionId, status);
    }

    function updateFileStatus(sessionId, status, uploadChunk) {
        console.log("updateFileStatus", sessionId, status);
        filelist.val = filelist.val.updateStatus(sessionId, status, uploadChunk);
    }

    // setUp WebSocket Connection
    const ws = new WebSocket(`ws://${window.location.host}/ws/${userId}`);
    ws.onopen = (e) => console.log(`WebSocket connection established for user: ${userId}`);
    ws.operror = (e) => console.error("WebSocket error", e);
    ws.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log("onmessage", data);
        updateFileStatus(data.sessionId, data.status);
        if (data.status == "done") {
            updateFileStatus(data.sessionId, READY);
        } else if (data.status == "error") {
            updateFileStatus(data.sessionId, ERROR);
        }
    }

    function uploadFileInChunks(file, sessionId) {
        const chunkSize = 1 * 1024 * 1024; // 1MB
        const totalChunks = Math.ceil(file.size / chunkSize);
        let currentChunk = 0;

        function _readAndUploadNextChunk() {
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
                formData.append('user_id', userId);
                $.ajax({
                    url: '/upload',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function () {
                        console.log(`Chunk ${currentChunk} of ${file.name} - ${sessionId} uploaded`);
                        if (currentChunk === totalChunks - 1) {
                            updateFileStatus(sessionId, PROCESSING);
                        } else {
                            currentChunk++;
                            _readAndUploadNextChunk();
                            updateFileStatus(sessionId, UPLOADING, Math.round((currentChunk + 1) * 100 / totalChunks));
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error(`Error uploading chunk ${currentChunk} of ${file.name}: ${error}`);
                        updateFileStatus(sessionId, ERROR);
                    }
                });
            }
            reader.onerror = function () {
                console.error(`Error reading chunk ${currentChunk} of ${file.name}`);
            }
            reader.readAsArrayBuffer(blob);
        } 
        _readAndUploadNextChunk();
    }

    function onSubmit(e) {
        e.preventDefault();
        var files = $('#fileInput')[0].files;
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const sessionId = uuidv4();
                addFileToList(files[i].name, sessionId, UPLOADING);
                // upload the file
                uploadFileInChunks(files[i], sessionId);
            }
        }
        $('#fileInput').val('');
    }

    function Card() {

        function createListItem(file) {
            var statusClass = 'bg-warning text-dark';
            switch (file.status.val) {
                case UPLOADING:
                    statusClass = 'bg-warning text-dark'; break;
                case PROCESSING:
                    statusClass = 'bg-info'; break;
                case READY:
                    statusClass = 'bg-success'; break;
                case UNKNOWNERROR: case UNKNOWNFORMAT: case EMPTYFILE: case MISSINGKEY:
                    statusClass = 'bg-danger'
            }
            const listItem = li({ class: 'list-group-item' },
                // truncate it
                span(file.filename),
                file.status.val == READY ? 
                    button({ id: `btn-${file.sessionId}`, 
                        class: "btn btn-sm btn-primary float-end",
                        onclick: () => downloadFile(file.sessionId) }, "Download") :
                    button({ id: `btn-${file.sessionId}`, class: "btn btn-sm btn-primary float-end disabled" }, "Download"),
                div(span({ id: `status-${file.sessionId}`, class: `badge ${statusClass}` }, file.status.val),
                file.status.val == UPLOADING ? span({ style: "margin: 1em 0 0 0", class: "badge text-bg-secondary" }, `${file.uploadChunk.val}/100`): span()))
            return listItem
        }

        return div({ class: "card w-50" }, 
            div({ class: "card-header" }, "TextUA's AI Detection System"),
            div({ class: "card-body" },
                h5({ class: "card-title" }, "File Upload"),
                p({ class: "card-text" }, "Upload a CSV file for further analysis.",
                    div(small({class: "fw-lighter"}, 
                        "· Input: a CSV file with a \"text\" column that contains text \
                        to be analyzed. Other columns will be ignored.",
                        br(),
                        "· Output: a CSV file with an extra column \"score\" \
                        indicating the probability that the text is synthetic."))),
                form({ class: "input-group", id:"uploadForm", onsubmit: onSubmit },
                    input({ type: "file", class: "form-control", id: "fileInput", multiple: true }),
                    button({ class: "btn btn-outline-secondary", type: "submit" }, "Upload"))),
            div(ul({ class: "list-group list-group-flush scroll", id: "fileList" },
                () => div(filelist.val.files.map(createListItem)))))
    }

    van.add($("#entryPoint"), Card());
});


// utility functions
class FileList {
    constructor (files) { this.files = files }
    add (filename, sessionId, status) {
        this.files.push({ filename: filename, sessionId: sessionId, status: van.state(status), uploadChunk: van.state(0)});
        return new FileList(this.files);
    }
    updateStatus(sessionId, status, uploadChunk) {
        const file = this.files.find(f => f.sessionId === sessionId);
        if (file) {
            // never downgrade from READY
            if (file.status.val !== READY) {
                file.status = van.state(status);
                file.uploadChunk = van.state(uploadChunk);
            }
        }
        return new FileList(this.files);
    }
}

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