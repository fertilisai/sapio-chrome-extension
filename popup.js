// TODO:
// - fix gpt4 (fallback)
// - web access
// - quick @ctions (summarize, translate, answer, quiz, calc, search, suggest)
// - prompt suggestions
// - add tabs (chat, write, draw, dictate)
// - remove tips

// Variables
let openai_api_key;
let chat_model;
let comp_model;
let max_tokens;
let temperature;
let presence;
let system;
let convo;
let sent = [];
let isChat = true;
let msg_count = 0;
let index = 0;
//let text = "";

let variables = {
    openai_api_key: "",
    chat_model: "gpt-3.5-turbo",
    comp_model: "text-davinci-003",
    max_tokens: 256,
    temperature: 0.7,
    presence: 0
};

let tips = [
    "TIP: Click anywhere on a message to copy it to clipboard",
    "TIP: Play with the model parameters in the settings menu",
    "TIP: Use Enter to send a message",
    "TIP: Clear the chat for better result when you change subjects",
    "TIP: Use the arrow keys to navigate through your previous messages",
    "TIP: Enter @help to see a list of available commands (comming soon)",
    // "TIP: New features are added regularly. Type @features to see what's new",
];

// Set marked options
// `highlight` example uses https://highlightjs.org
marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: function(code, lang) {
    //   const hljs = require('highlight.js');
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-', // highlight.js css expects a top-level 'hljs' class.
    pedantic: false,
    gfm: true,
    breaks: true,
    silent: true,
    sanitize: false,
    smartypants: false,
    xhtml: false
});


// Initialize Variables
function retriveVariables(){
    openai_api_key = localStorage.getItem("openai_api_key") || "";
    chat_model = localStorage.getItem("chat_model") || 'gpt-3.5-turbo';
    comp_model = localStorage.getItem("comp_model") || 'text-davinci-003';
    max_tokens = parseInt(localStorage.getItem("max_tokens")) || 256;
    temperature = Number(localStorage.getItem("temperature")) || 0.7;
    presence = Number(localStorage.getItem("presence")) || 0;
    system = localStorage.getItem("system") || 'You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.';
    convo = localStorage.getItem("convo") || '[{"role": "system", "content": "'+system+'"}]';

    document.getElementById("api-key").value = openai_api_key;
    document.getElementById("chat-model").value = chat_model;
    document.getElementById("comp-model").value = comp_model;
    document.getElementById("max").value = max_tokens;
    document.getElementById("max-range").value = max_tokens;
    document.getElementById("temp").value = temperature;
    document.getElementById("temp-range").value = temperature * 100;
    document.getElementById("pres").value = presence;
    document.getElementById("pres-range").value = presence * 100;
    document.getElementById("system").value = system;
};

// Update Variables
const save = document.querySelector('#save');
save.addEventListener('click', updateVariables);

function updateVariables(){
    openai_api_key = document.getElementById("api-key").value;
    chat_model = document.getElementById("chat-model").value;
    comp_model = document.getElementById("comp-model").value;
    max_tokens = parseInt(document.getElementById("max").value);
    temperature = Number(document.getElementById("temp").value);
    presence = Number(document.getElementById("pres").value);
    if (system !== document.getElementById("system").value) {
        system = document.getElementById("system").value;
        clearMessage();
    };

    localStorage.setItem("openai_api_key", openai_api_key);
    localStorage.setItem("chat_model", chat_model);
    localStorage.setItem("comp_model", comp_model);
    localStorage.setItem("max_tokens", max_tokens);
    localStorage.setItem("temperature", temperature);
    localStorage.setItem("presence", presence);
    localStorage.setItem("system", system);
    showMessage();
};



// Dark Mode
const darkModeSwitch = document.querySelector('#dark-mode');
const bodyElement = document.querySelector('body');
const codeTheme = document.querySelector('#theme');

darkModeSwitch.addEventListener('change', (e) => {
  if (e.target.checked) {
    bodyElement.setAttribute('data-theme', 'dark');
    codeTheme.setAttribute('href', './css/harmonic16-dark.min.css');
    localStorage.setItem("theme", "dark");
    
  } else {
    bodyElement.setAttribute('data-theme', 'light');
    codeTheme.setAttribute('href', './css/harmonic16-light.min.css');
    localStorage.setItem("theme", "light");
  }
});

function setTheme() {
    if (localStorage.getItem("theme") !== null) {
        theme = localStorage.getItem("theme");
        bodyElement.setAttribute('data-theme', theme);
        darkModeSwitch.checked = (theme == "light") ? false : true;
        codeTheme.setAttribute('href', './css/harmonic16-'+theme+'.min.css');
    }
};

