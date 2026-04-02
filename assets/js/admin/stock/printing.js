// Stock Manager Printing & PDF Functions

async function printStockLabel(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;
    return await printStockLabelFromData(item);
}

async function printStockLabelFromData(item) {
    if (!item) {
        alert("No data available for printing.");
        return;
    }

    const zpl = fillZPLTemplate(item);

    try {
        await PrinterManager.sendJob(zpl);
        console.log("Printed successfully via PrinterManager");
    } catch (error) {
        console.error("Printing failed:", error);
        alert("Printing Failed: " + error.message);
        throw error; // Re-throw so the caller knows to stop (e.g., Save & Print)
    }
}

function previewStockLabel(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;
    const zpl = fillZPLTemplate(item);
    const url = "https://api.labelary.com/v1/printers/8dpmm/labels/4x2/0/";
    const encoder = new TextEncoder();
    const data = encoder.encode(zpl);

    fetch(url, { method: "POST", body: data }).then(response => {
        if (!response.ok) throw new Error("Labelary API error");
        return response.blob();
    }).then(blob => {
        const fileURL = URL.createObjectURL(blob);
        const win = window.open(fileURL, '_blank');
        if (!win) alert("Pop-up blocked! Please allow pop-ups to see the label preview.");
    }).catch(err => {
        console.error("Preview failed", err);
        alert("Preview failed. Check console for details.");
    });
}

