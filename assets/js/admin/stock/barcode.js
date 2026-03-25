// Stock Manager Barcode Utilities

function generateBarcode() {
    const prefix = "8";
    const randomBody = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return prefix + randomBody;
}

function updateAddBarcodeVisualization() {
    const barCodeInput = document.getElementById('add-stock-barcode');
    const barCodeSvg = document.getElementById('add-stock-barcode-svg');
    const val = barCodeInput ? barCodeInput.value : '';
    if (!val) {
        if (barCodeSvg) barCodeSvg.style.display = 'none';
        return;
    }
    if (barCodeSvg) barCodeSvg.style.display = 'block';
    try {
        JsBarcode("#add-stock-barcode-svg", val, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: false,
            margin: 0,
            background: "transparent"
        });
    } catch (e) {
        console.error("Barcode generation failed", e);
    }
}

document.getElementById('regenerate-stock-barcode')?.addEventListener('click', () => {
    const barCodeInput = document.getElementById('add-stock-barcode');
    if (barCodeInput) barCodeInput.value = generateBarcode();
    updateAddBarcodeVisualization();
    if (typeof updateModalLabelPreview === 'function') {
        updateModalLabelPreview();
    }
});

document.getElementById('add-stock-barcode')?.addEventListener('input', () => {
    updateAddBarcodeVisualization();
    if (typeof updateModalLabelPreview === 'function') {
        updateModalLabelPreview();
    }
});
