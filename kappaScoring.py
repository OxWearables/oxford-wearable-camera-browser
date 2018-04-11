import argparse
import numpy as np
import pandas as pd
from sklearn.metrics import cohen_kappa_score
import sys


def main():
    parser = argparse.ArgumentParser(
        description="""Score new annotators against training reference standard""",
        add_help=False
    )
    # required args
    parser.add_argument('annotationsCsv', type=str,
            help="""csv file of annotations to score""")
    # optional args
    parser.add_argument('--participantStr', type=str, default=None,
            help="""manual set of participant id e.g. 'train1'""")
    parser.add_argument('--refDir', type=str,
            default='training/',
            help="""dir with reference annotations""")
    parser.add_argument('--imageListsDir', type=str,
            default='training/',
            help="""dir with reference image lists""")
    # parse arguments
    if len(sys.argv) < 2:
        parser.print_help()
        sys.exit(-1)
        args = parser.parse_args()
    args = parser.parse_args()
    
    # auto infer particiant ID from input file
    if args.participantStr is None:
        args.participantStr = args.annotationsCsv.split('/')[-1].split('-')[0]
        print 'participant = ', args.participantStr

    # auto determine I/O file names
    fileListTxt = args.imageListsDir + args.participantStr + '-imageList.txt'
    refAnnotationsCsv = args.refDir + args.participantStr + '-Salma-activities.csv'
    feedbackHtml = args.annotationsCsv.replace('.csv','-feedback.html')

    # call main method to evaluate annotation performance
    evaluateAnnotationAgreement(fileListTxt, refAnnotationsCsv, \
                                args.annotationsCsv, feedbackHtml, True)


def evaluateAnnotationAgreement(fileListStr, refAnnotationsCsv,
                                newAnnotationsCsv, outFeedbackHtml, groupAnnotations):
    fileList = pd.read_csv(fileListStr)
    fileList.columns = ['name']
    fileList['imgTime'] = pd.to_datetime(fileList['name'].str.split('_').str.get(2) + ' ' 
               + fileList['name'].str.split('_').str.get(3).str.replace('E.JPG',''),
               format='%Y%m%d %H%M%S')
    fileList = fileList.sort_values('imgTime')
    pd.options.mode.chained_assignment = None  # default='warn'
    #fileList = appendAnnotationsToList(refAnnotationsCsv, '%d/%m/%Y %H:%M:%S', False, fileList, 'ref')
    fileList = appendAnnotationsToList(refAnnotationsCsv, '%Y-%m-%dT%H:%M:%S.%fZ', True, fileList, 'ref')
    fileList = appendAnnotationsToList(newAnnotationsCsv, '%Y-%m-%dT%H:%M:%S.%fZ', True, fileList, 'my')
    
    if groupAnnotations == True:    
        # read in 'annotation' to 'label' mapping
        a2l = pd.read_csv('label-dictionary-9-classes.csv', header=0, skip_blank_lines=True)
        # manually add sleep and uncodeable labels since not in compendium
        a2l = a2l.append(pd.DataFrame([{'annotation':'7030 sleeping','label':'sleep'}]),
                         ignore_index =True)
        # move from ~10 labels down to ~7 labels
        #labelMapFree = {'bicycling':'bicycling', 'household-chores':'mixed', 'manual-work':'mixed',
        #                'mixed-activity':'mixed', 'sitting':'sit.stand', 'sports':'mixed',
        #                'standing':'sit.stand', 'vehicle':'vehicle', 'walking':'walking',
        #                'sleep':'sleep'}# 'unknown':'none', 'none':'none',
                        #'uncodeable':'uncodeable'}
        #a2l['label'] = a2l['label'].replace(labelMapFree)
        a2lDict = a2l.set_index('annotation').T.to_dict('records')[0]
        fileList['refCodes'] = fileList['ref'].replace(a2lDict)
        fileList['myCodes'] = fileList['my'].replace(a2lDict)
    
    # calculate and write out agreement scores and confusion matrix
    refCodes = fileList['refCodes']
    myCodes = fileList['myCodes']
    
    crossTab = pd.crosstab(refCodes, myCodes, margins=True )
    print '\n\nkappa score = ', cohen_kappa_score(refCodes, myCodes)

    w = open(outFeedbackHtml,'w')
    w.write('<html>\n')
    w.write(styleCssHtml())
    w.write('<body>\n')
    title = outFeedbackHtml.replace('.html','')
    if len(title.split('/')) > 0:
      title = title.split('/')[-1]
    w.write('<h1 align="center">' + title + '</h1>\n')
    w.write('<h3 align="center"> Score = ' + str(int(cohen_kappa_score(refCodes, myCodes)*100)) + '%</h3>\n')
    w.write('<hr>\n')
    w.write('<h3>Please review these episodes:</h3>')
    w.write(episodesHtml(fileList) + '\n')
    w.write('</tbody></table>')
    w.close()
    print 'Feedback summary written to: ', outFeedbackHtml

    return crossTab.style.applymap(highlight_vals)