async function generateStockPDF(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;

    const zpl = fillZPLTemplate(item);
    const labelImageUrl = `http://api.labelary.com/v1/printers/8dpmm/labels/4x2/0/${encodeURIComponent(zpl)}`;
    const imgUrl = item.resolved_url || placeholderImg;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');

    printWindow.document.write(`
        <html>
        <head>
            <title>Spec Sheet - ${item.article_no}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                
                /* Universal Styles */
                body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #525659; }
                .page-container { background: #525659; padding: 40px 0; display: flex; flex-direction: column; align-items: center; gap: 40px; }
                
                .spec-card { 
                    background: #fff; 
                    width: 210mm; 
                    height: 297mm; 
                    display: flex; 
                    flex-direction: column; 
                    box-shadow: 0 0 20px rgba(0,0,0,0.3);
                    box-sizing: border-box;
                }
                
                .card-header { 
                    background: #28a745; 
                    padding: 30px 45px; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    color: #fff;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .logo { height: 55px; }
                .brand-title { font-weight: 900; letter-spacing: 1.5px; font-size: 24px; text-transform: uppercase; }
                
                .info-section { 
                    padding: 35px 45px; 
                    border-bottom: 2px dashed #eee; 
                }
                
                .header-row { display: flex; gap: 40px; align-items: center; }
                .header-left { flex: 1; display: flex; flex-direction: column; gap: 10px; }
                
                .contact-row { font-size: 11px; line-height: 1.6; color: #444; font-weight: 500; }
                .contact-row b { color: #111; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; margin-right: 8px; font-size: 11.5px; }
                
                .header-right { width: 380px; }
                .label-preview-box img { width: 100%; height: auto; border: 1px solid #eee; }
                
                .image-section { 
                    flex-grow: 1; 
                    padding: 40px; 
                    background: #fff; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    overflow: hidden;
                }
                
                .image-section img { 
                    max-width: 100%; 
                    max-height: 100%; 
                    object-fit: contain; 
                }

                @media print {
                    @page { size: A4; margin: 0; }
                    body { background: #fff; }
                    .page-container { padding: 0; display: block; background: #fff; }
                    .spec-card { box-shadow: none; width: 210mm; height: 100vh; page-break-after: always; }
                    .spec-card:last-child { page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            <div class="spec-card">
                <div class="card-header">
                    <img class="logo" src="assets/images/green-logo.png">
                    <div class="brand-title">Green International</div>
                </div>
                <div class="info-section">
                    <div class="header-row">
                        <div class="header-left">
                            <div class="contact-row"><b>India Office:</b> 326, 3rd Floor, Tower B, Spazedge, Sohna Road, Sector 47, Gurugram, India 122018</div>
                            <div class="contact-row"><b>China Office:</b> Hutang Jiangcun, Gesi Industrial Zone, Wujin, Changzhou, China-213100</div>
                            <div class="contact-row"><b>Contact:</b> +91 9810639056 | +91 0124-4799566 | sales@greeninternationalindia.com</div>
                        </div>
                        <div class="header-right">
                             <div class="label-preview-box"><img src="${labelImageUrl}"></div>
                        </div>
                    </div>
                </div>
                <div class="image-section"><img src="${imgUrl}" crossorigin="anonymous"></div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

async function generateBatchStockPDF() {
    if (selectedStockIds.length === 0) return;
    showLoading(true);
    const loadingOverlay = document.getElementById('loading-overlay');
    const originalLoadingContent = loadingOverlay ? loadingOverlay.innerHTML : '';

    try {
        const selectedItems = await getSelectedItemsFullData();
        for (let i = 0; i < selectedItems.length; i++) {
            const item = selectedItems[i];
            if (loadingOverlay) {
                loadingOverlay.innerHTML = `
                    <div class="text-center">
                        <div class="spinner-border text-success mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
                        <div class="text-white h5 fw-bold mb-1">Generating Batch Report</div>
                        <div class="text-white-50 mb-3">Rendering article ${i + 1} of ${selectedItems.length}</div>
                        <div class="badge bg-light text-dark px-3 py-2" style="border-radius: 8px;">${item.article_no}</div>
                    </div>
                `;
            }
            try {
                if (item.image_url && !item.resolved_url) {
                    item.resolved_url = await getCachedSignedUrl(item.image_url);
                }

                const zpl = fillZPLTemplate(item);
                const resp = await fetch(`https://api.labelary.com/v1/printers/8dpmm/labels/4x2/0/${encodeURIComponent(zpl)}`);
                if (resp.ok) {
                    const blob = await resp.blob();
                    item.temp_rendered_label = await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                }
            } catch (err) { console.error(err); }
            await new Promise(r => setTimeout(r, 150));
        }

        const baseUrl = window.location.href.split('#')[0].split('?')[0].substring(0, window.location.href.lastIndexOf('/') + 1);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <base href="${baseUrl}">
                <title>Green Batch Spec Report</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                    
                    /* Universal Styles */
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #525659; }
                    .page-container { background: #525659; padding: 40px 0; display: flex; flex-direction: column; align-items: center; gap: 40px; }
                    
                    .spec-card { 
                        background: #fff; 
                        width: 210mm; 
                        height: 297mm; 
                        display: flex; 
                        flex-direction: column; 
                        box-shadow: 0 0 20px rgba(0,0,0,0.3);
                        box-sizing: border-box;
                    }
                    
                    .card-header { 
                        background: #28a745; 
                        padding: 30px 45px; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center; 
                        color: #fff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .logo { height: 55px; }
                    .brand-title { font-weight: 900; letter-spacing: 1.5px; font-size: 24px; text-transform: uppercase; }
                    
                    .info-section { 
                        padding: 35px 45px; 
                        border-bottom: 2px dashed #eee; 
                    }
                    
                    .header-row { display: flex; gap: 40px; align-items: center; }
                    .header-left { flex: 1; display: flex; flex-direction: column; gap: 10px; }
                    
                    .contact-row { font-size: 11px; line-height: 1.6; color: #444; font-weight: 500; }
                    .contact-row b { color: #111; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; margin-right: 8px; font-size: 11.5px; }
                    
                    .header-right { width: 380px; }
                    .label-preview-box img { width: 100%; height: auto; border: 1px solid #eee; }
                    
                    .image-section { 
                        flex-grow: 1; 
                        padding: 40px; 
                        background: #fff; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        overflow: hidden;
                    }
                    
                    .image-section img { 
                        max-width: 100%; 
                        max-height: 100%; 
                        object-fit: contain; 
                    }

                    @media print {
                        @page { size: A4; margin: 0; }
                        body { background: #fff; }
                        .page-container { padding: 0; display: block; background: #fff; }
                        .spec-card { box-shadow: none; width: 210mm; height: 100vh; page-break-after: always; }
                        .spec-card:last-child { page-break-after: auto; }
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                ${selectedItems.map(item => `
                        <div class="spec-card">
                            <div class="card-header">
                                <img src="assets/images/green-logo.png" class="logo">
                                <div class="brand-title">Green International</div>
                            </div>
                            <div class="info-section">
                                <div class="header-row">
                                    <div class="header-left">
                                        <div class="contact-row"><b>India Office:</b> 326, 3rd Floor, Tower B, Spazedge, Sohna Road, Sector 47, Gurugram, India 122018</div>
                                        <div class="contact-row"><b>China Office:</b> Hutang Jiangcun, Gesi Industrial Zone, Wujin, Changzhou, China-213100</div>
                                        <div class="contact-row"><b>Contact:</b> +91 9810639056 | +91 0124-4799566 | sales@greeninternationalindia.com</div>
                                    </div>
                                    <div class="header-right"><img src="${item.temp_rendered_label || ''}" style="width:100%"></div>
                                </div>
                            </div>
                            <div class="image-section"><img src="${item.resolved_url || placeholderImg}" crossorigin="anonymous"></div>
                        </div>
                    </div>
                `).join('')}
            </body>
            </html>
        `);
        printWindow.document.close();
        clearStockSelection();
    } catch (err) { alert(err.message); }
    finally { if (loadingOverlay) loadingOverlay.innerHTML = originalLoadingContent; showLoading(false); }
}
