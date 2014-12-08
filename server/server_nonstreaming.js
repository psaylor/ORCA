var binaryServer = require('binaryjs').BinaryServer;
var wav = require('wav');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var os = require('os');
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var util = require('util');

var server = binaryServer({port: 9001});

console.log("Starting binary server on port 9001");

var ifaces=os.networkInterfaces();
for (var dev in ifaces) {
  var alias=0;
  ifaces[dev].forEach(function(details){
    if (details.family=='IPv4') {
      console.log(dev+(alias?':'+alias:''),details.address);
      ++alias;
    }
  });
}

var DEFAULT_SAMPLE_RATE = 16 * 1000;  // 16 kHz
// the first %d is for the recording timestamp
var RECORDINGS_FOLDER_FORMAT = 'recordings_server2/%d';
// the first %d is for the recording timestamp
// the second %d is for the sample rate
var RAW_FILE_NAME_FORMAT = '%s/%d_raw.raw';
var WAV_FILE_NAME_FORMAT = '%s/%d_%d.wav';

console.log("Default sample rate: " + DEFAULT_SAMPLE_RATE);
console.log("Recording folder format: " + RECORDINGS_FOLDER_FORMAT);

var logAll = function (error, stdout, stderr) {
	console.log('stdout', stdout);
	console.log('stderr', stderr);
	if (error !== null) {
		console.log('exec error', error);
	}
}

var recognizeFile = function (wavFileName) {
	// var child = execFile(file, [args], [options], [callback]);
	console.log("Running recognition on " + fileName);
	var child = exec('pwd', logAll);
	var child = exec('./decode_audio.sh ' + fileName,
		function (error, stdout, stderr) {
			console.log('Recognition stdout', stdout);
			console.log('Recognition', typeof(stdout), typeof(stderr));
			console.log('Recognition stderr', stderr);
			if (error !== null) {
				console.log('Recognition exec error', error);
			}
			var index = stderr.search("/utterance-id1 /i");
			console.log("index", index);
			index = index + 14;
			console.log('index', index);
	});
}

/** 
	Converts a 44.1kHz raw audio file to a 16kHz wav file
**/
var convertFile = function (rawFileName, saveToFileName) {
	var command = ffmpeg()
					.input(rawFileName)
					.inputFormat('s16le')
					.inputOptions([
						'-acodec pcm_s16le',
						'-ac 1',
						])
					.audioCodec('pcm_s16le')
					.audioChannels(1)
					.audioFrequency(DEFAULT_SAMPLE_RATE)
					.outputFormat('s16le');

	var wavFileWriter = new wav.FileWriter(saveToFileName, {
	    channels: 1,
	    sampleRate: DEFAULT_SAMPLE_RATE,
	    bitDepth: 16
	});
			
	command.on('start', function(commandLine) {
		console.log("Spawned Ffmpeg with command " + commandLine);
	});
	command.on('codecData', function(data) {
	    console.log('Input is ' + data.audio + ' audio with ' + data.video + ' video');
	    console.log('Input is ' + data.format + ' and ' + data.audio_details);
		});
		command.on('progress', function(progress) {
	    console.log('Processing progress: ', progress);
	});
	command.on('error', function(err, stdout, stderr) {
	    console.log('Cannot process audio: ' + err.message);
	    console.log("Command Stdout: ", stdout);
	    console.log("Command Stderr: ", stderr)
	});
	command.on('end', function() {
	    console.log('Transcoding succeeded !');
	});
	// seem to need to write it with wavfilewriter; ffmpeg doesn't write the file properly, even if not streaming
	command.pipe(wavFileWriter, {end: true});

};

server.on('connection', function (client) {
	console.log("new client connection...");

	client.on('stream', function (stream, meta) {
		console.log("Streaming started...");
		console.log("Streaming metadata: ", meta);
		var numStreamWritesReceived = 0;
		var timestamp = new Date().getTime();
		var folder = util.format(RECORDINGS_FOLDER_FORMAT, timestamp);
		fs.mkdirSync(folder);

		var rawFileName = util.format(RAW_FILE_NAME_FORMAT, folder, timestamp);
		var wavFileName = util.format(WAV_FILE_NAME_FORMAT, folder, timestamp, DEFAULT_SAMPLE_RATE);

		console.log("Saving raw audio to file " + rawFileName);
		console.log("Saving converted wav audio to file " + wavFileName);

		var rawFileWriter = fs.createWriteStream(rawFileName, {encoding: 'binary'});

		stream.on('data', function(data) {
			numStreamWritesReceived+= 1;
			console.log('stream data of length %d, number %d', data.length, numStreamWritesReceived);
		});

		stream.on('end', function() {
			// Audio file finished streaming, convert and run ASR
			console.log("Streaming ended.");
			console.log("Saving raw audio to file " + rawFileName);
			convertFile(rawFileName, wavFileName);
			// recognizeFile(wavFileName);

		});

		stream.on('close', function() {
			console.log("Stream closed.");

		});

		stream.pipe(rawFileWriter, {end: true});
	});

	client.on('close', function () {
		console.log("Connection closed.");
	});
});


console.log("Server ready...\n");