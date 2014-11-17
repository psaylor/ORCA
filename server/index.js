var binaryServer = require('binaryjs').BinaryServer;
var wav = require('wav');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var os = require('os');
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

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
console.log("Default sample rate: " + DEFAULT_SAMPLE_RATE);

var logAll = function (error, stdout, stderr) {
	console.log('stdout', stdout);
	console.log('stderr', stderr);
	if (error !== null) {
		console.log('exec error', error);
	}
}

var convertFile = function(fileName, newKHz) {
	var newFileName = "recordings8/"+ new Date().getTime()  + ".wav"
	console.log("Converting " + fileName + " to " + newKHz + " in " + newFileName);
	var child = exec('sox ' + fileName + ' -r ' + newKHz + ' ' + newFileName, logAll);
	return newFileName;
}

var streaming_conversion = function(newKHz) {
	var newFileName = "recordings8/"+ new Date().getTime()  + ".wav"
	console.log("Converting stdin to " + newKHz + " in " + newFileName);
	// need to use spawn instead of exec b/c spawn returns a stream whereas exec returns a buffer
	var child = spawn('sox', ['-', '-r', newKHz.toString(), newFileName]);
	return newFileName;
}

var recognizeFile = function(fileName) {
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

server.on('connection', function(client) {
	console.log("new client connection...");
	var fileWriter = null;
	var fileName = null;

	client.on('stream', function(stream, meta) {
		console.log("Streaming started...");
		fileName = "recordings8/"+ new Date().getTime()  + ".wav"
		console.log("Saving to filename " + fileName);
		var fileWriter = new wav.FileWriter(fileName, {
		    channels: 1,
		    sampleRate: DEFAULT_SAMPLE_RATE,
		    bitDepth: 16
		});

		// var inStream = fs.createReadStream('recordings/ttt.wav');
		// var outStream = fs.createWriteStream('recordings/writestream.wav', {encoding: 'binary'})

		var command = ffmpeg()
						.input(stream)
						.inputFormat('s16le')
						.inputOptions([
							'-acodec pcm_s16le',
							'-ac 1',
							])
						.audioCodec('pcm_s16le')
						.audioChannels(1)
						.audioFrequency(DEFAULT_SAMPLE_RATE)
						.outputFormat('s16le');
		

		command.on('start', function(commandLine) {
			console.log("Spawned Ffmpeg with command " + commandLine);
		});
		command.on('codecData', function(data) {
		    console.log('Input is ' + data.audio + ' audio with ' + data.video + ' video');
		    console.log('Input is ' + data.format + ' and ' + data.audio_details);
  		});
  		command.on('progress', function(progress) {
		    console.log('Processing: ' + progress.frames + ' frames');
		});
		command.on('error', function(err, stdout, stderr) {
		    console.log('Cannot process video: ' + err.message);
		    console.log("Command Stdout: ", stdout);
		    console.log("Command Stderr: ", stderr)
		});
		command.on('end', function() {
		    console.log('Transcoding succeeded !');
		});

		stream.on('data', function(data) {
			console.log('stream data: ', data.length, data);
		});

		// stream.pipe(outStream, {end: true});
		// stream.pipe(child_convert); //.stdout.pipe(fileWriter);
		stream.on('end', function() {
			// fileWriter.end();
			console.log("Streaming ended.");
			// newFileName = convertFile(fileName, DEFAULT_SAMPLE_RATE);
			// recognizeFile(fileName);
		});
		stream.on('close', function() {
			if (fileWriter != null) {
				fileWriter.end();
			}
			console.log("Stream closed.");
		});

		// console.log("FFMPEG COMMAND", command);
		stream.pipe(command);
		// console.log("SREAM", stream);
		command.pipe(fileWriter, {end: true});
		// console.log("FFMPEG COMMAND AFTER", command);
	});

	client.on('close', function() {
		if (fileWriter != null) {
			fileWriter.end();
		}
		console.log("Connection closed.");
		// newFileName = convertFile(fileName, DEFAULT_SAMPLE_RATE);
		// recognizeFile(fileName);
	});
});

// var child = execFile(file, [args], [options], [callback]);

console.log("Server ready...\n");