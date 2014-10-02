var binaryServer = require('binaryjs').BinaryServer;
var wav = require('wav');

var server = binaryServer({port: 9001});



server.on('connection', function(client) {
	console.log("new client connection...");
	var fileWriter = null;

	client.on('stream', function(stream, meta) {
		console.log("Streaming started...");
		var fileName = "recordings/"+ new Date().getTime()  + ".wav"
		console.log("Saving to filename " + fileName);
		var fileWriter = new wav.FileWriter(fileName, {
		    channels: 1,
		    sampleRate: 44100,
		    bitDepth: 16
		});
		stream.pipe(fileWriter);
		stream.on('end', function() {
			fileWriter.end();
			console.log("Streaming ended.");
		});
	});

	client.on('close', function() {
		if (fileWriter != null) {
			fileWriter.end();
		}
		console.log("Connection closed.");
	});
});


