export class DataVisualization {
    constructor(container, main) {
        this.main = main;
        this.data = [];

        this.canvas = document.createElement("canvas");
        this.canvas.className = "data-visualization";
        this.ctx = this.canvas.getContext("2d");

        container.appendChild(this.canvas);
    }

    updateData(byteArray) {
        // Store the entire array, replacing previous data
        this.data = byteArray;
        this.draw();
    }

    draw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Check if data is valid
        // if (!this.data || !Array.isArray(this.data) || this.data.length === 0) {
        //     console.log("DataVisualization: No data to draw");
        //     return; // Nothing to draw
        // }

        // console.log(`DataVisualization: Drawing ${this.data.length} bytes`);

        const numBars = this.data.length;
        const barWidth = this.canvas.width / numBars;

        // Set the fill color for the bars
        this.ctx.fillStyle = 'white';

        // Iterate through the data and draw bars
        for (let i = 0; i < numBars; i++) {
            const byteValue = this.data[i];
            // Scale the byte value (0-255) to the canvas height
            const barHeight = (byteValue / 100) * this.canvas.height;
            const x = i * barWidth;
            // Y position starts from the bottom of the canvas
            const y = this.canvas.height - barHeight;
            this.ctx.fillRect(x, y, barWidth, barHeight);
        }
    }
}