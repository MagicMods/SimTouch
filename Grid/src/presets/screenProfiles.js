import { ScreenConfig } from "../config/screenConfig.js";

// Predefined screen profiles for different device configurations
export const ScreenProfiles = {
    // Screen profiles collection
    profiles: {
        // Circular screens
        "240x240_341_Circular": new ScreenConfig({
            name: "240x240 (341 cells)",
            physicalWidth: 240,
            physicalHeight: 240,
            shape: "circular",
            targetCells: 341,
            scale: 1,
            gap: 1,
            aspectRatio: 1.0,
            allowCut: 3
        }),

        "480x480_Circular": new ScreenConfig({
            name: "480x480 Circular",
            physicalWidth: 480,
            physicalHeight: 480,
            shape: "circular",
            targetCells: 341,
            scale: 0.986,
            gap: 2,
            aspectRatio: 1.0,
            allowCut: 1
        }),

        // Rectangular screens
        "240x280_Rectangular": new ScreenConfig({
            name: "240x280 Rectangular",
            physicalWidth: 240,
            physicalHeight: 280,
            shape: "rectangular",
            targetCells: 300,
            scale: 0.986,
            gap: 1,
            aspectRatio: 1.0,
            allowCut: 1
        }),

        "268x448_Rectangular": new ScreenConfig({
            name: "268x448 Rectangular",
            physicalWidth: 268,
            physicalHeight: 448,
            shape: "rectangular",
            targetCells: 325,
            scale: 0.986,
            gap: 1,
            aspectRatio: 1.0,
            allowCut: 1
        }),

        "170x320_Rectangular": new ScreenConfig({
            name: "170x320 Rectangular",
            physicalWidth: 170,
            physicalHeight: 320,
            shape: "rectangular",
            targetCells: 280,
            scale: 0.986,
            gap: 1,
            aspectRatio: 1.0,
            allowCut: 1
        })
    },

    // Default profile key
    defaultProfileKey: "240x240_341_Circular",

    // Get the default profile
    getDefaultProfile() {
        return this.profiles[this.defaultProfileKey];
    },

    // Get a profile by key
    getProfile(key) {
        return this.profiles[key] || this.getDefaultProfile();
    },

    // Get all profile keys
    getProfileKeys() {
        return Object.keys(this.profiles);
    },

    // Add or update a profile
    saveProfile(key, config) {
        this.profiles[key] = config;
    }
}; 