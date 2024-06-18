const { div, li, ul, span, button, h5, form, input, p } = van.tags;

$(document).ready(function() {
    
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

    function Card() {
        const filelist = van.state(new FileList([]));

        function addFileToList(filename, sessionId, status) {
            console.log('addFileToList', filename, sessionId, status);
            filelist.val = filelist.val.add(filename, sessionId, status);
        }

        function updateFileStatus(sessionId, status) {
            console.log('updateFileStatus', sessionId, status);
            filelist.val = filelist.val.updateStatus(sessionId, status);
        }

        const UPLOADING = 'Uploading...';
        const PROCESSING = 'Processing...';
        const READY = 'Ready to download!';
        const ERROR = 'Error!'

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
                            updateFileStatus(sessionId, ERROR);
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
            var files = $('#fileInput')[0].files;
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const sessionId = uuidv4();
                    addFileToList(files[i].name, sessionId, UPLOADING);
                    // create WebSocket and upload file only when that worked
                    const ws = new WebSocket(`ws://${window.location.host}/ws/${sessionId}`);
                    ws.onopen = function() {
                        console.log(`WebSocket connection established for session: ${sessionId}`);
                        uploadFileInChunks(files[i], sessionId);
                    };
                    ws.onmessage = function(e) {
                        const data = JSON.parse(e.data);
                        if (data.status == "done") {
                            console.log("File ready for download");
                            updateFileStatus(sessionId, READY);
                        } else if (data.status == "error") {
                            console.log("Received error", e);
                            updateFileStatus(sessionId, ERROR)
                        }
                    }
                    ws.onerror = function(e) {
                        console.error(`WebSocket error for session: ${sessionId}`, e);
                        updateFileStatus(sessionId, ERROR);
                    }
                }
            }
            $('#fileInput').val('');
        }

        function createListItem(file) {
            console.log('createListItem', file);
            var statusClass = 'bg-warning text-dark';
            switch (file.status.val) {
                // case UPLOADING:
                    // statusClass = 'bg-warning text-dark'; break;
                case PROCESSING:
                    statusClass = 'bg-info'; break;
                case READY:
                    statusClass = 'bg-success'; break;
                case ERROR:
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
                div(span({ id: `status-${file.sessionId}`, class: `badge ${statusClass}` }, file.status.val)))
            return listItem
        }

        return div({ class: "card w-50" }, 
            div({ class: "card-header" }, "AI Detection Service"),
            div({ class: "card-body" },
                h5({ class: "card-title" }, "File Upload"),
                p({ class: "card-text" }, "Upload a text file for further analysis."),
                form({ class: "input-group", id:"uploadForm", onsubmit: onSubmit },
                    input({ type: "file", class: "form-control", id: "fileInput", multiple: true }),
                    button({ class: "btn btn-outline-secondary", type: "submit" }, "Upload"))),
            div(ul({ class: "list-group list-group-flush", id: "fileList" },
                () => div(filelist.val.files.map(createListItem)))))
    }
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