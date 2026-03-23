// Standalone Label Printer Logic
// Handles manual label generation for the Zebra ZD230 printer without database interaction

(function () {
    const ZPL_TEMPLATE = `^XA
~TA000
~JSN
^LT0
^MNW
^MTT
^PON
^PMN
^LH0,0
^JMA
^PR6,6
~SD15
^JUS
^LRN
^CI27
^PA0,1,1,0
^MMT
^PW831
^LL406
^LS0

^FT30,62^A0N,50,50^FH\\^CI28^FDGREEN INTERNATIONAL^FS^CI27

^FT30,103^A0N,28,28^FH\\^CI28^FDArticle No ^FS^CI27
^FT30,138^A0N,28,28^FH\\^CI28^FDContent^FS^CI27
^FT30,173^A0N,28,28^FH\\^CI28^FDCount:^FS^CI27
^FT30,208^A0N,28,28^FH\\^CI28^FDDensity^FS^CI27
^FT30,243^A0N,28,28^FH\\^CI28^FDWidth^FS^CI27
^FT30,278^A0N,28,28^FH\\^CI28^FDWeight^FS^CI27
^FT30,313^A0N,28,28^FH\\^CI28^FDItem^FS^CI27
^FT30,348^A0N,28,28^FH\\^CI28^FDFinish^FS^CI27
^FT30,383^A0N,28,28^FH\\^CI28^FDRemark^FS^CI27

^FT145,103^A0N,28,28^FH\\^CI28^FD: {article_no}^FS^CI27
^FT145,138^A0N,28,28^FH\\^CI28^FD: {content}^FS^CI27
^FT145,173^A0N,28,28^FH\\^CI28^FD: {count}^FS^CI27
^FT145,208^A0N,28,28^FH\\^CI28^FD: {density}^FS^CI27
^FT145,243^A0N,28,28^FH\\^CI28^FD: {width}^FS^CI27
^FT145,278^A0N,28,28^FH\\^CI28^FD: {weight} GSM^FS^CI27
^FT145,313^A0N,28,28^FH\\^CI28^FD: {item}^FS^CI27
^FT145,348^A0N,28,28^FH\\^CI28^FD: {finish}^FS^CI27
^FT145,383^A0N,28,28^FH\\^CI28^FD: {remark}^FS^CI27

^FO565,20^BCN,60,Y,N,N^FD{barcode}^FS

^FO570,310^GFA,1041,2001,29,:Z64:eJztlL9v00AUx7+2mziKqjoDEtkSKRKKWEglhgih2v0POpAZ9z/I0hVfG4QihDozVkyRB2bEAI76LyBYqGToErHUGx7cHO/d2c4F2Fg52e9+vPfxu/fenYH71GwWAI+HaPNCHMc0tyJqjoxkRBOSBZ5G8pkrpQwAj7r1jIRM4ZDMbV7g1Rzo8dhiZQa2z1kUSgA+KxkhSx7nXkWu2Q3ZKLJQX8l6FSkBWX92rQxzxgsmpdCMocz8mkwc+ca2Adu2HQk19n+Q8L7btkwd2lPZIkuqjoWbURymUp6uBXcsvJRfNzdIZSgr0stKJcUEf1ZUQ01mbEIJ5mXfUoZFRbqZZ5L5Npn/QVommXGOSlLVRgkmXSYpL8o8UnlaKqVJirUQQipSbJM0sW4nk4nckMmWT1lXdZtke6M2lkmunMq82JCJEWdUksWfcXKVtM/tDLkmKf+eW+1I/laVmqRlS55u19PNlJ9ImdNJgHkS3Nwp6jPgL/UZEhtSzudzyi0rE7miScRCx2nJ26srXZVeEtH4a49EoUkVoa6nl/rViV9rn+qUa9JL+Jrk+q5o8qNKqCZ7m1umyZ5B8g3JGgbpGT7rm12UpBVtSN5Axt+qSLzkH8eClG2B9jxeoBXHi/YF3bwF/rd/bUKgBX54xNJUTgJ0wI814WnjiaGz6KSOwY+jz+zaVEJh1Bwld82vOkJh1GwlW+Vbko1gn/odNNGgvkvvnQ3pZQ/Sm5Ev6D+b3ogu0lFkj1F56kzDo1FAZCc8If9BeOgelcq3GK/StJ+KvcVwtMJBnn47PS+DdQt0gmlynNAoHCXo5cHSel76tPv2u7QvBgJ7/XAk8KgfzgbnpbKJu1Pa7iHvN9gXGOHY+blTKvcwHicDcS0o/GQsMMTgRfyqVO6APB0yuYvgWGCKQbNO0x7CvrjGNdcmJc993GvWKSJPoVBkFwHJEA9dlSad6DS9nInLM87NpcDq4rFz9rpWniy/OEg+U25OqERR1rU+VWSLIvtgQ7ynfR5QYeKLIfIha34Baf92ow==:97FE

^FO630,170^GFA,497,1968,16,:Z64:eJyl1DGOxCAMBVCPKChzg8xFULgWBRLTpdwrIVHkGqzmEhQIr202k612QoYmegUK+BsjYtExYDRgERvgBQdyqou4ADgHoFJcFoD5vbE4p2ugvYttL3tjPzId6Lo1bhjtJ0asu+m+4EM15rj/f+Z6uu5XfZ33/qp5UT6pwrFGLHnp6FV6thvmYSOuJWyc75OOJn5ocVbtfsbUb9j3s6fC9a2qgpLLjZoCWovUxz7zJUPgeI3KNlNeo57ouaCsZtu9sbnip807H/4wHU9cjbTbuCdc1436FxbV5nnY+PVwYaO8I3D7jpvatfeH1ASwFKD81XnTZ0P866LpfKrRg5qH3e9XA71naZhhU74rNVtKdBrJZ9zU7kzc36+DkKJZwGZ4630e93kEx7xW18zvmeZZonkG9ruNm+dh1dFwYtfdy/Fr8DrRD/Itz2fNA1nq2Q00YJXMo2FLuSsYRfNtn+8DlvlMeaWUYa/3iH8A/30lLg==:2C57

^XZ`;

    function fillStandaloneTemplate(data) {
        let zpl = ZPL_TEMPLATE;

        // If barcode is empty, remove the barcode commands entirely from ZPL
        if (!data.barcode || data.barcode.trim() === "") {
            // Remove the scannable barcode horizontal bars command
            zpl = zpl.replace(/\^FO565,20\^BCN,60,Y,N,N\^FD{barcode}\^FS/g, "");
        }

        zpl = zpl.replace(/{article_no}/g, data.article_no || '');
        zpl = zpl.replace(/{content}/g, data.content || '');
        zpl = zpl.replace(/{count}/g, data.count || '');
        zpl = zpl.replace(/{density}/g, data.density || '');
        zpl = zpl.replace(/{width}/g, data.width || '');
        zpl = zpl.replace(/{weight}/g, data.weight || '');
        zpl = zpl.replace(/{item}/g, data.item || '');
        zpl = zpl.replace(/{finish}/g, data.finish || '');
        zpl = zpl.replace(/{remark}/g, data.remark || '');
        zpl = zpl.replace(/{barcode}/g, data.barcode || '');
        return zpl;
    }

    // Live Preview Logic
    async function updateManualLabelPreview() {
        const form = document.getElementById('label-printer-form');
        const container = document.getElementById('manual-label-preview-container');
        const img = document.getElementById('manual-label-preview-img');
        const placeholder = document.getElementById('manual-label-preview-placeholder');
        const spinner = document.getElementById('manual-label-preview-spinner');

        if (!form || !img) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const zpl = fillStandaloneTemplate(data);

        placeholder.style.display = 'none';
        spinner.style.display = 'block';
        img.style.display = 'none';

        try {
            const labelaryUrl = `https://api.labelary.com/v1/printers/8dpmm/labels/4x2/0/${encodeURIComponent(zpl)}`;
            const response = await fetch(labelaryUrl);

            if (response.ok) {
                const blob = await response.blob();
                img.src = URL.createObjectURL(blob);
                img.onload = () => {
                    spinner.style.display = 'none';
                    img.style.display = 'block';
                };
            } else {
                throw new Error("Labelary Error: " + response.status);
            }
        } catch (err) {
            console.error("Preview failed", err);
            spinner.style.display = 'none';
            placeholder.style.display = 'block';
            placeholder.innerHTML = '<div class="text-danger small">Preview Error</div>';
        }
    }

    // Expose to global for the 'REFRESH' button in HTML
    window.updateManualLabelPreview = updateManualLabelPreview;

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('label-printer-form');
        const printerModal = document.getElementById('labelPrinterModal');
        if (!form) return;

        // Auto-refresh preview on field changes
        form.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('change', () => updateManualLabelPreview());
        });

        // Load empty preview immediately when modal opens
        if (printerModal) {
            printerModal.addEventListener('shown.bs.modal', () => {
                updateManualLabelPreview();
            });

            // Auto-clear form when modal is closed
            printerModal.addEventListener('hidden.bs.modal', () => {
                form.reset();
                updateManualLabelPreview();
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Re-generate final ZPL
            const zpl = fillStandaloneTemplate(data);

            try {
                const btn = form.querySelector('button[type="submit"]');
                const originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>PRINTING...';

                await sendToZebraPrinter(zpl);

                btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="me-2"><polyline points="20 6 9 17 4 12"/></svg> DONE';
                btn.className = "btn btn-success w-100 py-3 fw-bold";

                // Reset form after successful print
                setTimeout(() => {
                    form.reset();
                    updateManualLabelPreview();

                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                    btn.className = "btn btn-dark w-100 py-3 fw-bold";
                }, 2000);
            } catch (err) {
                alert("Printer Error: " + err.message);
                console.error(err);

                const btn = form.querySelector('button[type="submit"]');
                btn.disabled = false;
                btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="me-2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> PRINT STANDALONE LABEL';
            }
        });
    });

    // Helper to interface with Zebra Browser Print
    async function sendToZebraPrinter(zpl) {
        return new Promise((resolve, reject) => {
            if (typeof BrowserPrint === 'undefined') {
                return reject(new Error("Zebra Browser Print driver library not found. Please ensure the JS files are correctly included in the page."));
            }

            BrowserPrint.getDefaultDevice("printer", (device) => {
                if (!device) {
                    return reject(new Error("No Zebra printer found. Please ensure the Zebra Browser Print desktop application is running and the printer is connected."));
                }

                device.send(zpl, (success) => {
                    resolve(success);
                }, (error) => {
                    reject(new Error("Printing failed: " + error));
                });
            }, (error) => {
                reject(new Error("Could not get default device: " + error + ". Please check if Zebra Browser Print is running."));
            });
        });
    }
})();
