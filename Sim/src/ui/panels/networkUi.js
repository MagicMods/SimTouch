import { BaseUi } from "../baseUi.js";
import { NetworkConfig } from "../../network/networkConfig.js";
import { socketManager } from "../../network/socketManager.js";
import { eventBus } from '../../util/eventManager.js';

export class NetworkUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.gui.title("Network");
    this.initNetworkControls();
  }

  initNetworkControls() {
    const socket = socketManager;
    if (!socket) return;
    const networkParams = this.main.simParams.network;

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

    // Add Enable toggle
    this.networkEnabledController = this.gui
      .add(networkParams, "enabled")
      .name("N-Enabled")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'network.enabled', value }));

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
        eventBus.emit('uiControlChanged', { paramPath: 'network.debugSend', value });
      });

    configFolder
      .add(controls, "debugReceive")
      .name("Debug Receive")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'network.debugReceive', value });
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
