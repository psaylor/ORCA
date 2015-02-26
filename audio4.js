/*
*/
$(function() {
	console.log("Initializing cross-browser audio capabilities");
	window.AudioContext = Modernizr.prefixed('AudioContext', window);
	navigator.getUserMedia = Modernizr.prefixed('getUserMedia', navigator);
	window.URL = Modernizr.prefixed('URL', window);
	console.log("Creating binary client");
	audioContext =  window.AudioContext;
	console.log("AudioContext set up", audioContext);
	if (navigator.getUserMedia) {
		console.log("Browser has getUserMedia");
	} else {
		console.log("Browser does not support getUserMedia");
		alert("Browser does not support getUserMedia");
	}
});

$(function() {
	console.log("Seting up context and methods");

	var context = new audioContext();

	var session = {audio: true, video: false};
	var audioInput = null;

	var getAverageVolume = function (typedArray) {
		var values = 0;
		var average;
		var length = typedArray.length;
		for (var i = 0; i < length; i++) {
			values += typedArray[i];
		}
		average = values / length;
		return average;
	};

	var BASE_METER_HEIGHT = 35;  // 35% filled
	var MAX_METER_HEIGHT = 100;  // 100% filled
	var VOLUME_TO_HEIGHT_SCALE = 1.0;

	var adjustVolumeMeter = function (averageVolume) {
		var filled_height = (BASE_METER_HEIGHT + (VOLUME_TO_HEIGHT_SCALE * averageVolume)).toFixed();
		var gray_height = MAX_METER_HEIGHT - Math.min(filled_height, MAX_METER_HEIGHT);
		$(".fa-microphone.fill").css("max-height", gray_height+"%");
		$("#vol").text(averageVolume.toFixed(0));
	};

	var ANALYSER_FFT_SIZE = 1024;
	var ANALYSER_SMOOTHING_TIME_CONSTANT = 0.3;

	var setupAudioNodes = function () {
		// called whenever the 2048 frames have been sampled, approx 21 times a second
		javascriptNode = context.createScriptProcessor(2048, 1, 1);
		javascriptNode.connect(context.destination);
		javascriptNode.onaudioprocess = function () {
			var array = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			var average = getAverageVolume(array);
			adjustVolumeMeter(average);
		};

		var analyser = context.createAnalyser();
		analyser.smoothingTimeConstant = ANALYSER_SMOOTHING_TIME_CONSTANT;
		analyser.fftSize = ANALYSER_FFT_SIZE;

		navigator.getUserMedia(
			session,
			function(localMediaStream) {
				audioInput = context.createMediaStreamSource(localMediaStream);
				audioInput.connect(analyser);
				analyser.connect(javascriptNode);
				javascriptNode.connect(context.destination);
			},
			function(e) { // errorCallback
				console.log("Media access rejected.", e);
			}
		);
	};

	setupAudioNodes();

});
