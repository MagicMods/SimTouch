class ShaderLoader {
  static async loadShader(path) {
    try {
      const response = await fetch(path);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.text();
    } catch (error) {
      console.error(`Failed to load shader at ${path}:`, error);
      throw error;
    }
  }
}

export { ShaderLoader };
