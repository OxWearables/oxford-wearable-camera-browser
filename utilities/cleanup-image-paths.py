import argparse
import fnmatch
import os
import sys
import glob

parser = argparse.ArgumentParser(
        description="""Streamline folder+file structure of Doherty browser output.
                    This makes it easier to load such images in node-image-server""",
        add_help=False
        )

# required args
parser.add_argument('sourceDir', type=str,
        help="""path with root of camera dir for all participants""")
parser.add_argument('--destinationDir', type=str,
        help="""path to root dir of cleaned up folders""")
# parse arguments
if len(sys.argv) < 2:
    parser.print_help()
    sys.exit(-1)
args = parser.parse_args()

if args.destinationDir is None:
    args.destinationDir = args.sourceDir + '../new-camera/'

for folder in glob.glob(args.sourceDir + '*/'):
    images = []
    for root, dirnames, filenames in os.walk(folder):
        for filename in fnmatch.filter(filenames, '*.JPG'): 
            images.append(os.path.join(root, filename))
        for filename in fnmatch.filter(filenames, '*.txt'): 
            images.append(os.path.join(root, filename))
    
    newFolder = args.destinationDir + folder.replace(args.sourceDir,'').replace(' ','')
    if not os.path.exists(newFolder):
            os.makedirs(newFolder)
    for image in images:
        os.rename(image, newFolder+image.split('/')[-1])
        #print 'mv "' + image + '" "' + newFolder+image.split('/')[-1] + '"'
    print folder, len(images)
print 'finished'
