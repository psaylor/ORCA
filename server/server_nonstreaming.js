var binaryServer = require('binaryjs').BinaryServer;
var wav = require('wav');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var os = require('os');
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var util = require('util');
var through = require('through');
var split = require('split');

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
// %d is for the recording timestamp
var RECORDINGS_DIRECTORY_FORMAT = '/data/sls/scratch/psaylor/recordings/%d';
// var RECORDINGS_DIRECTORY_FORMAT = 'recordings/%d';

// %d is for a number unique to each utterance within the same session
var RAW_FILE_NAME_FORMAT = '%s/utterance_%d.raw';
var WAV_FILE_NAME_FORMAT = '%s/utterance_%d.wav';
var TXT_FILE_NAME_FORMAT = '%s/utterance_%d.txt';

var DATA_DIRECTORY = '/usr/users/annlee/for_trish/data'
// var DATA_DIRECTORY = 'data'
var TIMINGS_DIRECTORY_FORMAT = '%s/%d/time';
// first and second %d are speaker, which is timestamp
// third %d is utterance number
// var OUTPUT_TIMING_FILE_NAME_FORMAT = '%s/%d/time/%d_utterance_%d.txt';
var TIMING_FILE_NAME_PATTERN = /utterance_\d+(?=.txt)/;
var TIMING_FILE_ID_PATTERN = /\d+/;
var TIMING_PATH_FORMAT = '%s/%s';

console.log("Default sample rate: " + DEFAULT_SAMPLE_RATE);
console.log("Recording directory format: " + RECORDINGS_DIRECTORY_FORMAT);

var logAll = function (error, stdout, stderr) {
	console.log('stdout', stdout);
	console.log('stderr', stderr);
	if (error !== null) {
		console.log('exec error', error);
	}
};

var recognizeUtterances = function (directory, callback) {
	// var child = execFile(file, [args], [options], [callback]);
	console.log("Running recognition on utterances in " + directory);
	var recognize = exec('./call_script.sh ' + directory, 
		function (error, stdout, stderr) {
			console.log('Recognition stdout', stdout);
			console.log('Recognition', typeof(stdout), typeof(stderr));
			console.log('Recognition stderr', stderr);
			if (error !== null) {
				console.log('Recognition exec error', error);
			}
			callback();
	});
};

var getAlignmentResults = function (results_dir, timing_data, callback) {
	console.log("Reading alignment results from " + results_dir);
	var timing_filenames = fs.readdirSync(results_dir);
	console.log("Found timing files: ", timing_filenames);
	for (i = 0; i < timing_filenames.length; i++) {
		filename = timing_filenames[i];
		// str.match(pattern); returns array of matches
		// or patt.exec(str); returns the first match
		var utterance = TIMING_FILE_NAME_PATTERN.exec(filename)[0];
		var utterance_id = TIMING_FILE_ID_PATTERN.exec(utterance)[0];
		console.log("id of " + filename + " is ", utterance_id);

		timing_data[utterance_id] = [];

		var filePath = util.format(TIMING_PATH_FORMAT, results_dir, filename);
		var readStream = fs.createReadStream(filePath);
		readStream.pipe(split()).pipe(gen_throughWordBoundaries()).pipe(gen_throughTimingData(utterance_id, timing_data));


		var gen_callCallback = function (utterance_id) {
			return function() {
				console.log("finished reading, doing callback: ", filePath, utterance_id);
				callback(utterance_id);
			};
		};

		readStream.on('end', gen_callCallback(utterance_id));
	}
};


var gen_throughWordBoundaries = function () {
	var currentWord = null;
	var currentWordStartTime = null;
	var currentWordEndTime = null;

	var throughWordBoundaries = through ( 
		function write (line) { 
			var columns = line.split(' ');
			if (columns.length < 3) {
				return;
			}

			var start = columns[0];
			var end = columns[1];
			var phone = columns[2];
			var word = columns[3];

			if (word === undefined) {
				// if (phone === 'sil') { 
				// 	// false assumption
				// 	currentWordEndTime = start;
				// } else {
					currentWordEndTime = end;
					return;
				// }
			}

			// emit the boundaries of the previous word if there is one
			if (currentWord) {
				var output = wordBoundary(currentWord, currentWordStartTime, start);
				this.queue(output);
				currentWord = null;
			}

			if (word === undefined) {
				return;
			}

			// start determing boundary of new word
			currentWord = word;
			if (phone === 'sil') {
				// word starts when the silence ends
				currentWordStartTime = end;
			} else {
				// word starts with this phone
				currentWordStartTime = start;
			}
		},
		function end () {
			if (currentWord === null) {
				return;
			}
			var output = wordBoundary(currentWord, currentWordStartTime, currentWordEndTime);
			this.queue(output);
		});

	return throughWordBoundaries;
};

var gen_throughTimingData = function (utterance_id, timing_data, callback) {

	var throughTimingData = through (
		function write (wordBoundary) {
			wordBoundary = JSON.parse(wordBoundary);
			console.log("Utterance " + utterance_id + ": ", wordBoundary);
			timing_data[utterance_id].push(wordBoundary);
		});
	return throughTimingData;
}

