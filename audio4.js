'use strict';

$(function() { // whole-file closure to execute on page load

/* A self-calling function to initialize cross-browser audio capabilities
using Modernizr */
(function initializeCrossBrowser() {
	window.AudioContext = Modernizr.prefixed('AudioContext', window);
	navigator.getUserMedia = Modernizr.prefixed('getUserMedia', navigator);
	window.URL = Modernizr.prefixed('URL', window);

	if (navigator.getUserMedia) {
		console.log('Browser has getUserMedia');
	} else {
		console.log('Browser does not support getUserMedia');
		alert('Browser does not support getUserMedia');
	}	
})();

/* Gets the cached instance of AudioContext or creates it the first time */
// This function is created in a closure so the cached audioContext can be enclosed
var getAudioContext = (function genGetAudioContext() {
	var audioContext = undefined;

	var returnFunc = function() {
		if (audioContext) {
			return audioContext;
		} else {
			audioContext = new window.AudioContext();
			console.log('Created new AudioContext:', audioContext);
			return audioContext;
		}
	};

	return returnFunc;
})();

/* Computes and returns the average of the values in a typed array */
var getAverage = function(typedArray) {
	var valueSum = 0;
	var length = typedArray.length;

	for (var i = 0; i < length; i++) {
		valueSum += typedArray[i];
	}

	var average = valueSum / length;
	return average;
};

var enableVolumeMeter = function(volumeMeter, settings) {
	// Volume meter settings
	var BASE_METER_HEIGHT = 35;  // 35% filled
	var MAX_METER_HEIGHT = 100;  // 100% filled
	var VOLUME_TO_HEIGHT_SCALE = 1.0;

	// Analyser settings
	var ANALYSER_FFT_SIZE = 1024;
	var ANALYSER_SMOOTHING_TIME_CONSTANT = 0.3;

	// The jquery object for the adjustable part of the volume meter element(s)
	var volumeMeter = $('.fa-microphone.fill');
	// The jquery object for the numerical volume output
	var volumeText = $('#vol');

	/* Given the current averageVolume, updates the height of the volumeMeter */
	// should make this calculation configurable by passing in function to use
	// for calculating the new height
	var adjustVolumeMeter = function (averageVolume) {
		var filledHeight = (BASE_METER_HEIGHT + 
			(VOLUME_TO_HEIGHT_SCALE * averageVolume)).toFixed();
		var grayHeight = MAX_METER_HEIGHT - 
			Math.min(filledHeight, MAX_METER_HEIGHT);

		volumeMeter.css('max-height', grayHeight + '%');
		volumeText.text(averageVolume.toFixed(0));
	};

	/* Creates and connects audio nodes for listening to the user's microphone, 
	determining the average volume, and updating the volume meter
	*/
	var setupAudioNodes = function () {
		var audioContext = getAudioContext();
		var SESSION = {audio: true, video: false};

		// Create an AnalyserNode 
		var analyser = audioContext.createAnalyser();
		analyser.smoothingTimeConstant = ANALYSER_SMOOTHING_TIME_CONSTANT;
		analyser.fftSize = ANALYSER_FFT_SIZE;

		// Create a ScriptProcessorNode with a bufferSize of 2048, 1 input, and
		// 1 output.
		var javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

		// This function is called whenever the buffer of size 2048 is full,
		// approximately 21 times a second (assuming 44.1kHz sample rate)
		javascriptNode.onaudioprocess = function () {
			var array = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			var average = getAverage(array);
			adjustVolumeMeter(average);
		};

		

		navigator.getUserMedia(
			SESSION,
			function(localMediaStream) {
				var audioInput = audioContext.createMediaStreamSource(localMediaStream);
				audioInput.connect(analyser);
				analyser.connect(javascriptNode);
				javascriptNode.connect(audioContext.destination);
			},
			function(e) { // errorCallback
				console.log('Media access rejected.', e);
			}
		);
	};

	setupAudioNodes();

};

enableVolumeMeter();

}); // end of file closure
