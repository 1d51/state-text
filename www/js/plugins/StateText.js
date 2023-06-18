/*:
 * @author 1d51
 * @version 1.2.0
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

(function ($) {

    $.Helpers.createPath = function (wrath) {
        const oldVersion = window.location.pathname !== "/index.html";
        oldVersion && (wrath = "/" + wrath);
        wrath += (wrath === "") ? "./" : "/";
        !(Utils.isNwjs() && Utils.isOptionValid("test")) && (wrath = "www/" + wrath);
        let path = window.location.pathname.replace(/(\/www|)\/[^\/]*$/, wrath);
        if (path.match(/^\/([A-Z]\:)/)) path = path.slice(1);
        path = decodeURIComponent(path);
        return path;
    };

    $.Helpers.define = function (variable, value) {
        if (typeof (variable) === "undefined") return value;
        return variable;
    };

    /************************************************************************************/

    $.Params.root = $.Helpers.createPath("");

    $.insertFace = function (text) {
        const actorMatch = text.match(/<\\N\[(\d+)\]>/i);
        const faceMatch = text.match(/\\af\[(\d+)\]/i);
        if ($.Params.image && actorMatch || faceMatch) {
            const match = actorMatch != null ? actorMatch : faceMatch;
            $.Params.index = parseInt(match[1]);
            const faceMatch = text.match(/<\\AF\[(\d+)\]>/gi);
            if (!faceMatch) return text.replace(/<\\N\[(\d+)\]>/gi, "<\\N[$1]>\\AF[$1]");
        } else $.Params.index = -1;
        return text;
    };

    $.convertText = function (text) {
        if ($.Params.index >= 0) {
            const actor = $gameActors.actor($.Params.index);
            const data = $.readConfig()["data"];

            for (let i = 0; i < data.length; i++) {
                const groups = data[i]["groups"];
                const type = data[i]["type"] || "state";
                const id = data[i]["id"];

                if (type === "class" && actor.isClass($dataClasses[id]) ||
                    type === "skill" && actor.hasSkill(id) ||
                    type === "armor" && actor.hasArmor($dataArmors[id]) ||
                    type === "weapon" && actor.hasWeapon($dataArmors[id]) ||
                    type === "state" && actor.isStateAffected(id)) {

                    for (let j = 0; j < groups.length; j++) {
                        const groupChance = $.Helpers.define(groups[j]["chance"], 1);
                        const actorIds = (groups[j]["actors"] || []).map(x => x["id"]);
                        const replacements = groups[j]["replacements"];

                        if (actorIds.length > 0 && !actorIds.includes($.Params.index)) continue;

                        if (Math.random() <= groupChance) {
                            for (let k = 0; k < replacements.length; k++) {
                                const replacementChance = $.Helpers.define(replacements[k]["chance"], 1);
                                const modifiers = replacements[k]["modifiers"];
                                const source = replacements[k]["source"];
                                const target = replacements[k]["target"];

                                if (Math.random() <= replacementChance) {
                                    const s = new RegExp(source, modifiers);
                                    const t = target.replace(/\\/g, "\x1b").replace(/<br>/g, "\n");
                                    text = text.replace(s, t);
                                }
                            }

                            return text;
                        }
                    }
                }
            }
        }

        return text;
    };

    $.readConfig = function () {
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
    Game_Interpreter.prototype.command101 = function () {
        if (!$gameMessage.isBusy()) {
            StatusText.Params.image = this._params[0] || this._params[1];
        }
        return $.Holders.command101.call(this);
    };

    $.Holders.convertEscapeCharacters = Window_Message.prototype.convertEscapeCharacters;
    Window_Message.prototype.convertEscapeCharacters = function (text) {
        text = StatusText.insertFace(text);
        text = $.Holders.convertEscapeCharacters.call(this, text);
        text = StatusText.convertText(text);
        return text;
    };

})(StatusText);