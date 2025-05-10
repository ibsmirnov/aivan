// Global variables
let wordList = [];       // Array of all unique words
let wordToIndex = {};    // Map from word to index
let unigramModel = {};   // Unigram model using indices
let bigramModel = {};    // Bigram model using indices
let wordFrequencies = {}; // Word frequency data
let currentSource = '';
let generatedText = [];
let useBigrams = false; // Flag for bigram mode

// DOM elements
const sourceButtons = document.querySelectorAll('.source-btn');
const startWordInput = document.getElementById('start-word');
const generateBtn = document.getElementById('generate-btn');
const autogenerateBtn = document.getElementById('autogenerate-btn');
const textOutput = document.getElementById('text-output');
const optionsContainer = document.getElementById('options-container');
let statusMessage = document.getElementById('status-message'); // Changed to let
const loadingIndicator = document.getElementById('loading-indicator');

// Initialize the app
function init() {
    // Add click listeners to source buttons
    sourceButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            sourceButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Load the selected source
            loadTextSource(button.dataset.source);
        });
    });
    
    generateBtn.addEventListener('click', startGeneration);
    autogenerateBtn.addEventListener('click', startAutogeneration);
    
    // Create the container for status message and toggle
    setupStatusAndToggle();
    
    // Disable generate buttons initially
    generateBtn.disabled = true;
    autogenerateBtn.disabled = true;
    
    // Load To The Lighthouse by default
    setTimeout(() => {
        const toTheLighthouseBtn = document.querySelector('.source-btn[data-source="to_the_lighthouse"]');
        if (toTheLighthouseBtn) {
            toTheLighthouseBtn.classList.add('active');
            loadTextSource('to_the_lighthouse');
        }
    }, 100);
}

// Set up the status message container and toggle
function setupStatusAndToggle() {
    // Get the original status message element
    const originalStatus = document.getElementById('status-message');
    if (!originalStatus) return;
    
    // Create advanced mode toggle
    const bigramToggle = document.createElement('div');
    bigramToggle.className = 'bigram-toggle';
    bigramToggle.innerHTML = `
        <label class="toggle-container">
            <input type="checkbox" id="bigram-checkbox">
            <span class="toggle-label">Advanced mode</span>
        </label>
    `;
    
    // Create a container for the status message that will include the toggle
    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'flex';
    statusContainer.style.justifyContent = 'space-between';
    statusContainer.style.alignItems = 'center';
    statusContainer.style.margin = '8px 0 24px';
    
    // Create the status message element
    const newStatusMessage = document.createElement('div');
    newStatusMessage.id = 'status-message';
    newStatusMessage.style.margin = '0';
    newStatusMessage.style.minHeight = '20px';
    newStatusMessage.style.color = 'var(--text-light)';
    newStatusMessage.style.fontSize = '14px';
    
    // Copy any content from the original status
    newStatusMessage.textContent = originalStatus.textContent;
    
    // Add the elements to the container
    statusContainer.appendChild(newStatusMessage);
    statusContainer.appendChild(bigramToggle);
    
    // Replace the old status message with the new container
    originalStatus.parentNode.replaceChild(statusContainer, originalStatus);
    
    // Update the statusMessage reference
    statusMessage = newStatusMessage;
    
    // Add event listener for the checkbox
    setTimeout(() => {
        const checkbox = document.getElementById('bigram-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                useBigrams = this.checked;
                setStatus(useBigrams ? 'Advanced mode activated' : 'Standard mode activated');
                
                // If we have a current word, update the word options display
                if (generatedText.length > 0) {
                    displayNextWordOptions(generatedText[generatedText.length - 1]);
                }
            });
        }
    }, 100);
}

