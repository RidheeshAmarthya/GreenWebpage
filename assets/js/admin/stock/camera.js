// Stock Manager Camera & Image Handling

let webcamStream = null;

// Lazy element selectors to ensure they are found after DOM is ready
const getCamElements = () => ({
    video: document.getElementById('webcam-preview'),
    capturePreview: document.getElementById('webcam-capture-preview'),
    placeholder: document.getElementById('webcam-placeholder'),
    startBtn: document.getElementById('start-webcam-btn'),
    captureBtn: document.getElementById('capture-photo-btn'),
    footerCaptureBtn: document.getElementById('footer-capture-photo-btn'),
    retakeBtn: document.getElementById('retake-photo-btn'),
    webcamOverlay: document.getElementById('webcam-overlay'),
    sourcesContent: document.getElementById('stock-sources-content'),
    captureActions: document.getElementById('capture-actions'),
    imgDataField: document.getElementById('stock-image-data'),
    imgSourceField: document.getElementById('stock-image-source'),
    fileInput: document.getElementById('stock-file-input')
});

function dataURLToBlob(dataURL) {
    if (!dataURL || !dataURL.includes(';base64,')) return null;
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
}

async function startWebcam() {
    const el = getCamElements();
    try {
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        webcamStream = stream;
        
        if (el.video) {
            el.video.srcObject = stream;
            el.video.setAttribute('playsinline', true);
            el.video.style.display = 'block';
            await el.video.play().catch(e => console.warn("Auto-play blocked or failed:", e));
        }

        if (el.webcamOverlay) el.webcamOverlay.classList.remove('d-none');
        if (el.placeholder) el.placeholder.style.display = 'none';
        if (el.capturePreview) el.capturePreview.style.display = 'none';
        if (el.startBtn) el.startBtn.style.display = 'none';
        if (el.captureActions) el.captureActions.style.display = 'block';
        if (el.captureBtn) el.captureBtn.style.display = 'block';
        
        const scanBtn = document.getElementById('scan-label-btn');
        if (scanBtn) {
            scanBtn.style.display = 'block';
            scanBtn.disabled = false;
        }

        if (el.retakeBtn) el.retakeBtn.style.display = 'none';

    } catch (err) {
        console.error("Webcam access failed:", err);
        alert('Could not access camera. Please ensure you have granted permissions and are using HTTPS.');
    }
}

function stopWebcam() {
    const el = getCamElements();
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
        if (el.webcamOverlay) el.webcamOverlay.classList.add('d-none');
    }
    if (el.footerCaptureBtn) el.footerCaptureBtn.style.display = 'none';
    if (el.video) el.video.style.display = 'none';
    if (el.captureActions) el.captureActions.style.display = 'none';
    if (el.placeholder && !el.capturePreview?.src) el.placeholder.style.display = 'flex';
}

/**
 * Robust image compression and resizing to hit a target file size (e.g., 50KB).
 * Iteratively reduces quality, then resolution if quality alone isn't enough.
 */
async function compressAndResizeImage(canvas, format, maxSizeBytes = 48000) {
    let quality = 0.8;
    let dataUrl = canvas.toDataURL(format, quality);
    
    // 1. Try reducing quality first
    while (quality > 0.1 && (dataUrl.length * 0.75) > maxSizeBytes) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL(format, quality);
    }
    
    // 2. If still too big, start reducing resolution iteratively
    let scale = 0.9;
    while ((dataUrl.length * 0.75) > maxSizeBytes && scale > 0.2) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = Math.floor(canvas.width * scale);
        tempCanvas.height = Math.floor(canvas.height * scale);
        tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Reset quality to 0.7 for the new resolution attempt
        quality = 0.7;
        dataUrl = tempCanvas.toDataURL(format, quality);
        
        // Fine-tune quality for this resolution
        while (quality > 0.1 && (dataUrl.length * 0.75) > maxSizeBytes) {
            quality -= 0.1;
            dataUrl = tempCanvas.toDataURL(format, quality);
        }
        
        scale -= 0.1;
    }
    
    return dataUrl;
}

