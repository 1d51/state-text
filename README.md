# State Text
A plugin for RPG Maker MV games, it reads information from a configuration file placed at the root of the game files (inside the `www` folder) called `statetext.json`.

It uses that to intercept and change dialogs in the game that use the **\N[X]** annotation, while also inserting the corresponding **\AF[X]** annotation if it's not already present, to show the character's current image, but only if a face image would have been shown. This annotation comes from YEP Message Core, so that plugin is a requirement. All texts will be changed with the information provided in the configuration file, according to the specified **chance**.
