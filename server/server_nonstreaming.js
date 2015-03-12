'use strict'

var binaryServer = require('binaryjs').BinaryServer;
var wav = require('wav');
var exec = require('child_process').exec;
var execFile = require('child_process').execFile;
var spawn = require('child_process').spawn;
var os = require('os');
var fs = require('fs');
var util = require('util');
var through = require('through');
var split = require('split');
var TimingTransformer = require('parser').TimingTransformer;
var MisproTransformer = require('parser').MisproTransformer;

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

// %d is for a number unique to each utterance within the same session
var RAW_FILE_NAME_FORMAT = '%s/utterance_%d.raw';
var WAV_FILE_NAME_FORMAT = '%s/utterance_%d.wav';
var TXT_FILE_NAME_FORMAT = '%s/utterance_%d.txt';

var DATA_DIRECTORY_FORMAT = '/data/sls/scratch/psaylor/data/%d';
var TIMINGS_DIRECTORY_FORMAT = '%s/time';
var MISPRO_DIRECTORY_FORMAT = '%s/misp';
// first and second %d are speaker, which is timestamp
// third %d is utterance number
var TIMING_FILE_NAME_PATTERN = /utterance_\d+(?=.txt)/;
var TIMING_FILE_ID_PATTERN = /\d+/;
var TIMING_PATH_FORMAT = '%s/%s';
var MISPRO_FILE_NAME_PATTERN = '%s/utterance_%d.out';
var UTTERANCE_ID_PATTERN = /utterance_(\d)+.out/;

console.log("Default sample rate: " + DEFAULT_SAMPLE_RATE);
console.log("Recording directory format: " + RECORDINGS_DIRECTORY_FORMAT);

var logAll = function (error, stdout, stderr) {
	console.log('stdout', stdout);
	console.log('stderr', stderr);
	if (error !== null) {
		console.log('exec error', error);
	}
};

var recognizeUtterances = function (utteranceWavFile, utteranceTxtFile, dataOutputDir, callback) {
	console.log("Running recognition on ", utteranceWavFile, utteranceTxtFile, "\nOutput data to", dataOutputDir);
	var command = ['./call_script.sh', utteranceWavFile, utteranceTxtFile, dataOutputDir].join(' ');
	var child = exec(command,
		function (error, stdout, stderr) {
			console.log('Recognition stdout', stdout);
			console.log('Recognition stderr', stderr);
			if (error !== null) {
				console.log('Recognition exec error', error);
			}
			callback();
		});
};

var analyzeUtterances = function (dataOutputDir, clientCallback) {
	console.log("Analyzing utterances for mispronunciation from ", dataOutputDir);
	var command = ['./call_mispro_script.sh', dataOutputDir].join(' ');
	var mispronounced_words = {};
	var child = exec(command, 
		function (error, stdout, stderr) {
			console.log('Analysis stdout:', stdout);
			console.log('Analysis stderr:', stderr);
			if (error !== null) {
				console.log("Analysis exec err:", error);
				return;
			}
			// when done, send useful stuff to client
			/* The detection results will be saved under $output_directory/misp, with the files named in the format of $uttid.out */
			var misp_dir = util.format(MISPRO_DIRECTORY_FORMAT, dataOutputDir);
			var misp_filenames = fs.readdirSync(misp_dir);
			for (i = 0; i < misp_filenames.length; i++) {
				var filename = misp_filenames[i];
				var utterance_id = filename.match(UTTERANCE_ID_PATTERN)[1];
				console.log("id of " + filename + " is ", utterance_id);


				var filePath = misp_dir + "/" + filename;
				console.log("Opening", filePath, " for parsing");
				var readStream = fs.createReadStream(filePath);
				console.log("readStream", readStream);
				readStream.pipe(MisproTransformer()).pipe(gen_throughMisproData(utterance_id)).pipe(clientCallback);
			}

		});
}

