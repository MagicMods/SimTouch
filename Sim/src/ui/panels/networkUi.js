import { BaseUi } from "../baseUi.js";
import { NetworkConfig } from "../../network/networkConfig.js";
import { socketManager } from "../../network/socketManager.js";

export class NetworkUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Network");

    this.initNetworkControls();
  }

  initNetworkControls() {
    const socket = socketManager;
    if (!socket) return;

    // Create local control object
    const controls = {
      enabled: socket.enable,
      debugSend: socket.debugSend,
      debugReceive: socket.debugReceive,
    };

    // Add status display
    const status = {
      connection: "Disconnected",
      lastMessage: "None",
      messageCount: 0,
    };

    // Add enable toggle (keep at top level)
    this.gui
      .add(controls, "enabled")
      .name("Enable Network")
      .onChange((value) => {
        socket.enable = value;
        if (value && !socket.isConnected) {
          socket.connect();
        } else if (!value && socket.isConnected) {
          socket.disconnect();
        }
      });

    // Status display (keep at top level)
    const statusController = this.gui.add(status, "connection").name("Status");
    // .disable();

    // Create config folder for the rest
    const configFolder = this.gui.addFolder("Config");

    // Move these controls into the config folder
    configFolder
      .add({ host: NetworkConfig.UDP_HOST }, "host")
      .name("UDP Host")
      .onChange((value) => {
        console.log(`Note: UDP host changes require server restart`);
      });

    configFolder
      .add({ port: NetworkConfig.UDP_PORT }, "port", 1024, 65535, 1)
      .name("UDP Output Port")
      .onChange((value) => {
        console.log(`Note: UDP output port changes require server restart`);
      });

    configFolder
      .add({ port: NetworkConfig.UDP_INPUT_PORT }, "port", 1024, 65535, 1)
      .name("UDP Input Port")
      .onChange((value) => {
        console.log(`Note: UDP input port changes require server restart`);
      });

    // Debug toggles in config folder
    configFolder
      .add(controls, "debugSend")
      .name("Debug Send")
      .onChange((value) => {
        socket.debugSend = value;
      });

    configFolder
      .add(controls, "debugReceive")
      .name("Debug Receive")
      .onChange((value) => {
        socket.debugReceive = value;
      });

    // Message info in config folder
    const lastMessageController = configFolder
      .add(status, "lastMessage")
      .name("Last Input")
      .disable();

    const msgCountController = configFolder
      .add(status, "messageCount")
      .name("Message Count")
      .disable();

    // Track message count
    socket.addMouseHandler((x, y) => {
      status.messageCount++;
      status.lastMessage = `X: ${x}, Y: ${y}`;
      lastMessageController.updateDisplay();
      msgCountController.updateDisplay();
    });

    // Update status periodically
    setInterval(() => {
      status.connection = socket.isConnected ? "Connected" : "Disconnected";
      statusController.updateDisplay();
    }, 1000);

    // Open the config folder by default
    configFolder.open(false);
    this.gui.open(true);
  }
}
