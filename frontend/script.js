// ============================================================
// S.A.M. — PERSONAL AI ASSISTANT
// Gemini AI + Memory + Voice + Vision
// ============================================================

// ============================================================
// 1. GEMINI API KEY
// ============================================================

let API_KEY = localStorage.getItem("sam_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        localStorage.setItem("sam_key", API_KEY);
    }
}

// ============================================================
// GEMINI MODELS
// ============================================================

const MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
];

// ============================================================
// 2. MEMORY SYSTEM
// ============================================================

let MEMORY = JSON.parse(
    localStorage.getItem("sam_memory") || "[]"
);

function saveMemory() {
    localStorage.setItem(
        "sam_memory",
        JSON.stringify(MEMORY)
    );
}

// ============================================================
// HTML ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");

const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");

const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");

const sendBtn = document.getElementById("send");

// ============================================================
// LOAD OLD MEMORY INTO CHAT
// ============================================================

MEMORY.forEach(function (m) {

    add(
        (m.role === "user" ? "YOU: " : "SAM: ") + m.text,
        m.role === "user" ? "user" : "ai"
    );

});

// ============================================================
// 3. GEMINI BRAIN
// ============================================================

async function callGemini(promptText) {

    // Use recent conversation memory
    const contents = MEMORY
        .slice(-12)
        .map(function (m) {

            return {
                role: m.role === "model" ? "model" : "user",
                parts: [
                    {
                        text: m.text
                    }
                ]
            };

        });

    // Add current user message
    contents.push({
        role: "user",
        parts: [
            {
                text: promptText
            }
        ]
    });

    let lastError;

    // Try models one by one
    for (const model of MODELS) {

        try {

            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                API_KEY,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        contents: contents
                    })
                }
            );

            const data = await response.json();

            // API error
            if (data.error) {

                lastError = new Error(
                    data.error.message || "Gemini API error"
                );

                // Try next model for temporary errors
                if (
                    /high demand|temporar|quota|rate|unavailable|deprecated/i
                        .test(data.error.message)
                ) {
                    continue;
                }

                throw lastError;
            }

            // Check response
            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts
            ) {
                throw new Error("Invalid response from Gemini.");
            }

            return data
                .candidates[0]
                .content
                .parts[0]
                .text;

        } catch (error) {

            lastError = error;

        }

    }

    throw lastError || new Error("All Gemini models failed.");
}

// ============================================================
// ASK SAM
// ============================================================

async function askGemini(promptText) {

    add("SAM: Thinking...", "ai");

    try {

        const reply = await callGemini(promptText);

        // Save conversation
        MEMORY.push({
            role: "user",
            text: promptText
        });

        MEMORY.push({
            role: "model",
            text: reply
        });

        saveMemory();

        // Replace thinking message
        if (chat.lastChild) {
            chat.lastChild.innerText = "SAM: " + reply;
        }

        // Speak response
        speak(reply);

    } catch (error) {

        if (chat.lastChild) {

            chat.lastChild.innerText =
                "SAM: ERROR - " +
                (error.message || "Unknown error");

        }

    }
}

// ============================================================
// 4. VISION ENGINE
// ============================================================

