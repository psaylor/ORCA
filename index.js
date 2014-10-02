$(function() {

  try {
    var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
  } catch(e) {
    console.error("No speech recognition detected.");
    return;
  }

  final_txpt = '';
  var recognizing = false;
  var ignore_onend = false;

  // configure the recognizer
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = function() {
    recognizing = true;
    console.log("Speech recognition started");
    $("#speech-mic").switchClass("btn-success", "btn-danger");
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
    $("#recognized-content-final").html(final_txpt);
    $("#recognized-content-interim").html(interim_txpt);
    console.log("Final transcript: " + final_txpt);
    console.log("Intermediate transcript: " + interim_txpt);
  };

  $("#speech-mic").click(function() {
    console.log("Clicked.");
    if (recognizing) {
      recognition.stop();
      $("#speech-mic").switchClass("btn-danger", "btn-success");
    } else {
      recognition.start();
    }
  });

  /* 
    Compares the txpt (X(1:N)) against the text (Y(1:M))
    Creates the N+1 x M+1 cost matrix D and returns it
  */
  DTWCost = function(text, txpt) {
    // initialize the cost matrix D
    // the top row and left column are all Inf
    // except for the top left corner which is 0
    N = txpt.length
    M = text.length
    var D = new Array(N+1)
    for (var n=0; n <= N; n++) {
      D[n] = new Array(M+1);
      D[n][0] = Infinity;
    }

    for (var m=1; m <= M; m++) {
      D[0][m] = Infinity;
    }

    D[0][0] = 0;

    // recursively fill in the rest of the matrix
    for (var m=1; m <= M; m++) {
      for (var n=1; n <= N; n++) {
        var cost = binaryCost( text[m], txpt[n] );
        D[n][m] = cost + Math.min(  D[n-1][m],      //insertion
                                    D[n][m-1],      // deletion
                                    D[n-1][m-1] );  // match
      }
    }
    return D;
  };

  var binaryCost = function(a, b) {
    if (a === b) {
      return 0;
    } else {
      return 1;
    }
  };

  DTWOptimalPath = function(D) {
    N = D.length - 1
    M = D[0].length - 1
    path = new Array();
    path.push([N, M]);
    var n = N;
    var m = M;
    console.log("Adding " + n + ", " + m);
    while ( !( (n===1) && (m===1) ) ) {
      if (n === 1) {
        console.log("n is 1");
        m = m -1;
      } else if (m === 1) {
        console.log("m is 1");
        n = n -1;
      } else {

        if ( D[n-1][m-1] <= D[n-1][m] ) {
          if ( D[n-1][m-1] <= D[n][m-1] ) {
            console.log("Diagonal: n-1, m-1 is smallest");
            n = n -1;
            m = m - 1;
          } else {
            console.log("Horizontal: n, m-1 is smallest");
            m = m - 1;
          }
        } else {
          if ( D[n-1][m] < D[n][m-1] ) {
            console.log("Vertical: n-1, m is smallest");
            n = n - 1;
          } else {
            console.log("Horizontal: n, m-1 is smallest");
            m = m - 1;
          }
        }
      }
      console.log("Adding " + n + ", " + m);
      path.push([n, m]);
    }
    path.push([0,0]);
    path.reverse();
    return path;
  };

  DTWAlignment = function(text, txpt, path) {
    console.log("Text: " + text);
    console.log("Txpt: " + txpt);
    console.log("Path: ");
    console.log(path);

    for (var i = 0; i < path.length; i++) {
      n = path[i][0];
      m = path[i][1];
      console.log(text[m] + " : " + txpt[n]);
    };
  };

  text = "pardoning";
  txpt = "persons";

  D = DTWCost(text, txpt);
  p = DTWOptimalPath(D);
  DTWAlignment(text, txpt, p);

});