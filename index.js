$(function() {

  try {
    var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
  } catch(e) {
    console.error("No speech recognition detected.");
  }

  final_txpt = '';

  // configure the recognizer
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = function() {
    recognizing = true;
    console.log("Recognition started");
  };

  recognition.onerror = function(event) {
    if (event.error === 'no-speech') {
      console.error('No speech detected');
    } else if (event.error === 'aborted') {
      console.error('Speech input aborted');
    } else if (event.error === 'audio-capture') {
      console.error('Audio capture failed');
    } else if (event.error === 'not-allowed') {
      console.error('User disallowed speech input');
    }
    ignore_onend = true;
  };

  recognition.onend = function() {
    recognizing = false;
    if (ignore_onend) {
      ignore_onend = false;
      return;
    }
    console.log('Speech recognition ended');
  };

  recognition.onresult = function(event) {
    var interim_txpt = '';
    console.log("On result.");
    console.log(event);
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        final_txpt += event.results[i][0].transcript;
      } else {
        interim_txpt += event.results[i][0].transcript;
      }
    }
    console.log("Final transcript: " + final_txpt);
    console.log("Intermediate transcript: " + interim_txpt);
  };

});