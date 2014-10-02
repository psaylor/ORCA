/*
References:
http://www.html5rocks.com/en/tutorials/getusermedia/intro/#toc-webaudio-api
http://modernizr.com/docs/
https://nusofthq.com/blog/recording-mp3-using-only-html5-and-javascript-recordmp3-js/
http://blog.groupbuddies.com/posts/39-tutorial-html-audio-capture-streaming-to-node-js-no-browser-extensions
http://www.smartjava.org/content/record-audio-using-webrtc-chrome-and-speech-recognition-websockets
utlimately most useful: https://github.com/noamtcohen/AudioStreamer
https://developer.mozilla.org/en-US/docs/Web/API/AudioContext.sampleRate
Old:
WAMI https://code.google.com/p/wami-recorder/

*/
$(function() {
	console.log("Initializing cross-browser audio capabilities");
	window.AudioContext = Modernizr.prefixed('AudioContext', window);
	navigator.getUserMedia = Modernizr.prefixed('getUserMedia', navigator);
	window.URL = Modernizr.prefixed('URL', window);
});

$(function() {
	console.log("Seting up context and methods");

	// var hasGetUserMedia = function () {
	// 	return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
	// 		navigator.mozGetUserMedia || navigator.msGetUserMedia);
	// };

	// if (hasGetUserMedia()) {
	// 	console.log("getUserMedia present");
	// } else {
	// 	console.log("getUserMedia not present in your browser");
	// 	alert('getUserMedia() is not supported in your browser');
	// }

	var audioContext =  window.AudioContext;
	console.log("AudioContext set up", audioContext);

	var session = {audio: true, video: false};

	var client = null;
	var recorder = null;
	var recording = false;
	var binStream = null;
	var recordBtn = $("#rec-btn");

	
	function toggleRecording(e) {
		recordBtn.toggleClass("btn-primary btn-danger");
		if (recording) {
			// stop recording
			recorder.disconnect();
			client.close();
			recording = false;
			return;
		}

		// otherwise not recording yet
		recording = true;
		client = new BinaryClient('ws://localhost:9001');
		console.log("client", client);

		client.on('open', function() {
			// for the sake of this example let's put the stream in the window
			console.log("Opening client connection");
			binStream = client.createStream();
		});
		startGetUserMedia();
	};

	if (navigator.getUserMedia) {
		console.log("Browser has getUserMedia");
		recordBtn.click(toggleRecording);
	} else {
		console.log("Browser does not support getUserMedia");
		alert("Browser does not support getUserMedia");
	}
	
	function startGetUserMedia() {
		navigator.getUserMedia(
			session,
			function(localMediaStream) {
				// you can only have 6 instances of audioContext at a time
				// Failed to construct 'AudioContext': number of hardware contexts reached maximum (6)
				var context = new audioContext();
				var audioInput = context.createMediaStreamSource(localMediaStream);
				console.log(audioInput);
				var bufferSize = 2048;

				// create a javascript node for recording
				recorder = context.createScriptProcessor(bufferSize, 1, 1);

				// specify the processing function
				recorder.onaudioprocess = recorderProcess;
				// connect the stream to our recorder
				audioInput.connect(recorder);
				// connect recorder to the previous destination
				recorder.connect(context.destination);

				console.log("audioInput", audioInput);
				console.log("recorder", recorder);
			},
			function(e) { // errorCallback
				console.log("Media access rejected.", e);
			}
		);
	}


	// TODO: investigate whether Socket.IO or BinaryJS is better for the binary comms
	function recorderProcess(audioProcessingEvent) {
		// since we are recording in mono we only need the left channel
		var left = audioProcessingEvent.inputBuffer.getChannelData(0); // PCM data samples from left channel
		binStream.write(convertFloat32ToInt16(left));
	};

	function convertFloat32ToInt16(buffer) {
        var l = buffer.length;
        var buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l])*0x7FFF;
        }
        return buf.buffer;
    };


	// var getAudioTracks = function() {
	// 	var audioTracks = [];
	// 	MediaStreamTrack.getSources(function(sourceInfos) {
	// 		for (var i = 0; i < sourceInfos.length; i++) {
	// 			var sourceInfo = sourceInfos[i];
	// 			if (sourceInfo.kind == 'audio') {
	// 				console.log(sourceInfo.id, sourceInfo.label || 'mic');
	// 				audioTracks.push(sourceInfo);
	// 			}
	// 		}
	// 	});
	// 	return audioTracks;
	// };

	// audioTracks = getAudioTracks();

});