// Load Convo
function loadConvo(){
    let convo_obj = JSON.parse(convo);
    //console.log(convo_obj);
    for (let i = 1; i < convo_obj.length; i++) {
        let text = convo_obj[i].content;
        //text = text.trim().split('\n')
        //text = text.join('<br />');
        let type = convo_obj[i].role == "assistant" ? "completion" : "prompt";
        writeToChat(text, type);
    }
};

// Messenger Functions
const send = document.querySelector('#send');
const ask = document.querySelector('#ask');
ask.addEventListener('keyup', function(e){ if(e.keyCode == 13) sendMessage() });
send.addEventListener('click', function() { sendMessage(); } );
// ask.addEventListener('keyup', function(e){ if(e.keyCode == 13) checkAction(ask.value) });
// send.addEventListener('click', checkAction(ask.value));
ask.addEventListener('keyup', (event) => {
    if (index > -1) {
        if (event.keyCode === 38) { // up arrow key
            index--;
            if (index < 0) {
                index = 0;
            }
            ask.value = sent[index];
        } else if (event.keyCode === 40) { // down arrow key
            index++;
            if (index >= sent.length) {
                index = sent.length - 1;
                ask.value = '';
            } else {
                ask.value = sent[index];
            }
        }
    }
});

function checkAction(text){
    if (text.trim().startsWith("@")) {
        console.log(text)
        const match = text.trim().match(/@(\S+)/);
        console.log(match)
        if (match) {
            quickAction(match[0]);
        } else {
            sendMessage();
        }
    }
};

function quickAction(action){
    switch (action) {
        case "@help": 
            let text = "Here are some commands you can use:<br />" + 
                        "@help: Show this message<br />" + 
                        "@summarize: Summarize the current tab<br />" + 
                        "@translate: Translate the current tab<br />" + 
                        "@answer: Answer a question in the current tab<br />" + 
                        "@suggest: Suggest some follow up prompts<br />" + 
                        "@calc: Calculate a math expression<br />";
            writeToChat(ask.value,"prompt");
            ask.value = '';
            writeToChat(text,"completion");
            break;
        case "@summarize": 
            let html = getActiveTab();
            let article = new Readability(document).parse(html);
            text = 'sumaarize:' + article.textContent;
            writeToChat(ask.value,"prompt");
            // writeToChat(text,"completion");
            break;
        case "@translate": 
            writeToChat(ask.value,"prompt");
            // writeToChat(text,"completion");;
            break;
        case "@answer": 
            writeToChat(ask.value,"prompt");
            // writeToChat(text,"completion");
            break;
        case "@suggest": 
            writeToChat(ask.value,"prompt");
            // writeToChat(text,"completion");
            break;
        case "@calc": 
            writeToChat(ask.value,"prompt");
            // writeToChat(text,"completion");
            break;
        default:
            sendMessage();
    }
};


function sendMessage(){
    showMessage();
    // console.log(text);
    if ((openai_api_key === undefined) ||
        openai_api_key == "" || 
        openai_api_key.length != 51 || 
        openai_api_key.substring(0, 3) != "sk-") {
            let text = 'Please, enter a valid OpenAI API key in the settings menu. You can get one <a href="https://beta.openai.com/" target="_blank">here</a>.';
            writeToChat(text, "completion");
    } else {    
        let msg = ask.value;
        if (ask.value != '') { 
            ask.value = ''
            //console.log(msg);
            writeToChat(msg, "prompt");

            let text = ' <div aria-busy="true"></div> ';
            if (isChat) {  
                writeToChat(text, "completion loading");
                sendRequestChat(msg);
            } else {
                writeToChat(text, "completion loading");
                sendRequestComp(msg);
            }
        } 
    }
};

const messages = document.querySelector('.message-list');
const clear = document.querySelector('#clear');
clear.addEventListener('click', clearMessage);

function clearMessage(){
    sent = [];
    showMessage();
    convo = '[{"role": "system", "content": "'+system+'"}]';
    localStorage.setItem("convo", convo);
    messages.innerHTML = '';
    let randomTip = tips[Math.floor(Math.random() * tips.length)];
    writeToChat(randomTip, "completion");
};

// Chat Functions
function writeToChat (text, type) {
    // console.log(text);
    text = marked.parse(text);
    // console.log(text);
    let message;
    if (type == 'edit') {
        message = document.querySelector('.loading')
        message.classList.remove('loading');
        message.innerHTML = text;
    } else {
        ++msg_count;
        message = document.createElement('div');
        message.classList.add('message-line');
        message.innerHTML = '<div class="message '+type+'" id="msg-'+msg_count+'"><p>'+text+'</p></div>';
    }
    if (type =='prompt') {
        sent.push(text.replace(/<p>|<\/p>/gi,''));
        index = sent.length;
    } 
    
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    addListenerOnMessageClick('msg-'+msg_count);
}

