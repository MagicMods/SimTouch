import dgram from "dgram";

const client = dgram.createSocket("udp4");

function sendTestData() {
  const buffer = Buffer.alloc(4);
  buffer.writeInt16LE(100, 0); // x = 100
  buffer.writeInt16LE(100, 2); // y = 100

  client.send(buffer, 3001, "127.0.0.1", (err) => {
    if (err) {
      console.error("Error sending test data:", err);
    } else {
      console.log("Test data sent successfully");
    }
  });
}

// Send test data every second
const interval = setInterval(sendTestData, 1000);

// Stop after 10 seconds
setTimeout(() => {
  clearInterval(interval);
  client.close();
  console.log("Test complete");
}, 30000);

console.log("Sending test UDP data to port 3001...");
