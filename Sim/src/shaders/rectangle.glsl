// Vertex shader
precision mediump float;
attribute vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}

// Fragment shader
precision mediump float;
uniform vec2 resolution;
uniform vec2 center;
uniform vec2 dimensions;
uniform float aspect;
uniform vec4 color;
uniform float lineWidth;

void main() {
    // Get normalized coordinates (0-1)
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // Correct aspect ratio
    uv.x = uv.x * aspect;
    
    // Calculate distance from point to each edge of rectangle
    float halfWidth = dimensions.x / 2.0;
    float halfHeight = dimensions.y / 2.0;
    
    float left = center.x - halfWidth;
    float right = center.x + halfWidth;
    float top = center.y + halfHeight;
    float bottom = center.y - halfHeight;

    // Calculate distance to nearest edge (positive inside, negative outside)
    float distToLeft = uv.x - left;
    float distToRight = right - uv.x;
    float distToBottom = uv.y - bottom;
    float distToTop = top - uv.y;
    
    // Find minimum distance to any edge
    float dx = min(distToLeft, distToRight);
    float dy = min(distToBottom, distToTop);
    
    // Calculate signed distance field
    float distanceField = min(dx, dy);
    
    // Apply line width
    float outlineEdge = lineWidth;
    
    // Color based on distance
    vec4 finalColor = vec4(0.0);
    
    // Inside rectangle with outline
    if (distanceField > 0.0 && distanceField < outlineEdge) {
        // Inside outline zone - use border color
        finalColor = color;
    } else if (distanceField < 0.0 && distanceField > -outlineEdge) {
        // Outside but within line width - use border color
        finalColor = color;
    } else {
        // Either well inside or well outside - no color (transparent)
        discard;
    }
    
    gl_FragColor = finalColor;
} 