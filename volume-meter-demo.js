'use strict';

$(function() { // whole-file closure to execute on page load

/* A self-calling function to initialize cross-browser audio capabilities
using Modernizr */
(function initializeCrossBrowser() {
    window.AudioContext = Modernizr.prefixed('AudioContext', window);
    navigator.getUserMedia = Modernizr.prefixed('getUserMedia', navigator);
    window.URL = Modernizr.prefixed('URL', window);
    window.requestAnimationFrame = Modernizr.prefixed('requestAnimationFrame', window);
    window.cancelAnimationFrame = Modernizr.prefixed('cancelAnimationFrame', window);

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
var getAverage = function(typedArray, fromIndex, toIndex) {
    var valueSum = 0;

    var fromIndex = fromIndex || 0;
    var toIndex = toIndex || typedArray.length;

    for (var i = fromIndex; i < toIndex; i++) {
        valueSum += typedArray[i];
    }

    var average = valueSum / (toIndex - fromIndex);
    return average;
};

var sigmoid = function(t) {
    return 1/(1+Math.pow(Math.E, -t));
};

var enableVolumeMeter = function(volumeMeter, settings) {
    // Volume meter settings
    var BASE_METER_HEIGHT = 35;  // 35% filled
    var MAX_METER_HEIGHT = 100;  // 100% filled
    var remainingHeight = MAX_METER_HEIGHT - BASE_METER_HEIGHT;
    var VOLUME_TO_HEIGHT_SCALE = 1.0;

    // Analyser settings
    var ANALYSER_FFT_SIZE = 128;
    var ANALYSER_SMOOTHING_TIME_CONSTANT = 0.5;

    // The jquery object for the adjustable part of the volume meter element(s)
    // var volumeMeter = $('.fa-microphone.fill');
    var volumeMeterUnfilteredAll = $('.fa-microphone.fill.unfiltered-all');
    var volumeMeterUnfilteredRanged = $('.fa-microphone.fill.unfiltered-ranged');
    // var volumeMeterFiltered = $('.fa-microphone.fill.filtered');
    var volumeMeterFilteredAll = $('.fa-microphone.fill.filtered-all');
    var volumeMeterFilteredRanged = $('.fa-microphone.fill.filtered-ranged');

    // var volumeMeterUnfilteredRangedSigmoid = $('.unfiltered-ranged-sigmoid');
    // var volumeMeterFilteredRangedSigmoid = $('.filtered-ranged-sigmoid');

    // The jquery object for the numerical volume output
    var volumeText = $('#vol');

    var canvas1, canvas2;
    var gradient1, gradient2;
    var drawSpectrum;

    var initCanvasVisualization = function() {
        canvas1 = $('#canvas-1').get()[0].getContext('2d');
        canvas2 = $('#canvas-2').get()[0].getContext('2d');

        gradient1 = canvas1.createLinearGradient(0, 0, 0, 300);
        gradient1.addColorStop(1, '#000000');
        gradient1.addColorStop(0.75, '#ff0000');
        gradient1.addColorStop(0.25, '#ffff00');
        gradient1.addColorStop(0, '#ffffff');

        gradient2 = canvas2.createLinearGradient(0, 0, 0, 300);
        gradient2.addColorStop(1, '#000000');
        gradient2.addColorStop(0.75, '#0000ff');
        gradient2.addColorStop(0.25, '#00ffff');
        gradient2.addColorStop(0, '#ffffff');

        drawSpectrum = function (typedArray, canvas, gradient) {
            canvas.clearRect(0, 0, 1000, 325);
            canvas.fillStyle = gradient;
            for (var i = 0; i < (typedArray.length); i++) {
                var value = typedArray[i];
                canvas.fillRect(i*5, 325 - value, 3, 325);
            }
        };
    };
    
    window.getFrequencyIndex = function(frequency) {
        var sampleRate = 44100;
        var index = Math.floor((frequency * ANALYSER_FFT_SIZE) / sampleRate);
        return index;
    };

    window.getFrequencyRangeForIndex = function(index) {
        var sampleRate = 44100;
        var minF = (index * sampleRate) / ANALYSER_FFT_SIZE;
        var maxF = ((index + 1) * sampleRate) / ANALYSER_FFT_SIZE;
        return [minF, maxF];
    };

    var minFreqIndex = window.getFrequencyIndex(300);
    var maxFreqIndex = window.getFrequencyIndex(3300);
    var maxObsFreq = 16000;
    var interestingIndex = window.getFrequencyIndex(maxObsFreq);

    var spectrumBars, filteredSpectrumBars;
    var adjacentUnfiltered, adjacentFiltered;

    var initDivVisualization = function() {
        var spectrum = $('#spectrum-1');
        var filteredSpectrum = $('#spectrum-2');
        var adjacentSpectrum = $('#spectrum-3');

        var barSize = 4; // 4px
        var barSpacing = 1; // 1px
        var barWidth = barSize + barSpacing;
        var numBars = ANALYSER_FFT_SIZE / 2;

        spectrum.width(numBars * 2 * barWidth);
        filteredSpectrum.width(numBars * 2 * barWidth);
        adjacentSpectrum.width(numBars * 2 * barWidth);

        for (var i = 0; i < numBars; i++) {
            var leftPosition = i * 2 * barWidth;
            var unfilteredBar = $('<div>')
                .addClass('spectrum-bar unfiltered')
                .css("width", barSize + 'px')
                .css("left", leftPosition)
                .appendTo(spectrum);
            var filteredBar = $('<div>')
                .addClass('spectrum-bar filtered')
                .css("width", barSize + 'px')
                .css("left", leftPosition)
                .appendTo(filteredSpectrum);
            if ((i >= minFreqIndex) && (i <= maxFreqIndex)) {
                unfilteredBar.addClass('human-range');
                filteredBar.addClass('human-range');
            }

            if (i === interestingIndex) {
                $('<div>')
                    .addClass('spectrum-ruler')
                    .css('left', leftPosition)
                    .tooltip({
                        placement: 'right',
                        title: maxObsFreq + ' Hz',
                    })
                    .appendTo(spectrum);
                $('<div>')
                    .addClass('spectrum-ruler')
                    .css('left', leftPosition)
                    .tooltip({
                        placement: 'right',
                        title: maxObsFreq + ' Hz',
                    })
                    .appendTo(filteredSpectrum);
            }

            unfilteredBar = $('<div>').addClass('spectrum-bar unfiltered')
                .css("width", barSize + 'px')
                .css("left", leftPosition)
                .appendTo(adjacentSpectrum);
            filteredBar = $('<div>').addClass('spectrum-bar filtered')
                .css("width", barSize + 'px')
                .css("left", leftPosition + barWidth)
                .appendTo(adjacentSpectrum);

            if ((i >= minFreqIndex) && (i <= maxFreqIndex)) {
                unfilteredBar.addClass('human-range');
                filteredBar.addClass('human-range');
            }
            if (i === interestingIndex) {
                $('<div>')
                    .addClass('spectrum-ruler')
                    .css('left', leftPosition)
                    .tooltip({
                        placement: 'right',
                        title: maxObsFreq + ' Hz',
                    })
                    .appendTo(adjacentSpectrum);
            }
        }

        spectrumBars = $('#spectrum-1 > div.spectrum-bar');
        filteredSpectrumBars = $('#spectrum-2 > div.spectrum-bar');
        adjacentUnfiltered = $('#spectrum-3 > div.spectrum-bar.unfiltered');
        adjacentFiltered = $('#spectrum-3 > div.spectrum-bar.filtered');

        drawSpectrum = function (typedArray, spectrumBars) {
            spectrumBars.each(function(index, bar) {
                bar.style.height = Math.abs(typedArray[index]) + 'px';
            });
        };
    };

    // initCanvasVisualization();
    initDivVisualization();

    /* Given the current averageVolume, updates the height of the volumeMeter */
    // should make this calculation configurable by passing in function to use
    // for calculating the new height
    // volumeLevel is between 0 and 1, where 1 is max volume
    var adjustVolumeMeter = function(volumeMeter, volumeLevel) {
        var filledHeight = (volumeLevel * remainingHeight) + BASE_METER_HEIGHT;
        filledHeight = filledHeight.toFixed();
        // var filledHeight = (BASE_METER_HEIGHT + 
            // (VOLUME_TO_HEIGHT_SCALE * volumeLevel)).toFixed();
        var grayHeight = MAX_METER_HEIGHT - 
            Math.min(filledHeight, MAX_METER_HEIGHT);

        volumeMeter.css('max-height', grayHeight + '%');
        
    };

    /* Creates and connects audio nodes for listening to the user's microphone, 
    determining the average volume, and updating the volume meter
    */
    var setupAudioNodes = function () {
        var audioContext = getAudioContext();
        var SESSION = {audio: true, video: false};

        // Create an AnalyserNode for the filtered and unfiltered audio
        var analyserUnfiltered = audioContext.createAnalyser();
        analyserUnfiltered.smoothingTimeConstant = ANALYSER_SMOOTHING_TIME_CONSTANT;
        analyserUnfiltered.fftSize = ANALYSER_FFT_SIZE;
        
        var analyserFiltered = audioContext.createAnalyser();
        analyserFiltered.smoothingTimeConstant = ANALYSER_SMOOTHING_TIME_CONSTANT;
        analyserFiltered.fftSize = ANALYSER_FFT_SIZE;

        // Create a lowpass and a highpass filter
        var LOW_CUTOFF = 300;
        var HIGH_CUTOFF = 3300;

        var lowPassFilter = audioContext.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        lowPassFilter.frequency.value = HIGH_CUTOFF;

        var highPassFilter = audioContext.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.value = LOW_CUTOFF;


        // Create a ScriptProcessorNode with a bufferSize of 2048, 1 input, and
        // 1 output.
        var javascriptNodeUnfiltered = audioContext.createScriptProcessor(2048, 1, 1);

        // This function is called whenever the buffer of size 2048 is full,
        // approximately 21 times a second (assuming 44.1kHz sample rate)
        javascriptNodeUnfiltered.onaudioprocess = function () {
            // max value of any element is 255
            // console.log("Processing unfiltered audio");
            var array = new Uint8Array(analyserUnfiltered.frequencyBinCount);
            analyserUnfiltered.getByteFrequencyData(array);
            var averageRanged = getAverage(array, minFreqIndex, maxFreqIndex) / 256;
            var averageAll = getAverage(array) / 256;

            adjustVolumeMeter(volumeMeterUnfilteredAll, averageAll);
            adjustVolumeMeter(volumeMeterUnfilteredRanged, averageRanged);
            // adjustVolumeMeterSigmoid(volumeMeterUnfilteredRangedSigmoid, averageRanged);
            volumeText.text((averageAll*100).toFixed(0));
            drawSpectrum(array, spectrumBars);
            drawSpectrum(array, adjacentUnfiltered);

        }; 

        var javascriptNodeFiltered = audioContext.createScriptProcessor(2048, 1, 1);

        javascriptNodeFiltered.onaudioprocess = function () {
            // max value of any element is 255
            // console.log("Processing filtered audio");
            var array = new Uint8Array(analyserFiltered.frequencyBinCount);
            analyserFiltered.getByteFrequencyData(array);
            var averageAll = getAverage(array) / 256;
            var averageRanged = getAverage(array, minFreqIndex, maxFreqIndex) / 256;
            adjustVolumeMeter(volumeMeterFilteredAll, averageAll);
            adjustVolumeMeter(volumeMeterFilteredRanged, averageRanged);
            // adjustVolumeMeterSigmoid(volumeMeterFilteredRangedSigmoid, averageRanged);
            drawSpectrum(array, filteredSpectrumBars);
            drawSpectrum(array, adjacentFiltered);

        }; 

        // var frequencyData = new Uint8Array(analyser.frequencyBinCount);
        // var update = function() {
        //     // if (!frequencyData) {
        //         analyser.getByteFrequencyData(frequencyData);
        //         window.requestAnimationFrame(update);
        //     // }
            
        //     // drawSpectrum(array, canvas1, gradient1);
        //     // drawSpectrum(array, canvas2, gradient2);
        //     // drawSpectrum(frequencyData, spectrumBars);
        //     // drawSpectrum(frequencyData, filteredSpectrumBars);
        //     drawSpectrum(frequencyData, adjacentUnfiltered);
        //     drawSpectrum(frequencyData, adjacentFiltered);
        // };   

        navigator.getUserMedia(
            SESSION,
            function(localMediaStream) {
                var audioInput = audioContext.createMediaStreamSource(localMediaStream);
                // Connect the unfiltered stream
                window.GLOB = window.GLOB || {};
                window.GLOB.audioStreamSource = audioInput;
                window.GLOB.scriptProcessors = [javascriptNodeUnfiltered, javascriptNodeFiltered];

                audioInput.connect(analyserUnfiltered);
                analyserUnfiltered.connect(javascriptNodeUnfiltered);
                javascriptNodeUnfiltered.connect(audioContext.destination);

                // Connect the filtered stream
                audioInput.connect(lowPassFilter);
                lowPassFilter.connect(highPassFilter);
                highPassFilter.connect(analyserFiltered);
                analyserFiltered.connect(javascriptNodeFiltered);
                javascriptNodeFiltered.connect(audioContext.destination);
            },
            function(e) { // errorCallback
                console.log('Media access rejected.', e);
            }
        );

        // update();
    };

    setupAudioNodes();


};

enableVolumeMeter();
$('[data-toggle="tooltip"]').tooltip();

}); // end of file closure
