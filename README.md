ORCA
====

Online Reading Assistant


1. try to change the audio sampling rate in the javascript code
2. check the audio sampling rate of available data (timit data set)
3. reconcile the two audio sampling rates
4. execute some command line tool from Node.js javascript

5. identify the relevant methods for recognition, with attention to their specs
6. figure out how to reference the trained files
7. link up the recorded WAV file with the SR CLI tools
8. get recognized text and send back to client
9. display recognized text on webpage


1- 30 minutes
2- 30 minutes
3- 5 minutes
4- 1 hour
5- 1 hour
6- included in 5
7- 30 minutes
8- 30 minutes
9- 10 minutes
4:15 grand total

check server running with netstat
sls-apache-0, web.sls runs on the cloud, node.js stuff on there already, and ssls

killall -9 node if instance of the server seems to still be running



cat ttt.wav | ffmpeg -i pipe:0 -ar 22100 pipe:1 | cat > t4.wav

// var child_convert = spawn('sox', ['-', '-r', DEFAULT_SAMPLE_RATE.toString(), '-p']); noiisee and hard to get debugging information


var child_convert = spawn('ffmpeg', ['-acodec', 'pcm_s16le', '-f', 'wav', '-ar', '44.1k', '-i', '-', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-f', 'wav', '-']);

var child_convert = spawn('ffmpeg', ['-acodec', 'pcm_s16le', '-f', 'wav', '-ar', '44.1k', '-i', 'recordings/ttt.wav', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-f', 'wav', 'recordings8/abc123.wav']);

ffmpeg -acodec pcm_s16le -ac 1 -f s16le -i pipe:0 -ar 19000 -acodec pcm_s16le rawtest.wav



locally, first progress after 37 chunks
remotely, first progress after 122 chunks

ffmpeg -f s16le -acodec pcm_s16le -ac 1 -i 1416358278119.raw testing.wav

local ffmpeg
ffmpeg version 2.4.3 Copyright (c) 2000-2014 the FFmpeg developers
  built on Nov  4 2014 11:01:51 with llvm-gcc 4.2.1 (LLVM build 2336.11.00)

remote ffmepg
ffmpeg version 1.2.6-7:1.2.6-1~trusty1 Copyright (c) 2000-2014 the FFmpeg developers
  built on Apr 26 2014 18:52:58 with gcc 4.8 (Ubuntu 4.8.2-19ubuntu1)


Cut wav file using ffmpeg
-ss start of cut
-t duration of cut
ffmpeg -ss 1.34 -t 0.5 -i utterance_0.wav north.wav

with sox
	sox long.wav short.wav trim 0 10
	sox infile outfile trim 0 10
	play infile trim 12:34 =15:00 -2:00
		will play from 12 minutes 34 seconds into the audio up to 15 minutes into the audio (i.e. 2 minutes and 26 seconds long), then resume playing two minutes before the end of audio.
	All parameters can be specified using either an amount of time or an exact count of samples. The format for specifying lengths in time is hh:mm:ss.frac. The format for specifying sample counts is the number of samples with the letter ‘s’ appended to it. A value of 8000s for the first parameter will wait until 8000 samples are read before starting to process audio.


sox my.wav −n spectrogram




Special Filenames

The following special filenames may be used in certain circumstances in place of a normal filename on the command line:
-
SoX can be used in simple pipeline operations by using the special filename '-' which, if used in place of an input filename, will cause SoX will read audio data from 'standard input' (stdin), and which, if used in place of the output filename, will cause SoX will send audio data to 'standard output' (stdout). Note that when using this option, the file-type (see -t below) must also be given.

-p, --sox-pipe
This can be used in place of an output filename to specify that the SoX command should be used as in input pipe to another SoX command. For example, the command:

sox utterance_0.wav -t wav - trim 1.34 =1.8 | cat - >> north3.wav


sox utterance_0.wav north4.wav trim 1.3 =1.9 fade 0.04 .56 0.04
