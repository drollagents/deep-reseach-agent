/**
 * Droll Agents - Deep Research Agent JavaScript
 * An AI-powered research agent that provides comprehensive reports on any topic.
 */
document.addEventListener('DOMContentLoaded', function() {
    const researchInput = document.getElementById('research-input');
    const submitBtn = document.getElementById('submit-btn');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const initialReport = document.getElementById('initial-report');
    const enhancedReport = document.getElementById('enhanced-report');
    const errorDiv = document.getElementById('error');
    
    // Initialize the application
    initializeApp();
    
    /**
     * Initialize the application with all event listeners and UI enhancements
     */
    function initializeApp() {
        // Initialize tabs
        initTabs();
        
        // Add event listeners
        submitBtn.addEventListener('click', submitResearch);
        researchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });
        
        // Add focus animation to input
        researchInput.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        researchInput.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
        
        // Add button interaction
        submitBtn.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(-1px)';
        });
        
        submitBtn.addEventListener('mouseup', function() {
            this.style.transform = '';
        });
        
        // Focus input on page load for better UX
        setTimeout(() => {
            researchInput.focus();
        }, 500);

        // Add hover effect to back button
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('mouseenter', function() {
                const svg = this.querySelector('svg');
                if (svg) {
                    svg.style.transform = 'translateX(-3px)';
                }
            });
            
            backButton.addEventListener('mouseleave', function() {
                const svg = this.querySelector('svg');
                if (svg) {
                    svg.style.transform = '';
                }
            });
        }
    }
    
    /**
     * Initialize tabs functionality
     */
    function initTabs() {
        const tabElements = document.querySelectorAll('button[data-bs-toggle="tab"]');
        tabElements.forEach(tab => {
            tab.addEventListener('click', event => {
                // Get target tab pane ID
                const targetId = tab.getAttribute('data-bs-target');
                
                // Remove active class from all tabs and tab panes
                document.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => {
                    p.classList.remove('show');
                    p.classList.remove('active');
                });
                
                // Add active class to current tab and tab pane
                tab.classList.add('active');
                const targetPane = document.getElementById(targetId);
                if (targetPane) {
                    targetPane.classList.add('show');
                    targetPane.classList.add('active');
                }
            });
        });
    }
    
    /**
     * Submit the research request
     */
    function submitResearch() {
        const researchTopic = researchInput.value.trim();
        
        if (!researchTopic) {
            showError('Please enter a research topic');
            return;
        }
        
        // Clear previous results and errors
        initialReport.innerHTML = '';
        enhancedReport.innerHTML = '';
        errorDiv.classList.add('hidden');
        
        // Show loading indicator and disable button
        loadingDiv.classList.remove('hidden');
        resultsDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Researching...</span>';
        
        console.log('Sending research request for:', researchTopic);
        
        // Send research request
        fetch('/research', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ research_topic: researchTopic })
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `Server returned ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Research completed successfully');
            
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Research</span>';
            loadingDiv.classList.add('hidden');
            
            // Check if request was successful
            if (data.success) {
                // Format and display results
                displayResults(data);
            } else {
                console.error('Error in research response:', data.error);
                showError(data.error || 'Unknown error occurred');
            }
        })
        .catch(error => {
            console.error('Error during research:', error);
            
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Research</span>';
            loadingDiv.classList.add('hidden');
            
            showError(error.message || 'An error occurred while processing your request');
        });
    }
    
    /**
     * Display the research results
     * @param {Object} data - The research data from the server
     */
    function displayResults(data) {
        try {
            // Check if marked is available for markdown parsing
            if (typeof marked === 'undefined') {
                console.warn('Marked library not loaded, displaying plain text');
                initialReport.textContent = data.initial_report || 'No initial report available';
                enhancedReport.textContent = data.enhanced_report || 'No enhanced report available';
            } else {
                // Parse markdown to HTML
                initialReport.innerHTML = marked.parse(data.initial_report || 'No initial report available');
                enhancedReport.innerHTML = marked.parse(data.enhanced_report || 'No enhanced report available');
                
                // Add target="_blank" to all links in the reports
                makeLinksOpenInNewTab(initialReport);
                makeLinksOpenInNewTab(enhancedReport);
            }
            
            // Show results container with animation
            resultsDiv.style.opacity = '0';
            resultsDiv.classList.remove('hidden');
            
            // Apply fade-in animation
            setTimeout(() => {
                resultsDiv.style.opacity = '1';
                resultsDiv.style.transition = 'opacity 0.5s ease';
            }, 10);
            
            // Activate the first tab
            document.getElementById('initial-tab').click();
            
            // Scroll to results
            setTimeout(() => {
                resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error) {
            console.error('Error displaying results:', error);
            showError('Error displaying results: ' + error.message);
        }
    }
    
    /**
     * Make all links in the element open in new tabs
     * @param {HTMLElement} element - The element containing links
     */
    function makeLinksOpenInNewTab(element) {
        const links = element.querySelectorAll('a');
        links.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
    }
    
    /**
     * Show an error message
     * @param {string} message - The error message to display
     */
    function showError(message) {
        // Apply animation effect for error display
        errorDiv.style.opacity = '0';
        errorDiv.classList.remove('hidden');
        errorDiv.textContent = message;
        
        // Apply fade-in animation
        setTimeout(() => {
            errorDiv.style.opacity = '1';
            errorDiv.style.transition = 'opacity 0.5s ease';
        }, 10);
        
        // Scroll to error message
        setTimeout(() => {
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
});
