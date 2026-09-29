// =====================================================
// SAM AI - BUTTON TEST VERSION
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("SAM JS LOADED");

    const send = document.getElementById("send");
    const input = document.getElementById("msg");
    const chat = document.getElementById("chat");
    const mic = document.getElementById("mic-btn");
    const camera = document.getElementById("cam-btn");
    const clear = document.getElementById("clear-btn");
    const imageInput = document.getElementById("img-input");

    // Check elements
    console.log("SEND:", send);
    console.log("INPUT:", input);
    console.log("CHAT:", chat);
    console.log("MIC:", mic);
    console.log("CAMERA:", camera);
    console.log("CLEAR:", clear);

    // -----------------------------
    // SEND BUTTON
    // -----------------------------

    if (send) {
        send.addEventListener("click", function () {

            const message = input.value.trim();

            if (message === "") {
                addMessage("SAM", "Please type something first.");
                return;
            }

            addMessage("YOU", message);

            input.value = "";

            setTimeout(function () {
                addMessage(
                    "SAM",
                    "I received your message: " + message
                );
            }, 500);
        });
    }

    // -----------------------------
    // ENTER KEY
    // -----------------------------

    if (input) {
        input.addEventListener("keydown", function (event) {

            if (event.key === "Enter") {
                event.preventDefault();

                if (send) {
                    send.click();
                }
            }

        });
    }

    // -----------------------------
    // MICROPHONE
    // -----------------------------

    if (mic) {

        mic.addEventListener("click", function () {

            if (
                !("webkitSpeechRecognition" in window) &&
                !("SpeechRecognition" in window)
            ) {
                addMessage(
                    "SAM",
                    "Voice recognition is not supported in this browser."
                );
                return;
            }

            const SpeechRecognition =
                window.SpeechRecognition ||
                window.webkitSpeechRecognition;

            const recognition = new SpeechRecognition();

            recognition.lang = "en-IN";
            recognition.continuous = false;
            recognition.interimResults = false;

            addMessage("SAM", "Listening...");

            recognition.start();

            recognition.onresult = function (event) {

                const text =
                    event.results[0][0].transcript;

                input.value = text;

                send.click();
            };

            recognition.onerror = function (event) {

                addMessage(
                    "SAM",
                    "Voice error: " + event.error
                );

            };

        });

    }

    // -----------------------------
    // CAMERA
    // -----------------------------

    if (camera && imageInput) {

        camera.addEventListener("click", function () {

            imageInput.click();

        });

        imageInput.addEventListener("change", function () {

            if (imageInput.files.length === 0) {
                return;
            }

            const file = imageInput.files[0];

            addMessage(
                "SAM",
                "Image selected: " + file.name
            );

        });

    }

    // -----------------------------
    // CLEAR MEMORY
    // -----------------------------

    if (clear) {

        clear.addEventListener("click", function () {

            localStorage.clear();

            if (chat) {
                chat.innerHTML = "";
            }

            addMessage(
                "SAM",
                "Memory cleared."
            );

        });

    }

    // -----------------------------
    // MESSAGE FUNCTION
    // -----------------------------

    function addMessage(sender, message) {

        if (!chat) {
            return;
        }

        const div = document.createElement("div");

        div.className = "msg";

        div.innerHTML =
            "<strong>" +
            sender +
            ":</strong> " +
            escapeHTML(message);

        chat.appendChild(div);

        chat.scrollTop = chat.scrollHeight;

    }

    // -----------------------------
    // SECURITY
    // -----------------------------

    function escapeHTML(text) {

        const div = document.createElement("div");

        div.textContent = text;

        return div.innerHTML;

    }

});
