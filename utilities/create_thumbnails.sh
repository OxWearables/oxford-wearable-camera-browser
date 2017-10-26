#!/bin/sh

img_size_folder(){
    source=$1
    newDirName=$2
    size=$3
    cd $source
    mkdir $newDirName
    for i in $( ls *.JPG)
    do
        convert -resize $size $i $newDirName/$i
    done
}

source=$1
img_size_folder $source medium "864x645" &
img_size_folder $source thumbnail "100x87" &
wait