// Settings Functions
const cancel = document.querySelector('#cancel');
cancel.addEventListener('click', toggleSettings);

const settings = document.querySelector('#settings');
settings.addEventListener('click', toggleSettings);

function toggleSettings(){
    if (document.querySelector('.settings-menu').style.display == "none") {
        document.querySelector('.message-list').style.display = "none";
        document.querySelector('.settings-menu').style.display = "block";
        retriveVariables();
    } else {
        document.querySelector('.settings-menu').style.display = "none";
        document.querySelector('.message-list').style.display=  "block";
    }
};

function showMessage(){
    if (document.querySelector('.settings-menu').style.display == "block") {
        document.querySelector('.settings-menu').style.display = "none";
        document.querySelector('.message-list').style.display = "block";
    }
    //retriveVariables();
};

// Slider
function slider(id, id_range, factor=1) {
    const id_slider = document.getElementById(id_range);
    const id_val = document.getElementById(id);
    id_val.value = id_slider.value / factor;
    
    id_slider.oninput = function() {
        id_val.value = this.value / factor;
    };
    id_val.oninput = function() {
        id_slider.value= this.value * factor;
    };
};

function addListenerOnMessageClick(id) {
    const id_val = document.getElementById(id);
    id_val.addEventListener('click', function() {
        let text = id_val.innerText;
        // Copy to clipboard
        navigator.clipboard.writeText(text);
    }
)};

// Update convo
function addPrompt(prompt) {
    convo = convo.slice(0,-1);
    convo = convo + ',{"role": "user", "content": '+ JSON.stringify(prompt) +' }]';
    localStorage.setItem("convo", convo)
};       

function addCompletion(completion) {
    convo = convo.slice(0,-1);
    convo = convo + ',{"role": "assistant", "content": '+ JSON.stringify(completion) +' }]';
    localStorage.setItem("convo", convo)
};

// API resquest to openai (completion)
let sendRequestComp = async function (prompt) {
    let response = await fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer '+ openai_api_key,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'model' : comp_model,
            'prompt' : prompt,
            'max_tokens' : max_tokens,
            'temperature' : temperature,
            'presence_penalty' : presence
        })
    })
    .then(response => response.json())
    .catch(error => console.log(error));

    // console.log(response.choices[0].text);
    // console.log(response);

    const r = await handleResponseComp(response);
};

function handleResponseComp(response) {
    //console.log(response);
    let answer = response.choices[0].text;
    //console.log(JSON.stringify(answer));
    addCompletion(answer);
    let text = answer.trim().split('\n')
    //writeCompletion(text);
    text = text.join('<br />');
    writeToChat(text, "edit");
};

// API resquest to openai (chat)
let sendRequestChat = async function (prompt) {

    addPrompt(prompt);
    //console.log(convo);
    let msgs = JSON.parse(convo);
    //console.log(msgs);

    let response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer '+ openai_api_key,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'model' : chat_model,
            'messages' : msgs,
            'max_tokens' : max_tokens,
            'temperature' : temperature,
            'presence_penalty' : presence
        })
    })
    .then(response => response.json())
    .catch(error => console.log(error));

    // console.log(response.choices[0].message.content);
    // console.log(response);

    const r = await handleResponseChat(response);
};

function handleResponseChat(response) {
    // console.log(response);
    let answer = response.choices[0].message.content;
    //console.log(JSON.stringify(answer));
    addCompletion(answer);
    // let text = answer.trim().split('\n')
    // text = text.join('<br />');
    let text = answer//.trim();
    // text = marked.parse(text);
    writeToChat(text, "edit");
};

// On Load
window.addEventListener('load', function() { 
    retriveVariables(); 
    setTheme();
    let randomTip = tips[Math.floor(Math.random() * tips.length)];
    writeToChat(randomTip, "completion");
    loadConvo();
    // Initiate Sliders
    slider("max", "max-range");
    slider("temp", "temp-range", 100);
    slider("pres", "pres-range", 100);
});

// function showChat(){
//     document.querySelector('.chatbox').style.display = "block";
//     document.querySelector('.chat').style.display = "none";
//     showMessage()
//     document.querySelector('#ask').focus();
// };
// function hideChat(){
//     document.querySelector('.chatbox').style.display = "none";
//     doc;ument.querySelector('.chat').style.display = "block";
// };
