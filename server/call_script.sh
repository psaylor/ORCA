#!/bin/bash

echo "Decoding audio from $1"

utterance_wav=$1
utterance_txt=$2
output_dir=$3

echo "Utterance wav: $utterance_wav Utterance text: $utterance_txt Output dir: $output_dir"

cd ./for_trish 
./run_single_utt.sh $utterance_wav $utterance_txt $output_dir

# timing results in output_dir/time/utterance_id.txt