// Global state
let allData = [];
let filteredData = [];

// DOM Elements
const makeFilter = document.getElementById('makeFilter');
const modelFilter = document.getElementById('modelFilter');
const errorCodeFilter = document.getElementById('errorCodeFilter');
const resetFiltersBtn = document.getElementById('resetFilters');
const resultsContainer = document.getElementById('resultsContainer');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const totalEntriesEl = document.getElementById('totalEntries');
const showingEntriesEl = document.getElementById('showingEntries');
const totalMakesEl = document.getElementById('totalMakes');

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
});

// Load JSON data
async function loadData() {
    try {
        const response = await fetch('enriched_boiler_data.json');
        const data = await response.json();
        allData = data.boiler_faults || [];
        filteredData = [...allData];

        populateFilters();
        updateStats();
        renderResults();

        loadingState.style.display = 'none';
    } catch (error) {
        console.error('Error loading data:', error);
        loadingState.innerHTML = '<p style="color: var(--danger);">Error loading data. Please ensure enriched_boiler_data.json is in the same directory.</p>';
    }
}

// Populate filter dropdowns
function populateFilters() {
    // Get unique makes
    const makes = [...new Set(allData.map(item => item.maker))].sort();
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeFilter.appendChild(option);
    });

    // Initially populate all models
    updateModelFilter();
}

// Update model filter based on selected make
function updateModelFilter() {
    const selectedMake = makeFilter.value;
    const models = selectedMake
        ? [...new Set(allData.filter(item => item.maker === selectedMake).map(item => item.model))].sort()
        : [...new Set(allData.map(item => item.model))].sort();

    // Clear existing options except first
    modelFilter.innerHTML = '<option value="">All Models</option>';

    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelFilter.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    makeFilter.addEventListener('change', () => {
        updateModelFilter();
        applyFilters();
    });

    modelFilter.addEventListener('change', applyFilters);

    errorCodeFilter.addEventListener('input', debounce(applyFilters, 300));

    resetFiltersBtn.addEventListener('click', resetFilters);
}

// Apply filters
function applyFilters() {
    const selectedMake = makeFilter.value.toLowerCase();
    const selectedModel = modelFilter.value.toLowerCase();
    const errorCode = errorCodeFilter.value.toLowerCase().trim();

    filteredData = allData.filter(item => {
        const matchesMake = !selectedMake || item.maker.toLowerCase() === selectedMake;
        const matchesModel = !selectedModel || item.model.toLowerCase() === selectedModel;
        const matchesErrorCode = !errorCode || item.error_code.toLowerCase().includes(errorCode);

        return matchesMake && matchesModel && matchesErrorCode;
    });

    updateStats();
    renderResults();
}

// Reset filters
function resetFilters() {
    makeFilter.value = '';
    modelFilter.value = '';
    errorCodeFilter.value = '';
    updateModelFilter();
    filteredData = [...allData];
    updateStats();
    renderResults();
}

// Update statistics
function updateStats() {
    totalEntriesEl.textContent = allData.length;
    showingEntriesEl.textContent = filteredData.length;

    const uniqueMakes = new Set(allData.map(item => item.maker));
    totalMakesEl.textContent = uniqueMakes.size;
}

// Render results
function renderResults() {
    resultsContainer.innerHTML = '';

    if (filteredData.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    filteredData.forEach((item, index) => {
        const card = createErrorCard(item, index);
        resultsContainer.appendChild(card);
    });
}

// Create error card
function createErrorCard(item, index) {
    const card = document.createElement('div');
    card.className = 'error-card';

    const hasOverview = item.ai_overview && item.ai_overview.trim();
    const hasTroubleshooting = item.troubleshooting && item.troubleshooting.trim();
    const hasResources = item.helpful_resources && item.helpful_resources.length > 0;

    card.innerHTML = `
        <div class="error-header">
            <div class="error-info">
                <h3>${escapeHtml(item.maker)}</h3>
                <p class="error-model">${escapeHtml(item.model)}</p>
            </div>
            <div class="error-code-badge">${escapeHtml(item.error_code)}</div>
        </div>
        
        ${item.possible_cause ? `
            <div class="error-cause">
                <div class="error-cause-label">Possible Cause</div>
                <div class="error-cause-text">${escapeHtml(item.possible_cause)}</div>
            </div>
        ` : ''}
        
        ${hasOverview ? `
            <div class="error-overview" id="overview-${index}">
                ${escapeHtml(item.ai_overview)}
            </div>
            ${item.ai_overview.length > 200 ? `
                <span class="expand-btn" onclick="toggleOverview(${index})">Read more</span>
            ` : ''}
        ` : ''}
        
        ${hasTroubleshooting ? `
            <div class="troubleshooting-section">
                <h4>🔧 Troubleshooting Steps</h4>
                <div class="troubleshooting-text">${escapeHtml(item.troubleshooting)}</div>
            </div>
        ` : ''}
        
        ${hasResources ? `
            <div class="resources-section">
                <h4>📚 Helpful Resources</h4>
                <div class="resource-links">
                    ${item.helpful_resources.map(resource => createResourceLink(resource)).join('')}
                </div>
            </div>
        ` : ''}
        
        ${item.enrichment_metadata && item.enrichment_metadata.error ? `
            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg); border-radius: 0.5rem; border-left: 3px solid var(--danger);">
                <div style="font-size: 0.75rem; color: var(--danger); font-weight: 600;">Enrichment Error</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">This entry could not be enriched</div>
            </div>
        ` : ''}
    `;

    return card;
}

// Create resource link
function createResourceLink(resource) {
    const icons = {
        video: '🎥',
        article: '📄',
        forum: '💬'
    };

    const icon = icons[resource.type] || '🔗';

    return `
        <a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" class="resource-link">
            <span class="resource-icon">${icon}</span>
            <div class="resource-content">
                <div class="resource-title">${escapeHtml(resource.title)}</div>
                ${resource.description ? `<div class="resource-desc">${escapeHtml(resource.description)}</div>` : ''}
            </div>
            <span class="resource-type">${escapeHtml(resource.type)}</span>
        </a>
    `;
}

// Toggle overview expansion
function toggleOverview(index) {
    const overview = document.getElementById(`overview-${index}`);
    const btn = overview.nextElementSibling;

    if (overview.classList.contains('expanded')) {
        overview.classList.remove('expanded');
        btn.textContent = 'Read more';
    } else {
        overview.classList.add('expanded');
        btn.textContent = 'Read less';
    }
}

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
