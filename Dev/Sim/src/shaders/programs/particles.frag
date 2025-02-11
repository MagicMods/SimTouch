precision mediump float;
uniform vec4 color;

void main() {
    // Create circular particles
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float r = dot(coord, coord);
    if (r > 1.0) {
        discard;
    }
    gl_FragColor = color;
}