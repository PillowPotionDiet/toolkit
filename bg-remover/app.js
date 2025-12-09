// AI Background Removal - Uses Remove.bg API
let apiKey = null;

// ⚠️ SECURITY WARNING: This API key is for DEVELOPMENT/TESTING ONLY
// NEVER commit this to GitHub or deploy publicly with a hardcoded API key!
// For production, implement a backend proxy (see README.md)
const DEFAULT_API_KEY = 'UabbjELnApkxgCYhh5Cwzqgn'; // TODO: Remove before deploying

// State Management
const state = {
    files: [],
    processedImages: [],
    isProcessing: false,
    maxFiles: 50,
    maxResolution: 2048,
    bgType: 'transparent',
    apiKey: localStorage.getItem('removebg_api_key') || DEFAULT_API_KEY
};

// DOM Elements
let uploadBox, fileInput, browseBtn, uploadSection, processingSection, resultsSection;
let progressFill, progressText, resultsGrid, resultCount, downloadAllBtn, resetBtn;
let bgOptions, bgTypeRadios;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    uploadBox = document.getElementById('uploadBox');
    fileInput = document.getElementById('fileInput');
    browseBtn = document.getElementById('browseBtn');
    uploadSection = document.getElementById('uploadSection');
    processingSection = document.getElementById('processingSection');
    resultsSection = document.getElementById('resultsSection');
    progressFill = document.getElementById('progressFill');
    progressText = document.getElementById('progressText');
    resultsGrid = document.getElementById('resultsGrid');
    resultCount = document.getElementById('resultCount');
    downloadAllBtn = document.getElementById('downloadAllBtn');
    resetBtn = document.getElementById('resetBtn');
    bgOptions = document.getElementById('bgOptions');
    bgTypeRadios = document.querySelectorAll('input[name="bgType"]');

    // Check if API key is available
    if (state.apiKey) {
        apiKey = state.apiKey;
        console.log('✅ Remove.bg API key loaded from storage');
        initializeEventListeners();
    } else {
        // Prompt for API key
        showApiKeyPrompt();
    }
});

