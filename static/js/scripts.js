let fileList = [];
let combinedPDFBlob = null;
let draggingIndex = null; // Deklarert globalt

// Legg til filer
function addFiles() {
    const fileInput = document.getElementById('pdf-file');
    const files = Array.from(fileInput.files);

    // Legg til nye filer i fil-listen
    fileList = fileList.concat(files);
    updateFileList();

    // Tøm input-feltet slik at samme fil kan velges igjen
    fileInput.value = "";
}

// Oppdater fil-liste
function updateFileList() {
    const fileListContainer = document.getElementById('file-list');
    fileListContainer.innerHTML = '';

    if (fileList.length === 0) {
        fileListContainer.innerHTML = '<p>Ingen filer valgt.</p>';
        return;
    }

    // Generer HTML for hver fil
    fileList.forEach((file, index) => {
        const fileItem = document.createElement('li');
        fileItem.className = 'file-list-item';
        fileItem.draggable = true; // Gjør elementet dra-bart
        fileItem.dataset.index = index;
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <button class="remove-btn" onclick="removeFile(${index})">Fjern</button>
        `;

        // Legg til drag-and-drop eventer
        fileItem.addEventListener('dragstart', () => (draggingIndex = index));
        fileItem.addEventListener('dragover', (e) => handleDragOver(e, index));
        fileItem.addEventListener('drop', handleDrop);
        fileItem.addEventListener('dragend', handleDragEnd);

        fileListContainer.appendChild(fileItem);
    });
}

// Fjern en fil fra listen
function removeFile(index) {
    fileList.splice(index, 1);
    updateFileList();
}

// Dra-og-slipp-håndtering
function handleDragOver(e, targetIndex) {
    e.preventDefault();
    if (draggingIndex !== targetIndex) {
        const item = fileList.splice(draggingIndex, 1)[0];
        fileList.splice(targetIndex, 0, item);
        draggingIndex = targetIndex; // Oppdater startindeksen
        updateFileList();
    }
}

function handleDrop() {
    draggingIndex = null; // Nullstill
}

function handleDragEnd() {
    draggingIndex = null; // Nullstill
}


// Flett PDF-filer
async function uploadAndCombine() {
    if (fileList.length < 2) {
        alert('Velg minst to PDF-filer.');
        return;
    }

    const formData = new FormData();
    fileList.forEach((file, index) => {
        formData.append(`pdfs[${index}]`, file); // Sørger for riktig struktur
    });

    try {
        const response = await fetch('/combine', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Serverfeil: ${response.status}`);
        }

        combinedPDFBlob = await response.blob(); // Lagre blob for nedlasting

        // Aktiver input-feltet og knappen
        document.getElementById('output-name').disabled = false;
        document.getElementById('download-btn').disabled = false;
    } catch (error) {
        alert('En feil oppstod: ' + error.message);
    }
}


// Last ned kombinert PDF
function downloadCombinedPDF() {
    const fileName = document.getElementById('output-name').value || 'kombinert';
    const url = window.URL.createObjectURL(combinedPDFBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.pdf`; // Legg til .pdf automatisk
    a.click();
    window.URL.revokeObjectURL(url);
}

// Fjern filer
function removeFile(index) {
    fileList.splice(index, 1);
    updateFileList();
}

// Dra-og-slipp-funksjonalitet
function handleDragOver(e, targetIndex) {
    e.preventDefault();
    if (draggingIndex !== targetIndex) {
        const item = fileList.splice(draggingIndex, 1)[0];
        fileList.splice(targetIndex, 0, item);
        draggingIndex = targetIndex; // Oppdater startindeksen
        updateFileList();
    }
}

// Last dynamisk innhold
function loadContent(page) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    let content = '';
    switch (page) {
        case 'guiden':
            content = `
                <h1>Hvordan flette PDF-filer</h1>
                <p>Følg trinnene nedenfor for å flette PDF-dokumentene dine:</p>
                <ol>
                    <li><strong>Last opp PDF-filer:</strong> Klikk på <input type="file" id="pdf-file" class="btn" name="pdf-file" accept="application/pdf" multiple onchange="addFiles()" required></li>
                    <li><strong>Sorter filene:</strong> Dra og slipp filene i listen nedenfor for å angi ønsket rekkefølge.
                        <ul class="file-list" id="file-list"></ul>
                    </li>
                    <li><strong>Flett filene:</strong> Klikk på <button type="button" class="btn" onclick="uploadAndCombine()">Flett PDF</button> for å kombinere filene.</li>
                    <li><strong>Kombinert PDF:</strong>
                        <p>Du kan endre navnet på den kombinerte filen nedenfor og laste den ned:</p>
                        <div class="output-section">
                            <div class="file-list-item">
                                <input type="text" id="output-name" value="kombinert" class="rename-input" disabled>
                                <span>.pdf</span>
                                <button class="btn" id="download-btn" onclick="downloadCombinedPDF()" disabled>Last ned</button>
                            </div>
                        </div>
                    </li>
                </ol>
            `;
            break;

        case 'historien':
            content = `
                <h1>Historien om PDF-fletting</h1>
                <p>En gang for lenge siden, i en verden der dokumenter levde adskilt, oppsto behovet for å bringe dem sammen...</p>
                <p>Slik ble PDF-fletting født, og i dag hjelper det millioner av brukere over hele verden å organisere sine digitale liv.</p>
            `;
            break;

        case 'kontakt':
            content = `
                <h1>Kontakt oss</h1>
                <p>Har du spørsmål eller forslag til forbedringer? Send en e-post til:</p>
                <p><a href="mailto:helland.orjan@gmail.com">helland.orjan@gmail.com</a></p>
            `;
            break;

        default:
            content = '<p>Ukjent side</p>';
            break;
    }

    mainContent.innerHTML = content;
}

// Last guiden som standard
window.onload = () => {
    loadContent('guiden');
};
