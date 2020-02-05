"""Command line tool to interact with Vicon Autographer wearable camera."""

import argparse
from datetime import datetime
import fnmatch
import os
import re
from shutil import copyfile
import sys
import glob


def main():
    """
    Application entry point responsible for parsing command line requests
    """

    parser = argparse.ArgumentParser(
            description="""Setup Vicon Autographer cameras for data collection \n
                Also download data from camera.""",
            add_help=False
            )

    # required args
    parser.add_argument('--cameraDir', type=str,
            help="path with root of camera dir",
            default="/Volumes/Autographer/")
    parser.add_argument('--participantDir', type=str,
            help="root path to store study data for participant",
            default="")
    parser.add_argument('--participantID', type=str,
            help="name/ID of participant",
            default="setup")
    parser.add_argument('--setup',
            metavar='True/False', default=False, type=str2bool,
            help="""Wipe data from device and setup with correct time \n
                Call this function immediately after camera is plugged in.""")
    parser.add_argument('--download',
            metavar='True/False', default=False, type=str2bool,
            help="Download data from device to destination directory")
    # parse arguments
    if len(sys.argv) < 2:
        parser.print_help()
        sys.exit(-1)
    args = parser.parse_args()

    if args.download is True:
        downloadData(args.cameraDir, args.participantDir, args.participantID)

    if args.setup is True:
        setupCamera(args.cameraDir)


def downloadData(cameraDir, participantDir, participantID):
    """Download participant data from camera to disk

    Image files and sensor files copied from device to local drive

    :param str cameraDir: Input path to root dir of camera
    :param str cameraDir: Output path to store study data for participant
    :param str participantID: participant name/ID

    :return: Camera data copied to <participantDir>/<participantID>
    :rtype: void
    """

    for folder in glob.glob(cameraDir + 'DATA/'):
        images = []
        for root, dirnames, filenames in os.walk(folder):
            if not root.endswith('640_480') and not root.endswith('256_192'):
                for filename in fnmatch.filter(filenames, '*.JPG'): 
                    images.append(os.path.join(root, filename))
                for filename in fnmatch.filter(filenames, '*.RES'): 
                    images.append(os.path.join(root, filename))
                for filename in fnmatch.filter(filenames, '*.txt'): 
                    images.append(os.path.join(root, filename))
                for filename in fnmatch.filter(filenames, '*.CSV'): 
                    images.append(os.path.join(root, filename))
        
        newFolder = participantDir + participantID + '/'
        if not os.path.exists(newFolder):
                os.makedirs(newFolder)
        for image in images:
            newImg = newFolder+image.split('/')[-1]
            #os.rename(image, newImg)
            copyfile(image, newImg)
        print(folder, len(images))
        print('copy of data is now complete from the camera to', newFolder)


def setupCamera(cameraDir):
    """Setup camera to record new data

    Set time on camera and also wipe data from it

    :param str cameraDir: Input path to root dir of camera

    :return: Camera wiped and now ready to collect data
    :rtype: void
    """

    # set time on the camera i.e. write clock_correction.txt
    setCameraTime(cameraDir)

    # delete data from camera
    #shutil.rmtree(cameraDir + 'DATA/')
    
    print('Camera now ready. Please safely eject the device and collect data!')


def setCameraTime(cameraDir):
    """Set time correction on camera

    Write clock_correction.txt on camera with the difference in seconds between
    the camera time and the computer time. The correction is applied when the 
    camera is disconnected from the computer usb port. The file will subsequently
    be deleted. Calculating the camera time is possible but non trivial. We can 
    read the camera time from autographer.inf but this is a static value that 
    is written when the camera is connected to the usb. If we can determine the 
    (computer) time when the camera was connected then we can calculate the 
    current camera time. If this can't be found, go with the present time

    :param str cameraDir: Input path to root dir of camera

    :return: clock_correction.txt written to camera
    :rtype: void
    """

    # get computer time estimate for when camera was plugged in
    computerTime = datetime.now()
    try:
        # get OSX registry time
        deviceLog = []
        for line in open("/var/log/system.log"):
            if "New disk" in line and "Autographer" in line:
                print(line)
                deviceLog += [line]
        computerTime = deviceLog[-1]
    except:
        print('could not read OSX system log')
    
    # get camera time estimate for when camera was plugged in
    cameraTime = datetime.now()
    try:
        for line in open(cameraDir + "autographer.inf"):
            if "Time=" in line:
                timePart = line.split('=')[-1]
                cameraTime = datetime.strpTime(timePart[0:19], '%Y-%m-%dT%H:%M:%S')
    except:
        print('could not read camera time file')

    # write difference (in seconds) between computer and camera time
    secondDiff = (computerTime - cameraTime).total_seconds()
    w = open(cameraDir + "clock_correction.txt", 'w')
    w.write(secondDiff)
    w.close()


def str2bool(v):
    """
    Used to parse true/false values from the command line. E.g. "True" -> True
    """
    return v.lower() in ("yes", "true", "t", "1")


if __name__ == '__main__':
    main()  # Standard boilerplate to call the main() function to begin the program.