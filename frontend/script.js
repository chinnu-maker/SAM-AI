// ============================================================
// S.A.M. — SMART AI MULTI-TOOL ASSISTANT
// Gemini + Memory + Voice + Vision + Smart Tools
// ============================================================


// ============================================================
// 1. GEMINI API KEY
// ============================================================

let API_KEY = localStorage.getItem("sam_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("sam_key", API_KEY);
    }
}


// ============================================================
// 2. GEMINI MODELS
// ============================================================

const MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
];


// ============================================================
// 3. MEMORY
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
// 4. ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");

const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");

const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


// ============================================================
// 5. LOAD MEMORY
// ============================================================

MEMORY.forEach(function (m) {

    add(
        (m.role === "user" ? "YOU: " : "SAM: ") + m.text,
        m.role === "user" ? "user" : "ai"
    );

});


// ============================================================
// 6. TOOL STATE
// ============================================================

let stopwatchStart = null;
let stopwatchTimer = null;

let lastSamResponse = "";


// ============================================================
// 7. SMART TOOLS
// ============================================================

async function handleTools(text) {

    const original = text.trim();
    const t = original.toLowerCase();


    // ========================================================
    // TIME
    // ========================================================

    if (
        t === "time" ||
        t.includes("what time") ||
        t.includes("current time")
    ) {

        return (
            "The current time is " +
            new Date().toLocaleTimeString() +
            ", Boss."
        );
    }


    // ========================================================
    // DATE
    // ========================================================

    if (
        t === "date" ||
        t.includes("today's date") ||
        t.includes("what is the date") ||
        t.includes("what day is today")
    ) {

        return (
            "Today is " +
            new Date().toLocaleDateString(
                undefined,
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            ) +
            ", Boss."
        );
    }


    // ========================================================
    // WEATHER
    // ========================================================

    if (
        t.includes("weather") ||
        t.includes("temperature")
    ) {

        return new Promise(function (resolve) {

            if (!navigator.geolocation) {

                resolve(
                    "Geolocation is not supported."
                );

                return;
            }

            navigator.geolocation.getCurrentPosition(

                async function (position) {

                    try {

                        const lat =
                            position.coords.latitude;

                        const lon =
                            position.coords.longitude;

                        const response =
                            await fetch(
                                "https://api.open-meteo.com/v1/forecast" +
                                "?latitude=" + lat +
                                "&longitude=" + lon +
                                "&current_weather=true"
                            );

                        const data =
                            await response.json();

                        if (
                            data.current_weather
                        ) {

                            resolve(
                                "The current temperature is " +
                                data.current_weather.temperature +
                                " degrees Celsius, Boss."
                            );

                        } else {

                            resolve(
                                "Weather information is unavailable."
                            );
                        }

                    } catch (error) {

                        resolve(
                            "Unable to get weather information."
                        );
                    }

                },

                function () {

                    resolve(
                        "Please allow location access to check the weather."
                    );

                }
            );

        });
    }


    // ========================================================
    // TIMER
    // ========================================================

    const timerMatch =
        t.match(
            /(?:timer|set timer)\s*(?:for)?\s*(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i
        );

    if (timerMatch) {

        const amount =
            Number(timerMatch[1]);

        const unit =
            timerMatch[2].toLowerCase();

        let milliseconds = amount * 1000;

        if (
            unit.startsWith("minute") ||
            unit.startsWith("min")
        ) {
            milliseconds =
                amount * 60000;
        }

        if (
            unit.startsWith("hour") ||
            unit.startsWith("hr")
        ) {
            milliseconds =
                amount * 3600000;
        }

        setTimeout(function () {

            const message =
                "Boss, your timer is complete.";

            add(
                "SAM: " + message,
                "ai"
            );

            speak(message);

        }, milliseconds);

        return (
            "Timer set for " +
            amount +
            " " +
            unit +
            "."
        );
    }


    // ========================================================
    // STOPWATCH START
    // ========================================================

    if (
        t.includes("start stopwatch") ||
        t === "start stopwatch"
    ) {

        if (stopwatchTimer) {

            return "The stopwatch is already running.";
        }

        stopwatchStart =
            Date.now();

        stopwatchTimer =
            setInterval(function () {

                const elapsed =
                    Date.now() -
                    stopwatchStart;

                const seconds =
                    Math.floor(
                        elapsed / 1000
                    );

                const mins =
                    Math.floor(
                        seconds / 60
                    );

                const secs =
                    seconds % 60;

                const display =
                    String(mins).padStart(2, "0") +
                    ":" +
                    String(secs).padStart(2, "0");

                console.log(
                    "SAM Stopwatch:",
                    display
                );

            }, 1000);

        return "Stopwatch started.";
    }


    // ========================================================
    // STOPWATCH STOP
    // ========================================================

    if (
        t.includes("stop stopwatch") ||
        t.includes("stop the stopwatch")
    ) {

        if (!stopwatchTimer) {

            return "The stopwatch is not running.";
        }

        clearInterval(
            stopwatchTimer
        );

        stopwatchTimer = null;

        const elapsed =
            Date.now() -
            stopwatchStart;

        const seconds =
            Math.floor(
                elapsed / 1000
            );

        const mins =
            Math.floor(
                seconds / 60
            );

        const secs =
            seconds % 60;

        return (
            "Stopwatch stopped at " +
            mins +
            " minutes " +
            secs +
            " seconds."
        );
    }


    // ========================================================
    // CALCULATOR
    // ========================================================

    const calcExpression =
        original.match(
            /^(?:calculate|calc|what is)\s+(.+)$/i
        );

    if (calcExpression) {

        let expression =
            calcExpression[1]
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/[^0-9+\-*/().%\s]/g, "");

        if (!expression.trim()) {

            return "I couldn't find a calculation.";
        }

        try {

            // Calculator is restricted to mathematical characters.
            const result =
                Function(
                    '"use strict"; return (' +
                    expression +
                    ")"
                )();

            if (
                typeof result !== "number" ||
                !Number.isFinite(result)
            ) {

                return "That calculation is not valid.";
            }

            return (
                "The answer is " +
                result +
                "."
            );

        } catch (error) {

            return "I couldn't calculate that.";
        }
    }


    // ========================================================
    // TRANSLATE TO TELUGU
    // ========================================================

    if (
        t.includes("translate") &&
        (
            t.includes("telugu") ||
            t.includes("తెలుగు")
        )
    ) {

        let phrase =
            original
                .replace(
                    /translate/i,
                    ""
                )
                .replace(
                    /to\s+telugu/i,
                    ""
                )
                .trim();

        if (!phrase) {

            return "Tell me what you want translated.";
        }

        try {

            const response =
                await fetch(
                    "https://api.mymemory.translated.net/get?q=" +
                    encodeURIComponent(phrase) +
                    "&langpair=en|te"
                );

            const data =
                await response.json();

            if (
                data.responseData &&
                data.responseData.translatedText
            ) {

                return (
                    "Telugu translation: " +
                    data.responseData.translatedText
                );
            }

            return "Translation unavailable.";

        } catch (error) {

            return "Translation service error.";
        }
    }


    // ========================================================
    // YOUTUBE SEARCH
    // ========================================================

    if (
        t.startsWith("youtube ") ||
        t.startsWith("play ")
    ) {

        let query =
            original
                .replace(
                    /^(youtube|play)\s+/i,
                    ""
                )
                .trim();

        if (query) {

            window.open(
                "https://www.youtube.com/results?search_query=" +
                encodeURIComponent(query),
                "_blank"
            );

            return (
                "Searching YouTube for " +
                query +
                "."
            );
        }
    }


    // ========================================================
    // GOOGLE SEARCH
    // ========================================================

    if (
        t.startsWith("google ") ||
        t.startsWith("search google ")
    ) {

        let query =
            original
                .replace(
                    /^(google|search google)\s+/i,
                    ""
                )
                .trim();

        if (query) {

            window.open(
                "https://www.google.com/search?q=" +
                encodeURIComponent(query),
                "_blank"
            );

            return (
                "Searching Google for " +
                query +
                "."
            );
        }
    }


    // ========================================================
    // LOCATION
    // ========================================================

    if (
        t.includes("where am i") ||
        t.includes("my location") ||
        t.includes("current location")
    ) {

        if (!navigator.geolocation) {

            return (
                "Location services are not available."
            );
        }

        return new Promise(function (resolve) {

            navigator.geolocation.getCurrentPosition(

                function (position) {

                    resolve(
                        "Your location coordinates are latitude " +
                        position.coords.latitude.toFixed(4) +
                        " and longitude " +
                        position.coords.longitude.toFixed(4) +
                        "."
                    );

                },

                function () {

                    resolve(
                        "Please allow location access."
                    );
                }

            );

        });
    }


    // ========================================================
    // RANDOM FACT
    // ========================================================

    if (
        t.includes("random fact") ||
        t.includes("tell me a fact") ||
        t.includes("interesting fact")
    ) {

        const facts = [

            "A day on Venus is longer than a year on Venus.",

            "Honey can remain edible for an extremely long time when properly preserved.",

            "Octopuses have three hearts.",

            "Light from the Sun takes about eight minutes to reach Earth.",

            "The human brain contains billions of neurons."

        ];

        return (
            facts[
                Math.floor(
                    Math.random() *
                    facts.length
                )
            ]
        );
    }


    // ========================================================
    // COPY LAST SAM RESPONSE
    // ========================================================

    if (
        t.includes("copy last response") ||
        t.includes("copy your last response")
    ) {

        if (!lastSamResponse) {

            return "There is no SAM response to copy yet.";
        }

        try {

            await navigator.clipboard.writeText(
                lastSamResponse
            );

            return "My last response has been copied.";
        } catch (error) {

            return "I couldn't access the clipboard.";
        }
    }


    // ========================================================
    // SPEAK AGAIN
    // ========================================================

    if (
        t === "speak again" ||
        t === "repeat that" ||
        t === "say that again"
    ) {

        if (!lastSamResponse) {

            return "There is nothing to repeat.";
        }

        speak(lastSamResponse);

        return "Repeating my last response.";
    }


    // ========================================================
    // CLEAR CHAT COMMAND
    // ========================================================

    if (
        t === "clear memory" ||
        t === "forget everything"
    ) {

        MEMORY = [];

        saveMemory();

        chat.innerHTML = "";

        return "SAM memory has been cleared.";
    }


    // ========================================================
    // HELP
    // ========================================================

    if (
        t === "sam tools" ||
        t === "show tools" ||
        t === "what can you do"
    ) {

        return (
            "SAM tools available: " +
            "time, date, weather, timer, stopwatch, " +
            "calculator, Telugu translation, YouTube search, " +
            "Google search, location, random facts, clipboard, " +
            "voice and image analysis."
        );
    }


    // ========================================================
    // NO TOOL MATCH
    // ========================================================

    return null;
}


// ============================================================
// 8. GEMINI BRAIN
// ============================================================

async function callGemini(promptText) {

    if (!API_KEY) {

        throw new Error(
            "Gemini API key is missing."
        );
    }

    const contents =
        MEMORY
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

            const response =
                await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/" +
                    model +
                    ":generateContent?key=" +
                    encodeURIComponent(API_KEY),
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
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
                        .test(
                            data.error.message || ""
                        )
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

                throw new Error(
                    "Invalid Gemini response."
                );
            }


            return data
                .candidates[0]
                .content
                .parts
                .map(function (part) {

                    return part.text || "";

                })
                .j
