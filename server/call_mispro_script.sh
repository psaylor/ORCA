#!/bin/bash

# have to change this file to executable on server

echo "Analyzing audio from $1 for mispronunciations"

cd ./for_trish
./run_misp_detect.sh $1

# Usage: ./run_misp_detect.sh $output_directory
# $output_directory should be the same as the one that was used to call run_single_utt.sh
# The detection results will be saved under $output_directory/misp, with the files named in the format of $uttid.out