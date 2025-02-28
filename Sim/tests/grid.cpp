void SimGraph()
{
    const int center = 240 / 2; // 120
    const float scale = 0.95f;
    const int radius = center * scale; // ~114
    const int gap = 1;
    const int screenWidth = 240;
    const int screenHeight = 240;

    // Use the same cell dimensions as in JS
    int cellWidth = 10;
    int cellHeight = 10;

    // Match the JavaScript algorithm
    int moduleCount = 0;
    int maxCols = radius / (cellWidth + gap);
    int maxRows = radius / (cellHeight + gap);

    // Similar algorithm to generateRectangles in JavaScript
    for (int r = -maxRows; r <= maxRows && moduleCount < 342; r++)
    {
        for (int c = -maxCols; c <= maxCols && moduleCount < 342; c++)
        {
            int dx = c * (cellWidth + gap);
            int dy = r * (cellHeight + gap);

            // Check if point is within circle
            if (sqrt(dx * dx + dy * dy) <= radius)
            {
                // First calculate mirrored coordinates
                int origX = center - dx - cellWidth / 2;  // Mirrored X (fixed from before)
                int origY = center + dy - cellHeight / 2; // Normal Y

                // Then rotate 90 degrees counterclockwise
                int cursorX = origY;
                int cursorY = screenWidth - origX - cellWidth;

                uint32_t colSpeed;
                uint32_t colDir;
                // Get color values from the array that's in the same order as JS
                if (moduleCount < NBR_MODULES)
                {
                    colSpeed = CRGB_UINT32(modulesMotLeds[moduleCount * 2]);
                }
                else
                {
                    colSpeed = 0;
                    colDir = 0;
                }

                // Swap width and height for the rotated rectangle
                tft.fillRect(cursorX, cursorY, cellHeight, cellWidth, colSpeed);
                moduleCount++;
            }
        }
    }
}