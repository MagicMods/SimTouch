#define SCREEN_WIDTH 240
#define SCREEN_HEIGHT 240
#define NBR_MODULES 341

void RoundGraph()
{
    const int center = SCREEN_WIDTH / 2; // 120
    const float scale = 0.95f;
    const int radius = center * scale; // ~114
    const int gap = 1;

    // Calculate cell size that will fit approximately NBR_MODULES
    int cellWidth = 10; // Starting point based on gridRenderer
    int cellHeight = 10;

    // Generate grid positions
    int moduleCount = 0;
    int cursorX, cursorY;

    // Similar to gridRenderer's approach
    for (int y = -radius; y <= radius && moduleCount < NBR_MODULES; y += cellHeight + gap)
    {
        for (int x = -radius; x <= radius && moduleCount < NBR_MODULES; x += cellWidth + gap)
        {
            // Check if point is within circle
            if (sqrt(x * x + y * y) <= radius)
            {
                // Convert to screen coordinates
                cursorX = center + x - cellWidth / 2;
                cursorY = center + y - cellHeight / 2;

                // Draw rectangle
                uint32_t colSpeed = CRGB_UINT32(modulesMotLeds[moduleCount * 2]);
                uint32_t colDir = modulesMotLeds[moduleCount * 2 + 1].g == 0 ? ColorValue(DIR_L) : ColorValue(DIR_R);

                tft.fillRect(cursorX, cursorY, cellWidth, cellHeight, colSpeed);
                moduleCount++;
            }
        }
    }
}