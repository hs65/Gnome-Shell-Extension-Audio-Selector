const {Adw, Gio, Gtk} = imports.gi;

// It's common practice to keep GNOME API and JS imports in separate blocks
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @param {ExtensionMeta} meta - An extension meta object, described below.
 */
function init() {
}

/**
 * This function is called when the preferences window is first created to build
 * and return a GTK widget.
 *
 * As of GNOME 42, the preferences window will be a `Adw.PreferencesWindow`.
 * Intermediate `Adw.PreferencesPage` and `Adw.PreferencesGroup` widgets will be
 * used to wrap the returned widget if necessary.
 *
 * @returns {Gtk.Widget} the preferences widget
 */
function buildPrefsWidget() {
    // This could be any GtkWidget subclass, although usually you would choose
    // something like a GtkGrid, GtkBox or GtkNotebook
    const prefsWidget = new Gtk.Label({
        label: Me.metadata.name,
        visible: true,
    });

    // Add a widget to the group. This could be any GtkWidget subclass,
    // although usually you would choose preferences rows such as AdwActionRow,
    // AdwComboRow or AdwRevealerRow.
    const label = new Gtk.Label({ label: `${Me.metadata.name}` });
    group.add(label);

    window.add(page);
}

/**
 * This function is called when the preferences window is first created to fill
 * the `Adw.PreferencesWindow`.
 *
 * This function will only be called by GNOME 42 and later. If this function is
 * present, `buildPrefsWidget()` will never be called.
 *
 * @param {Adw.PreferencesWindow} window - The preferences window
 */
function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.audio-selector');

    const audioOutputToggle = new Gtk.Switch({
        active: settings.get_boolean("show-output-device-menu"),
        valign: Gtk.Align.CENTER
    });
    const outputSelectorRow = new Adw.ActionRow({ title: 'Show Audio Output Menu' });
    outputSelectorRow.add_suffix(audioOutputToggle);
    outputSelectorRow.activatable_widget = audioOutputToggle;

    const audioInputToggle = new Gtk.Switch({
        active: settings.get_boolean("show-input-device-menu"),
        valign: Gtk.Align.CENTER
    });
    const inputSelectorRow = new Adw.ActionRow({ title: 'Show Audio Input Menu' });
    inputSelectorRow.add_suffix(audioInputToggle);
    inputSelectorRow.activatable_widget = audioInputToggle;

    settings.bind(
        "show-output-device-menu",
        audioOutputToggle,
        "active",
        Gio.SettingsBindFlags.DEAULT
    );

    settings.bind(
        "show-input-device-menu",
        audioInputToggle,
        "active",
        Gio.SettingsBindFlags.DEAULT
    );
    
    const prefsGroup = new Adw.PreferencesGroup();
    prefsGroup.add(outputSelectorRow);
    prefsGroup.add(inputSelectorRow);
    
    const prefsPage = new Adw.PreferencesPage();
    prefsPage.add(prefsGroup);

    window.add(prefsPage);    
}
