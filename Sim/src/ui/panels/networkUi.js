import { BaseUi } from "../baseUi.js";
import { NetworkConfig } from "../../network/networkConfig.js";
import { socketManager } from "../../network/socketManager.js";

export class NetworkUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.gui.title("Network");
    this.initNetworkControls();

    // Monitor folder open/close state to enable/disable network
    const folderElement = this.gui.domElement;

    // Set up a MutationObserver to watch for class changes on the folder
    const folderObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Check if folder is closed by looking for the 'closed' class
          const isClosed = folderElement.classList.contains('closed');

          // Update network connection based on folder state
          if (isClosed) {
            socketManager.enable = false;
            if (socketManager.isConnected) {
              socketManager.disconnect();
            }
          } else {
            socketManager.enable = true;
            if (!socketManager.isConnected) {
              socketManager.connect();
            }
          }
        }
      });
    });

    // Start observing the folder element
    folderObserver.observe(folderElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also handle the initial folder state when UI is first created
    // We need to use a small delay to ensure the DOM is ready
    setTimeout(() => {
      // Get the initial state (closed or open)
      const isClosed = folderElement.classList.contains('closed');

      // Set network connection based on initial folder state
      socketManager.enable = !isClosed;
      if (!isClosed && !socketManager.isConnected) {
        socketManager.connect();
      } else if (isClosed && socketManager.isConnected) {
        socketManager.disconnect();
      }
    }, 100);
  }

  initNetworkControls() {
    const socket = socketManager;
    if (!socket) return;

    // Create local control object
    const controls = {
      debugSend: socket.debugSend,
      debugReceive: socket.debugReceive,
    };

    // Add status display
    const status = {
      connection: "Disconnected",
      lastMessage: "None",
      messageCount: 0,
    };

    // Status display (keep at top level)
    const statusController = this.gui.add(status, "connection").name("Status");

    this.gui
      .add({ brightness: 100 }, "brightness", 0, 100, 1)
      .name("N-Brightness")
      .onChange((value) => {
        socketManager.sendBrightness(value);
      });

    // Power control
    this.gui
      .add({ power: 50 }, "power", 0, 100, 1)
      .name("N-PowerMx")
      .onChange((value) => {
        socketManager.sendPower(value);
      });

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

    setInterval(() => {
      status.connection = socket.isConnected ? "Connected" : "Disconnected";
      statusController.updateDisplay();
    }, 1000);

    configFolder.open(false);
    this.gui.open(false);
  }
}
