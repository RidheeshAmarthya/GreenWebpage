// Gemini OCR Module
// Handles interaction with Google Generative AI for label scanning

// How hard to try before giving up on a model and moving to the next one
const GEMINI_ATTEMPTS_PER_MODEL = 3;
const GEMINI_RETRY_DELAYS_MS = [1500, 3500];
// Longest wait Google can ask for that is still worth sitting through; longer waits skip to the next model
const GEMINI_MAX_WAIT_MS = 10000;

class GeminiOCR {
    /**
     * Sends a base64 image to Gemini for structured OCR extraction.
     * Busy or rate-limited requests are retried, then the default and backup models are tried in turn.
     * @param {string} base64Image - Complete base64 data URL
     * @param {Object} [options]
     * @param {function(string): void} [options.onStatus] - Receives a short progress message while retrying
     */
    async scanImage(base64Image, { onStatus } = {}) {
        const apiKey = AdminSettings.get('gemini_api_key');

        if (!apiKey) {
            alert("Please enter your Gemini API Key in the Settings menu (gear icon) to use the AI Scan feature.");
            throw new Error("Missing Gemini API Key");
        }

        // Clean base64 data (Gemini expects pure data, not data URL prefix)
        const base64Data = base64Image.split(',')[1] || base64Image;

        // Saved choice first, then the default, then the backup (duplicates removed)
        const savedModel = AdminSettings.get('gemini_model_name');
        const models = [...new Set([
            savedModel,
            AdminSettings.defaults.gemini_model_name,
            AdminSettings.gemini_backup_model
        ].filter(Boolean))];

        const promptText = `
            You are a specialized OCR agent for Green International textile warehouse.
            Carefully analyze this fabric label image and extract all visible technical details.
            
            EXTRACT THE FOLLOWING FIELDS INTO A JSON OBJECT:
            - article_no (Primary identifier, e.g., GR-9921)
            - content (Fabric composition, e.g., 100% Polyester)
            - count (Yarn specification, e.g., 75D/72F)
            - density (Thread count, e.g., 133*72)
            - width (Fabric width, e.g., 58/60")
            - weight (Fabric weight in GSM)
            - item (Basic fabric name, e.g., Chiffon)
            - finish (Treatments like PD, W/R, Peach)
            - remark (Any extra comments or labels)

            STRICT INSTRUCTIONS:
            1. Return ONLY pure JSON. No markdown blocks, no preamble, no explanations.
            2. If a field is not visible, use an empty string "".
            3. Prioritize Accuracy. If an 'Article No' is partially visible, try to infer it based on context.

            ADDITIONAL INDUSTRIAL RULES:
            1. GIE QUALITY TABLE:
               GIE001: 100% COTTON AND COTTON SPANDEX
               GIE002: COTTON POLY, POLY COTTON, COTTON POLY SPANDEX
               GIE003: COTTON NYLON AND ALL NYLON BLENDS
               GIE004: 100% POLYESTER AND POLYESTER SPANDEX
               GIE005: VELVETTE
               GIE006: LINEN AND LINEN BLENDS
               GIE007: RAYON AND RAYON BLENDS, VISCOSE, BAMBOO
               GIE008: POLY RAYON AND POLY RAYON SPANDEX
               GIE009: SILK AND SILK BLENDS
               GIE010: COTTON RAYON AND COTTON MODAL
               GIE011: TENCEL AND TENCEL BLENDS
               GIE012: KNITTS
               GIE013: DENIMS
               GIE014: CORDUROY
               GIE015: COATED FABRICS
               GIE016: MULTI BLENDS
               GIE017: BOUCKLE AND BONDED FABRICS
               GIE018: WOOL BLENDS
               GIE019: MOLESKEIN
               GIE020: BURN OUT FABRICS
               GIE021: LACE AND EMBROIDERY
               SPECIAL OVERRIDE: If the scanned label mentions "JACQUARD", always use GIE016.

            2. ARTICLE NUMBER FORMATTING:
               - First, determine the GIE code from the table above based on composition.
               - Second, extract the label's article number (standardize 'WS NO:123' to 'WS-123').
               - Third, combine them into: [GIE-CODE]-[ARTICLE-NUMBER]. 
               - Example: A 100% Cotton label with 'WS NO:2014' becomes 'GIE001-WS-2014'.

            3. TRANSLATION: If any text is in Chinese, translate to English (e.g., 涤纶 -> Polyester, 棉 -> Cotton).

            4. WEIGHT: If weight is 0, return an empty string "". Never return 0.
        `;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                // Ask for bare JSON so the reply doesn't come wrapped in markdown or commentary
                responseMimeType: "application/json"
            }
        };

        const failures = [];
        try {
            for (let m = 0; m < models.length; m++) {
                const model = models[m];
                if (m > 0) onStatus?.('TRYING BACKUP MODEL...');

                for (let attempt = 1; attempt <= GEMINI_ATTEMPTS_PER_MODEL; attempt++) {
                    const res = await this.callGemini(model, apiKey, payload);
                    if (res.ok) {
                        if (m > 0) console.info(`Label scanned with fallback model ${model}`);
                        return this.parseLabelData(res.body);
                    }

                    const kind = this.classifyFailure(res);
                    failures.push({ model, kind, res });
                    console.warn(`Gemini ${model} attempt ${attempt} failed (${res.status || 'network'}, ${kind}):`, res.message);

                    // Bad or missing API key: no other model will do better
                    if (kind === 'key') throw new Error(`AI Error: ${res.message}`);

                    if (kind === 'model_missing') {
                        // A saved model that Google has retired: forget it so this browser goes back to the default
                        if (model === savedModel && model !== AdminSettings.defaults.gemini_model_name) {
                            AdminSettings.remove('gemini_model_name');
                        }
                        break;
                    }

                    // Today's free quota for this model is gone, or this model can't handle the request
                    if (kind === 'daily_limit' || kind === 'rejected') break;

                    // Busy, per-minute limit or network hiccup: wait and retry the same model
                    if (attempt === GEMINI_ATTEMPTS_PER_MODEL) break;
                    const waitMs = res.retryAfterMs ?? GEMINI_RETRY_DELAYS_MS[attempt - 1];
                    if (waitMs > GEMINI_MAX_WAIT_MS) break;
                    onStatus?.('GEMINI BUSY, RETRYING...');
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                }
            }

            throw new Error(this.describeFailures(failures));

        } catch (err) {
            console.error("Gemini OCR Request Failed:", err);
            throw err;
        }
    }

    /**
     * One generateContent request. Never throws; returns the HTTP status and parsed body.
     */
    async callGemini(model, apiKey, payload) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (networkErr) {
            return { ok: false, status: 0, message: networkErr.message, body: null };
        }

        const body = await response.json().catch(() => null);
        if (response.ok) return { ok: true, status: response.status, body };

        const error = body?.error || {};
        const details = Array.isArray(error.details) ? error.details : [];
        const retryInfo = details.find(d => String(d['@type'] || '').endsWith('RetryInfo'));
        const retrySeconds = parseFloat(retryInfo?.retryDelay);

        return {
            ok: false,
            status: response.status,
            message: error.message || `Error ${response.status}`,
            details,
            retryAfterMs: Number.isFinite(retrySeconds) ? retrySeconds * 1000 : undefined,
            body
        };
    }

    /**
     * Sorts a failed request into what the scanner should do next.
     * @returns {'key'|'model_missing'|'daily_limit'|'rate_limit'|'busy'|'network'|'rejected'}
     */
    classifyFailure(res) {
        const message = res.message || '';
        const detailText = JSON.stringify(res.details || []);

        if (res.status === 0) return 'network';
        if (res.status === 404) return 'model_missing';
        if (res.status === 429) {
            // Free-tier daily quotas carry a quota id like "GenerateRequestsPerDayPerProjectPerModel-FreeTier"
            return /PerDay/i.test(detailText) ? 'daily_limit' : 'rate_limit';
        }
        if (res.status >= 500) return 'busy';
        if (res.status === 401 || res.status === 403 || /API[_ ]KEY/i.test(message + detailText)) return 'key';
        return 'rejected';
    }

    /**
     * Turns the failures from every model into one message for the person scanning.
     */
    describeFailures(failures) {
        const kinds = new Set(failures.map(f => f.kind));
        const last = failures[failures.length - 1];

        if (kinds.has('busy')) {
            return "Gemini is overloaded right now (a problem on Google's side). Please try again in a minute.";
        }
        if (kinds.has('rate_limit')) {
            return "Too many scans in the last minute for the free Gemini key. Please wait a minute and try again.";
        }
        if (kinds.has('network')) {
            return "Couldn't reach Gemini. Check the internet connection and try again.";
        }
        if (kinds.has('daily_limit')) {
            return "The free Gemini key has used up today's scans. The limit resets at midnight US Pacific time.";
        }
        if (kinds.has('rejected')) {
            const rejected = failures.find(f => f.kind === 'rejected');
            return `AI Error: ${rejected.res.message}`;
        }
        if (kinds.has('model_missing')) {
            return "No Gemini model could be reached. Clear the Gemini Model Name in Settings to use the default.";
        }
        return `AI Error: ${last?.res?.message || 'Unknown error'}`;
    }

    /**
     * Pulls the label JSON out of a successful generateContent response.
     */
    parseLabelData(result) {
        const parts = result?.candidates?.[0]?.content?.parts || [];
        // Skip thought parts; join the text parts that carry the answer
        const textResponse = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');

        // Robust cleaning of the text response to find raw JSON
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Gemini raw response:", result);
            throw new Error("AI failed to return structured data. Please try a clearer photo.");
        }

        const parsedData = JSON.parse(jsonMatch[0]);
        console.log("Successfully extracted label data:", parsedData);
        return parsedData;
    }

    /**
     * Map extracted data to the Stock Manager form fields
     * @param {Object} data - The JSON object from scanImage
     */
    fillForm(data) {
        const form = document.getElementById('stock-item-form');
        if (!form) return;

        // Iterate through common fields and fill if present
        const fields = ['article_no', 'content', 'count', 'density', 'width', 'weight', 'item', 'finish', 'remark'];

        fields.forEach(field => {
            if (data[field] !== undefined) {
                const input = form.querySelector(`[name="${field}"]`);
                if (input) {
                    let value = data[field];

                    // Sanitize numeric fields (like weight/GSM)
                    if (field === 'weight' && value) {
                        // Extract just the numbers (e.g., "120 GSM" -> "120")
                        const match = String(value).match(/\d+(\.\d+)?/);
                        value = match ? match[0] : "";
                        // Final safety check for 0
                        if (value === "0" || value === 0) value = "";
                    }

                    input.value = value;
                    // Trigger input event to sync with previews (barcode, printing)
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });

        // Visual feedback
        this.showToast('AI Scan Complete! Quality Mapped.', 'success');
    }

    /**
     * Display a temporary toast notification in the bottom right corner
     * @param {string} message - Text to display
     * @param {string} type - 'success', 'danger', 'info', etc. (Bootstrap classes)
     */
    showToast(message, type = 'success') {
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
        const toast = document.createElement('div');
        toast.className = `position-fixed bottom-0 end-0 m-3 p-3 bg-dark text-white rounded-3 shadow-lg border-start border-4 border-${type}`;
        toast.style.zIndex = '9999';
        toast.style.minWidth = '300px';
        toast.innerHTML = `<i class="fas ${icon} text-${type} me-2"></i>${message}`;
        document.body.appendChild(toast);

        // Add entry animation
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.transform = 'translateY(20px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }
}

// Global initialization
const geminiOCR = new GeminiOCR();
