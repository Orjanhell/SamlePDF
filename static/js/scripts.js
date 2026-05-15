(() => {
    const MAX_FILES = 20;
    const FIRMASOK_URL = 'https://brreg-sok.onrender.com/';
    const GOOGLE_URL = 'https://www.google.no/';
    const WINDOW_ICONS = {
        'samlepdf-window': '/static/images/SamlePDF.png?v=5',
        'browser-window': '/static/images/nettleser.png?v=5',
        'computer-window': '/static/images/datamaskin.png?v=5',
        'files-window': '/static/images/filer.png?v=5',
        'trash-window': '/static/images/soppel.png?v=5'
    };

    let zIndexCounter = 20;
    let fileList = [];
    let combinedPDFBlob = null;
    let draggingIndex = null;
    let activeWindowId = null;

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    document.addEventListener('DOMContentLoaded', () => {
        bindDesktopAndWindows();
        bindPages();
        bindUpload();
        bindBrowser();
        bindStartMenu();
        bindUtilityWindows();
        updateClock();
        setInterval(updateClock, 1000);
        openWindow('samlepdf-window');
        setPage('merge');
    });

    function bindDesktopAndWindows() {
        $$('[data-window-target]').forEach((button) => {
            button.addEventListener('click', () => {
                const target = button.dataset.windowTarget;
                selectDesktopIcon(target);
                openWindow(target);

                if (button.dataset.page) {
                    setPage(button.dataset.page);
                }
            });
        });

        $('.desktop').addEventListener('click', (event) => {
            if (!event.target.closest('.desktop-icon')) {
                selectDesktopIcon(null);
            }
        });

        $$('[data-close]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                closeWindow(button.dataset.close);
            });
        });

        $$('[data-minimize]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                minimizeWindow(button.dataset.minimize);
            });
        });

        $$('[data-maximize]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleMaximize(button.dataset.maximize);
            });
        });

        $$('.window').forEach((windowElement) => {
            windowElement.addEventListener('mousedown', () => bringToFront(windowElement.id));
        });

        $$('[data-drag-handle]').forEach((handle) => {
            handle.addEventListener('mousedown', startWindowDrag);
            handle.addEventListener('dblclick', (event) => {
                const windowElement = event.target.closest('.window');
                if (windowElement) toggleMaximize(windowElement.id);
            });
        });
    }

    function bindPages() {
        $$('[data-page]').forEach((button) => {
            button.addEventListener('click', () => {
                if (button.dataset.windowTarget) {
                    openWindow(button.dataset.windowTarget);
                }
                setPage(button.dataset.page);
            });
        });
    }

    function bindUpload() {
        const input = $('#pdf-file-input');
        const chooseButton = $('#choose-files-btn');
        const clearButton = $('#clear-files-btn');
        const dropZone = $('#drop-zone');
        const combineButton = $('#combine-btn');
        const downloadButton = $('#download-btn');

        chooseButton.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            addFiles(input.files);
            input.value = '';
        });

        clearButton.addEventListener('click', () => {
            fileList = [];
            combinedPDFBlob = null;
            updateFileList();
            setStatus('Velg minst to PDF-filer for å starte.');
        });

        ['dragenter', 'dragover'].forEach((eventName) => {
            dropZone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            dropZone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (event) => {
            addFiles(event.dataTransfer.files);
        });

        combineButton.addEventListener('click', uploadAndCombine);
        downloadButton.addEventListener('click', downloadCombinedPDF);
    }

    function bindBrowser() {
        const frame = $('#browser-frame');
        const address = $('#browser-address');
        const notice = $('#browser-notice');

        $('#browser-home-btn').addEventListener('click', () => {
            address.value = FIRMASOK_URL;
            frame.src = FIRMASOK_URL;
            notice.textContent = 'FirmaSøk vises inne i nettleservinduet.';
        });

        $('#browser-go-btn').addEventListener('click', () => navigateBrowser(address.value));

        address.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                navigateBrowser(address.value);
            }
        });

        $('#browser-google-btn').addEventListener('click', () => {
            window.open(GOOGLE_URL, '_blank', 'noopener,noreferrer');
            notice.textContent = 'Google åpnes i ny fane fordi Google vanligvis ikke kan vises inne i iframe-vinduer.';
        });

        $('#browser-new-tab-btn').addEventListener('click', () => {
            const url = normalizeAddress(address.value);
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    function bindStartMenu() {
        const startButton = $('#start-button');
        const startMenu = $('#start-menu');

        startButton.addEventListener('click', (event) => {
            event.stopPropagation();
            startMenu.classList.toggle('hidden');
            startButton.classList.toggle('active', !startMenu.classList.contains('hidden'));
        });

        startMenu.addEventListener('click', (event) => {
            if (event.target.closest('button')) {
                startMenu.classList.add('hidden');
                startButton.classList.remove('active');
            }
        });

        document.addEventListener('click', (event) => {
            if (!startMenu.contains(event.target) && event.target !== startButton) {
                startMenu.classList.add('hidden');
                startButton.classList.remove('active');
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                startMenu.classList.add('hidden');
                startButton.classList.remove('active');
            }
        });
    }

    function bindUtilityWindows() {
        const emptyTrashButton = $('#empty-trash-btn');
        const trashList = document.querySelector('.trash-list');
        const trashMessage = $('#trash-message');
        const refreshButton = $('#computer-refresh-btn');

        if (emptyTrashButton && trashList && trashMessage) {
            emptyTrashButton.addEventListener('click', () => {
                trashList.classList.add('empty');
                trashMessage.textContent = 'Søppelet er tømt. Ingen ekte filer ble skadet i prosessen.';
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                refreshButton.textContent = 'Oppdatert!';
                setTimeout(() => {
                    refreshButton.textContent = 'Oppdater';
                }, 1200);
            });
        }
    }

    function navigateBrowser(rawValue) {
        const frame = $('#browser-frame');
        const address = $('#browser-address');
        const notice = $('#browser-notice');
        const url = normalizeAddress(rawValue);

        address.value = url;

        if (url.includes('google.') || url.includes('accounts.google.') || rawValue.trim().includes(' ')) {
            const searchUrl = rawValue.trim().includes(' ')
                ? `https://www.google.no/search?q=${encodeURIComponent(rawValue.trim())}`
                : url;
            window.open(searchUrl, '_blank', 'noopener,noreferrer');
            notice.textContent = 'Denne adressen åpnes i ny fane. Flere eksterne sider blokkerer visning inne i iframe.';
            return;
        }

        frame.src = url;
        notice.textContent = 'Siden lastes i nettleservinduet. Hvis den blokkerer iframe, bruk “Åpne i ny fane”.';
    }

    function normalizeAddress(value) {
        const trimmed = value.trim();
        if (!trimmed) return FIRMASOK_URL;
        if (trimmed.includes(' ') || !trimmed.includes('.')) {
            return `https://www.google.no/search?q=${encodeURIComponent(trimmed)}`;
        }
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    }

    function addFiles(fileInputList) {
        const incomingFiles = Array.from(fileInputList || []);
        const validFiles = [];
        const rejectedFiles = [];

        incomingFiles.forEach((file) => {
            const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (looksLikePdf) {
                validFiles.push(file);
            } else {
                rejectedFiles.push(file.name);
            }
        });

        const freeSlots = MAX_FILES - fileList.length;
        const filesToAdd = validFiles.slice(0, freeSlots);
        fileList = fileList.concat(filesToAdd);
        combinedPDFBlob = null;
        updateFileList();

        if (rejectedFiles.length > 0) {
            setStatus(`Noen filer ble hoppet over fordi de ikke er PDF: ${rejectedFiles.join(', ')}`, 'error');
        } else if (validFiles.length > freeSlots) {
            setStatus(`Maks ${MAX_FILES} filer. De siste filene ble ikke lagt til.`, 'error');
        } else if (fileList.length < 2) {
            setStatus('Velg minst to PDF-filer for å starte.');
        } else {
            setStatus('Filene er klare. Sorter listen eller trykk “Flett PDF”.');
        }
    }

    function updateFileList() {
        const fileListElement = $('#file-list');
        const fileCount = $('#file-count');
        const combineButton = $('#combine-btn');
        const clearButton = $('#clear-files-btn');
        const downloadButton = $('#download-btn');

        fileListElement.replaceChildren();
        fileCount.textContent = `${fileList.length} ${fileList.length === 1 ? 'fil' : 'filer'}`;
        combineButton.disabled = fileList.length < 2;
        clearButton.disabled = fileList.length === 0;
        downloadButton.disabled = !combinedPDFBlob;

        if (fileList.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = 'Ingen filer valgt.';
            fileListElement.appendChild(empty);
            return;
        }

        fileList.forEach((file, index) => {
            const item = document.createElement('li');
            item.className = 'file-list-item';
            item.draggable = true;
            item.dataset.index = String(index);

            const fileIndex = document.createElement('span');
            fileIndex.className = 'file-index';
            fileIndex.textContent = String(index + 1);

            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.title = file.name;
            fileName.textContent = file.name;

            const fileSize = document.createElement('span');
            fileSize.className = 'file-size';
            fileSize.textContent = formatFileSize(file.size);

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-btn';
            removeButton.type = 'button';
            removeButton.textContent = 'Fjern';
            removeButton.addEventListener('click', () => removeFile(index));

            item.append(fileIndex, fileName, fileSize, removeButton);

            item.addEventListener('dragstart', () => {
                draggingIndex = index;
                item.classList.add('dragging');
            });
            item.addEventListener('dragover', (event) => {
                event.preventDefault();
                handleFileReorder(index);
            });
            item.addEventListener('dragend', () => {
                draggingIndex = null;
                item.classList.remove('dragging');
            });

            fileListElement.appendChild(item);
        });
    }

    function handleFileReorder(targetIndex) {
        if (draggingIndex === null || draggingIndex === targetIndex) return;
        const movedFile = fileList.splice(draggingIndex, 1)[0];
        fileList.splice(targetIndex, 0, movedFile);
        draggingIndex = targetIndex;
        combinedPDFBlob = null;
        updateFileList();
        setStatus('Rekkefølgen er oppdatert. Trykk “Flett PDF” på nytt for å lage ny fil.');
    }

    function removeFile(index) {
        fileList.splice(index, 1);
        combinedPDFBlob = null;
        updateFileList();
        setStatus(fileList.length < 2 ? 'Velg minst to PDF-filer for å starte.' : 'Fil fjernet. Klar for fletting.');
    }

    async function uploadAndCombine() {
        if (fileList.length < 2) {
            setStatus('Velg minst to PDF-filer.', 'error');
            return;
        }

        const combineButton = $('#combine-btn');
        const downloadButton = $('#download-btn');
        const formData = new FormData();
        fileList.forEach((file) => formData.append('pdfs', file, file.name));

        combineButton.disabled = true;
        downloadButton.disabled = true;
        combinedPDFBlob = null;
        setStatus('Fletter PDF-filer ...');

        try {
            const response = await fetch('/combine', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || `Serverfeil: ${response.status}`);
            }

            combinedPDFBlob = await response.blob();
            downloadButton.disabled = false;
            setStatus('Ferdig. Den samlede PDF-en er klar for nedlasting.', 'success');
        } catch (error) {
            setStatus(`En feil oppstod: ${error.message}`, 'error');
        } finally {
            combineButton.disabled = fileList.length < 2;
        }
    }

    function downloadCombinedPDF() {
        if (!combinedPDFBlob) {
            setStatus('Ingen samlet PDF er klar ennå.', 'error');
            return;
        }

        const rawName = $('#output-name').value.trim() || 'samlet-pdf';
        const safeName = rawName.replace(/[^a-zA-Z0-9æøåÆØÅ._-]/g, '-').replace(/-+/g, '-');
        const url = URL.createObjectURL(combinedPDFBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatus('PDF-en er lastet ned.', 'success');
    }

    function setStatus(message, type = '') {
        const status = $('#status-message');
        status.textContent = message;
        status.classList.remove('success', 'error');
        if (type) status.classList.add(type);
    }

    function formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex += 1;
        }
        return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    }

    function selectDesktopIcon(windowId) {
        $$('.desktop-icon').forEach((icon) => {
            icon.classList.toggle('selected', Boolean(windowId) && icon.dataset.windowTarget === windowId);
        });
    }

    function setPage(pageName) {
        $$('.page').forEach((page) => page.classList.toggle('active', page.id === `page-${pageName}`));
        $$('.sidebar-item').forEach((item) => item.classList.toggle('active', item.dataset.page === pageName));
    }

    function openWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        if (!windowElement) return;
        windowElement.classList.remove('hidden', 'minimized');
        bringToFront(windowId);
        updateTaskbar();
    }

    function closeWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        if (!windowElement) return;
        windowElement.classList.add('hidden');
        windowElement.classList.remove('minimized', 'maximized', 'active');
        updateMaximizeButton(windowElement);
        if (activeWindowId === windowId) activeWindowId = null;
        updateTaskbar();
    }

    function minimizeWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        if (!windowElement) return;
        windowElement.classList.add('minimized');
        if (activeWindowId === windowId) activeWindowId = null;
        $$('.window').forEach((element) => {
            element.classList.remove('active');
            element.classList.add('inactive');
        });
        updateTaskbar();
    }

    function restoreWindow(windowId) {
        openWindow(windowId);
    }

    function toggleMaximize(windowId) {
        const windowElement = document.getElementById(windowId);
        if (!windowElement || window.innerWidth <= 760) return;

        if (windowElement.classList.contains('minimized')) {
            windowElement.classList.remove('minimized');
        }

        windowElement.classList.toggle('maximized');
        updateMaximizeButton(windowElement);
        bringToFront(windowId);
        updateTaskbar();
    }

    function updateMaximizeButton(windowElement) {
        const button = document.querySelector(`[data-maximize="${windowElement.id}"]`);
        if (!button) return;

        const isMaximized = windowElement.classList.contains('maximized');
        button.textContent = isMaximized ? '❐' : '□';
        button.setAttribute('aria-label', isMaximized ? `Gjenopprett ${windowElement.dataset.title || windowElement.id}` : `Maksimer ${windowElement.dataset.title || windowElement.id}`);
        button.title = isMaximized ? 'Gjenopprett' : 'Maksimer';
    }

    function bringToFront(windowId) {
        const windowElement = document.getElementById(windowId);
        if (!windowElement) return;
        zIndexCounter += 1;
        windowElement.style.zIndex = String(zIndexCounter);
        activeWindowId = windowId;
        $$('.window').forEach((element) => {
            element.classList.toggle('active', element.id === windowId);
            element.classList.toggle('inactive', element.id !== windowId);
        });
        updateTaskbar();
    }

    function updateTaskbar() {
        const taskBar = $('#task-bar');
        taskBar.replaceChildren();

        $$('.window').forEach((windowElement) => {
            if (windowElement.classList.contains('hidden')) return;

            const isMinimized = windowElement.classList.contains('minimized');
            const task = document.createElement('button');
            task.type = 'button';
            task.className = 'task';
            task.classList.toggle('active', windowElement.id === activeWindowId && !isMinimized);
            task.classList.toggle('minimized-task', isMinimized);

            const icon = document.createElement('img');
            icon.src = WINDOW_ICONS[windowElement.id] || '/static/images/SamlePDF.png?v=5';
            icon.alt = '';
            icon.setAttribute('aria-hidden', 'true');

            const label = document.createElement('span');
            label.textContent = windowElement.dataset.title || windowElement.id;

            task.append(icon, label);
            task.addEventListener('click', () => {
                if (isMinimized) {
                    restoreWindow(windowElement.id);
                    return;
                }

                bringToFront(windowElement.id);
            });
            taskBar.appendChild(task);
        });
    }

    function startWindowDrag(event) {
        if (window.innerWidth <= 760) return;
        if (event.button !== 0) return;

        const windowElement = event.target.closest('.window');
        if (!windowElement || windowElement.classList.contains('maximized')) return;

        bringToFront(windowElement.id);

        const startX = event.clientX;
        const startY = event.clientY;
        const rect = windowElement.getBoundingClientRect();
        const initialLeft = rect.left;
        const initialTop = rect.top;

        const onMove = (moveEvent) => {
            const nextLeft = initialLeft + (moveEvent.clientX - startX);
            const nextTop = initialTop + (moveEvent.clientY - startY);
            windowElement.style.left = `${Math.max(0, nextLeft)}px`;
            windowElement.style.top = `${Math.max(0, nextTop)}px`;
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function updateClock() {
        const clock = $('#clock');
        if (!clock) return;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clock.textContent = `${hours}:${minutes}`;
    }
})();