var gen_throughMisproData = function (utterance_id) {
	var count = 0;
	var throughTimingData = through (
		function write (wordBoundary) {
			if (wordBoundary.hasError) {
				wordBoundary.utterance_id = utterance_id;
				wordBoundary.index = count;
				console.log("Mispronounced ", wordBoundary);
				this.queue(wordBoundary);
			}
			count+=1;
		});
	return throughTimingData;
}

var getAlignmentResults = function (results_dir, stream_id, timing_data, callback) {
	console.log("Reading alignment results from " + results_dir);
	var timing_filenames = fs.readdirSync(results_dir);
	console.log("Found timing files: ", timing_filenames);
	for (var i = 0; i < timing_filenames.length; i++) {
		var filename = timing_filenames[i];
		// str.match(pattern); returns array of matches
		// or patt.exec(str); returns the first match
		var utterance = TIMING_FILE_NAME_PATTERN.exec(filename)[0];
		var utterance_id = TIMING_FILE_ID_PATTERN.exec(utterance)[0];
		console.log("id of " + filename + " is ", utterance_id);

		if (utterance_id != stream_id) {
			console.log("Timing results of", utterance_id, "already processed");
			continue;
		}

		timing_data[utterance_id] = [];

		var filePath = util.format(TIMING_PATH_FORMAT, results_dir, filename);
		var readStream = fs.createReadStream(filePath);
		readStream.pipe(TimingTransformer()).pipe(gen_throughTimingData(utterance_id, timing_data));
		// readStream.pipe(split()).pipe(gen_throughWordBoundaries()).pipe(gen_throughTimingData(utterance_id, timing_data));


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
			// wordBoundary = JSON.parse(wordBoundary);
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
	Converts a 44.1kHz raw audio file to a 16kHz wav file using Sox
**/
var convertFileSox = function (rawFileName, saveToFileName) {
	console.log(util.format("Transcoding %s to %s", rawFileName, saveToFileName));
	var COMMAND_FORMAT = 'sox -r 44100 -e signed -b 16 -c 1 %s -r %d %s';
	var commandLine = util.format(COMMAND_FORMAT, rawFileName, DEFAULT_SAMPLE_RATE, saveToFileName);
	var command = exec(commandLine, logAll);
};

var cutFileSox = function (originalFileName, startSample, endSample, outputPipe) {
	// var COMMAND_FORMAT = 'sox %s -t wav - trim %d =%d';
	// var COMMAND_FORMAT = 'sox %s %s trim %d =%d';
	// var commandLine = util.format(COMMAND_FORMAT, originalFileName, outputFileName, startTimeSeconds, endTimeSeconds);
	var ABSOLUTE_TIME_FORMAT = '=%ds';
	var startTimeFormatted = util.format(ABSOLUTE_TIME_FORMAT, startSample);
	var endTimeFormatted = util.format(ABSOLUTE_TIME_FORMAT, endSample);

	var command = spawn('sox', [originalFileName, '-t', 'wav', '-', 'trim', startTimeFormatted, endTimeFormatted]);
	command.on('close', function (code) {
		console.log("Sox cut file exited with code " + code);
	});
	command.stdout.pipe(outputPipe);
}

var concatFileSox = function (fileNameList, startSample, endSample, outputFileName, outputPipe) {
	var ABSOLUTE_TIME_FORMAT = '=%ds';
	var startTimeFormatted = util.format(ABSOLUTE_TIME_FORMAT, startSample);
	var endTimeFormatted = util.format(ABSOLUTE_TIME_FORMAT, endSample);
	console.log('startTimeSeconds', startSample, startTimeFormatted);
	console.log("endTimeSeconds", endSample, endTimeFormatted);

	/*
	Command line example of what we need to do
	sox --combine concatenate "|sox first_file.wav -t wav - trim =3.9"  middle_file.wav "|sox last_file.wav -t wav - trim 0 =2.67" output.wav 
	*/

	var firstFileCommand = util.format('|sox %s -t wav - trim %s', fileNameList[0], startTimeFormatted);
	var lastFileCommand = util.format('|sox %s -t wav - trim 0 %s', fileNameList[fileNameList.length - 1], endTimeFormatted);
	console.log("firstFileCommand", firstFileCommand);
	console.log("lastFileCommand", lastFileCommand);

	var commandArgs = ['--combine', 'concatenate', firstFileCommand]
		.concat(fileNameList.slice(1, -1))
		.concat([lastFileCommand, outputFileName]);
	console.log("commandArgs", commandArgs);
	
	var command = spawn('sox', commandArgs);
	command.on('close', function (code) {
		console.log("Sox concat files exited with code " + code);
		if (code == 0) {  // success
			fs.createReadStream(outputFileName).pipe(outputPipe);
		}
	});
};

server.on('connection', function (client) {
	console.log("new client connection...");

	var timestamp = new Date().getTime();
	var recordings_dir = util.format(RECORDINGS_DIRECTORY_FORMAT, timestamp);
	fs.mkdirSync(recordings_dir);
	var data_output_dir = util.format(DATA_DIRECTORY_FORMAT, timestamp);
	var timings_dir = util.format(TIMINGS_DIRECTORY_FORMAT, data_output_dir);
	console.log("Utterances from this session being saved in " + recordings_dir);
	var timing_data = {};

	client.on('stream', function (stream, meta) {
		console.log("Streaming started...");
		console.log("Streaming metadata: ", meta);

		if (meta.type === 'playback-request') {
			// var testPipe = client.createStream({type: 'playback-result'});
			// testConcatFileSox(testPipe);
			// return;
			var start_utterance = meta.start_fragment;
			var start_index =  meta.start_index;
			var end_utterance = meta.end_fragment;
			var end_index = meta.end_index;
			var startWordBoundary = timing_data[start_utterance][start_index];
			var endWordBoundary = timing_data[end_utterance][end_index];
			console.log("startWordBoundary: ", startWordBoundary);
			console.log("endWordBoundary: ", endWordBoundary);
			if (start_utterance !== end_utterance) {
				console.log("Requested playback spanning multiple utterances");

				var wavFileNameList = [];
				for (var id = start_utterance; id <= end_utterance; id++) {
					var wavFileName = util.format(WAV_FILE_NAME_FORMAT, recordings_dir, id);
					if (fs.existsSync(wavFileName)) {
						wavFileNameList.push(wavFileName);
					}
				}
				var response_meta = {type: 'playback-result', first_word: startWordBoundary.word, last_word: endWordBoundary.word};
				var response = client.createStream(response_meta);
				var outputFileName = recordings_dir + '/output_' + start_utterance + '_' + end_utterance + '.wav';
				concatFileSox(wavFileNameList, startWordBoundary.start_sample, endWordBoundary.end_sample, outputFileName, response);

			} else { // within a single utterance recording
				console.log("Requested playback within one utterance");

				var wavFileName = util.format(WAV_FILE_NAME_FORMAT, recordings_dir, start_utterance);
				var response_meta = {type: 'playback-result', first_word: startWordBoundary.word, last_word: endWordBoundary.word};
				var response = client.createStream(response_meta);
				cutFileSox(wavFileName, startWordBoundary.start_sample, endWordBoundary.end_sample, response);

			}
			
			return;
		} else if (meta.type === 'reading_ended') {
			console.log("Client reading ended. Process all utterances.");
			var response_meta = {type: 'mispro-result'};
			var response = client.createStream(response_meta);
			analyzeUtterances(data_output_dir, response);
			return;
		}
		console.log("Expecting normal audio stream");
		var stream_id = meta.fragment;
		var stream_text = meta.text.toLowerCase().replace(".", "") + "\n";
		console.log("Utterances from stream " + stream_id + " for text " + stream_text, "with sample rate", meta.sampleRate);
		

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
			recognizeUtterances(wavFileName, txtFileName, data_output_dir, function () {
				getAlignmentResults(timings_dir, stream_id, timing_data, alignment_callback);
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