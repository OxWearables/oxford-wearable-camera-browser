# Node-image-server
A wearable camera image browser & annotation tool

## Usage

![SvenBrowser](http://i.imgur.com/YSqfTL7.png)

[See a demo video](http://i.imgur.com/o0BtSQZ.gif)

## Adding a new participant

Each participant has their own folder in the 'images' directory. Create a new folder (Windows: `Ctrl-shift-N`), with the name of the participant.

![in images folder](http://i.imgur.com/M4kxRQc.png)

Within the folder copy over your images. Images currently need to be type .jpg (or .jpeg) and must have file name like: 

![in participant folder](http://i.imgur.com/VYWLIPO.png)

Now start the browser, the browser should begin creating 'thumbnail' and 'medium' size images to speed up browsing. This may take a short time but only needs to be done once. You should see a screen like the below, and when the queue is empty click on the participant to see the images.

![resizing screen](http://i.imgur.com/5XIcP9a.png)

To remove a participant, simply delete their images folder while the browser is not running. If you have made any annotations they will also have a participant folder in the 'annotations' folder, delete this too.

## Annotating images

## Exporting annotations

## Custom schemas

The browser comes with two schema .csv files, one with 7 classes of activity to choose from, and a more detailed schema based on the [Compendium of Physical Activities](https://sites.google.com/site/compendiumofphysicalactivities/). If you wish to define your own simply copy one of these, and add/remove rows as you see fit. You can use either a text editor (Notepad), or Excel. If using Excel make sure to save as .csv. 

Excel will repeatedly warn about saving a .csv file, ignore these messages (select yes).
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
## Development

Requires node.js. Run `npm install` to install required modules, and `npm start` to run the program.

To build an execuatble program for you OS run `npm run-script build`.
