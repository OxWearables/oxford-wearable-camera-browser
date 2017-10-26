## Dev instructions

### files

#### Backend:
`main.js` - main entry point for program (just boilerplate to launch other scripts)

`image_resize.js` - responsible for:
 - all image resizing
 - reading file_paths.json to get the folder locations for 'images' and 'annotations'
 - sending those paths to the frontend via ipc
 - managing a big queue of images to be resized and sending queue details to main.html via ipc
 
 `schema.js` - responsible for:
 - serializing the requested schema to json and sending via ipc
 - needs to make the json interpretable by the [jsTree library](https://www.jstree.com/docs/json/)
 
#### Frontend:
everything is in `main.html`, searching for 'function' will get you most of the main methods with a little comment above (for the important ones).
Some details:
- images are loaded from the 'thumbnail' folder, if they are only in 'full' or 'medium' size then they will not appear
- annotations are stored in the 'annotations' folder, unless specified elsewhere
- there are a few big arrays with all the information about image path, annotation, label, color, that are used to generate all the images
These are: imgs (file paths), evts (store an internal event id), labels (mapping from event id -> label), label_to_color (what it sounds like).
- to see what it gets from the backend do Ctrl-F 'ipc' to find where it uses inter process communication library

### Running the program
For *development* execute *npm start* command. This will launch the program with hot-reload for all front end-changes (but not backend).

### Building an .exe
Build script is under 'scripts' in package.json, to build use command `npm run-script build`, which will build for your current OS. For any other build options refer to [electron-build](https://github.com/electron-userland/electron-packager) documentation.

Importantly after building you must copy over the desired `schema` folder, which goes in the root directory. Any images/annotations you would like to use must also be copied in (or linked to).
