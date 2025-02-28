void UpdateModulesData(unsigned char *buffer)
{
    uint8_t motSpeed;
    uint8_t motPwm;
    uint8_t motDir;

    int m = 0;
    for (int i = 0; i < 341; i++)
    {
        switch (buffer[0])
        {
        case 0:
        {
            motSpeed = buffer[i + 1];
            motPwm = (motSpeed <= 0) ? 0 : map(motSpeed, 0, 100, minPWM, maxPWM);
            modulesMotLeds[m] = ColorFromPalette(Palettes[GetColorPaletteIdx()], motSpeed, BRIGHTNESS_LED, BLEND);
            m++;
            motDir = modulesMotLeds[m].g;

            modulesMotLeds[m] = CRGB(motDir, motPwm, motDir);

            modulesMotLeds[m] = CRGB(motPwm, motDir, motDir);

            m++;
        }
        break;
        case 1:
        {
            m++;
            motDir = buffer[i + 1] < 200 ? 0 : 255;
            motPwm = modulesMotLeds[m].r;

            modulesMotLeds[m] = CRGB(motPwm, motDir, motDir);

            m++;
        }
        break;
        default:
            log_e("Error: UpdateModulesData => buffer[0] out of range");
        }
    }
}