// Load the optimized text source
async function loadTextSource(source) {
    if (source === currentSource && wordList.length > 0) {
        setStatus(`${getSourceDisplayName(source)} is already loaded.`);
        return;
    }
    
    // Show loading indicator
    loadingIndicator.classList.add('visible');
    generateBtn.disabled = true;
    autogenerateBtn.disabled = true;
    setStatus(`Loading ${getSourceDisplayName(source)}...`);
    
    try {
        const response = await fetch(`data/${source}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        
        const optimizedModel = await response.json();
        
        // Set up our data structures
        wordList = optimizedModel.word_list;
        wordToIndex = {};
        
        // Create the word to index mapping
        for (let i = 0; i < wordList.length; i++) {
            wordToIndex[wordList[i]] = i;
        }
        
        // Set up the unigram and bigram models
        unigramModel = optimizedModel.unigrams;
        bigramModel = optimizedModel.bigrams;
        wordFrequencies = optimizedModel.word_frequencies || {};
        
        currentSource = source;
        
        setStatus(`${getSourceDisplayName(source)} loaded successfully with ${wordList.length} unique words.`);
        generateBtn.disabled = false;
        autogenerateBtn.disabled = false;
        resetGeneration();
    } catch (error) {
        setStatus(`Error: ${error.message}`);
        console.error(error);
    } finally {
        loadingIndicator.classList.remove('visible');
    }
}

// Start text generation with the provided phrase
function startGeneration() {
    // Get the input text and split it into words
    const inputText = startWordInput.value.trim().toLowerCase();
    
    // If no input, select a random starting word based on frequency
    if (inputText === '') {
        selectRandomStartWord();
        return;
    }
    
    const inputWords = inputText.split(/\s+/);
    
    // Check if the last word exists in the model
    const lastWord = inputWords[inputWords.length - 1];
    if (!wordToIndex.hasOwnProperty(lastWord)) {
        setStatus(`The word "${lastWord}" does not exist in the selected text source.`);
        return;
    }
    
    // Reset and set the generated text to all input words
    resetGeneration();
    generatedText = [...inputWords];
    textOutput.textContent = inputWords.join(' ');
    
    // Display next word options based on the last word
    displayNextWordOptions(lastWord);
}

// Select a random starting word based on word frequencies
function selectRandomStartWord() {
    resetGeneration();
    
    // If we have word frequencies, use them to select a starting word
    if (Object.keys(wordFrequencies).length > 0) {
        // Convert to arrays for selection
        const indices = Object.keys(wordFrequencies).map(idx => parseInt(idx));
        const frequencies = indices.map(idx => wordFrequencies[idx]);
        
        // Sample a word based on frequencies
        const randomIndex = weightedRandomSample(indices, frequencies);
        const randomWord = wordList[randomIndex];
        
        // Add the word to generated text
        generatedText = [randomWord];
        textOutput.textContent = randomWord;
        
        setStatus(`Randomly selected "${randomWord}" as a starting word based on its frequency.`);
        
        // Display next word options
        displayNextWordOptions(randomWord);
    } else {
        // Simple random selection if no frequency data
        const randomIndex = Math.floor(Math.random() * wordList.length);
        const randomWord = wordList[randomIndex];
        
        // Add the word to generated text
        generatedText = [randomWord];
        textOutput.textContent = randomWord;
        
        setStatus(`Randomly selected "${randomWord}" as a starting word.`);
        
        // Display next word options
        displayNextWordOptions(randomWord);
    }
}

// Helper function for weighted random sampling
function weightedRandomSample(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const randomValue = Math.random() * totalWeight;
    
    let weightSum = 0;
    for (let i = 0; i < items.length; i++) {
        weightSum += weights[i];
        if (randomValue <= weightSum) {
            return items[i];
        }
    }
    
    // Fallback to the last item (should not reach here)
    return items[items.length - 1];
}

// Start autogeneration with the provided phrase
function startAutogeneration() {
    // If we already have a sentence, use the last word
    if (generatedText.length > 0) {
        const currentWord = generatedText[generatedText.length - 1];
        autogenerateNextWords(currentWord, 10);
        return;
    }
    
    // Get the input text and split it into words
    const inputText = startWordInput.value.trim().toLowerCase();
    
    // If no input, select a random starting word based on frequency
    if (inputText === '') {
        selectRandomStartWord();
        // Continue with autogeneration
        setTimeout(() => {
            if (generatedText.length > 0) {
                autogenerateNextWords(generatedText[0], 10);
            }
        }, 300);
        return;
    }
    
    const inputWords = inputText.split(/\s+/);
    
    // Check if the last word exists in the model
    const lastWord = inputWords[inputWords.length - 1];
    if (!wordToIndex.hasOwnProperty(lastWord)) {
        setStatus(`The word "${lastWord}" does not exist in the selected text source.`);
        return;
    }
    
    // Set the generated text to all input words
    resetGeneration();
    generatedText = [...inputWords];
    textOutput.textContent = inputWords.join(' ');
    
    // Start autogeneration from the last word
    autogenerateNextWords(lastWord, 10);
}

// Get bigram key for the current position
function getBigramKey() {
    if (generatedText.length < 2) return null;
    
    // Get indices for the last two words to form a bigram key
    const prevWord = generatedText[generatedText.length - 2];
    const currentWord = generatedText[generatedText.length - 1];
    
    if (!wordToIndex.hasOwnProperty(prevWord) || !wordToIndex.hasOwnProperty(currentWord)) {
        return null;
    }
    
    return `${wordToIndex[prevWord]},${wordToIndex[currentWord]}`;
}

// Get next word options based on current context (unigram or bigram)
function getNextWordOptions(currentWord) {
    if (!wordToIndex.hasOwnProperty(currentWord)) {
        return {};
    }
    
    const currentIdx = wordToIndex[currentWord];
    const currentIdxStr = currentIdx.toString();
    
    if (useBigrams && generatedText.length >= 2) {
        // Try using bigram
        const bigramKey = getBigramKey();
        
        // Check if bigram exists and has continuations in the bigram model
        if (bigramKey && bigramModel[bigramKey] && Object.keys(bigramModel[bigramKey]).length > 0) {
            // Return a map of next words with their frequencies
            const result = {};
            
            for (const [nextIdxStr, freq] of Object.entries(bigramModel[bigramKey])) {
                const nextIdx = parseInt(nextIdxStr);
                const nextWord = wordList[nextIdx];
                result[nextWord] = freq;
            }
            
            return result;
        }
    }
    
    // Fallback to unigram if bigram has no continuations or not in bigram mode
    if (unigramModel[currentIdxStr]) {
        // Return a map of next words with their frequencies
        const result = {};
        
        for (const [nextIdxStr, freq] of Object.entries(unigramModel[currentIdxStr])) {
            const nextIdx = parseInt(nextIdxStr);
            const nextWord = wordList[nextIdx];
            result[nextWord] = freq;
        }
        
        return result;
    }
    
    return {};
}

// Autogenerate next words based on probabilities
function autogenerateNextWords(currentWord, remainingWords) {
    if (remainingWords <= 0) {
        setStatus('Autogeneration complete.');
        return;
    }
    
    // Get next word options based on current context
    const nextWords = getNextWordOptions(currentWord);
    
    if (Object.keys(nextWords).length === 0) {
        setStatus('No next words found. Autogeneration stopped.');
        return;
    }
    
    // Calculate total frequency for normalization
    const totalFreq = Object.values(nextWords).reduce((sum, freq) => sum + freq, 0);
    
    // Generate a random number between 0 and total frequency
    const random = Math.random() * totalFreq;
    
    // Find the word that corresponds to the random number
    let cumulativeFreq = 0;
    let selectedWord = '';
    
    for (const [word, freq] of Object.entries(nextWords)) {
        cumulativeFreq += freq;
        if (random <= cumulativeFreq) {
            selectedWord = word;
            break;
        }
    }
    
    // Add the selected word to generated text
    generatedText.push(selectedWord);
    textOutput.textContent = generatedText.join(' ');
    
    // Continue with the next word
    setTimeout(() => {
        autogenerateNextWords(selectedWord, remainingWords - 1);
    }, 300); // Add a small delay for better visualization
}

// Display the next possible words with their frequencies
function displayNextWordOptions(currentWord) {
    // Clear previous options
    optionsContainer.innerHTML = '';
    
    // Get next word options based on current context
    const nextWords = getNextWordOptions(currentWord);
    
    if (Object.keys(nextWords).length === 0) {
        setStatus(`No next words found for "${currentWord}".`);
        return;
    }
    
    // Sort by frequency in descending order
    const sortedWords = Object.entries(nextWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Take top 5
    
    // Calculate total frequency for normalization
    const totalFreq = sortedWords.reduce((sum, [_, freq]) => sum + freq, 0);
    
    // Display the options
    sortedWords.forEach(([nextWord, frequency]) => {
        const probability = (frequency / totalFreq * 100).toFixed(1);
        const option = document.createElement('div');
        option.className = 'word-option';
        option.innerHTML = `
            <span class="word">${nextWord}</span>
            <span class="frequency">${frequency} (${probability}%)</span>
        `;
        
        // Add click event to select this word
        option.addEventListener('click', () => selectNextWord(nextWord));
        
        optionsContainer.appendChild(option);
    });
    
    const modelType = useBigrams ? "advanced" : "standard";
    const context = useBigrams && generatedText.length >= 2 ? 
                   `"${generatedText[generatedText.length - 2]} ${currentWord}"` : 
                   `"${currentWord}"`;
    setStatus(`Select a word to continue. Using ${modelType} mode with context ${context}.`);
}

// Select a word as the next in the sequence
function selectNextWord(word) {
    // Add the word to generated text
    generatedText.push(word);
    textOutput.textContent = generatedText.join(' ');
    
    // Display next word options
    displayNextWordOptions(word);
}

// Reset the generation
function resetGeneration() {
    generatedText = [];
    textOutput.textContent = '';
    optionsContainer.innerHTML = '';
}

// Set status message
function setStatus(message) {
    statusMessage.textContent = message;
}

// Get display name for source
function getSourceDisplayName(source) {
    switch(source) {
        case 'to_the_lighthouse': return 'To The Lighthouse';
        case 'buddenbrooks': return 'Buddenbrooks';
        case 'stackexchange': return 'StackExchange';
        case 'reddit': return 'Reddit';
        default: return source;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 