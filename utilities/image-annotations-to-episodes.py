import argparse
import numpy as np
import pandas as pd
import sys

parser = argparse.ArgumentParser(
        description="""Convert image-level annotations to episode-level annotations""",
        add_help=False
        )

# required args
parser.add_argument('imageAnnotationsCsv', type=str,
        help="""input csv of image-level annotations""")
parser.add_argument('--episodeAnnotationsCsv', type=str,
        help="""output csv of episode-level annotations""")
# parse arguments
if len(sys.argv) < 2:
    parser.print_help()
    sys.exit(-1)
args = parser.parse_args()

if args.episodeAnnotationsCsv is None:
    args.episodeAnnotationsCsv = args.imageAnnotationsCsv.replace('.csv','-episodes.csv')

# read file
d = pd.read_csv(args.imageAnnotationsCsv)
d['image_time'] = pd.to_datetime(d['image_time'])
# identify boundaries where annotation code changes
d['prev_annotation'] = d['annotation'].shift(1)
boundaries = d[['name', 'image_time', 'annotation']][d['annotation']!=d['prev_annotation']]

# from boundaries, infer start and end times
boundaries['startTime']=boundaries['image_time']
boundaries['endTime'] = boundaries['startTime'].shift(-1) - pd.Timedelta(seconds=1)
boundaries['participant'] = boundaries['name']
boundaries['source'] = 'images'

# write output episode level file
outputCols = ['participant', 'startTime', 'endTime', 'source', 'annotation']
boundaries[outputCols].to_csv(args.episodeAnnotationsCsv, index=False, date_format='%d/%m/%Y %H:%M:%S')


print 'episode-level annotations written to:', args.episodeAnnotationsCsv
print 'finished'