if (camBtn && imgInput) {

    camBtn.onclick = function () {
        imgInput.click();
    };

    imgInput.onchange = function () {

        const file = imgInput.files[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = function () {

            const base64 =
                reader.result.split(",")[1];

            const question =
                input.value.trim() ||
                "What do you see? Describe the image briefly.";

            add(
                "YOU: [IMAGE] " + question,
                "user"
            );

            input.value = "";

            askVision(
                base64,
                file.type,
                question
            );

        };

        reader.readAsDataURL(file);
    };
}

// ============================================================
// IMAGE ANALYSIS
// ============================================================

async function askVision(base64, mimeType, question) {

    add(
        "SAM: Analyzing image...",
        "ai"
    );

    let lastError;

    for (const model of MODELS) {

        try {

            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                API_KEY,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        contents: [

                            {
                                role: "user",

                                parts: [

                                    {
                                        text: question
                                    },

                                    {
                                        inline_data: {
                                            mime_type: mimeType,
                                            data: base64
                                        }
                                    }

                                ]
                            }

                        ]

                    })
                }
            );

            const data = await response.json();

            if (data.error) {

                lastError = new Error(
                    data.error.message || "Vision API error"
                );

                if (
                    /high demand|temporar|quota|rate|unavailable|deprecated/i
                        .test(data.error.message)
                ) {
                    continue;
                }

                throw lastError;
            }

            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content
            ) {
                throw new Error("Invalid image response.");
            }

            const reply =
                data.candidates[0]
                    .content
                    .parts[0]
                    .text;

            if (chat.lastChild) {
                chat.lastChild.innerText =
                    "SAM: " + reply;
            }

            speak(reply);

            return;

        } catch (error) {

            lastError = error;

        }

    }

    if (chat.lastChild) {

        chat.lastChild.innerText =
            "SAM: ERROR - " +
            (lastError?.message || "Image analysis failed.");

    }
}

// ============================================================
// 5. VOICE INPUT
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition && micBtn) {

    const recognition =
        new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onresult = function (event) {

        const text =
            event.results[0][0].transcript;

        add(
            "YOU: " + text,
            "user"
        );

        askGemini(text);
    };

    recognition.onerror = function (event) {

        console.log(
            "Voice recognition error:",
            event.error
        );

        micBtn.innerText = "🎙️";
    };

    micBtn.onclick = function () {

        try {

            recognition.start();

            micBtn.innerText =
                "LISTENING...";

        } catch (error) {

            console.log(error);

        }

    };

    recognition.onend = function () {

        micBtn.innerText = "🎙️";

    };
}

// ============================================================
// 6. SAM VOICE OUTPUT
// ============================================================

let voices = [];

function loadVoices() {

    voices =
        window.speechSynthesis.getVoices();
}

loadVoices();

if ("speechSynthesis" in window) {

    speechSynthesis.onvoiceschanged =
        loadVoices;
}

function speak(text) {

    if (
        !text ||
        !("speechSynthesis" in window)
    ) {
        return;
    }

    // Stop previous speech
    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;

    utterance.pitch = 0.85;

    const voice =
        voices.find(function (v) {

            return v.lang &&
                v.lang.startsWith("en");

        });

    if (voice) {

        utterance.voice = voice;

    }

    speechSynthesis.speak(utterance);
}

// ============================================================
// 7. SEND BUTTON
// ============================================================

if (sendBtn) {

    sendBtn.onclick = function () {

        const text =
            input.value.trim();

        if (!text) {
            return;
        }

        add(
            "YOU: " + text,
            "user"
        );

        input.value = "";

        askGemini(text);
    };
}

// ============================================================
// 8. ENTER KEY SUPPORT
// ============================================================

if (input) {

    input.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                if (sendBtn) {
                    sendBtn.click();
                }

            }

        }
    );
}

// ============================================================
// 9. CLEAR MEMORY
// ============================================================

if (clearBtn) {

    clearBtn.onclick = function () {

        MEMORY = [];

        saveMemory();

        chat.innerHTML = "";

        add(
            "SYSTEM: SAM memory cleared.",
            "ai"
        );

    };
}

// ============================================================
// 10. ADD MESSAGE TO CHAT
// ============================================================

function add(text, type) {

    const message =
        document.createElement("div");

    message.className =
        "msg " + type;

    message.innerText = text;

    chat.appendChild(message);

    chat.scrollTop =
        chat.scrollHeight;
}

// ============================================================
// SAM STARTUP MESSAGE
// ============================================================

if (MEMORY.length === 0) {

    add(
        "SAM: System ready. How can I help you?",
        "ai"
    );

          }
