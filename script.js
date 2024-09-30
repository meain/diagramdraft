let editor;

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
});

function renderChart() {
    const input = editor.getValue();
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
