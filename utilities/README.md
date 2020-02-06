# Image preparation utilities
This document describes how to deal with the substantial amount of moving around and cleaning of data needed to get wearable camera files ready for annotation.

## Set Vicon Autographer camera to record data
Run this script to setup the device with the correct time (synced to your computer)
and to wipe data from the device.
*It is important to call this function immediately after camera is plugged in*
```bash
pip install tqdm # called first time only
python autographer.py --setup True
# you can now safely unplug the device
```

## Download data from Vicon Autographer camera
Run this script to download data from the device to participant's data folder.
```bash
python autographer.py --download True --destDir ~/myStudy/p001/
```

## Copying files from local drive to cluster
```bash
nohup rsync -avrz -d *camera user@server:/study/camera/ &
# copy all dir matching "*camera", and their recursive item to root folder on server 
```

## Create a file/folder structure that works better with annotation browser
```bash
nohup python cleanup-image-paths.py /study/camera/ &
# output = ../new-camera/ ... with subdir for each participant which only contains images or image_table.txt
```

## Generate thumbnails and medium sized images for browser
```bash
# To generate thumbnail cmds for a participant's images run:
bash create_thumbnails.sh /study/camera/P001/
#   input = <study folder>
#   output = <study folder>/medium/ - dir with medium-size images
#             <study folder>/thumbnail/ - dir with thumbnail size images


# or to optimise the above if you have many participants...
# 1) generate list of commands for each participant folder
python write-thumbnail-cmds.py /study/camera/
# output auto written to 'thumbnailCmds.txt'

# 2) Using gnu parallel, these cmds in 'thumbnailCmds.txt' can be run in parallel:
# (j = max num concurrent processes at a time)
nohup parallel -j 10 -- < thumnailCmds.txt &
```

## Copy files from server to local drive
```bash
cd /study/images-to-annotate/
nohup rsync -avrz -d user@server:/study/camera/Pat_ID_10* . &
# copy dirs matching "Pat_ID_10*" from server, and their recursive item to pwd
```

## Optional - convert annotations from (legacy) C# desktop browser image-level to episode-level
```bash
python image-annotations-to-episodes.py legacyImgAnnotationsFile.csv
```
