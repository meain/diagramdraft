let editor;
let currentTheme = 'default';
let currentLook = 'classic';

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.30.1/min/vs' } });

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('mermaidInput'), {
        value: `graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]`,
        language: 'mermaid',
        theme: 'vs-light',
        minimap: { enabled: false }
    });

    editor.onDidChangeModelContent(renderChart);
    renderChart();

    // Add event listener for theme select
    document.getElementById('themeSelect').addEventListener('change', function(e) {
        currentTheme = e.target.value;
        renderChart();
    });

    // Add event listener for look select
    document.getElementById('lookSelect').addEventListener('change', function(e) {
        currentLook = e.target.value;
        renderChart();
    });
});

function renderChart() {
    const input = editor.getValue();
    const output = document.getElementById('mermaidChart');

    // Clear previous chart
    output.innerHTML = '';

    // Initialize mermaid with the current theme and look
    mermaid.initialize({ 
        startOnLoad: false,
        theme: currentTheme,
        themeVariables: {
            fontFamily: currentLook === 'handDrawn' ? 'Comic Sans MS' : 'Arial',
            fontSize: currentLook === 'handDrawn' ? '16px' : '14px'
        },
        flowchart: {
            curve: currentLook === 'neo' ? 'basis' : 'linear'
        }
    });

    // Render new chart
    mermaid.render('mermaid-diagram', input).then(result => {
        output.innerHTML = result.svg;
    }).catch(error => {
        output.innerHTML = '<p style="color: red;">Error rendering chart: ' + error.message + '</p>';
    });
}
