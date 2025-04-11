export const gridCellShader = {
  vert: `
        precision highp float; // Use highp for matrices

        attribute vec2 position; // Base quad vertex position (-0.5 to 0.5)
        attribute mat4 instanceMatrix; // Per-instance transform (scale, translate)
        attribute vec4 instanceColor; // Per-instance color
        attribute vec3 instanceShadowParams; // Per-instance shadow (intensity, blur, threshold)

        // Varyings to pass data to fragment shader
        varying vec4 vColor;
        varying vec3 vShadowParams;
        varying vec2 vUv; // Pass UV coordinates for fragment shader calculations

        void main() {
            // Convert position from [-0.5, 0.5] to clip space [-1, 1]
            vec2 clipPos = position * 2.0; // This scales -0.5,0.5 to -1,1
            
            // Apply instance transform
            gl_Position = instanceMatrix * vec4(clipPos, 0.0, 1.0);

            // Pass instance data to fragment shader
            vColor = instanceColor;
            vShadowParams = instanceShadowParams;
            vUv = position + 0.5; // Convert base quad (-0.5 to 0.5) to UV (0 to 1)
        }
    `,
  frag: `
        precision mediump float;
        
        varying vec4 vColor;
        varying vec3 vShadowParams;
        varying vec2 vUv;
        
        void main() {
            // Extract shadow parameters
            float shadowIntensity = vShadowParams.x;
            float blurAmount = vShadowParams.y;
            float shadowThreshold = vShadowParams.z;
            
            // Calculate distance from edges with configurable threshold
            float distFromEdge = min(
                min(vUv.x, 1.0 - vUv.x),
                min(vUv.y, 1.0 - vUv.y)
            );
            
            // Create shadow effect with threshold and spread
            float shadow = 1.0 - smoothstep(
                shadowThreshold, 
                shadowThreshold + blurAmount, 
                distFromEdge
            );
            
            // Calculate color brightness (0-1)
            float brightness = max(max(vColor.r, vColor.g), vColor.b);
            
            // Scale shadow intensity inversely with color brightness
            float scaledShadowIntensity = shadowIntensity * (1.0 - brightness * 0.75);
            
            // Apply shadow independently of base color
            vec4 finalColor = vColor;
            finalColor.rgb = mix(finalColor.rgb, vec3(0.0), shadow * scaledShadowIntensity);
            
            gl_FragColor = finalColor;
        }
    `,
};
