function handleFiles(files, processDataCallback) {
    [...files].forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });
            processDataCallback(json);
        };
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
        }
    });
}

function loadFromGoogleSheet(csvUrl, processDataCallback) {
    document.getElementById('title').innerHTML = 'Training from Google Sheet...';
    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const workbook = XLSX.read(text, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });
            processDataCallback(json);
        });
}
