#!/bin/bash
result=1
bad_files=0
total_files=0
for file in ../roms/*; do
    hash_a=($(md5sum $file))
    hash_b=($(./rom2asm $file | ./asm2rom | md5sum))
    if [ "$hash_a" != "$hash_b" ]; then
        echo "The hash for $file does not match the one of the reassembled ROM!"
        echo -e "Expected:\t$hash_a"
        echo -e "Got:\t\t$hash_b"
        result=0
        let bad_files=bad_files+1
    fi
    let total_files=total_files+1
done
if [ "$result" == 0 ]; then
    echo "$bad_files out of $total_files tests failed."
else
    echo "All tests passed with success."
fi