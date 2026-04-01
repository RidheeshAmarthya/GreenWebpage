// Gemini OCR Module
// Handles interaction with Google Generative AI for label scanning

class GeminiOCR {
    constructor() {
        // Model is now dynamic from AdminSettings
    }

    /**
     * Sends a base64 image to Gemini-1.5-Flash for structured OCR extraction.
     * @param {string} base64Image - Complete base64 data URL
     */
    async scanImage(base64Image) {
        const apiKey = AdminSettings.get('gemini_api_key');
        
        if (!apiKey) {
            alert("Please enter your Gemini API Key in the Settings menu (gear icon) to use the AI Scan feature.");
            throw new Error("Missing Gemini API Key");
        }

        // Clean base64 data (Gemini expects pure data, not data URL prefix)
        const base64Data = base64Image.split(',')[1] || base64Image;

        const model = AdminSettings.get('gemini_model_name') || 'gemini-flash-latest';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
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
            }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error("High Demand: Gemini is currently busy. Please wait 10-20 seconds and try again.");
                }
                if (response.status === 503) {
                    throw new Error("Gemini Service Unavailable: The AI model is briefly offline. Please try again in a minute.");
                }
                const errorData = await response.json();
                const msg = errorData.error?.message || `Error ${response.status}: Connection Failed`;
                throw new Error(`AI Error: ${msg}`);
            }

            const result = await response.json();
            const textResponse = result.candidates[0].content.parts[0].text;
            
            // Robust cleaning of the text response to find raw JSON
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error("Gemini raw response:", textResponse);
                throw new Error("AI failed to return structured data. Please try a clearer photo.");
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            console.log("Successfully extracted label data:", parsedData);
            return parsedData;

        } catch (err) {
            console.error("Gemini OCR Request Failed:", err);
            throw err;
        }
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
                    }

                    input.value = value;
                    // Trigger input event to sync with previews (barcode, printing)
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });

        // Visual feedback
        this.showToast('AI Scan Complete! Form populated.', 'success');
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
