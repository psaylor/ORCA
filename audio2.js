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

user selected text range: http://www.quirksmode.org/dom/range_intro.html

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
	if (navigator.getUserMedia) {
		console.log("Browser has getUserMedia");
	} else {
		console.log("Browser does not support getUserMedia");
		alert("Browser does not support getUserMedia");
	}
});

// Handle streams from the server
$(function() {
	// play any streams from the server as audio
	var context = new audioContext();
	client.on('stream', function (stream, meta) {
		console.log("Stream from server ", meta);
		if (meta.type === 'playback-result') {
			console.log("Audio stream from server");
			stream.on('data', function (data) {
				console.log("Streaming data from server ", data);
				context.decodeAudioData(data, function (buffer) {
					var source = context.createBufferSource();
					console.log('source:', source);
					source.buffer = buffer;
					source.connect(context.destination);
					source.start();				
				});

			});
		} else if (meta.type === 'timing-result') {
			var frag = meta.fragment;
			console.log("Server finished processing timing results for ", frag);
			$("[data-fragment="+frag+"]").data('enabled', true);
			$("[class=readable-fragment][data-fragment="+frag+"]")
			.removeClass('bg-info bg-warning').addClass('bg-success');
		}		

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
	
	var convertFloat32ToInt16 = function (buffer) {
        var l = buffer.length;
        var buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l])*0x7FFF;
        }
        return buf.buffer;
    };

	onDisplayPrepared = function () {
		var recordButton = $("#rec-btn");
		var storyLines = $(".readable-fragment");
		addTextSelectListeners();
		recordButtonSetup(recordButton, storyLines);
	};

	var addTextSelectListeners = function () {
		console.log("Adding text selection listeners");
		var content = $("#readable-content");
		content.on('mouseup', function (e) {
			console.log("Dragging started");
			var userSelection;
			if (window.getSelection) {
				console.log("Has window.getSelection");
				userSelection = window.getSelection();
			} else if (document.selection) {
				console.log("Has document.selection");
				userSelection = document.selection.createRange();
			}
			console.log("userSelection: ", userSelection);
			if (userSelection.type !== "Range") {
				return;
			}
			range = userSelection.getRangeAt(0);
			console.log("range: ", range);
			rangeStart = $(range.startContainer.parentElement);
			rangeEnd = $(range.endContainer.parentElement);
			var playbackFragment = rangeStart.data("fragment");
			var playbackStartIndex = rangeStart.data("index");
			var playbackEndIndex = rangeEnd.data("index");
			if (rangeEnd.data("fragment") !== playbackFragment) {
				playbackEndIndex = -1;
			}
			if (rangeStart.data("enabled")) {
				console.log("Playback is enabled");
			} else {
				console.log("Playback is not yet ready");
			}
			alert("User selected: " + range.toString() + "\nFragment: " + playbackFragment + " Start: " + playbackStartIndex + " End: " + playbackEndIndex);

			
		});
		
	};

	var recordButtonSetup = function (recordBtn, fragmentElements) {
		console.log("Setting up record button", recordBtn, fragmentElements);
		var fragmentIndex = 0;
		var fragmentElement = $(fragmentElements[fragmentIndex]);
		fragmentElement.addClass("bg-info");
		var recorder = null;
		var recording = false;
		var binStream = null;

		var getCurrentFragment = function () {
			return fragmentElement;
		};

		var setupStream = function () {
			if (binStream === null) {
				console.log("Setting up new stream");
				var setupMetadata = { 
					"fragment": fragmentElement.data("fragment"),
					"text": fragmentElement.data("text")
				};
				binStream = client.createStream(setupMetadata);

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
		};

		var teardownStream = function () {
			if (binStream === null) {
				return;
			}
			binStream.end();
			binStream = null;
		};

		// TODO: investigate whether Socket.IO or BinaryJS is better for the binary comms
		var recorderProcess = function (audioProcessingEvent) {
			// since we are recording in mono we only need the left channel
			var left = audioProcessingEvent.inputBuffer.getChannelData(0); // PCM data samples from left channel
			var converted = convertFloat32ToInt16(left);
			binStream.write(converted);
			console.log("Writing %d length buffer to binary stream: %d ", converted.byteLength);
		};

		var startGetUserMedia = function () {
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

					console.log("Connected recorder", recorder);
				},
				function(e) { // errorCallback
					console.log("Media access rejected.", e);
				}
			);
		};

		var updateFragmentVars = function () {
			fragmentIndex+= 1;
			if (fragmentIndex < fragmentElements.length) {
				fragmentElement = $(fragmentElements[fragmentIndex]);
				fragmentid = fragmentElement.data("fragment");
				fragmentElement.addClass('bg-info');
			} else {
				console.log("Exceeded fragment index.");
				fragmentElement = null;
				fragmentid = null;
			}
			console.log("Updating Fragment: ", fragmentElement, fragmentid);
		}

		var toggleRecording = function (e) {
			console.log("Toggling recording state");
			console.log("binStream: ", binStream);
			console.log("recording: ", recording);

			$(recordBtn).toggleClass("btn-primary btn-danger");
			if (recording) {
				// stop recording
				console.log("Disconnecting recorder ", recorder);
				recorder.disconnect();
				teardownStream();
				recording = false;
				fragmentElement.removeClass('bg-warning bg-info');
				updateFragmentVars();
				return;
			}
			// start recording
			$("[id|=word-btn]").attr('enabled', false);
			setupStream();
			fragmentElement.removeClass('bg-info').addClass('bg-warning');
			startGetUserMedia();
			return;
		};

		$(recordBtn).click(toggleRecording);
		$(recordBtn).hover(
			function hoverIn(e) {
				if (recording) {
					return;
				}
				getCurrentFragment().removeClass("bg-info").addClass('bg-warning');
			}, 
			function hoverOut(e) {
				if (recording) {
					return;
				}
				getCurrentFragment().addClass("bg-info").removeClass("bg-warning");
			});
	};
});

