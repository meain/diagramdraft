let editor;
let currentTheme = "default";
let currentLook = "classic";

function encodeState() {
    const state = {
        code: editor.getValue(),
        theme: currentTheme,
        look: currentLook
    };
    return btoa(JSON.stringify(state));
}

function decodeState(encodedState) {
    try {
        return JSON.parse(atob(encodedState));
    } catch (e) {
        console.error("Failed to decode state:", e);
        return null;
    }
}

function updateURL() {
    const encodedState = encodeState();
    history.replaceState(null, null, `?state=${encodedState}`);
}

function loadStateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedState = urlParams.get('state');
    if (encodedState) {
        const state = decodeState(encodedState);
        if (state) {
            editor.setValue(state.code);
            currentTheme = state.theme;
            currentLook = state.look;
            document.getElementById("themeSelect").value = currentTheme;
            document.getElementById("lookSelect").value = currentLook;
        }
    }
}

require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.30.1/min/vs",
    },
});

require(["vs/editor/editor.main"], function () {
    // Define custom language for Mermaid
    monaco.languages.register({ id: 'mermaid' });
    monaco.languages.setMonarchTokensProvider('mermaid', {
        tokenizer: {
            root: [
                [/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)/, "keyword"],
                [/[A-Z][0-9A-Za-z]*/, "type.identifier"],
                [/[a-z][0-9A-Za-z]*/, "identifier"],
                [/[{}()\[\]]/, "delimiter.bracket"],
                [/".*?"/, "string"],
                [/\-\->|\=\=>|\-\.\->/, "arrow"],
                [/\|.*?\|/, "label"],
                [/#.*$/, "comment"],
            ],
        }
    });

    // Create editor with Mermaid language
    editor = monaco.editor.create(document.getElementById("mermaidInput"), {
        value: `graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]`,
        language: "mermaid",
        theme: "vs-light",
        minimap: { enabled: false },
        automaticLayout: true,
    });

    // Adjust editor height to leave space for the documentation link
    const editorContainer = document.getElementById("mermaidInput");
    const adjustEditorHeight = () => {
        const containerHeight = editorContainer.clientHeight;
        editor.layout({ width: editorContainer.clientWidth, height: containerHeight - 30 });
    };
    adjustEditorHeight();
    window.addEventListener('resize', adjustEditorHeight);

    editor.onDidChangeModelContent(() => {
        renderChart();
        updateURL();
    });
    
    loadStateFromURL();
    renderChart();

    // Add event listener for window resize
    window.addEventListener('resize', function() {
        editor.layout();
    });

    // Add event listener for theme select
    document
        .getElementById("themeSelect")
        .addEventListener("change", function (e) {
            currentTheme = e.target.value;
            renderChart();
            updateURL();
        });

    // Add event listener for look select
    document
        .getElementById("lookSelect")
        .addEventListener("change", function (e) {
            currentLook = e.target.value;
            renderChart();
            updateURL();
        });

    // Add event listener for export button
    document
        .getElementById("exportBtn")
        .addEventListener("click", exportChart);

    // Add event listener for popstate to handle browser back/forward
    window.addEventListener('popstate', loadStateFromURL);
});

function exportChart() {
    const svgElement = document.querySelector("#mermaidChart svg");
    if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download = "chart.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } else {
        alert("No diagram to export. Please render a diagram first.");
    }
}

function renderChart() {
    const input = editor.getValue();
    const output = document.getElementById("mermaidChart");

    // Clear previous chart
    output.innerHTML = "";

    // Initialize mermaid with the current theme and look
    mermaid.initialize({
        startOnLoad: false,
        theme: currentTheme,
        look: currentLook,
        themeVariables: {
            fontFamily: currentLook === "handDrawn" ? "Comic Sans MS" : "Arial",
            fontSize: currentLook === "handDrawn" ? "16px" : "14px",
        },
    });

    // Render new chart
    mermaid
        .render("mermaid-diagram", input)
        .then((result) => {
            output.innerHTML = result.svg;

            // Ensure the SVG fills its container without max-width
            const svg = output.querySelector('svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.maxWidth = 'none';

            // Initialize pan and zoom after the SVG is rendered
            const panZoom = svgPanZoom("#mermaid-diagram", {
                zoomEnabled: true,
                controlIconsEnabled: false,
                fit: true,
                center: true,
                minZoom: 0.1,
                maxZoom: 10,
            });

            // Function to update pan and zoom when window is resized
            function updatePanZoom() {
                if (panZoom) {
                    panZoom.resize();
                    panZoom.fit();
                    panZoom.center();
                }
            }

            // Add event listener for window resize
            window.addEventListener("resize", updatePanZoom);

            // Initial update
            updatePanZoom();
        })
        .catch((error) => {
            output.innerHTML =
                '<p style="color: red;">Error rendering chart: ' +
                error.message +
                "</p>";
        });
}
