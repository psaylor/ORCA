// http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
'''
the first step is getUserMedia. when we get access to the localMediaStream,
we use it to create an audioInput node which will provide the users microphone data
to any connecting nodes. then we connect the mic input to an anlyser node, and
connect that anlyser node to a custom script processor node
'''
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

'''
Here we create an AnalyserNode, which can be used to expose audio time and 
frequency data and create data visualisations. The AnalyserNode is able to provide
real-time frequency and time-domain analysis information. It passes the audio 
stream unchanged from input to the output

AnalyserNode.fftSize
Is an unsigned long value representing the size of the FFT (Fast Fourier Transform) to be used to determine the frequency domain.
This defines the buffer size that is used to perform the analysis. Higher values
will result in more fine-grained analysis of the signal, at cost of performance.

We can set the min and max decibels for the mix/max value for the range of 
    results when using getByteFrequencyData

AnalyserNode.smoothingTimeConstant
Is a double value representing the averaging constant with the last analysis frame — basically, it makes the transition between values over time smoother.


the difficulty here is that the range of frequencies that are represented in the
result of the fft are not specified anywhere in the specs, so how do we determine where
300 Hz is a 3300 Hz are?


the indexes of the output array can be mapped linearly between zero and the
nyquist frequency, which is half the sampling rate (the one from audioContext.sampleRate).
so for us they range from 0 to 22,050 Hz

The number of bins we have from the FFT is FFT_SIZE / 2.
Since we are sampling at 44.1 kHz, via nyquist the maximum frequency we can 
detect is half the sample rate, or 22,050 Hz. The frequencies in this range 
(0, 22050) are linearly mapped onto the bins available from the FTT. 
So each bin represents the signal strength of frequencies within a small range;
this size of that range is (nyquist freq)/(# bins) = (sampleRate/2) / (fftSize/2) 
= sampleRate / fftSize = 44100 / fftSize
For an FFT size of 128, theres a range of 345 Hz in each bin
So the bin with index i represents frequencies from i*(sampleRate/fftSize) to 
    (i+1)*(sampleRate/fftSize)
We can reverse this to figure out what bin a given frequency would be in like so:
    Math.round((frequency/nyquist) * # bins)
    = Math.round( frequency  )


44100 samples a second, call onaudioprocess every 2048 samples, which is about 4~5 ms

'''

// Analyser settings
var ANALYSER_FFT_SIZE = 1024;
var ANALYSER_SMOOTHING_TIME_CONSTANT = 0.3;
// Create an AnalyserNode 
var analyser = audioContext.createAnalyser();
analyser.smoothingTimeConstant = ANALYSER_SMOOTHING_TIME_CONSTANT;
analyser.fftSize = ANALYSER_FFT_SIZE;

/* Maps from frequency to the correct bucket in the array of frequencies */
function getFrequencyValue(frequency) {
    var nyquist = audioContext.sampleRate / 2;
    var index = Math.round( frequency/nyquist * freqDomain.length);
    return freqDomain[index]
}

'''

'''

var BASE_METER_HEIGHT = 35;  // 35% filled
var MAX_METER_HEIGHT = 100;  // 100% filled
var VOLUME_TO_HEIGHT_SCALE = 1.0;

// Create a ScriptProcessorNode with a bufferSize of 2048, 1 input, and
// 1 output.
var javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

// This function is called whenever the buffer of size 2048 is full,
// approximately 21 times a second (assuming 44.1kHz sample rate)
javascriptNode.onaudioprocess = function () {
    var array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    var average = getAverageVolume(array);
    adjustVolumeMeter(average);
};

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