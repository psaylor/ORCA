#!/bin/bash

echo "Decoding audio from $1"
exit 1

kaldi=/usr/users/psaylor/kaldi-trunk/
fisher=/usr/users/psaylor/kaldi-trunk/egs/fisher_english/s5
$kaldi/src/online2bin/online2-wav-nnet2-latgen-faster --do-endpointing=false \
--online=false \
--config=$fisher/nnet_a_gpu_online/conf/online_nnet2_decoding.conf \
--max-active=7000 --beam=15.0 --lattice-beam=6.0 \
--acoustic-scale=0.1 --word-symbol-table=$fisher/graph/words.txt \
$fisher/nnet_a_gpu_online/smbr_epoch2.mdl $fisher/graph/HCLG.fst "ark:echo utterance-id1 utterance-id1|" "scp:echo utterance-id1 $1|" \
ark:/dev/null