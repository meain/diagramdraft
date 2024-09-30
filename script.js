let editor;
let currentTheme = "default";
let currentLook = "classic";

async function encodeState() {
    const state = {
        code: editor.getValue(),
        theme: currentTheme,
        look: currentLook
    };
    const zip = new JSZip();
    zip.file("state.json", JSON.stringify(state));
    const content = await zip.generateAsync({type: "base64"});
    return encodeURIComponent(content);
}

async function decodeState(encodedState) {
    try {
        const content = decodeURIComponent(encodedState);
        const zip = new JSZip();
        await zip.loadAsync(content, {base64: true});
        const stateJson = await zip.file("state.json").async("string");
        return JSON.parse(stateJson);
    } catch (e) {
        console.error("Failed to decode state:", e);
        return null;
    }
}

async function updateURL() {
    const encodedState = await encodeState();
    history.replaceState(null, null, `?state=${encodedState}`);
}

async function loadStateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedState = urlParams.get('state');
    if (encodedState) {
        const state = await decodeState(encodedState);
        if (state) {
            return state;
        }
    }
    return null;
}

require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.30.1/min/vs",
    },
});

require(["vs/editor/editor.main"], async function () {
    initialState = await loadStateFromURL();

    const initialCode = initialState ? initialState.code : `graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]`;

    if (initialState) {
        currentTheme = initialState.theme;
        currentLook = initialState.look;
        document.getElementById("themeSelect").value = currentTheme;
        document.getElementById("lookSelect").value = currentLook;
    }
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
        value: initialCode,
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

    editor.onDidChangeModelContent(async () => {
        renderChart();
        await updateURL();
    });

    renderChart();

    // Add event listener for window resize
    window.addEventListener('resize', function() {
        editor.layout();
    });

    // Add event listener for theme select
    document
        .getElementById("themeSelect")
        .addEventListener("change", async function (e) {
            currentTheme = e.target.value;
            renderChart();
            await updateURL();
        });

    // Add event listener for look select
    document
        .getElementById("lookSelect")
        .addEventListener("change", async function (e) {
            currentLook = e.target.value;
            renderChart();
            await updateURL();
        });

    // Add event listener for export button
    document
        .getElementById("exportBtn")
        .addEventListener("click", exportChart);

    // Add event listener for popstate to handle browser back/forward
    window.addEventListener('popstate', async () => {
        initialState = await loadStateFromURL();
        if (initialState) {
            editor.setValue(initialState.code);
            currentTheme = initialState.theme;
            currentLook = initialState.look;
            document.getElementById("themeSelect").value = currentTheme;
            document.getElementById("lookSelect").value = currentLook;
            renderChart();
        }
    });
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
