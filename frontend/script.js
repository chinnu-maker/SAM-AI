// ============================================================
// S.A.M. — SMART AI MULTI-TOOL ASSISTANT
// STABLE BUTTON VERSION
// ============================================================

"use strict";


// ============================================================
// 1. ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn");
const clearBtn = document.getElementById("clear-btn");
const imgInput = document.getElementById("img-input");


// ============================================================
// 2. CHECK HTML ELEMENTS
// ============================================================

console.log("SAM: JavaScript loaded.");

if (!chat) console.error("SAM ERROR: #chat not found");
if (!input) console.error("SAM ERROR: #msg not found");
if (!sendBtn) console.error("SAM ERROR: #send not found");
if (!micBtn) console.error("SAM ERROR: #mic-btn not found");
if (!camBtn) console.error("SAM ERROR: #cam-btn not found");
if (!clearBtn) console.error("SAM ERROR: #clear-btn not found");
if (!imgInput) console.error("SAM ERROR: #img-input not found");


// ============================================================
// 3. GEMINI API KEY
// ============================================================

let API_KEY = localStorage.getItem("sam_key");

if (!API_KEY) {

    API_KEY = prompt(
        "Enter your Gemini API Key:"
    );

    if (API_KEY) {

        API_KEY = API_KEY.trim();

        localStorage.setItem(
            "sam_key",
            API_KEY
        );
    }
}


// ============================================================
// 4. GEMINI MODEL
// ============================================================

const GEMINI_MODEL =
    "gemini-3.8-flash";


// ============================================================
// 5. MEMORY
// ============================================================

let MEMORY = [];

try {

    MEMORY = JSON.parse(
        localStorage.getItem("sam_memory") || "[]"
    );

    if (!Array.isArray(MEMORY)) {
        MEMORY = [];
    }

} catch (error) {

    console.error(
        "SAM memory error:",
        error
    );

    MEMORY = [];
}


function saveMemory() {

    localStorage.setItem(
        "sam_memory",
        JSON.stringify(MEMORY)
    );
}


// ============================================================
// 6. STATE
// ============================================================

let lastSamResponse = "";

let timerList = [];

let stopwatchStart = null;
let stopwatchInterval = null;


// ============================================================
// 7. CHAT MESSAGE
// ============================================================

function add(text, type) {

    if (!chat) return;

    const message =
        document.createElement("div");

    message.className =
        "msg " + type;

    message.textContent =
        text;

    chat.appendChild(message);

    chat.scrollTop =
        chat.scrollHeight;

    return message;
}


// ============================================================
// 8. LOAD MEMORY
// ============================================================

function loadMemory() {

    if (!MEMORY.length) {

        add(
            "SAM: System ready. How can I help you?",
            "ai"
        );

        return;
    }

    MEMORY.forEach(function (item) {

        if (
            !item ||
            !item.role ||
            !item.text
        ) {
            return;
        }

        add(
            item.role === "user"
                ? "YOU: " + item.text
                : "SAM: " + item.text,
            item.role === "user"
                ? "user"
                : "ai"
        );
    });
}


// ============================================================
// 9. SPEECH OUTPUT
// ============================================================

function speak(text) {

    if (
        !text ||
        !("speechSynthesis" in window)
    ) {
        return;
    }

    try {

        speechSynthesis.cancel();

        const speech =
            new SpeechSynthesisUtterance(
                text
            );

        speech.rate = 1.05;
        speech.pitch = 0.9;
        speech.volume = 1;

        speechSynthesis.speak(
            speech
        );

    } catch (error) {

        console.error(
            "SAM speech error:",
            error
        );
    }
}


// ============================================================
// 10. TIME
// ============================================================

function getTime() {

    return (
        "The current time is " +
        new Date().toLocaleTimeString() +
        ", Boss."
    );
}


// ============================================================
// 11. DATE
// ============================================================

function getDate() {

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
        "."
    );
}


// ============================================================
// 12. CALCULATOR
// ============================================================

