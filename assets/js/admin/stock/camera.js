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
    imgDataField: document.getElementById('stock-image-data'),
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
        if (el.captureBtn) el.captureBtn.style.display = 'inline-block';
        if (el.footerCaptureBtn) el.footerCaptureBtn.style.display = 'inline-block';
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
    if (el.placeholder && !el.capturePreview?.src) el.placeholder.style.display = 'flex';
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

    let quality = 0.8;
    let dataUrl = '';
    const format = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'image/webp' : 'image/jpeg';

    while (quality > 0.1) {
        dataUrl = canvas.toDataURL(format, quality);
        if ((dataUrl.length * 0.75) < 50000) break;
        quality -= 0.1;
    }

    if (el.capturePreview) {
        el.capturePreview.src = dataUrl;
        el.capturePreview.style.display = 'block';
    }
    if (el.sourcesContent) el.sourcesContent.style.display = 'none';

    if (el.captureBtn) el.captureBtn.style.display = 'none';
    if (el.footerCaptureBtn) el.footerCaptureBtn.style.display = 'none';
    if (el.retakeBtn) el.retakeBtn.style.display = 'inline-block';

    if (el.imgDataField) el.imgDataField.value = dataUrl;
    stopWebcam();
}

// Global initialization for listeners - need to wait for DOM or use delegation
document.addEventListener('DOMContentLoaded', () => {
    const el = getCamElements();
    
    if (el.startBtn) el.startBtn.onclick = startWebcam;
    if (el.captureBtn) el.captureBtn.onclick = capturePhoto;
    if (el.footerCaptureBtn) el.footerCaptureBtn.onclick = capturePhoto;

    if (el.retakeBtn) el.retakeBtn.onclick = () => {
        if (el.capturePreview) el.capturePreview.style.display = 'none';
        if (el.sourcesContent) el.sourcesContent.style.display = 'block';
        
        if (el.imgDataField) el.imgDataField.value = '';
        if (el.fileInput) el.fileInput.value = '';

        if (document.getElementById('cam-tab')?.classList.contains('active')) {
            startWebcam();
        }
    };

    window.addEventListener('keydown', (e) => {
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
        const elCurrent = getCamElements();
        if ((e.key === 'Enter' || e.key === ' ') && elCurrent.captureBtn && elCurrent.captureBtn.getClientRects().length > 0 && webcamStream) {
            if (isInput && e.key === ' ') return;
            e.preventDefault();
            capturePhoto();
        }
    });

    el.fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
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
                let quality = 0.8;
                let dataUrl = '';
                const format = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'image/webp' : 'image/jpeg';
                while (quality > 0.05) { dataUrl = canvas.toDataURL(format, quality); if ((dataUrl.length * 0.75) < 50000) break; quality -= 0.05; }
                
                const elLatest = getCamElements();
                if (elLatest.capturePreview) { elLatest.capturePreview.src = dataUrl; elLatest.capturePreview.style.display = 'block'; }
                if (elLatest.sourcesContent) elLatest.sourcesContent.style.display = 'none';
                if (elLatest.retakeBtn) elLatest.retakeBtn.style.display = 'inline-block';
                if (elLatest.startBtn) elLatest.startBtn.style.display = 'none';
                if (elLatest.imgDataField) elLatest.imgDataField.value = dataUrl;
                showLoading(false);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
});
