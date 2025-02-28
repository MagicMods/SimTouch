import dgram from "dgram";

// Create a listener to see if our own packets are being sent correctly
const listener = dgram.createSocket("udp4");

// Set up error handling
listener.on("error", (err) => {
  console.error(`Diagnostic listener error: ${err.message}`);
  listener.close();
});

// Set up message handling
listener.on("message", (msg, rinfo) => {
  console.log(
    `Diagnostic received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`
  );

  if (msg.length === 4) {
    const x = msg.readInt16LE(0);
    const y = msg.readInt16LE(2);
    console.log(`Parsed values: x=${x}, y=${y}`);
  } else {
    console.log(`Raw message: ${msg.toString("hex")}`);
  }
});

// Bind listener to the same port as our server should be using
listener.on("listening", () => {
  const address = listener.address();
  console.log(
    `Diagnostic listener active on ${address.address}:${address.port}`
  );

  // Once listener is ready, start sending test data
  startSendingTestData();
});

// Bind to the same port on a different address
// This is to verify if the data can be received properly
listener.bind(3001, "127.0.0.1");

function startSendingTestData() {
  const sender = dgram.createSocket("udp4");

  console.log("Sending test packets...");

  // Send a packet every second
  const interval = setInterval(() => {
    const buffer = Buffer.alloc(4);
    buffer.writeInt16LE(100, 0);
    buffer.writeInt16LE(100, 2);

    // Try different target addresses
    const targets = [
      { port: 3001, address: "127.0.0.1" }, // localhost
      { port: 3001, address: "0.0.0.0" }, // all interfaces
      { port: 3001, address: "192.168.3.255" }, // broadcast (from your config)
    ];

    for (const target of targets) {
      sender.send(buffer, target.port, target.address, (err) => {
        if (err) {
          console.error(
            `Error sending to ${target.address}:${target.port} - ${err.message}`
          );
        } else {
          console.log(`Sent test packet to ${target.address}:${target.port}`);
        }
      });
    }
  }, 1000);

  // Stop after 10 seconds
  setTimeout(() => {
    clearInterval(interval);
    sender.close();
    listener.close();
    console.log("Diagnostic test completed");
  }, 10000);
}
