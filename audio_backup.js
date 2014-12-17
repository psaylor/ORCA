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

// Remote
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
	var context = new audioContext();

	var session = {audio: true, video: false};

	client = null;
	var recorder = null;
	var connected = false;
	var recording = false;
	binStream = null;
	var recordBtn = $("#rec-btn");
	var numStreamWrites = 0;

	function setupStream() {
		if (binStream === null) {
			console.log("Setting up new stream");
			binStream = client.createStream();

			binStream.on('data', function(data) {
				console.log("Client stream received data: ", data);
			});

			binStream.on('end', function () {
				console.log("Client stream ended.");
			});

			binStream.on('close', function () {
				console.log("Client stream closed");
			});

			binStream.on('error', function (error) {
				console.log("Client stream encountered an error: ", error);
			});
		}
		recording = true;
		console.log("Set up stream: ", binStream);
		return binStream;
	}

	function teardownStream() {
		if (binStream === null) {
			return;
		}
		binStream.end();
		binStream = null;
	}
	
	function toggleRecording(e) {
		console.log("Toggling remote recording state");
		console.log("binStream: ", binStream);
		console.log("recording: ", recording);
		console.log("connected: ", connected);

		recordBtn.toggleClass("btn-primary btn-danger");
		if (recording) {
			// stop recording
			recorder.disconnect();
			teardownStream();
			recording = false;
			numStreamWrites = 0;
			return;
		}

		if (connected) {
			console.log("Already connected to remote server. Setting up stream.");
			setupStream();
			startGetUserMedia();
			return;
		}

		// otherwise not recording yet
		console.log("Trying to connect to remote server");
		// client = new BinaryClient('ws://sls-apache-0.csail.mit.edu:9001');
		// client = new BinaryClient('ws://sls-quad-27.csail.mit.edu:9001');
		client = new BinaryClient('ws://sugar-bear.csail.mit.edu:9001');
		
		console.log("client", client);


		client.on('open', function() {
			// client doesn't maintain an open/closed boolean variable so we have to
			connected = true;
			console.log("Opening client connection");
			setupStream();
		});

		client.on('close', function () {
			console.log("Client closed");
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
				// var context = new audioContext();
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
		var converted = convertFloat32ToInt16(left);
		binStream.write(converted);
		numStreamWrites+= 1;
		console.log("Writing %d length buffer to binary stream: %d ", converted.byteLength, numStreamWrites);
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

// Local
$(function() {
	console.log("Seting up context and methods");

	var audioContext =  window.AudioContext;
	console.log("Second AudioContext set up", audioContext);
	var context = new audioContext();

	var session = {audio: true, video: false};

	var client = null;
	var recorder = null;
	var connected = false;
	var recording = false;
	var binStream = null;
	var recordBtn = $("#rec-btn-local");
	var numStreamWrites = 0;

	function setupStream() {
		if (binStream === null) {
			console.log("Setting up new stream");
			binStream = client.createStream();

			binStream.on('data', function(data) {
				console.log("Client stream received data: ", data);
			});

			binStream.on('end', function () {
				console.log("Client stream ended.");
			});

			binStream.on('close', function () {
				console.log("Client stream closed");
			});

			binStream.on('error', function (error) {
				console.log("Client stream encountered an error: ", error);
			});
		}
		recording = true;
		console.log("Set up stream: ", binStream);
		return binStream;
	}

	function teardownStream() {
		if (binStream === null) {
			return;
		}
		binStream.end();
		binStream = null;
	}
	
	function toggleRecording(e) {
		console.log("Toggling local recording state");
		console.log("binStream: ", binStream);
		console.log("recording: ", recording);
		console.log("connected: ", connected);

		recordBtn.toggleClass("btn-primary btn-danger");
		if (recording) {
			// stop recording
			console.log("Stopping recording.");
			// TODO: maybe pause the recorder instead?
			// or disconnect the audioInput and reconnect it later
			recorder.disconnect();
			teardownStream();
			recording = false;
			numStreamWrites = 0;
			return;
		}

		if (connected) {
			console.log("Already connected. Setting up stream to local server.");
			setupStream();
			startGetUserMedia();
			return;
		}

		// otherwise not connected or recording yet
		console.log("Trying to make binary client to localhost 9001");
		console.log("Looking for local connection");
		client = new BinaryClient('ws://localhost:9001');
		console.log("client", client);

		client.on('open', function() {
			connected = true;
			// for the sake of this example let's put the stream in the window
			console.log("Opening client connection to local server");
			setupStream();
			
		});

		client.on('close', function () {
			console.log("Client closed");
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
				// var context = new audioContext();
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
		console.log("recorderProcess");
		// since we are recording in mono we only need the left channel
		var left = audioProcessingEvent.inputBuffer.getChannelData(0); // PCM data samples from left channel
		var converted = convertFloat32ToInt16(left);
		binStream.write(converted);
		numStreamWrites+= 1;
		console.log("Writing %d length buffer to binary stream: %d ", converted.byteLength, numStreamWrites);
	};

	function convertFloat32ToInt16(buffer) {
        var l = buffer.length;
        var buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l])*0x7FFF;
        }
        return buf.buffer;
    };

});