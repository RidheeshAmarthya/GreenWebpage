// Stock Manager Printing & PDF Functions

async function printStockLabel(id, btn = null) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;

    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>PRINTING...`;
    }

    try {
        await printStockLabelFromData(item);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
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
    LocalZplRenderer.renderZplToObjectUrl(zpl, {
        dpi: '8dpmm',
        widthInches: 4,
        heightInches: 2,
        index: 0
    }).then(fileURL => {
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
    let labelImageUrl = '';
    try {
        labelImageUrl = await LocalZplRenderer.renderZplToDataUrl(zpl, {
            dpi: '8dpmm',
            widthInches: 4,
            heightInches: 2,
            index: 0
        });
    } catch (err) {
        console.error('Failed to render label for PDF:', err);
    }
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
                
                .top-info {
                    background: #28a745;
                    padding: 16px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: stretch;
                    gap: 18px;
                    color: #fff;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .brand-block { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; padding: 4px 0; }
                .brand-middle { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 3px; }
                .logo-wrap {
                    background: #1f7b34;
                    border-radius: 10px;
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    border: 1px solid rgba(255, 255, 255, 0.35);
                }
                .logo { height: 42px; display: block; }
                .brand-title { font-weight: 900; letter-spacing: 1px; font-size: 36px; text-transform: uppercase; line-height: 0.98; }
                .article-no { font-size: 12px; font-weight: 700; letter-spacing: 0.4px; color: rgba(255, 255, 255, 0.95); line-height: 1.1; }
                .brand-site { font-size: 11.5px; font-weight: 700; letter-spacing: 0.45px; color: rgba(255, 255, 255, 0.95); line-height: 1.1; text-transform: lowercase; }
                .label-preview-box {
                    width: 330px;
                    max-width: 44%;
                    flex-shrink: 0;
                    background: #fff;
                    border-radius: 8px;
                    padding: 4px;
                }
                .label-preview-box img { width: 100%; height: auto; display: block; border-radius: 6px; }
                
                .image-section { 
                    flex: 1; 
                    min-height: 0;
                    padding: 16px 24px 24px; 
                    background: #fff; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    overflow: hidden;
                }
                
                .image-section img { 
                    width: 100%;
                    height: 100%;
                    object-fit: contain; 
                }

                .address-footer {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 14px;
                    padding: 12px 24px 16px;
                    border-top: 1px solid #e7e7e7;
                    background: #f8fbf8;
                }
                .footer-col-title {
                    font-size: 10px;
                    font-weight: 800;
                    color: #1f7b34;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .footer-col-text {
                    font-size: 9.2px;
                    line-height: 1.35;
                    color: #333;
                    font-weight: 500;
                }
                .footer-left { text-align: left; }
                .footer-center { text-align: center; }
                .footer-right { text-align: right; }

                @media print {
                    @page { size: A4; margin: 0; }
                    body { background: #fff; }
                    .page-container { padding: 0; display: block; background: #fff; }
                    .spec-card { box-shadow: none; width: 210mm; height: 297mm; page-break-after: always; }
                    .spec-card:last-child { page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            <div class="spec-card">
                <div class="top-info">
                    <div class="brand-block">
                        <div class="logo-wrap"><img class="logo" src="assets/images/green-logo.png"></div>
                        <div class="brand-middle">
                            <div class="brand-title">Quality Sample</div>
                            <div class="article-no">${item.article_no || 'N/A'}</div>
                        </div>
                        <div class="brand-site">greeninternationalindia.com</div>
                    </div>
                    <div class="label-preview-box"><img src="${labelImageUrl}"></div>
                </div>
                <div class="image-section"><img src="${imgUrl}" crossorigin="anonymous"></div>
                <div class="address-footer">
                    <div class="footer-left">
                        <div class="footer-col-title">India Office</div>
                        <div class="footer-col-text">326, 3rd Floor, Tower B, Spazedge, Sohna Road, Sector 47, Gurugram, India 122018</div>
                    </div>
                    <div class="footer-center">
                        <div class="footer-col-title">Contact</div>
                        <div class="footer-col-text">+91 9810639056 | +91 0124-4799566<br>sales@greeninternationalindia.com</div>
                    </div>
                    <div class="footer-right">
                        <div class="footer-col-title">China Office</div>
                        <div class="footer-col-text">Hutang Jiangcun, Gesi Industrial Zone, Wujin, Changzhou, China 213100</div>
                    </div>
                </div>
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
                item.temp_rendered_label = await LocalZplRenderer.renderZplToDataUrl(zpl, {
                    dpi: '8dpmm',
                    widthInches: 4,
                    heightInches: 2,
                    index: 0
                });
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
                    
                    .top-info {
                        background: #28a745;
                        padding: 16px 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: stretch;
                        gap: 18px;
                        color: #fff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .brand-block { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; padding: 4px 0; }
                    .brand-middle { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 3px; }
                    .logo-wrap {
                        background: #1f7b34;
                        border-radius: 10px;
                        padding: 8px 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        border: 1px solid rgba(255, 255, 255, 0.35);
                    }
                    .logo { height: 42px; display: block; }
                    .brand-title { font-weight: 900; letter-spacing: 1px; font-size: 36px; text-transform: uppercase; line-height: 0.98; }
                    .article-no { font-size: 12px; font-weight: 700; letter-spacing: 0.4px; color: rgba(255, 255, 255, 0.95); line-height: 1.1; }
                    .brand-site { font-size: 11.5px; font-weight: 700; letter-spacing: 0.45px; color: rgba(255, 255, 255, 0.95); line-height: 1.1; text-transform: lowercase; }
                    .label-preview-box {
                        width: 330px;
                        max-width: 44%;
                        flex-shrink: 0;
                        background: #fff;
                        border-radius: 8px;
                        padding: 4px;
                    }
                    .label-preview-box img { width: 100%; height: auto; display: block; border-radius: 6px; }
                    
                    .image-section { 
                        flex: 1; 
                        min-height: 0;
                        padding: 16px 24px 24px; 
                        background: #fff; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        overflow: hidden;
                    }
                    
                    .image-section img { 
                        width: 100%;
                        height: 100%;
                        object-fit: contain; 
                    }

                    .address-footer {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 14px;
                        padding: 12px 24px 16px;
                        border-top: 1px solid #e7e7e7;
                        background: #f8fbf8;
                    }
                    .footer-col-title {
                        font-size: 10px;
                        font-weight: 800;
                        color: #1f7b34;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 4px;
                    }
                    .footer-col-text {
                        font-size: 9.2px;
                        line-height: 1.35;
                        color: #333;
                        font-weight: 500;
                    }
                    .footer-left { text-align: left; }
                    .footer-center { text-align: center; }
                    .footer-right { text-align: right; }

                    @media print {
                        @page { size: A4; margin: 0; }
                        body { background: #fff; }
                        .page-container { padding: 0; display: block; background: #fff; }
                        .spec-card { box-shadow: none; width: 210mm; height: 297mm; page-break-after: always; }
                        .spec-card:last-child { page-break-after: auto; }
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                ${selectedItems.map(item => `
                        <div class="spec-card">
                            <div class="top-info">
                                <div class="brand-block">
                                    <div class="logo-wrap"><img src="assets/images/green-logo.png" class="logo"></div>
                                    <div class="brand-middle">
                                        <div class="brand-title">Quality Sample</div>
                                        <div class="article-no">${item.article_no || 'N/A'}</div>
                                    </div>
                                    <div class="brand-site">greeninternationalindia.com</div>
                                </div>
                                <div class="label-preview-box"><img src="${item.temp_rendered_label || ''}"></div>
                            </div>
                            <div class="image-section"><img src="${item.resolved_url || placeholderImg}" crossorigin="anonymous"></div>
                            <div class="address-footer">
                                <div class="footer-left">
                                    <div class="footer-col-title">India Office</div>
                                    <div class="footer-col-text">326, 3rd Floor, Tower B, Spazedge, Sohna Road, Sector 47, Gurugram, India 122018</div>
                                </div>
                                <div class="footer-center">
                                    <div class="footer-col-title">Contact</div>
                                    <div class="footer-col-text">+91 9810639056 | +91 0124-4799566<br>sales@greeninternationalindia.com</div>
                                </div>
                                <div class="footer-right">
                                    <div class="footer-col-title">China Office</div>
                                    <div class="footer-col-text">Hutang Jiangcun, Gesi Industrial Zone, Wujin, Changzhou, China 213100</div>
                                </div>
                            </div>
                        </div>
                `).join('')}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        clearStockSelection();
    } catch (err) { alert(err.message); }
    finally { if (loadingOverlay) loadingOverlay.innerHTML = originalLoadingContent; showLoading(false); }
}