def appendAnnotationsToList(csvPath, dateFormat, fromNodeJS, fileList, colName):
    # import and prepare csv annotations file
    ref = pd.read_csv(csvPath)
    if fromNodeJS:
        # convert UTC time (saved by node-image-browser) to local time (acc data)
        ref['startTime'] = pd.to_datetime(ref['startTime'], format=dateFormat).dt.tz_localize('UTC').dt.tz_convert('Europe/London')
        ref['endTime'] = pd.to_datetime(ref['endTime'], format=dateFormat).dt.tz_localize('UTC').dt.tz_convert('Europe/London')
    # now store time and be timezone agnostic (after adjustment above if needed from node.js browser files)
    ref['startTime'] = pd.to_datetime(ref['startTime'], format=dateFormat).dt.tz_localize(None)
    ref['endTime'] = pd.to_datetime(ref['endTime'], format=dateFormat).dt.tz_localize(None)
    

    # default end time for one annotation is usually ~15-20sec before start-time for next episode
    # therefore set new 'complete' endtime as start-time of next episode
    ref['endTimeComplete'] = ref['startTime'].shift(-1)
    ref.loc[pd.isnull(ref['endTimeComplete']), 'endTimeComplete'] = ref['endTime']
    
    #convert episode-level annotations to image-level annotations
    for idx, row in ref.iterrows():
        start = row["startTime"]
        end = row["endTimeComplete"]
        row_annotation = row["annotation"]
        fileList.loc[((fileList['imgTime']>=start) & (fileList['imgTime']<end)), colName] = row_annotation
    
    print colName + ' NAN codes removed =', len(fileList[pd.isnull(fileList[colName])])
    fileList = fileList[~pd.isnull(fileList[colName])]
    print colName + ' missing annotations =', len(fileList[fileList[colName]=='undefined'])
    fileList.loc[fileList[colName]=='undefined', colName] = 'undefined;-99'
    fileList.loc[fileList[colName]==' <unknown>', colName] = 'undefined;-99'
    fileList[colName + 'Codes'] = fileList[colName].str.extract('(\d+)', expand=False)
    fileList[colName + 'Codes-orig'] = fileList[colName + 'Codes']
    return fileList


def episodesHtml(fileList):
    # identify disagreement images, then lump together into episodes
    fileList['codeAll'] = fileList['refCodes'].map(str) + '-' + fileList['myCodes'].map(str)
    fileList['prevCodeAll'] = fileList['codeAll'].shift(1)
    fileList['disagree'] = 0
    fileList.loc[fileList['refCodes'] != fileList['myCodes'], 'disagree'] = 1
    fileList.loc[fileList['codeAll'] != fileList['prevCodeAll'], 'disagree'] = 0
    runs = zero_runs(np.clip(np.rint(fileList['disagree']-1),-1,0))
    # write episodes to html
    html = '<table id="hor-minimalist-a" summary="Employee Pay Sheet">'
    html += '<thead><tr><th>date</th><th>start</th><th>end</th><th>reference</th><th>me</th></tr></thead>\n'
    html += '<tbody>\n'
    for ix in runs:
        episode = fileList[ix[0]:ix[1]]
        startTime = episode['imgTime'].min()
        endTime = episode['imgTime'].max()
        duration_mins = (endTime - startTime).total_seconds() / 60.0
        line = '<tr>'
        line += '<td>' + startTime.strftime("%Y-%m-%d") + '</td>'
        line += '<td>' + startTime.strftime("%I:%M %p") + '</td>'
        line += '<td>' + endTime.strftime("%I:%M %p") + '</td>'
        refCodeStr = str(episode['refCodes'].min())
        myCodeStr = str(episode['myCodes'].min())
        if refCodeStr != str(episode['refCodes-orig'].min()):
            refCodeStr += " (" + str(episode['refCodes-orig'].min()) + ")"
            myCodeStr += " (" + str(episode['myCodes-orig'].min()) + ")"
        line += '<td>' + refCodeStr  + '</td>'
        line += '<td>' + myCodeStr + '</td>'
        line += '</tr>'
        if duration_mins >= 5:
            html += line + '\n'

    #close writer
    html += '</tbody></table>'#</body></html>'
    return html


def confusionMatrixHtml(crossTab):
    #html = '<html><style type="text/css">\n<!--\n@import url("style.css");\n-->\n</style><body>\n'
    html = '<table id="hor-minimalist-a" summary="Confusion matrix">\n'
    html += '<colgroup><col class="oce-first" /></colgroup>'
    html += '<thead><tr><th scope="col">Me &rarr;<br>Ref &darr;</th>'
    for col in crossTab.columns:
        html += '<th scope="col">' + str(col) + '</th>'
    html += '</tr></thead>\n'
    for ix, row in crossTab.iterrows():
        html += '<tr><td>' + str(ix) + '</td>'
        for col in crossTab.columns:
            html += '<td class="ele">' + str(row[col]) + '</td>'
        html += '</tr>\n'
    html += '</tbody></table>'#</body></html>'
    return html

def styleCssHtml():
    html = '<style>\n'
    html += """
            #hor-minimalist-a
            {
                font-family: "Lucida Sans Unicode", "Lucida Grande", Sans-Serif;
                font-size: 12px;
                background: #fff;
                margin: 45px;
                width: 480px;
                border-collapse: collapse;
                text-align: left;
            }
            #hor-minimalist-a th
            {
                font-size: 14px;
                font-weight: normal;
                color: #039;
                padding: 10px 8px;
                border-bottom: 2px solid #6678b1;
            }
            #hor-minimalist-a td
            {
                color: #669;
                padding: 9px 8px 0px 8px;
            }
            #hor-minimalist-a tbody tr:hover td
            {
                color: #009;
            }
            """
    html += '</style>'
    return html

def zero_runs(a):
    # Create an array that is 1 where a is 0, and pad each end with an extra 0.
    iszero = np.concatenate(([0], np.equal(a, 0).view(np.int8), [0]))
    absdiff = np.abs(np.diff(iszero))
    # Runs start and end where absdiff is 1.
    ranges = np.where(absdiff == 1)[0].reshape(-1, 2)
    return ranges


def highlight_vals(val, min=50, color='red'):
    if val >= min:
        return 'background-color: %s' % color
    else:
        return ''


if __name__ == '__main__':
    main()  # Standard boilerplate to call the main() function to begin the program.
