/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const { GObject, St, Gio, Gvc } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Me = ExtensionUtils.getCurrentExtension();
const MixerControl = Gvc.MixerControl;
const PopupMenu = imports.ui.popupMenu;

const AudioDevicePopupMenu = GObject.registerClass(
class AudioDevicePopupMenu extends PopupMenu.PopupSubMenuMenuItem {
    /**
    * Initializer
    *
    * @param {MixerControl} mixerControl - An open instance of a Gvc.MixerControl
    * @param [string} direction - Direction of the audio devie as "in" or "out"  
    */
    _init(mixerControl, direction) {
        super._init("Initializing...", true);
        this._mixerControl = mixerControl;
        this._direction = direction;
        
        this._menuItemMap = new Map();
        this._menuItemMap[Symbol.iterator] = function*() {
            yield* [...this.entries()].sort( (a, b) => a[1].localeCompare(b[1]) ); 
        }

        // The signal "output-added" is called after connect for each available output device 
        // before signal "active-output-update" - Used to initialize the popup menu
        this._signals = [];
        this._signals[0] = this._mixerControl.connect(direction + "put-added", (mixerControl, id) => this._mixerDeviceAdded(id));
        this._signals[1] = this._mixerControl.connect(direction + "put-removed", (mixerControl, id) => this._mixerDeviceRemoved(id));
        this._signals[2] = this._mixerControl.connect("active-" + direction + "put-update", (mixerControl, id) => this._activeStreamChanged(id));
    }
    
    _lookupMixerUiDevice(id) {
        if (this._direction === "in") {
            return this._mixerControl.lookup_input_id(id);
        } else {
            return this._mixerControl.lookup_output_id(id);
        }
    }
    
    /**
     * MixerControl signal handler
     */
    _mixerDeviceAdded(id) {
        let mixerUiDevice = this._lookupMixerUiDevice(id);
        
        if (mixerUiDevice.get_origin()) {
            this._menuItemMap.set(id, mixerUiDevice.get_description() + " - " + mixerUiDevice.get_origin());
        } else {
            this._menuItemMap.set(id, mixerUiDevice.get_description());
        }
        
        if (this._isInitialized) {
            this._updateMenu();
        }
    }
    
    /**
     * MixerControl signal handler
     */
    _mixerDeviceRemoved(id) {
        this._menuItemMap.delete(id);
        this._updateMenu();
    }
            
    /**
     * MixerControl signal handler
     */
    _activeStreamChanged(id) {
        this.label.set_text(this._menuItemMap.get(id));
        
        if (!this._isInitialized) {
            this._updateMenu();
            this._isInitialized = true;
        }
    }
    
    /**
     * Private function to build the popup menu items
     */
    _updateMenu() {
        this.menu.removeAll();

        for (let entry of this._menuItemMap) {
            let item = new PopupMenu.PopupMenuItem(entry[1]);
            item.connect("activate", () => {
                let mixerUiDevice = this._lookupMixerUiDevice(entry[0]);
                
                if (this._direction === "in") {
                    this._mixerControl.change_input(mixerUiDevice);
                } else {
                    this._mixerControl.change_output(mixerUiDevice);
                }
            });
            this.menu.addMenuItem(item);
        };
    }
    
    /**
     * Cleanup function to be called by extension
     */
    _disable() {
        this._signals.forEach((signal) => this._mixerControl.disconnect(signal));
        this._signals = null;
        this._menuItemMap = null;
        this._isInitialized = null;
    }
});

class Extension {
    /**
     * Private function to add the audio sink menu below the output volume slider
     */
    _addMenuItem(item) {
        const volumeMenu = Main.panel.statusArea.aggregateMenu._volume._volumeMenu;
        const items = volumeMenu._getMenuItems();
        
        for (let i = 0; i < items.length; i++) {
            if (items[i] === volumeMenu._output.item) {
                volumeMenu.addMenuItem(item, i + 1);
                break;
            }
        }
    }
    
    enable() {
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.audio-selector');
        const showOutputDeviceMenu = this._settings.get_boolean("show-output-device-menu");
        const showInputDeviceMenu = this._settings.get_boolean("show-input-device-menu");

        if (showOutputDeviceMenu || showInputDeviceMenu) {
            this._mixerControl = MixerControl.new(Me.metadata.name);
            this._mixerControl.open();

            if (showInputDeviceMenu) {
                this._audioInputDevicePopupMenu = new AudioDevicePopupMenu(this._mixerControl, "in");
                this._addMenuItem(this._audioInputDevicePopupMenu);
            }            

            if (showOutputDeviceMenu) {
                this._audioOutputDevicePopupMenu = new AudioDevicePopupMenu(this._mixerControl, "out");
                this._addMenuItem(this._audioOutputDevicePopupMenu);
            }            
        }
        
        /**
        * Update the visible popup menu if the settings has been changed
        */
        this._settingsSignal = this._settings.connect("change-event", () => {
            this.disable();
            this.enable();
        });
        
        log("enabled");
    }
    
    // REMINDER: It's required for extensions to clean up themselves when
    // they are disabled. This is required for approval during review!
    disable() {
        this._settings.disconnect(this._settingSignal);
        this._settingsSingal = null;
        this._settings = null;
        
        if (this._audioOutputDevicePopupMenu) {
            this._audioOutputDevicePopupMenu._disable();
            this._audioOutputDevicePopupMenu.destroy();
            this._audioOutputDevicePopupMenu = null;
        }

        if (this._audioInputDevicePopupMenu) {
            this._audioInputDevicePopupMenu._disable();
            this._audioInputDevicePopupMenu.destroy();
            this._audioInputDevicePopupMenu = null;
        }
        
        if (this._mixerControl) {
            this._mixerControl.close();
            this._mixerControl = null;
        }

        log("disabled");
    }   
}

function init() {
    return new Extension();
}