// Show API Key Prompt
function showApiKeyPrompt() {
    const existing = document.getElementById('apiKeyOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'apiKeyOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    overlay.innerHTML = `
        <div style="background: #1e293b; padding: 40px; border-radius: 16px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">🔑</div>
                <h2 style="margin: 0 0 10px 0; font-size: 24px;">Remove.bg API Key Required</h2>
                <p style="color: #94a3b8; margin: 0; font-size: 14px;">This tool uses the professional Remove.bg API for high-quality background removal</p>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #cbd5e1;">Enter your Remove.bg API Key:</label>
                <input type="text" id="apiKeyInput" placeholder="Enter your API key here..."
                    style="width: 100%; padding: 12px; border: 2px solid #334155; border-radius: 8px; background: #0f172a; color: white; font-size: 14px; box-sizing: border-box;"
                    autocomplete="off">
                <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
                    ℹ️ Your API key is stored locally in your browser only
                </div>
            </div>

            <button id="saveApiKeyBtn"
                style="width: 100%; padding: 14px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 15px;">
                Save & Start Using
            </button>

            <div style="background: #0f172a; padding: 15px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 10px;"><strong>🆓 Get Your Free API Key:</strong></div>
                <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                    1. Visit <a href="https://www.remove.bg/api" target="_blank" style="color: #60a5fa;">remove.bg/api</a><br>
                    2. Sign up for free account<br>
                    3. Get 50 free API calls/month<br>
                    4. Copy your API key and paste above
                </div>
            </div>

            <div style="margin-top: 20px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <div style="font-size: 11px; color: #fca5a5; line-height: 1.5;">
                    ⚠️ <strong>Security Note:</strong> For production use, implement a backend proxy to secure your API key. Never hardcode API keys in frontend code.
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Add event listener for save button
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) {
            state.apiKey = key;
            apiKey = key;
            localStorage.setItem('removebg_api_key', key);
            overlay.remove();
            console.log('✅ API key saved');
            initializeEventListeners();
        } else {
            alert('Please enter a valid API key');
        }
    });

    // Allow Enter key to submit
    document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('saveApiKeyBtn').click();
        }
    });
}

// Event Listeners
function initializeEventListeners() {
    // Browse button click
    browseBtn.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Drag and drop events
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('dragleave', handleDragLeave);
    uploadBox.addEventListener('drop', handleDrop);

    // Background type selection
    bgTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.bgType = e.target.value;
        });
    });

    // Download all button
    downloadAllBtn.addEventListener('click', downloadAllAsZip);

    // Reset button
    resetBtn.addEventListener('click', resetApp);

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());

    console.log('✅ Event listeners initialized');
}

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    handleFiles(files);
}

// File Handling
function handleFiles(files) {
    // Convert FileList to Array
    const fileArray = Array.from(files);

    // Filter valid image files
    const validFiles = fileArray.filter(file => {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        return validTypes.includes(file.type);
    });

    // Check file limit
    if (validFiles.length === 0) {
        alert('Please select valid image files (PNG, JPG, WEBP)');
        return;
    }

    if (validFiles.length > state.maxFiles) {
        alert(`Free plan allows maximum ${state.maxFiles} images per batch. Please upgrade to Premium for unlimited processing.`);
        validFiles.splice(state.maxFiles);
    }

    // Store files and start processing
    state.files = validFiles;
    startProcessing();
}

// Main Processing Function
async function startProcessing() {
    if (state.isProcessing) return;

    // Check if API key is available
    if (!apiKey || !state.apiKey) {
        alert('Please enter your Remove.bg API key first.');
        showApiKeyPrompt();
        return;
    }

    state.isProcessing = true;
    state.processedImages = [];

    // Hide upload section, show processing
    uploadSection.style.display = 'none';
    processingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    bgOptions.style.display = 'flex';

    // Show initial loading message
    progressText.textContent = 'Preparing to process images with Remove.bg API...';
    progressFill.style.width = '0%';

    // Process each file
    for (let i = 0; i < state.files.length; i++) {
        const file = state.files[i];

        // Update progress
        updateProgress(i, state.files.length, `Processing ${file.name}...`);

        try {
            // Process the image with AI
            console.log(`📸 Starting to process: ${file.name}`);
            const processedImage = await processImageWithAI(file);
            state.processedImages.push(processedImage);
            console.log(`✅ Successfully processed: ${file.name}`);
        } catch (error) {
            console.error(`❌ Error processing ${file.name}:`, error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            // Show error but continue with next image
            updateProgress(i, state.files.length, `Error: ${file.name} - ${error.message}`);
            alert(`Failed to process ${file.name}: ${error.message}\n\nCheck console (F12) for details.`);
        }
    }

    // Show results
    showResults();
}

// AI-Powered Image Processing using Remove.bg API
async function processImageWithAI(file) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`Processing ${file.name} with Remove.bg API...`);

            // Update progress
            progressText.textContent = `Uploading ${file.name} to Remove.bg...`;

            // Create FormData
            const formData = new FormData();
            formData.append('image_file', file);
            formData.append('size', 'auto'); // auto, preview, medium, hd, 4k

            // Add background color if white background selected
            if (state.bgType === 'white') {
                formData.append('bg_color', 'ffffff');
            }

            // Make API request
            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': apiKey
                },
                body: formData
            });

            // Check response status
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                if (response.status === 403) {
                    throw new Error('Invalid API key or insufficient credits. Please check your Remove.bg account.');
                } else if (response.status === 402) {
                    throw new Error('Insufficient API credits. Please upgrade your Remove.bg account or wait for monthly reset.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                } else {
                    throw new Error(errorData.errors?.[0]?.title || `API Error: ${response.status}`);
                }
            }

            progressText.textContent = `Processing ${file.name}...`;

            // Get the processed image as blob
            const processedBlob = await response.blob();

            console.log(`✅ Background removed successfully for ${file.name}`);

            // Resize if needed (max 2K for free plan)
            const resizedBlob = await resizeImage(processedBlob, state.maxResolution);

            // Create result object
            const result = {
                name: file.name.replace(/\.[^/.]+$/, '') + '_removed.png',
                blob: resizedBlob,
                url: URL.createObjectURL(resizedBlob),
                originalName: file.name
            };

            // Log remaining API credits
            const creditsHeader = response.headers.get('X-Credits-Charged');
            const remainingHeader = response.headers.get('X-Ratelimit-Remaining');
            if (creditsHeader || remainingHeader) {
                console.log(`📊 API Credits: Charged ${creditsHeader || 'N/A'} | Remaining ${remainingHeader || 'N/A'}`);
            }

            resolve(result);

        } catch (error) {
            console.error('Remove.bg API Error:', error);

            // Check for network errors
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                reject(new Error('Network error. Please check your internet connection.'));
            } else {
                reject(error);
            }
        }
    });
}

// Helper function to load image from file
function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

// Resize Image to Max Resolution
async function resizeImage(blob, maxSize) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let width = img.width;
            let height = img.height;

            // Check if resizing is needed
            if (width <= maxSize && height <= maxSize) {
                resolve(blob);
                return;
            }

            // Calculate new dimensions
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);

            // Create canvas and resize
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Use high-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((resizedBlob) => {
                resolve(resizedBlob);
            }, 'image/png', 1.0);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for resizing'));
        };

        img.src = url;
    });
}

// Apply White Background to Transparent Image
async function applyWhiteBackground(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Fill with pure white (#FFFFFF)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw transparent image on top
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((whiteBlob) => {
                resolve(whiteBlob);
            }, 'image/png', 1.0);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to apply white background'));
        };

        img.src = url;
    });
}

// Update Progress
function updateProgress(current, total, message = null) {
    const percentage = Math.floor(((current + 1) / total) * 100);
    progressFill.style.width = `${percentage}%`;

    if (message) {
        progressText.textContent = message;
    } else {
        progressText.textContent = `Processing: ${current + 1} / ${total} images...`;
    }
}

// Show Results
function showResults() {
    state.isProcessing = false;
    processingSection.style.display = 'none';
    resultsSection.style.display = 'block';

    // Update count
    resultCount.textContent = state.processedImages.length;

    // Clear grid
    resultsGrid.innerHTML = '';

    // Add each result
    state.processedImages.forEach((image, index) => {
        const resultItem = createResultItem(image, index);
        resultsGrid.appendChild(resultItem);
    });
}

// Create Result Item
function createResultItem(image, index) {
    const div = document.createElement('div');
    div.className = 'result-item';

    div.innerHTML = `
        <div class="result-image-container">
            <img src="${image.url}" alt="${image.name}" class="result-image">
        </div>
        <div class="result-actions">
            <span class="result-filename" title="${image.name}">${image.name}</span>
        </div>
        <button class="btn-download" data-index="${index}">
            💾 Download
        </button>
    `;

    // Add download event listener
    const downloadBtn = div.querySelector('.btn-download');
    downloadBtn.addEventListener('click', () => downloadSingle(index));

    return div;
}

// Download Single Image
function downloadSingle(index) {
    const image = state.processedImages[index];
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download All as ZIP
async function downloadAllAsZip() {
    try {
        // Show loading state
        downloadAllBtn.textContent = '⏳ Creating ZIP...';
        downloadAllBtn.disabled = true;

        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            // Fallback: download individually
            alert('Downloading images individually...');
            state.processedImages.forEach((image, index) => {
                setTimeout(() => downloadSingle(index), index * 300);
            });
            downloadAllBtn.textContent = '📦 Download All as ZIP';
            downloadAllBtn.disabled = false;
            return;
        }

        const zip = new JSZip();

        // Add each image to zip
        for (const image of state.processedImages) {
            zip.file(image.name, image.blob);
        }

        // Generate zip file
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });

        // Download zip
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `background-removed-images-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Reset button
        downloadAllBtn.textContent = '📦 Download All as ZIP';
        downloadAllBtn.disabled = false;
    } catch (error) {
        console.error('Error creating ZIP:', error);
        alert('Error creating ZIP file. Try downloading images individually.');
        downloadAllBtn.textContent = '📦 Download All as ZIP';
        downloadAllBtn.disabled = false;
    }
}

// Reset Application
function resetApp() {
    // Clear state
    state.files = [];
    state.processedImages.forEach(img => URL.revokeObjectURL(img.url));
    state.processedImages = [];
    state.isProcessing = false;

    // Reset UI
    fileInput.value = '';
    uploadSection.style.display = 'block';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    bgOptions.style.display = 'none';
    resultsGrid.innerHTML = '';
    progressFill.style.width = '0%';
    progressText.textContent = 'Processing: 0 / 0 images...';
}
