ORCA
====

Online Reading Assistant

to upload: scp index.js psaylor@ftp.dialup.mit.edu:/mit/psaylor/web_scripts/ORCA


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



Recognition stderr /usr/users/psaylor/kaldi-trunk//src/online2bin/online2-wav-nnet2-latgen-faster --do-endpointing=false --online=false --config=/usr/users/psaylor/kaldi-trunk/egs/fisher_english/s5/nnet_a_gpu_online/conf/online_nnet2_decoding.conf --max-active=7000 --beam=15.0 --lattice-beam=6.0 --acoustic-scale=0.1 --word-symbol-table=/usr/users/psaylor/kaldi-trunk/egs/fisher_english/s5/graph/words.txt /usr/users/psaylor/kaldi-trunk/egs/fisher_english/s5/nnet_a_gpu_online/smbr_epoch2.mdl /usr/users/psaylor/kaldi-trunk/egs/fisher_english/s5/graph/HCLG.fst 'ark:echo utterance-id1 utterance-id1|' 'scp:echo utterance-id1 recordings8/1414606085247.wav|' ark:/dev/null 
LOG (online2-wav-nnet2-latgen-faster:ComputeDerivedVars():ivector-extractor.cc:180) Computing derived variables for iVector extractor
LOG (online2-wav-nnet2-latgen-faster:ComputeDerivedVars():ivector-extractor.cc:201) Done.
utterance-id1 well i think now it seems to be working doesn't matter that i'm on the sea sale present africa oh if you there's no fire walls 
LOG (online2-wav-nnet2-latgen-faster:main():online2-wav-nnet2-latgen-faster.cc:252) Decoded utterance utterance-id1
LOG (online2-wav-nnet2-latgen-faster:Print():online-timing.cc:51) Timing stats: real-time factor for offline decoding was 3.24429 = 43.3915 seconds  / 13.3748 seconds.
LOG (online2-wav-nnet2-latgen-faster:main():online2-wav-nnet2-latgen-faster.cc:258) Decoded 1 utterances, 0 with errors.
LOG (online2-wav-nnet2-latgen-faster:main():online2-wav-nnet2-latgen-faster.cc:260) Overall likelihood per frame was 0.185779 per frame over 1335 frames.






ffmpeg
 ... anull            A->A       Pass the source unchanged to the output.
 ... aformat          A->A       Convert the input audio to one of the specified formats.
 ... aresample        A->A       Resample audio data.
 ... aselect          A->N       Select audio frames to pass in output.
 ... asetnsamples     A->A       Set the number of samples for each output audio frames.
 ... asetrate         A->A       Change the sample rate without altering the data.
 ... asplit           A->N       Pass on the audio input to N audio outputs.
 ... abuffer          |->A       Buffer audio frames, and make them accessible to the filterchain.
 ... abuffersink      A->|       Buffer audio frames, and make them available to the end of the filter graph.
 ... afifo            A->A       Buffer input frames and send them when they are requested.


cat ttt.wav | ffmpeg -i pipe:0 -ar 22100 pipe:1 | cat > t4.wav

// var child_convert = spawn('sox', ['-', '-r', DEFAULT_SAMPLE_RATE.toString(), '-p']); noiisee and hard to get debugging information


var child_convert = spawn('ffmpeg', ['-acodec', 'pcm_s16le', '-f', 'wav', '-ar', '44.1k', '-i', '-', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-f', 'wav', '-']);

var child_convert = spawn('ffmpeg', ['-acodec', 'pcm_s16le', '-f', 'wav', '-ar', '44.1k', '-i', 'recordings/ttt.wav', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-f', 'wav', 'recordings8/abc123.wav']);

ffmpeg -acodec pcm_s16le -ac 1 -f s16le -i pipe:0 -ar 19000 -acodec pcm_s16le rawtest.wav
