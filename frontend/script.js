// ============================================================
// S.A.M. — PERSONAL AI ASSISTANT
// GEMINI AI + MEMORY + VOICE + VISION + TOOLS
// ============================================================


// ============================================================
// 1. GEMINI API KEY
// ============================================================

let API_KEY = localStorage.getItem("sam_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        localStorage.setItem("sam_key", API_KEY.trim());
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
const sendBtn = document.getElementById("send");

const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");

const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


// ============================================================
// LOAD SAVED MEMORY
// ============================================================

MEMORY.forEach(function (m) {

    add(
        (m.role === "user" ? "YOU: " : "SAM: ") + m.text,
        m.role === "user" ? "user" : "ai"
    );

});


// ============================================================
// 3. TOOLS — THE HANDS
// ============================================================

async function handleTools(text) {

    const t = text.toLowerCase().trim();


    // ========================================================
    // TOOL 1 — TIME
    // ========================================================

    if (
        /\btime\b/.test(t) ||
        t.includes("what time") ||
        t.includes("current time") ||
        t.includes("sam time")
    ) {

        return (
            "The current time is " +
            new Date().toLocaleTimeString() +
            ", Boss."
        );
    }


    // ========================================================
    // TOOL 2 — WEATHER
    // ========================================================

    if (
        t.includes("weather") ||
        t.includes("temperature") ||
        t.includes("climate")
    ) {

        return new Promise(function (resolve) {

            if (!navigator.geolocation) {

                resolve(
                    "Geolocation is not supported by this browser, Boss."
                );

                return;
            }


            navigator.geolocation.getCurrentPosition(

                async function (position) {

                    try {

                        const latitude =
                            position.coords.latitude;

                        const longitude =
                            position.coords.longitude;


                        const response = await fetch(
                            "https://api.open-meteo.com/v1/forecast" +
                            "?latitude=" + latitude +
                            "&longitude=" + longitude +
                            "&current_weather=true"
                        );


                        if (!response.ok) {
                            throw new Error("Weather request failed");
                        }


                        const data =
                            await response.json();


                        if (
                            data.current_weather &&
                            data.current_weather.temperature !== undefined
                        ) {

                            resolve(
                                "The current temperature is " +
                                data.current_weather.temperature +
                                " degrees Celsius, Boss."
                            );

                        } else {

                            resolve(
                                "I couldn't get the current weather, Boss."
                            );
                        }


                    } catch (error) {

                        resolve(
                            "Weather service error, Boss."
                        );
                    }

                },


                function () {

                    resolve(
                        "I need location permission to check the weather, Boss."
                    );
                }

            );

        });
    }


    // ========================================================
    // TOOL 3 — TIMER
    // ========================================================

    const timerMatch = t.match(
        /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i
    );


    if (
        (
            t.includes("timer") ||
            t.includes("set timer")
        ) &&
        timerMatch
    ) {

        const amount =
            parseInt(timerMatch[1]);


        const unit =
            timerMatch[2].toLowerCase();


        let factor = 1000;


        if (
            unit.startsWith("minute") ||
            unit.startsWith("min")
        ) {

            factor = 60000;
        }


        if (
            unit.startsWith("hour") ||
            unit.startsWith("hr")
        ) {

            factor = 3600000;
        }


        const duration =
            amount * factor;


        setTimeout(function () {

            const timerMessage =
                "Boss, your " +
                amount +
                " " +
                unit +
                " timer is complete.";


            add(
                "SAM: " + timerMessage,
                "ai"
            );


            speak(timerMessage);

        }, duration);


        return (
            "Timer set for " +
            amount +
            " " +
            unit +
            "."
        );
    }


    // ========================================================
    // TOOL 4 — TRANSLATE TO TELUGU
    // ========================================================

    if (t.includes("translate")) {

        let q = text
            .replace(
                /translate\s*(this)?\s*/i,
                ""
            )
            .replace(
                /\s*(to|into)\s*telugu\s*$/i,
                ""
            )
            .trim();


        if (!q) {
            q = "hello";
        }


        try {

            const response = await fetch(
                "https://api.mymemory.translated.net/get?q=" +
                encodeURIComponent(q) +
                "&langpair=en|te"
            );


            if (!response.ok) {
                throw new Error("Translation request failed");
            }


            const data =
                await response.json();


            if (
                data.responseData &&
                data.responseData.translatedText
            ) {

                return (
                    "In Telugu: " +
                    data.responseData.translatedText
                );
            }


            return (
                "Translation service returned no result, Boss."
            );


        } catch (error) {

            return (
                "Translation service error, Boss."
            );
        }
    }


    // ========================================================
    // TOOL 5 — YOUTUBE SEARCH
    // ========================================================

    if (
        t.includes("youtube") ||
        t.startsWith("play ")
    ) {

        let q = text
            .replace(
                /^(play|youtube|search youtube)\s*/i,
                ""
            )
            .replace(
                /\s*(on youtube|in youtube)$/i,
                ""
            )
            .trim();


        if (q) {

            window.open(
                "https://www.youtube.com/results?search_query=" +
                encodeURIComponent(q),
                "_blank"
            );


            return (
                "Searching YouTube for " +
                q +
                ", Boss."
            );
        }
    }


    // ========================================================
    // NO TOOL MATCH
    // ========================================================

    return null;
}


// ============================================================
// 4. GEMINI BRAIN
// ============================================================

async function callGemini(promptText) {

    const contents = MEMORY
        .slice(-12)
        .map(function (m) {

            return {

                role:
                    m.role === "model"
                        ? "model"
                        : "user",

                parts: [
                    {
                        text: m.text
                    }
                ]
            };

        });


    contents.push({

        role: "user",

        parts: [
            {
                text: promptText
            }
        ]

    });


    let lastError = null;


    for (const model of MODELS) {

        try {

            const response = await fetch(

                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY),

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


            const data =
                await response.json();


            if (data.error) {

                lastError =
                    new Error(
                        data.error.message ||
                        "Gemini API error"
                    );


                if (
                    /high demand|temporar|quota|rate|unavailable|deprecated|not found/i
                        .test(data.error.message || "")
                ) {

                    continue;
                }


                throw lastError;
            }


            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts
            ) {

                throw new Error(
                    "Invalid response from Gemini."
                );
            }


            return data
                .candidates[0]
                .content
                .parts
                .map(function (part) {
                    return part.text || "";
                })
                .join("");


        } catch (error) {

            lastError = error;
        }
    }


    throw (
        lastError ||
        new Error("All Gemini models failed.")
    );
}


