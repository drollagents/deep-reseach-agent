document.addEventListener('DOMContentLoaded', function() {
    const researchInput = document.getElementById('research-input');
    const submitBtn = document.getElementById('submit-btn');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const initialReport = document.getElementById('initial-report');
    const enhancedReport = document.getElementById('enhanced-report');

    // Initialize tabs from Bootstrap
    const tabElements = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabElements.forEach(tab => {
        tab.addEventListener('click', event => {
            // Manually initialize Bootstrap tabs since we're not using the full Bootstrap JS
            const targetId = tab.getAttribute('data-bs-target').substring(1);
            
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

    // Submit button click handler
    submitBtn.addEventListener('click', function() {
        const researchTopic = researchInput.value.trim();
        
        if (!researchTopic) {
            alert('Please enter a research topic');
            return;
        }
        
        // Clear previous results
        initialReport.innerHTML = '';
        enhancedReport.innerHTML = '';
        
        // Show loading indicator
        loadingDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        
        console.log('Sending research request for:', researchTopic);
        
        // Send research request
        fetch('/research', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
            // Hide loading indicator
            loadingDiv.style.display = 'none';
            
            // Check if request was successful
            if (data.success) {
                // Convert markdown to HTML and display results
                initialReport.innerHTML = marked.parse(data.initial_report || 'No initial report available');
                enhancedReport.innerHTML = marked.parse(data.enhanced_report || 'No enhanced report available');
                
                // Show results container
                resultsDiv.style.display = 'block';
                
                // Activate the first tab
                document.getElementById('initial-tab').click();
            } else {
                console.error('Error in research response:', data.error);
                alert('Error: ' + (data.error || 'Unknown error occurred'));
            }
        })
        .catch(error => {
            console.error('Error during research:', error);
            loadingDiv.style.display = 'none';
            alert('Error: ' + error.message);
        });
    });

    // Allow pressing Enter to submit
    researchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitBtn.click();
        }
    });
});