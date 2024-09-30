function renderChart() {
    const input = document.getElementById('mermaidInput').value;
    const output = document.getElementById('mermaidChart');

    // Clear previous chart
    output.innerHTML = '';

    // Initialize mermaid
    mermaid.initialize({ startOnLoad: false });

    // Render new chart
    mermaid.render('mermaid-diagram', input).then(result => {
        output.innerHTML = result.svg;
    }).catch(error => {
        output.innerHTML = '<p style="color: red;">Error rendering chart: ' + error.message + '</p>';
    });
}

// Initial render
renderChart();

// Event listener for input changes
document.getElementById('mermaidInput').addEventListener('input', renderChart);
