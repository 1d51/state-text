/*:
 * @author 1d51
 * @version 2.0.4
 * @plugindesc Change dialog text based on actor states
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 * 
 * This plugin reads information from a configuration file placed at the root
 * of the game files (inside the www folder) called "statetext.json". It uses
 * that to intercept and change dialogs in the game that use the <\N[X]> annotation,
 * while also inserting the corresponding \AF[X] annotation if it's not already 
 * present, to show the character's current image, but only if a face image would
 * have been shown. This annotation comes from YEP Message Core, so that plugin
 * is a requirement. All texts will be changed with the information provided in
 * the configuration file, according to the specified chance.
 */

var Imported = Imported || {};
Imported.StatusText = true;

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
        const faceMatch = text.match(/\\AF\[(\d+)\]/i);
        if ($.Params.image && actorMatch || faceMatch) {
            const match = actorMatch != null ? actorMatch : faceMatch;
            $.Params.index = parseInt(match[1]);

            if (!faceMatch) {
                return text.replace(
                    /<\\N\[(\d+)\]>/i,
                    "<\\N[$1]>\\AF[$1]"
                );
            }
        } else $.Params.index = -1;
        return text;
    };

    $.convertText = function (text) {
        if ($.Params.index >= 0) {
            const actor = $gameActors.actor($.Params.index);
            const inputs = $.readConfig()["inputs"];

            inputs.sort((a, b) => {
                if (a["priority"] == null) return 1;
                if (b["priority"] == null) return -1;
                return a["priority"] - b["priority"];
            });

            for (let i = 0; i < inputs.length; i++) {
                const conditions = inputs[i]["conditions"];
                const replacements = inputs[i]["replacements"];

                const allowed = conditions.every(condition => {
                    const inclusive = condition["inclusive"] || true;
                    const type = condition["type"] || "state";
                    const value = condition["value"];
                    const id = condition["id"];

                    let response = false;
                    if (type === "switch") response = $gameSwitches.value(id);
                    else if (type === "actor") response = id === actor._actorId;
                    else if (type === "random") response = Math.random() <= value;
                    else if (type === "class") response = actor.isClass($dataClasses[id]);
                    else if (type === "skill") response = actor.hasSkill(id);
                    else if (type === "armor") response = actor.hasArmor($dataArmors[id]);
                    else if (type === "weapon") response = actor.hasWeapon($dataArmors[id]);
                    else if (type === "state") response = actor.isStateAffected(id);
                    return inclusive ? response : !response;
                });

                if (!allowed) continue;

                for (let j = 0; j < replacements.length; j++) {
                    const chance = $.Helpers.define(replacements[j]["chance"], 1);
                    const modifiers = replacements[j]["modifiers"];
                    const source = replacements[j]["source"];
                    const target = replacements[j]["target"];

                    if (Math.random() <= chance) {
                        const s = new RegExp(source, modifiers);
                        const t = target.replace(/\\/g, "\x1b").replace(/<br>/g, "\n");
                        text = text.replace(s, t);
                    }
                }

                return text;
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
                "inputs": []
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