$(function() {
	console.log("Trying to read the north wind");
	$.get("the_north_wind.xml", function (xml_data) {
		// xml_data is an XML Document parsed from the file
		var $xml_data = $(xml_data);
		var title = $xml_data.find("title").text();
		title = $.trim(title);
		var content = $xml_data.find("content").text();
		content = $.trim(content).split(/\n/);
		console.log(title, content);
		prepareReadableDisplay({title: title, content: content});
	});

	var gen_wordButtonListener = function (btn, frag, ind, word) {
		return function requestPlayback (e) {
			if (btn.data("enabled")) {
				var metadata = {word: word, fragment: frag, index: ind, type: 'playback-request'};
				console.log("Clicked word button: ", metadata);
				client.createStream(metadata);
			} else {
				console.log("Clicked disabled word button");
			}
			
		};
	}

	var prepareReadableDisplay = function (readable) {
		// expects readable {title: 't', content: ['c', 'o']}
		var title = readable.title;
		var content = readable.content;
		console.log("Preparing ", title, content);

		var titleNode = $('<h3>', {id: 'title', text: title});
		$('h1').after(titleNode);

		var storyElement = $("#readable-content");

		for (var i = 0; i < content.length; i++) {
			var line = content[i];

			var lineElement = $('<span>').attr('id', 'fragment-'+i).addClass('readable-fragment');
			lineElement.data('text', line);
			// this can either be set as an attr or as data, but only setting it as an attribute makes it
			// jquery selector searchable
			lineElement.attr('data-fragment', i);

			var phrases = line.split(' ');
			for (var j = 0; j < phrases.length; j++) {
				var id = 'word-btn-' + i + '-' + j;
				var wordButton = $('<span>').attr('id', id).text(phrases[j]);
				// this can either be set as an attr or as data, but only setting it as an attribute makes it
			// jquery selector searchable
				wordButton.attr("data-fragment", i);
				wordButton.data("enabled", false);
				wordButton.data("index", j);
				wordButton.click(gen_wordButtonListener(wordButton, i, j, phrases[j]));
				lineElement.append(wordButton);
				lineElement.append(" ");
			}
			storyElement.append(lineElement);
		}

		onDisplayPrepared();
	};

});