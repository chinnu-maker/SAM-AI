alert("SAM JavaScript is working!");

const send = document.getElementById("send");
const input = document.getElementById("msg");
const chat = document.getElementById("chat");

send.addEventListener("click", function () {
    chat.innerHTML +=
        '<div class="msg ai">SAM: Button is working!</div>';

    input.value = "";
});
