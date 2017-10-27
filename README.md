# Oxford wearable camera browser
A wearable camera image browser & annotation tool. If you find this tool helpful, please use the following citations:

[Willetts, Hollowell, Aslett, Holmes, & Doherty. Statistical machine learning of sleep and physical activity phenotypes from sensor data in 96,609 UK Biobank participants. bioRxiv 187625 (2017). doi:10.1101/187625](http://www.biorxiv.org/content/early/2017/09/12/187625)

[Doherty, Moulin, & Smeaton (2011) Automatically Assisting Human Memory: A SenseCam Browser. Memory: Special Issue on SenseCam: The Future of Everyday Research? Taylor and Francis, 19(7), 785-795](http://www.tandfonline.com/doi/abs/10.1080/09658211.2010.509732)

![Browser](http://i.imgur.com/YSqfTL7.png)

[See a demo video](http://i.imgur.com/o0BtSQZ.gif)


## Installation
This project relies on [Electron](https://electron.atom.io/) and Node.js, so first you need to install [npm (node pacakage manager)](https://docs.npmjs.com/getting-started/installing-node). Then proceed as follows:
```bash
# 1. Download/clone this git repo
git clone git@github.com:activityMonitoring/oxford-wearable-camera-browser.git

# 2. Install npm package dependencies
npm install

# 3. Open/run browser
npm start
```


## Adding data from a new participant
Your study should have data stored as follows:
```python
path/<studyName>/
    annotations/
    images/
        participant1/
            B00000895_21I7IV_20170314_134417E.JPG
            B00000895_21I7IV_20170314_134447E.JPG
            ...
            B00000895_21I7IV_20170314_233239E.JPG
            medium/
                B00000895_21I7IV_20170314_134417E.JPG
                B00000895_21I7IV_20170314_134447E.JPG
                ...
                B00000895_21I7IV_20170314_233239E.JPG
            thumbnail/
                B00000895_21I7IV_20170314_134417E.JPG
                B00000895_21I7IV_20170314_134447E.JPG
                ...
                B00000895_21I7IV_20170314_233239E.JPG
        ...
        participantN/
            AAAAAAAAA_BBBBBB_YYYYMMDD_HHMMSSE.JPG
            ...
            AAAAAAAAA_BBBBBB_YYYYMMDD_HHMMSSE.JPG
            medium/
                AAAAAAAAA_BBBBBB_YYYYMMDD_HHMMSSE.JPG
                ...
                AAAAAAAAA_BBBBBB_YYYYMMDD_HHMMSSE.JPG
            thumbnail/
                AAAAAAAAA_BBBBBB_YYYYMMDD_HHMMSSE.JPG
                ...
                AAAAAAAAA_BBBBBB_YYYYMMDD_HHMMSSE.JPG
```


Then update `file_paths.json`, to link to the root folder of participant images and annotation on your local or network drive. For example:
```
{
	"IMAGE_DIR":"C:\\study\\images\\",
	"ANNOTATION_DIR":"C:\\study\\annotation\\",
	"RESIZING_ENABLED":false
}
```
Note you need to use two `\\` instead of `\` as this is a json file.
`"RESIZING_ENABLED":false` will disable resizing images on startup. This is useful if you already know your images have been resized (i.e. into the medium/ and thumbnail/ folders under each participant's images/ dir). If your images aren't already resized, look at the utilities folder for the write-thumbnail-commands.py script to resize images before loading them into the browser; this is MUCH faster than letting the browser resize images.

Please go to this [page with further information on file input](fileInput.md).


## Selecting schema
A schema is simply a list of different labels used to annotate your images. The browser comes with two schemas we have used with wearable camera images, one contains only 7 classes & an 'unknown' class, the second is a more detailed schema based on the [Compendium of Physical Activities](https://sites.google.com/site/compendiumofphysicalactivities/) for which exact energy expenditure values are known.

To select a schema simply press the book button and choose an option from below. Each participant can have seperate annotations using different schemas. E.g. for studying how being outdoors affects activity you could have one schema for 'primary activity', another for 'secondary activity' and a third one for 'indoor/outdoor'. 


## Annotating images
Images are split up into events, which can then be annotated. To split an event into two, click on the line between two images as below:
![splitting](http://i.imgur.com/EDNitOT.png)

This split is where I think the participant has started locking up their bike.
![split](http://i.imgur.com/kdzNzUe.png)

To move event boundaries, click and drag the circles. To delete an event simply drag another event over it.

Depending on the schema you have selected, you should see different annotations in the side-bar. Dragging these onto an event will annotate it. Your annotations are automatically saved to a file, so it is safe to close the browser or change schema, they will be there when you re-select the same schema.

Tip:
* Press Ctrl+E to zoom in
* Press Ctrl+Z to zoom out


## Exporting annotations
Annotations can be downloaded as a .csv file by pressing the 'downward-arrow' button. The file will have 3 columns as shown below.
![annotation.csv](http://i.imgur.com/tW9KiQ3.png)

All the annotations are stored in the 'annotations' folder. The files are not large so this folder can be copied if you want to back up your work. If you want to restore a specific one e.g. annotations for 'sven' using the 7-class.csv schema, then copy the file `/annotation/sven/annotation_7-class.csv` (while the browser is closed).


## Custom schemas
The browser comes with two schema .csv files, which can be modified, copied or deleted. They can be seen in the 'schema' folder and opened with notepad. The annotations are simply one annotation per-line, e.g. to add a new 'walking' annotation simply add a line with 'walking'. If you wish to define your own schema simply copy one of the existing ones, and add/remove rows as you see fit. You can use either a text editor (Notepad), or Excel. If using Excel make sure to save as .csv filetype, as .xls files will not be recognised. 

Excel may warn you when saving a .csv file, ignore these messages (select yes).
![excel warning](http://i.imgur.com/xcJ34yk.png)

### Special characters
Semicolons (;) are use to define folders, e.g.
```
activity;outdoor;running
activity;outdoor;walking
activity;indoor;running
activity;indoor;walking
```
![folder structure](http://i.imgur.com/HAqMuz6.png)


# Training new researchers
To assess the performance of new researchers learning to annotate wearable camera data, we have 9 participants with reference annotations in Oxford. The reference annotations are in training/ and ask Aiden for help to locate the image datasets on Oxford servers. This document gives a good overview of the [schedule and protocols for trainees.](trainingSchedule.docx) To assess the performance of a trainee then run:
```Bash
python kappaScoring.py /..path../train4-Aiden.csv

# input:
#   annotationsCsv: csv with annotations just made by trainee

# output:
#   input-feedback.html: html summary page with kappa score, confusion table, and episodes to review
```


## Development
To work on this project `git clone` this repository and use the `npm start` command to run a test instance, the program will automatically reboot after any changes to source code. Most application logic is in `/static/main.html`, except image resizing and schema parsing which live in `/image_resize.js` and `/schema.js`. Once built there are no external dependencies, however development requires node.js and npm installed. Run `npm install` to install required modules. This program is written in [Electron](https://electron.atom.io/), so a good read of their docs is recommended.

To build a distributable program for your OS run `npm run-script build`. This will generate e.g. OxfordImageBrowser-win32-x64 (if you are on 64-bit windows).


## Special errors
We don't want anyone to lose their work, so if the annotation file fails to save (for whatever reason; hard drive failiure, networked drive cutting out, or someone renamed the annotation folder), we warn them and backup the work. We turn the background orange and save a copy of the current annotations to the root folder... if that save *also* doesn't work then we turn the background red! The annotation file will appear at the side so you can copy paste it and save it yourself.

To restore the backup you should go into the annotation folder, then go into the participant folder. Start annotating again to generate a new annotation file (.csv) and then close the browser, open the .csv in notepad, copy in your backup, and save and close.. now when you start the browser the data should be restored.
