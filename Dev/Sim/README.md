# 18-flip/18-flip/README.md

# 18-Flip Project

## Overview
The 18-Flip project is a WebGL application that generates and renders rectangles based on a specified logic. It utilizes shaders for rendering and includes various JavaScript files for managing the application state, animations, and utility functions.

## Project Structure
```
18-flip
├── src
│   ├── index.html          # Main HTML document
│   ├── js
│   │   ├── app.js         # Entry point for JavaScript code
│   │   ├── shaders.js     # WebGL shader handling
│   │   ├── grid.js        # Logic for generating rectangles
│   │   ├── animation.js    # Animation handling
│   │   └── utils.js       # Utility functions
│   ├── styles
│   │   └── main.css       # Application styles
│   └── shaders
│       ├── vertex.glsl    # Vertex shader code
│       └── fragment.glsl  # Fragment shader code
├── package.json            # npm configuration file
└── README.md               # Project documentation
```

## Setup
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd 18-flip
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage
To run the application, open `src/index.html` in a web browser. The application will render rectangles based on the defined logic.

## Contributing
Feel free to submit issues or pull requests for improvements or bug fixes.