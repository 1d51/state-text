/*:
 * @author 1d51
 * @version 1.0.3
 * @plugindesc Change dialog text based on actor states
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 * 
 * This plugin reads information from a configuration file placed at the root
 * of the game files (inside the www folder) called "statetext.json". It uses
 * that to intercept and change dialogs in the game that use the \N[X] annotation,
 * while also inserting the corresponding \AF[X] annotation if it's not already 
 * present, to show the character's current image, but only if a face image would
 * have been shown. This annotation comes from YEP Message Core, so that plugin
 * is a requirement. All texts will be changed with the information provided in
 * the configuration file, according to the specified chance.
 */
 
var StatusText = StatusText || {};

StatusText.fs = require('fs');

StatusText.Helpers = StatusText.Helpers || {};
StatusText.Params = StatusText.Params || {};
StatusText.Holders = StatusText.Holders || {};

(function($) {
	
	$.Helpers.createPath = function(wrath) {
		const oldVersion = window.location.pathname !== "/index.html";
        oldVersion && (wrath = "/" + wrath);
        wrath += (wrath === "") ? "./" : "/";
        !(Utils.isNwjs() && Utils.isOptionValid("test")) && (wrath = "www/" + wrath);
        let path = window.location.pathname.replace(/(\/www|)\/[^\/]*$/, wrath);
        if (path.match(/^\/([A-Z]\:)/)) path = path.slice(1);
        path = decodeURIComponent(path);
        return path;
    };
	
	$.Helpers.define = function(variable, value) {
    if (typeof(variable) === "undefined") return value;
    return variable;
};
	
	/************************************************************************************/
	
	$.Params.root = $.Helpers.createPath("");
	
	$.insertFace = function(text) {
		if ($.Params.skip) return text;
		const actorMatch = text.match(/<\\N\[(\d+)\]>/i);
		
		if (actorMatch) {
			$.Params.index = parseInt(actorMatch[1]);
			const faceMatch = text.match(/<\\AF\[(\d+)\]>/gi);
			if (!faceMatch) return text.replace(/<\\N\[(\d+)\]>/gi, "<\\N[$1]>\\AF[$1]");
		} else $.Params.index = -1;
		return text;
	};
	
	$.convertText = function(text) {
		if ($.Params.skip) return text;
		if ($.Params.index >= 0) {
			const actor = $gameActors.actor($.Params.index);
			const states = $.readConfig()["states"];
			
			for (let i = 0; i < states.length; i++) {
				if(actor.isStateAffected(states[i]["id"])){
					if (Math.random() < states[i]["chance"]) {
						const replacements = states[i]["replacements"];
						for (let j = 0; j < replacements.length; j++) {
							const chance = $.Helpers.define(replacements[j]["chance"], 1);
							const actorId = $.Helpers.define(replacements[j]["actorId"], -1);
							if (Math.random() <= chance && (actorId < 0 || $.Params.index === actorId)) {
								const source = new RegExp(replacements[j]["source"], replacements[j]["modifiers"]);
								const target = replacements[j]["target"].replace(/\\/g, "\x1b").replace(/<br>/g, "\n");
								return text.replace(source, target);
							}
						}
					} else return text;
				}
			}
		} return text;
	};
	
	$.readConfig = function() {
		const path = $.Params.root + "statetext.json";
		if ($.fs.existsSync(path)) {
			const file = $.fs.readFileSync(path);
			return JSON.parse(file);
		} else {
			return {
				"states": []
			};
		}
	}
	
	/************************************************************************************/
	
	$.Holders.command101 = Game_Interpreter.prototype.command101;
	Game_Interpreter.prototype.command101 = function() {
		if (!$gameMessage.isBusy()) {
			StatusText.Params.skip = !this._params[0] && !this._params[1];
		} return $.Holders.command101.call(this);
	};
	
	$.Holders.convertEscapeCharacters = Window_Message.prototype.convertEscapeCharacters;
	Window_Message.prototype.convertEscapeCharacters = function(text) {
		text = StatusText.insertFace(text);
		text = $.Holders.convertEscapeCharacters.call(this, text);
		text = StatusText.convertText(text);
		return text;
	};
	
})(StatusText);