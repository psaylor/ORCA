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
	console.log("Creating binary client");
	client = new BinaryClient('ws://sugar-bear.csail.mit.edu:9001');
	console.log("Client: ", client);
	client.on('open', function () {
		console.log("Connected open!!!!!!!");
	});
	client.on('close', function () {
		console.log("Client closed");
	});
	audioContext =  window.AudioContext;
	console.log("AudioContext set up", audioContext);
});

$(function() {
	var wordBtn = $("#word-btn-1");
	var metadata = {word: 'the', fragment: 0, index: 0, type: 'playback-request'};
	wordBtn.click( function (e) {
		console.log("Clicked word button: ", metadata);
		var stream = client.createStream(metadata);
	});
});

$(function() {
	var wordBtn = $("#word-btn-2");
	var metadata = {word: 'north', fragment: 0, index: 1, type: 'playback-request'};
	wordBtn.click( function (e) {
		console.log("Clicked word button: ", metadata);
		var stream = client.createStream(metadata);
	});
});

$(function() {
	var wordBtn = $("#word-btn-3");
	var metadata = {word: 'wind', fragment: 0, index: 2, type: 'playback-request'};
	wordBtn.click( function (e) {
		console.log("Clicked word button: ", metadata);
		var stream = client.createStream(metadata);
	});
});

$(function() {
	var wordBtn = $("#word-btn-4");
	var metadata = {word: 'and', fragment: 0, index: 3, type: 'playback-request'};
	wordBtn.click( function (e) {
		console.log("Clicked word button: ", metadata);
		var stream = client.createStream(metadata);
	});
});

$(function() {
	var wordBtn = $("#word-btn-5");
	var metadata = {word: 'the', fragment: 0, index: 4, type: 'playback-request'};
	wordBtn.click( function (e) {
		console.log("Clicked word button: ", metadata);
		var stream = client.createStream(metadata);
	});
});

$(function() {
	var wordBtn = $("#word-btn-6");
	var metadata = {word: 'sun', fragment: 0, index: 5, type: 'playback-request'};
	wordBtn.click( function (e) {
		console.log("Clicked word button: ", metadata);
		var stream = client.createStream(metadata);
	});
});

$(function() {
	var context = new audioContext();
	client.on('stream', function (stream, meta) {
		console.log("Stream back audio from server ", meta);

		stream.on('data', function (data) {
			console.log("Streaming data from server ", data);
			context.decodeAudioData(data, function (buffer) {
				var source = context.createBufferSource();
				console.log('source:', source);
				source.buffer = buffer;
				source.connect(context.destination);
				source.start();
				// if (startTime >= playedTime && startTime <= playedTime + buffer.duration) {
				// 	console.log("allow to play");
				// 	playedTime += buffer.duration;
				// 	source.start(0, startTime, duration);
				// } else {
				// 	console.log("start time has already passed");
				// 	playedTime += buffer.duration;
				// }
				
			});

		});

		stream.on('end', function () {
			console.log("Stream from server ended");
		});
	});
});


// Remote
$(function() {
	console.log("Seting up context and methods");

	var context = new audioContext();

	var session = {audio: true, video: false};

	var recorder = null;
	var connected = false;
	var recording = false;
	var binStream = null;
	var recordBtn = $("#rec-btn-1");
	var metadata = {text: "the north wind and the sun", fragment: 1};
	var numStreamWrites = 0;

	function setupStream() {
		if (binStream === null) {
			console.log("Setting up new stream");
			binStream = client.createStream(metadata);

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

		console.log("Already connected to remote server. Setting up stream.");
		setupStream();
		startGetUserMedia();
		return;
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

});

// Local
$(function() {
	console.log("Seting up context and methods");

	var context = new audioContext();

	var session = {audio: true, video: false};

	var recorder = null;
	var connected = false;
	var recording = false;
	var binStream = null;
	var recordBtn = $("#rec-btn-2");
	var metadata = {text: "were disputing which was the stronger", fragment: 2};
	var numStreamWrites = 0;

	function setupStream() {
		if (binStream === null) {
			console.log("Setting up new stream");
			binStream = client.createStream(metadata);

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

		console.log("Already connected. Setting up stream to local server.");
		setupStream();
		startGetUserMedia();
		return;
	
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