var wordBoundary = function (word, startTime, endTime) {
	startTime = startTime/DEFAULT_SAMPLE_RATE;
	endTime = endTime/DEFAULT_SAMPLE_RATE;
	var boundaryObject = {word: word, start: startTime, end: endTime};
	return JSON.stringify(boundaryObject);
};
// { word: north, start: 12960, end:17600 }

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
					.audioCodec('pcm_s32le')
					.audioChannels(1)
					.audioFrequency(DEFAULT_SAMPLE_RATE)
					.outputFormat('s32le');

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
	    // delete raw file
	    // fs.unlink(rawFileName, function (err) {
	    // 	if (err) {
	    // 		console.log("Error removing raw file: ", err);
	    // 	} else {
	    // 		console.log("Raw file removed: " + rawFileName);
	    // 	}
	    // });

	});
	// seem to need to write it with wavfilewriter; ffmpeg doesn't write the file properly, even if not streaming
	command.pipe(wavFileWriter, {end: true});
};

/** 
	Converts a 44.1kHz raw audio file to a 16kHz wav file using Sox
**/
var convertFileSox = function (rawFileName, saveToFileName) {
	console.log(util.format("Transcoding %s to %s", rawFileName, saveToFileName));
	var COMMAND_FORMAT = 'sox -r 44100 -e signed -b 16 -c 1 %s -r %d %s';
	var commandLine = util.format(COMMAND_FORMAT, rawFileName, DEFAULT_SAMPLE_RATE, saveToFileName);
	var command = exec(commandLine, logAll);
};

var cutFileSox = function (originalFileName, startTimeSeconds, endTimeSeconds, outputPipe) {
	// var COMMAND_FORMAT = 'sox %s -t wav - trim %d =%d';
	// var COMMAND_FORMAT = 'sox %s %s trim %d =%d';
	// var commandLine = util.format(COMMAND_FORMAT, originalFileName, outputFileName, startTimeSeconds, endTimeSeconds);
	var ABSOLUTE_TIME_FORMAT = '=%d';
	var startTimeFormatted = util.format(ABSOLUTE_TIME_FORMAT, startTimeSeconds);
	var endTimeFormatted = util.format(ABSOLUTE_TIME_FORMAT, endTimeSeconds);

	var command = spawn('sox', [originalFileName, '-t', 'wav', '-', 'trim', startTimeFormatted, endTimeFormatted]);
	command.on('close', function (code) {
		console.log("Sox cut file exited with code " + code);
	});
	command.stdout.pipe(outputPipe);
}

server.on('connection', function (client) {
	console.log("new client connection...");

	var timestamp = new Date().getTime();
	var recordings_dir = util.format(RECORDINGS_DIRECTORY_FORMAT, timestamp);
	fs.mkdirSync(recordings_dir);
	var timings_dir = util.format(TIMINGS_DIRECTORY_FORMAT, DATA_DIRECTORY, timestamp);
	console.log("Utterances from this session being saved in " + recordings_dir);
	var timing_data = {};

	client.on('stream', function (stream, meta) {
		console.log("Streaming started...");
		console.log("Streaming metadata: ", meta);

		if (meta.type === 'playback-request') {
			var utterance_id = meta.fragment;
			var index =  meta.index;
			var wordBoundary = timing_data[utterance_id][index];
			var wavFileName = util.format(WAV_FILE_NAME_FORMAT, recordings_dir, utterance_id);
			var response_meta = {type: 'playback-result'};
			var response = client.createStream(response_meta);
			cutFileSox(wavFileName,wordBoundary.start, wordBoundary.end, response);
			return;
		}

		var stream_id = meta.fragment;
		var stream_text = meta.text.toLowerCase().replace(".", "") + "\n";
		console.log("Utterances from stream " + stream_id + " for text " + stream_text);
		

		var rawFileName = util.format(RAW_FILE_NAME_FORMAT, recordings_dir, stream_id);
		var wavFileName = util.format(WAV_FILE_NAME_FORMAT, recordings_dir, stream_id);
		var txtFileName = util.format(TXT_FILE_NAME_FORMAT, recordings_dir, stream_id);

		console.log("Saving raw audio to file " + rawFileName);
		console.log("Saving converted wav audio to file " + wavFileName);

		var rawFileWriter = fs.createWriteStream(rawFileName, {encoding: 'binary'});
		// text file must end in newline
		fs.writeFileSync(txtFileName, stream_text);

		stream.on('data', function(data) {
			// console.log('stream data of length %d', data.length);
		});

		var alignment_callback = function (utterance_id) {
			console.log("Alignment callback for utterance ", utterance_id);
			var result_meta = {type: 'timing-result', fragment: utterance_id};
			var response = client.createStream(result_meta);
			response.end();
		};

		stream.on('end', function() {
			// Audio file finished streaming, convert and run ASR
			console.log(util.format("Stream %d ended.", stream_id));
			console.log("Raw audio: " + rawFileName);
			convertFileSox(rawFileName, wavFileName);
			recognizeUtterances(recordings_dir, function () {
				getAlignmentResults(timings_dir, timing_data, alignment_callback);
			});
		});

		stream.on('close', function() {
			console.log(util.format("Stream %d closed.", stream_id));
		});

		stream.pipe(rawFileWriter, {end: true});
	});

	client.on('close', function () {
		console.log("Connection closed.");
	});
});


console.log("Server ready...\n");