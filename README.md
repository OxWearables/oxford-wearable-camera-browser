# Node-image-server
A wearable camera image browser & annotation tool

## Usage

![SvenBrowser](http://i.imgur.com/YSqfTL7.png)

[See a demo video](http://i.imgur.com/o0BtSQZ.gif)

## Custom schemas

The browser comes with two schema .csv files, one with 7 classes of activity to choose from, and a more detailed schema based on the [Compendium of Physical Activities](https://sites.google.com/site/compendiumofphysicalactivities/). If you wish to define your own simply copy one of these, and add/remove rows as you see fit. You can use either a text editor (Notepad), or Excel. If using Excel make sure to save as .csv. 

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
