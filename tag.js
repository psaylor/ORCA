(function($) {

    var nuturl;
    var nutname;

    
    $(document).ready(function() {

        try {
            var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
            var recognition = new SpeechRecognition();
            $("#speech-page-content").text("Got recognition");
        } catch(e) {
            var recognition = Object;
            $("#speech-page-content").text(e);
        }
        recognition.continuous = true;
        recognition.interimResults = true;

        var interimResult = '';
        var textAreaID = 'tagged-query';
        var textArea = $('#tagged-query');


        $('#speech-mic').click(function(){
            toggleRecognition();
        });

  var listening = false;
        var toggleRecognition = function() {
      if (listening){
    recognition.stop();
      } else {
    textArea.focus();
    recognition.start();
    $("#speech-mic").prop('value', 'Stop Listening');
    listening = true;
      }
        };

  function displayTaggedResult(data){
      var text = data.text;
      var tokens = data.tokens;
      var segments = data.segments;
      for(var i=0; i<segments.length; i++){
    var segment = segments[i];
    var stext = tokens.slice(segment.start, segment.end).join('&nbsp');
    
    textArea.append("<div class='wordDiv "+segment.label+"'><p class='wordSpan'>"+stext+"<p class='wordCat'>"+segment.label+"</div>");
    textArea.append("<div style:'clear:left'></div>");
      }
      textArea.append("<div class='eolDiv'>");
  }

  function tag(text){
      console.log("Text: '"+text+"'");
      $.getJSON(nuturl+nutname+'?jsonp=?', {'text' : text},
          function(data){
        displayTaggedResult(data);
          });
  }

        recognition.onresult = function (event) {
            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
        var text = event.results[i][0].transcript.trim();
        tag(text);
                } else {

                }
            }
        };

        recognition.onend = function() {
      $("#speech-mic").prop('value', 'Start Listening');
      listening = false;
        };
    });
})(jQuery);
