#!/bin/bash

echo "Decoding audio from $1"

utterance_folder = $1

cd ./for_trish 
./run.sh $utterance_folder