async function capturePhoto() {
    const el = getCamElements();
    if (!el.video || el.video.readyState < 2) return;

    let vWidth = el.video.videoWidth;
    let vHeight = el.video.videoHeight;

    if (vWidth === 0 || vHeight === 0) {
        await new Promise(r => setTimeout(r, 150));
        vWidth = el.video.videoWidth;
        vHeight = el.video.videoHeight;
    }

    if (vWidth === 0 || vHeight === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const cropSize = Math.min(vWidth, vHeight) * 0.75; 
    const startX = (vWidth - cropSize) / 2;
    const startY = (vHeight - cropSize) / 2;

    canvas.width = cropSize;
    canvas.height = cropSize;
    ctx.drawImage(el.video, startX, startY, cropSize, cropSize, 0, 0, cropSize, cropSize);

    const format = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'image/webp' : 'image/jpeg';
    
    // Apply robust compression (Target < 50KB)
    const dataUrl = await compressAndResizeImage(canvas, format, 48000);

    if (el.capturePreview) {
        el.capturePreview.src = dataUrl;
        el.capturePreview.style.display = 'block';
    }
    if (el.sourcesContent) el.sourcesContent.style.display = 'none';

    if (el.captureBtn) el.captureBtn.style.display = 'none';
    if (el.footerCaptureBtn) el.footerCaptureBtn.style.display = 'none';
    if (el.retakeBtn) el.retakeBtn.style.display = 'inline-block';

    if (el.imgDataField) el.imgDataField.value = dataUrl;
    if (el.imgSourceField) el.imgSourceField.value = 'photo';
    stopWebcam();
}

// Global initialization for listeners - need to wait for DOM or use delegation
document.addEventListener('DOMContentLoaded', () => {
    const el = getCamElements();
    
    if (el.startBtn) el.startBtn.onclick = startWebcam;
    if (el.captureBtn) el.captureBtn.onclick = capturePhoto;
    if (el.footerCaptureBtn) el.footerCaptureBtn.onclick = capturePhoto;
    
    const ocrBtn = document.getElementById('scan-label-btn');
    if (ocrBtn) ocrBtn.onclick = captureForOCR;

    if (el.retakeBtn) el.retakeBtn.onclick = () => {
        if (el.capturePreview) el.capturePreview.style.display = 'none';
        if (el.sourcesContent) el.sourcesContent.style.display = 'block';
        
        if (el.imgDataField) el.imgDataField.value = '';
        if (el.imgSourceField) el.imgSourceField.value = '';
        if (el.fileInput) el.fileInput.value = '';

        if (document.getElementById('cam-tab')?.classList.contains('active')) {
            startWebcam();
        }
    };

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        const elCurrent = getCamElements();
        const isCamActive = elCurrent.video && elCurrent.video.style.display !== 'none';
        
        // Don't trigger if user is typing in a form field
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
        if (isInput) return;

        // Ensure the modal is actually open and visible (not just in DOM)
        const modal = document.getElementById('stockItemModal');
        if (!modal || !modal.classList.contains('show')) return;

        if (!isCamActive) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            capturePhoto();
        } else if (e.key === ' ') {
            e.preventDefault();
            captureForOCR();
        }
    });

    el.fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const format = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'image/webp' : 'image/jpeg';
                // Apply robust compression (Target < 50KB)
                const dataUrl = await compressAndResizeImage(canvas, format, 48000);
                
                const elLatest = getCamElements();
                if (elLatest.capturePreview) { elLatest.capturePreview.src = dataUrl; elLatest.capturePreview.style.display = 'block'; }
                if (elLatest.sourcesContent) elLatest.sourcesContent.style.display = 'none';
                if (elLatest.retakeBtn) elLatest.retakeBtn.style.display = 'inline-block';
                if (elLatest.startBtn) elLatest.startBtn.style.display = 'none';
                if (elLatest.imgDataField) elLatest.imgDataField.value = dataUrl;
                if (elLatest.imgSourceField) elLatest.imgSourceField.value = 'photo';
                showLoading(false);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
});
let isOcrProcessing = false;
async function captureForOCR() {
    if (isOcrProcessing) return;
    isOcrProcessing = true;

    const el = getCamElements();
    if (!el.video || el.video.readyState < 2) {
        console.warn("OCR ignored: Camera not actively streaming");
        isOcrProcessing = false;
        return;
    }

    // 1. Capture high-quality frame
    const vWidth = el.video.videoWidth;
    const vHeight = el.video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = vWidth;
    canvas.height = vHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(el.video, 0, 0, vWidth, vHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // 2. STOP CAMERA IMMEDIATELY as requested
    stopWebcam();

    // 2.5 Prepare image for AI only (Resize & Compress)
    // We target < 50KB to keep OCR payload light
    const format = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'image/webp' : 'image/jpeg';
    const compressedDataUrl = await compressAndResizeImage(canvas, format, 48000);

    // 3. Show static preview while processing
    if (el.capturePreview) {
        el.capturePreview.src = compressedDataUrl;
        el.capturePreview.style.display = 'block';
        // Hide the sources container (tabs/video/placeholder)
        if (el.sourcesContent) el.sourcesContent.style.display = 'none';
        if (el.placeholder) el.placeholder.style.display = 'none';
        if (el.webcamOverlay) el.webcamOverlay.classList.add('d-none');
    }

    // OCR image is temporary and must never become the saved article photo.
    // Only capturePhoto/file upload should populate image_data for persistence.
    if (el.imgDataField) el.imgDataField.value = '';
    if (el.imgSourceField) el.imgSourceField.value = '';
    // Keep retake hidden while OCR is processing.
    if (el.retakeBtn) el.retakeBtn.style.display = 'none';
    if (el.startBtn) el.startBtn.style.display = 'none';

    // 4. Update Button State
    const ocrBtn = document.getElementById('scan-label-btn');
    if (!ocrBtn) return;

    const originalHtml = ocrBtn.innerHTML;
    ocrBtn.disabled = true;
    ocrBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>AI SCANNING...';
    
    // Re-show capture actions specifically for the loading feedback
    if (el.captureActions) {
        el.captureActions.style.display = 'block';
        if (el.captureBtn) el.captureBtn.style.display = 'none'; // Hide normal photo btn during AI scan
    }

    try {
        if (typeof geminiOCR === 'undefined') throw new Error("OCR Module not loaded");

        // 5. Call AI
        const data = await geminiOCR.scanImage(compressedDataUrl);
        
        // 5.5 Safety Check: If user closed the modal while we were waiting, discard result
        const modal = document.getElementById('stockItemModal');
        if (!modal || !modal.classList.contains('show')) {
            console.warn("AI result discarded: Modal hidden during processing");
            isOcrProcessing = false;
            return;
        }

        // 6. Populate form fields
        geminiOCR.fillForm(data);
        
        // 7. Success state
        ocrBtn.className = "btn btn-success fw-bold py-3 w-100 shadow-sm";
        ocrBtn.innerHTML = '<i class="fas fa-check me-2"></i>AI SCAN COMPLETE!';
        
        // 8. Auto-reset to 'Ready' state (Start Camera button)
        isOcrProcessing = false;
        setTimeout(() => {
            ocrBtn.disabled = false;
            ocrBtn.innerHTML = originalHtml;
            ocrBtn.className = "btn btn-primary fw-bold py-3 w-100 mb-2";
            
            // Hide the preview and restore 'Start Camera' button
            if (el.capturePreview) {
                el.capturePreview.style.display = 'none';
                el.capturePreview.src = ''; // Clear temporary preview
            }
            if (el.sourcesContent) el.sourcesContent.style.display = 'block';
            if (el.placeholder) el.placeholder.style.display = 'flex';
            
            if (el.captureActions) el.captureActions.style.display = 'none';
            if (el.startBtn) el.startBtn.style.display = 'block';
            if (el.retakeBtn) el.retakeBtn.style.display = 'none';
        }, 1200);

    } catch (err) {
        isOcrProcessing = false;
        console.error("AI Scan failed:", err);
        ocrBtn.className = "btn btn-danger fw-bold py-3 w-100 shadow-sm";
        ocrBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>AI SCAN FAILED';
        
        // Show specific error to user
        if (typeof geminiOCR !== 'undefined') {
            geminiOCR.showToast(err.message, 'danger');
        } else {
            alert("AI Scan failed: " + err.message);
        }

        if (el.captureActions) el.captureActions.style.display = 'block';
        
        setTimeout(() => {
            ocrBtn.disabled = false;
            ocrBtn.innerHTML = originalHtml;
            ocrBtn.className = "btn btn-primary fw-bold py-3 w-100 mb-2";
            // Allow retake on failure
            if (el.retakeBtn) el.retakeBtn.style.display = 'block';
        }, 4000); // 4 Seconds to let user read toast before reset
    }
}