// ============================================================
// 5. ASK SAM
// TOOLS FIRST → GEMINI SECOND
// ============================================================

async function askGemini(promptText) {

    add(
        "SAM: Thinking...",
        "ai"
    );


    try {

        // ----------------------------------------------------
        // FIRST: CHECK SAM TOOLS
        // ----------------------------------------------------

        const toolResult =
            await handleTools(promptText);


        if (toolResult !== null) {

            if (chat.lastChild) {

                chat.lastChild.innerText =
                    "SAM: " + toolResult;
            }


            MEMORY.push({
                role: "user",
                text: promptText
            });


            MEMORY.push({
                role: "model",
                text: toolResult
            });


            saveMemory();


            speak(toolResult);


            return;
        }


        // ----------------------------------------------------
        // SECOND: GEMINI
        // ----------------------------------------------------

        if (!API_KEY) {

            throw new Error(
                "Gemini API key is missing."
            );
        }


        const reply =
            await callGemini(promptText);


        MEMORY.push({
            role: "user",
            text: promptText
        });


        MEMORY.push({
            role: "model",
            text: reply
        });


        saveMemory();


        if (chat.lastChild) {

            chat.lastChild.innerText =
                "SAM: " + reply;
        }


        speak(reply);


    } catch (error) {

        if (chat.lastChild) {

            chat.lastChild.innerText =
                "SAM: ERROR - " +
                (
                    error.message ||
                    "Unknown error"
                );
        }
    }
}


// ============================================================
// 6. VISION ENGINE — CAMERA / IMAGE
// ============================================================

if (camBtn && imgInput) {

    camBtn.onclick = function () {

        imgInput.click();

    };


    imgInput.onchange = function () {

        const file =
            imgInput.files[0];


        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/")) {

            add(
                "SAM: Please select an image file.",
                "ai"
            );

            return;
        }


        const reader =
            new FileReader();


        reader.onload = function () {

            const result =
                reader.result;


            const base64 =
                result.split(",")[1];


            const question =
                input.value.trim() ||
                "What do you see in this image? Describe it briefly.";


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
// 7. IMAGE ANALYSIS
// ============================================================

async function askVision(
    base64,
    mimeType,
    question
) {

    add(
        "SAM: Analyzing image...",
        "ai"
    );


    let lastError = null;


    for (const model of MODELS) {

        try {

            const response = await fetch(

                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY),

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


            const data =
                await response.json();


            if (data.error) {

                lastError =
                    new Error(
                        data.error.message ||
                        "Vision API error"
                    );


                if (
                    /high demand|temporar|quota|rate|unavailable|deprecated|not found/i
                        .test(data.error.message || "")
                ) {

                    continue;
                }


                throw lastError;
            }


            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts
            ) {

                throw new Error(
                    "Invalid image response."
                );
            }


            const reply =
                data.candidates[0]
                    .content
                    .parts
                    .map(function (part) {
                        return part.text || "";
                    })
                    .join("");


            if (chat.lastChild) {

                chat.lastChild.innerText =
                    "SAM: " + reply;
            }


            MEMORY.push({
                role: "user",
                text: "[IMAGE] " + question
            });


            MEMORY.push({
                role: "model",
                text: reply
            });


            saveMemory();


            speak(reply);


            return;


        } catch (error) {

            lastError = error;
        }
    }


    if (chat.lastChild) {

        chat.lastChild.innerText =
            "SAM: ERROR - " +
            (
                lastError?.message ||
                "Image analysis failed."
            );
    }
}


// ============================================================
// 8. VOICE INPUT
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


    recognition.onresult =
        function (event) {

            const text =
                event.results[0][0]
                    .transcript;


            add(
                "YOU: " + text,
                "user"
            );


            askGemini(text);
        };


    recognition.onerror =
        function (event) {

            console.log(
                "Speech recognition error:",
                event.error
            );


            micBtn.innerText =
                "🎙️";
        };


    recognition.onend =
        function () {

            micBtn.innerText =
                "🎙️";
        };


    micBtn.onclick =
        function () {

            try {

                recognition.start();

                micBtn.innerText =
                    "LISTENING...";

            } catch (error) {

                console.log(error);
            }
        };
}


// ============================================================
// 9. SAM VOICE OUTPUT
// ============================================================

let voices = [];


function loadVoices() {

    voices =
        window.speechSynthesis
            ? window.speechSynthesis.getVoices()
            : [];
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
 
