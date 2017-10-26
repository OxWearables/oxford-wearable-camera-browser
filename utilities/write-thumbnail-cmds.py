import argparse
import fnmatch
import os
import sys
import glob

parser = argparse.ArgumentParser(
        description="""Write commands to generate thumbnail images for given folder""",
        add_help=False
        )

# required args
parser.add_argument('sourceDir', type=str,
        help="""root of all participant folders which themselves have images to resize""")
parser.add_argument('--cmdsTxt', type=str,
        help="""txt file with thumbnail generation cmds""")
# parse arguments
if len(sys.argv) < 2:
    parser.print_help()
    sys.exit(-1)
args = parser.parse_args()

if args.cmdsTxt is None:
    args.cmdsTxt = "thumbnailCmds.txt"

w = open(args.cmdsTxt, 'w')
for folder in glob.glob(args.sourceDir + '*/'):
    w.write('bash create_thumbnails.sh ' + folder + '\n')

w.close()
print 'finished'
