#!/bin/sh
if [ $# != 1 ]; then
	echo "Usage: $0 file_name.ogg"
	exit
fi
file_name="$1"
echo
echo "Recording audio to OGG file $file_name"
echo "Press Ctrl+C to end recording"
echo
cleanup() {
	echo -e "Done\n"
}
trap cleanup INT
(
	trap "" INT
	exec rec -t wav -c 1 -r 44100 - | sox - -r 16000 "$file_name";
	# oggenc -r -B 16 -C 2 -R 1800 -q 5 -o "$file_name" - ;
)