function calculate(expression) {

    let clean =
        expression
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/[^0-9+\-*/().%\s]/g, "");

    if (!clean.trim()) {

        return "I couldn't find a valid calculation.";
    }

    try {

        const result =
            Function(
                '"use strict"; return (' +
                clean +
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


// ============================================================
// 13. WEATHER
// ============================================================

async function getWeather() {

    if (!navigator.geolocation) {

        return (
            "Location services are not supported by this browser."
        );
    }

    return new Promise(function(resolve) {

        navigator.geolocation.getCurrentPosition(

            async function(position) {

                try {

                    const lat =
                        position.coords.latitude;

                    const lon =
                        position.coords.longitude;

                    const url =
                        "https://api.open-meteo.com/v1/forecast" +
                        "?latitude=" +
                        lat +
                        "&longitude=" +
                        lon +
                        "&current=temperature_2m,weather_code";

                    const response =
                        await fetch(url);

                    if (!response.ok) {

                        throw new Error(
                            "Weather request failed"
                        );
                    }

                    const data =
                        await response.json();

                    if (
                        !data.current ||
                        data.current.temperature_2m === undefined
                    ) {

                        resolve(
                            "Weather information is unavailable."
                        );

                        return;
                    }

                    resolve(
                        "The current temperature is " +
                        data.current.temperature_2m +
                        " degrees Celsius, Boss."
                    );

                } catch (error) {

                    console.error(
                        error
                    );

                    resolve(
                        "Unable to get weather information."
                    );
                }
            },

            function() {

                resolve(
                    "Please allow location access to check the weather."
                );
            }
        );
    });
}


// ============================================================
// 14. TELUGU TRANSLATION
// ============================================================

async function translateTelugu(text) {

    if (!text) {

        return (
            "Tell me what you want translated."
        );
    }

    try {

        const url =
            "https://api.mymemory.translated.net/get?q=" +
            encodeURIComponent(text) +
            "&langpair=en|te";

        const response =
            await fetch(url);

        if (!response.ok) {

            throw new Error(
                "Translation request failed"
            );
        }

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

        console.error(
            "Translation error:",
            error
        );

        return (
            "Translation service is unavailable."
        );
    }
}


// ============================================================
// 15. YOUTUBE SEARCH
// ============================================================

function youtubeSearch(query) {

    if (!query) {

        return "Tell me what to search on YouTube.";
    }

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


// ============================================================
// 16. GOOGLE SEARCH
// ============================================================

function googleSearch(query) {

    if (!query) {

        return "Tell me what you want to search.";
    }

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


// ============================================================
// 17. LOCATION
// ============================================================

function getLocation() {

    if (!navigator.geolocation) {

        return Promise.resolve(
            "Location services are not available."
        );
    }

    return new Promise(function(resolve) {

        navigator.geolocation.getCurrentPosition(

            function(position) {

                resolve(
                    "Your coordinates are latitude " +
                    position.coords.latitude.toFixed(4) +
                    " and longitude " +
                    position.coords.longitude.toFixed(4) +
                    "."
                );
            },

            function() {

                resolve(
                    "Please allow location access."
                );
            }
        );
    });
}


// ============================================================
// 18. RANDOM FACT
// ============================================================

function randomFact() {

    const facts = [

        "A day on Venus is longer than a year on Venus.",

        "Octopuses have three hearts.",

        "Light from the Sun takes about eight minutes to reach Earth.",

        "Honey can remain edible for a very long time when properly preserved.",

        "The human brain contains billions of neurons.",

        "Water can exist naturally in three states: solid, liquid and gas."

    ];

    return facts[
        Math.floor(
            Math.random() *
            facts.length
        )
    ];
}


// ============================================================
// 19. SMART TOOLS
// ============================================================

async function handleTools(text) {

    const original =
        text.trim();

    const t =
        original.toLowerCase();


    // TIME
    if (
        t === "time" ||
        t.includes("what time") ||
        t.includes("current time")
    ) {

        return getTime();
    }


    // DATE
    if (
        t === "date" ||
        t.includes("today's date") ||
        t.includes("what is the date") ||
        t.includes("what day is today")
    ) {

        return getDate();
    }


    // WEATHER
    if (
        t === "weather" ||
        t.includes("weather") ||
        t.includes("temperature")
    ) {

        return await getWeather();
    }


    // CALCULATOR
    const calcMatch =
        original.match(
            /^(?:calculate|calc|what is)\s+(.+)$/i
        );

    if (calcMatch) {

        return calculate(
            calcMatch[1]
        );
    }


    // TIMER
    const timerMatch =
        original.match(
            /(?:set\s+)?timer\s+(?:for\s+)?(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i
        );

    if (timerMatch) {

        const amount =
            Number(timerMatch[1]);

        const unit =
            timerMatch[2].toLowerCase();

        let ms =
            amount * 1000;

        if (
            unit.startsWith("min")
        ) {

            ms =
                amount * 60000;
        }

        if (
            unit.startsWith("hour") ||
            unit.startsWith("hr")
        ) {

            ms =
                amount * 3600000;
        }

        const timer =
            setTimeout(function() {

                const message =
                    "Boss, your timer is complete.";

                add(
                    "SAM: " + message,
                    "ai"
                );

                speak(message);

            }, ms);

        timerList.push(timer);

        return (
            "Timer set for " +
            amount +
            " " +
            unit +
            "."
        );
    }


    // START STOPWATCH
    if (
        t === "start stopwatch" ||
        t.includes("start stopwatch")
    ) {

        if (stopwatchInterval) {

            return (
                "The stopwatch is already running."
            );
        }

        stopwatchStart =
            Date.now();

        stopwatchInterval =
            setInterval(
                function() {

                    console.log(
                        "SAM stopwatch:",
                        Math.floor(
                            (
                                Date.now() -
                                stopwatchStart
                            ) / 1000
                        ),
                        "seconds"
                    );

                },
                1000
            );

        return "Stopwatch started.";
    }


    // STOP STOPWATCH
    if (
        t === "stop stopwatch" ||
        t.includes("stop stopwatch")
    ) {

        if (!stopwatchInterval) {

            return (
                "The stopwatch is not running."
            );
        }

        clearInterval(
            stopwatchInterval
        );

        stopwatchInterval =
            null;

        const seconds =
            Math.floor(
                (
                    Date.now() -
                    stopwatchStart
                ) / 1000
            );

        const minutes =
            Math.floor(
                seconds / 60
            );

        const remaining =
            seconds % 60;

        return (
            "Stopwatch stopped at " +
            minutes +
            " minutes " +
            remaining +
            " seconds."
        );
    }


    // TELUGU
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
                .replace(
                    /తెలుగు/g,
                    ""
                )
                .trim();

        return await translateTelugu(
            phrase
        );
    }


    // YOUTUBE
    if (
        t.startsWith("youtube ") ||
        t.startsWith("play ")
    ) {

        const query =
            original
                .replace(
                    /^(youtube|play)\s+/i,
                    ""
                )
                .trim();

        return youtubeSearch(
            query
        );
    }


    // GOOGLE
    if (
        t.startsWith("google ") ||
        t.startsWith("search google ")
    ) {

        const query =
            original
                .replace(
                    /^(google|search google)\s+/i,
                    ""
                )
                .trim();

        return googleSearch(
            query
        );
    }


    // LOCATION
    if (
        t.includes("where am i") ||
        t.includes("my location") ||
        t.includes("current location")
    ) {

        return await getLocation();
    }


    // RANDOM FACT
    if (
        t.includes("random fact") ||
        t.includes("tell me a fact") ||
        t.includes("interesting fact")
    ) {

        return randomFact();
    }


    // COPY
    if (
        t === "copy last response" ||
        t === "copy your last response"
    ) {

        if (!lastSamResponse) {

            return (
                "There is no SAM response to copy yet."
            );
        }

        try {

            await navigator.clipboard.writeText(
                lastSamResponse
            );

            return (
                "My last response has been copied."
            );

        } catch (error) {

            return (
                "Clipboard access is unavailable."
            );
        }
    }


    // REPEAT
    if (
        t === "speak again" ||
        t === "repeat that" ||
        t === "say that again"
    ) {

        if (!lastSamResponse) {

            return (
                "There is nothing to repeat."
            );
        }

        speak(
            lastSamResponse
        );

        return (
            "Repeating my last response."
        );
    }


    // TOOLS
    if (
        t === "sam tools" ||
        t === "show tools" ||
        t === "help" ||
        t === "what can you do"
    ) {

        return (
            "SAM tools: time, date, weather, timer, " +
            "stopwatch, calculator, Telugu translation, " +
            "YouTube search, Google search, location, " +
            "random facts, copy response, voice and image analysis."
        );
    }


    // NO TOOL
    return null;
}


// ============================================================
// 20. GEMINI
// ============================================================

async function callGemini(promptText) {

    if (!API_KEY) {

        throw new Error(
            "Gemini API key is missing."
        );
    }


    const history =
        MEMORY
            .slice(-12)
            .map(function(item) {

                return {

                    role:
                        item.role === "model"
                            ? "model"
                            : "user",

                    parts: [
                        {
                            text: item.text
                        }
                    ]
                };
            });


    history.push({

        role: "user",

        parts: [
  
