// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function() {

  // We'll ask the browser to use strict code to help us catch errors earlier.
  // https://developer.mozilla.org/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode
  'use strict';
  var EMPTY = '';
  var DEFAULT_NAME = "Enter Name Here";
  var DEFAULT_MESSAGE = "Enter Message Here";

  var translate = navigator.mozL10n.get;

  var button = document.getElementById('send-button');
  button.addEventListener('click', sendMessage);
  var input_name = document.getElementById('input-name');
  var input_message = document.getElementById('input-message');
  var messages = document.getElementById('messages');

  var CHAT_PORT = 9900;
  var MULTICAST_ADDRESS = '224.0.0.255';
  var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
  var seq = 0;
  var peers = {};

  var socket = null;

  function appendMessage(txt) {
    var item = document.createElement('p');
    item.textContent = txt;
    messages.appendChild(item);
  }

  function receiveMessage(msg) {
    console.log('receive message');
    var data = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(msg.data)));

    if(peers.hasOwnProperty(data.id) && data.seq <= peers[data.id]) {
      return;
    }

    peers[data.id] = data.seq;

    console.log(data.from, data.content);
    appendMessage('<' + data.from + '> ' + data.content);
  }

  function sendMessage() {
    console.log('send message');
    if(input_message.value == EMPTY) return;

    if(!socket) {
      setTimeout(setup, 1000);
      return;
    }

    if(!(input_name.value.length && input_message.value.length)) {
      return;
    }

    var message = JSON.stringify({
      id: id,
      seq: ++ seq,
      from: input_name.value,
      content: input_message.value,
      time: Date.now(),
    });

    try {
      socket.send(message, MULTICAST_ADDRESS, CHAT_PORT);
      console.log(message);
      input_message.value = EMPTY;
    } catch(e) {
      console.error(e.message, e.stack);
      button.disabled = true;
      setTimeout(setup, 1000);
      return;
    }
  }

  function setup() {
    if(socket) {
      button.disabled = false;
      return;
    }

    button.disabled = true;
    console.log('send disabled');

    try {
      socket = new UDPSocket({loopback: true, localPort: CHAT_PORT});
      console.log('socket created');
    } catch(e) {
      console.error(e.message, e.stack);
      socket = null;
      setTimeout(setup, 1000);
      return;
    }

    socket.joinMulticastGroup(MULTICAST_ADDRESS);
    console.log('join multicast group');

    socket.opened.then(function() {
      socket.addEventListener('message', receiveMessage);
      button.disabled = false;
      console.log('send enabled');
    });
  }

  // We want to wait until the localisations library has loaded all the strings.
  // So we'll tell it to let us know once it's ready.
  navigator.mozL10n.once(setup);

  //UI behjavioours
  input_name.value = DEFAULT_NAME;
  input_message.value = DEFAULT_MESSAGE;
  input_name.onfocus = function() {
    if(input_name.value == DEFAULT_NAME) {
      input_name.value = EMPTY;
    }
  }
  input_name.onblur = function() {
    if(input_name.value == EMPTY) {
      input_name.value = DEFAULT_NAME;
    }
  }
  input_name.onkeypress = function(k) {
    if(k.charCode === 13) {
      input_message.focus();
    }
  }

  input_message.onfocus = function() {
    if(input_message.value == DEFAULT_MESSAGE) {
      input_message.value = EMPTY;
    }
  }
  input_message.onblur = function() {
    if(input_message.value == EMPTY) {
      input_message.value = DEFAULT_MESSAGE;
    }
  }
  input_message.onkeypress = function(k) {
    if(k.charCode === 13) {
      sendMessage();
    }
  }

});
