class ShaderLoader {
  static async loadShader(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load shader: ${path}`);
      }
      const source = await response.text();
      console.log(`Shader loaded from ${path}`);
      return source;
    } catch (error) {
      console.error(`Error loading shader ${path}:`, error);
      throw error;
    }
  }
}

export { ShaderLoader };
