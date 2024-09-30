let editor;
let currentTheme = "default";
let currentLook = "handDrawn";

function encodeState() {
    const state = {
        code: editor.getValue(),
        mermaid: {
            theme: currentTheme,
            look: currentLook,
        },
    };
    const jsonString = JSON.stringify(state);
    const compressed = pako.deflate(jsonString);
    return encodeURIComponent(btoa(compressed));
}

function decodeState(encodedState) {
    try {
        const decoded = decodeURIComponent(encodedState);
        const compressed = atob(decoded);
        const compressedArray = new Uint8Array(compressed.split(',').map(Number));
        const jsonString = pako.inflate(compressedArray);
        return JSON.parse(new TextDecoder().decode(jsonString));
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
    const encodedState = urlParams.get("state");
    if (encodedState) {
        return decodeState(encodedState);
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

    const initialCode = initialState
        ? initialState.code
        : `graph TD
    A[Start] -->|Decide to make a Mermaid chart| B(Stare at blank screen)
    B --> C{What now?}
    C -->|Panic| D[Google 'How to Mermaid']
    C -->|Procrastinate| E[Check social media]
    C -->|Be brave| F[Type random symbols]
    D --> G[Copy-paste examples]
    E --> G
    F -->|Accidentally create modern art| G
    G -->|Finally| H[Admire your 'chart']
    H -->|Realize it makes no sense| A`;

    if (initialState) {
        currentTheme = initialState.mermaid.theme;
        currentLook = initialState.mermaid.look;
    } else {
        currentLook = "handDrawn";
    }
    document.getElementById("themeSelect").value = currentTheme;
    document.getElementById("lookSelect").value = currentLook;
    // Define custom language for Mermaid
    monaco.languages.register({ id: "mermaid" });
    monaco.languages.setMonarchTokensProvider("mermaid", {
        tokenizer: {
            root: [
                [
                    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)/,
                    "keyword",
                ],
                [/[A-Z][0-9A-Za-z]*/, "type.identifier"],
                [/[a-z][0-9A-Za-z]*/, "identifier"],
                [/[{}()\[\]]/, "delimiter.bracket"],
                [/".*?"/, "string"],
                [/\-\->|\=\=>|\-\.\->/, "arrow"],
                [/\|.*?\|/, "label"],
                [/#.*$/, "comment"],
            ],
        },
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
        editor.layout({
            width: editorContainer.clientWidth,
            height: containerHeight - 30,
        });
    };
    adjustEditorHeight();
    window.addEventListener("resize", adjustEditorHeight);

    editor.onDidChangeModelContent(async () => {
        renderChart();
        await updateURL();
    });

    renderChart();

    // Add event listener for window resize
    window.addEventListener("resize", function () {
        editor.layout();
        updatePanZoom();
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
    document.getElementById("exportBtn").addEventListener("click", exportChart);

    // Add event listener for popstate to handle browser back/forward
    window.addEventListener("popstate", async () => {
        initialState = await loadStateFromURL();
        if (initialState) {
            editor.setValue(initialState.code);
            currentTheme = initialState.mermaid.theme;
            currentLook = initialState.mermaid.look;
            document.getElementById("themeSelect").value = currentTheme;
            document.getElementById("lookSelect").value = currentLook;
            renderChart();
        }
    });

    // Add resizing functionality
    const resizeHandle = document.getElementById('resize-handle');
    const codeSection = document.getElementById('code-section');
    const diagramSection = document.getElementById('diagram-section');
    let isResizing = false;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
        });
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        const containerRect = document.getElementById('resizable-container').getBoundingClientRect();
        const newCodeWidth = e.clientX - containerRect.left;
        const containerWidth = containerRect.width;
        const codeWidthPercentage = (newCodeWidth / containerWidth) * 100;
        
        if (codeWidthPercentage > 20 && codeWidthPercentage < 80) {
            codeSection.style.width = `${codeWidthPercentage}%`;
            editor.layout();
            updatePanZoom();
        }
    }
});

function exportChart() {
    const svgElement = document.querySelector("#mermaidChart svg");
    if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], {
            type: "image/svg+xml;charset=utf-8",
        });
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
            const svg = output.querySelector("svg");
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            svg.style.maxWidth = "none";

            // Initialize pan and zoom after the SVG is rendered
            const panZoom = svgPanZoom("#mermaid-diagram", {
                zoomEnabled: true,
                controlIconsEnabled: false,
                fit: true,
                center: true,
                minZoom: 0.1,
                maxZoom: 10,
                zoomScaleSensitivity: 0.3, // Decreased from default 0.1 to make zoom faster
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
