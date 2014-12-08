#!/bin/bash

echo "Converting $1 to output.wav file"

ffmpeg -f s16le -acodec pcm_s16le -ac 1 -i $1 output.wav
ffmpeg -f s16le -acodec pcm_s16le -ac 1 -i $1 -ar 16000 output16.wav