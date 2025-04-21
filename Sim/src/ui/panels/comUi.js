import { BaseUi } from "../baseUi.js";
import { NetworkConfig } from "../../com/udp/networkConfig.js";
import { SerialConfig } from "../../com/serial/serialConfig.js";
import { socketManager } from "../../com/udp/socketManager.js";
import { serialManager } from "../../com/serial/serialManager.js";
import { eventBus } from '../../util/eventManager.js';

export class ComUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.db = this.main.debugFlags;
    this.gui.title("Com");

    // Track folder states
    this.isNetworkFolderOpen = true;
    this.isSerialFolderOpen = true;

    this.networkFolder = this.gui.addFolder("UDP");
    this.serialFolder = this.gui.addFolder("Serial");

    // Mutual Exclusion for Network and Serial Folders
    this.networkFolder.onOpenClose(() => {
      this.serialFolder.close();
    });

    this.serialFolder.onOpenClose(() => {
      this.networkFolder.close();
    });

    // Ensure a defined initial state (e.g., network open, serial closed)
    // Adjust if a different initial state is desired
    this.networkFolder.open(); // Make sure network is open initially
    this.serialFolder.close(); // Make sure serial is closed initially

    this.initNetworkControls();
    this.initSerialControls();
  }

  initNetworkControls() {
    const socket = socketManager;
    if (!socket) return;
    const networkParams = this.main.simParams.network;

    // Create local control object
    const controls = {
      enabled: networkParams.enabled,
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
    const statusController = this.networkFolder.add(status, "connection").name("Status");

    // Add Enable toggle
    this.networkEnabledController = this.networkFolder.add(controls, "enabled").name("N-Enabled")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'network.enabled', value }));

    this.networkFolder.add({ brightness: 100 }, "brightness", 0, 100, 1).name("N-Brightness")
      .onChange((value) => { socket.sendBrightness(value); });

    // Power control
    this.networkFolder.add({ power: 50 }, "power", 0, 100, 1).name("N-PowerMx")
      .onChange((value) => { socket.sendPower(value); });

    // Create config folder for the rest


    this.configNetworkFolder = this.networkFolder.addFolder("Config");
    this.configNetworkFolder.open(false);

    // Move these controls into the config folder
    this.configNetworkFolder.add({ host: NetworkConfig.UDP_HOST }, "host").name("UDP Host")
      .onChange((value) => { if (this.db.network) console.log(`UDP HOST changes ${value}`); });

    this.configNetworkFolder.add({ port: NetworkConfig.UDP_PORT }, "port", 1024, 65535, 1).name("UDP Output Port")
      .onChange((value) => { if (this.db.network) console.log(`UDP PORT changes ${value}`); });

    this.configNetworkFolder.add({ port: NetworkConfig.UDP_INPUT_PORT }, "port", 1024, 65535, 1).name("UDP Input Port")
      .onChange((value) => { if (this.db.network) console.log(`UDP input port changes ${value}`); });

    this.configNetworkFolder.add(controls, "debugSend").name("Debug Send")
      .onChange((value) => { eventBus.emit('uiControlChanged', { paramPath: 'network.debugSend', value }); });

    this.configNetworkFolder.add(controls, "debugReceive").name("Debug Receive")
      .onChange((value) => { eventBus.emit('uiControlChanged', { paramPath: 'network.debugReceive', value }); });

    const lastMessageController = this.configNetworkFolder.add(status, "lastMessage").name("Last Input").disable();
    const msgCountController = this.configNetworkFolder.add(status, "messageCount").name("Message Count").disable();



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
  }

  initSerialControls() {
    const serial = serialManager;
    if (!serial) return;
    const serialParams = this.main.simParams.serial;
    // Create local control object
    const controls = {
      enabled: serialParams.enabled,
      debugSend: serialParams.debugSend,
      debugReceive: serialParams.debugReceive,
    };

    // Add status display
    const status = {
      connection: "Disconnected",
      lastMessage: "None",
      messageCount: 0,
    };

    // Status display (keep at top level)
    const statusController = this.serialFolder.add(status, "connection").name("Status");

    // Add Enable toggle
    this.serialEnabledController = this.serialFolder.add(controls, "enabled").name("N-Enabled")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'serial.enabled', value }));

    this.serialFolder.add({ brightness: 100 }, "brightness", 0, 100, 1).name("N-Brightness")
      .onChange((value) => { serial.sendBrightness(value); });

    // Power control
    this.serialFolder.add({ power: 50 }, "power", 0, 100, 1).name("N-PowerMx")
      .onChange((value) => { serial.sendPower(value); });

    // Create config folder for the rest

    this.configSerialFolder = this.serialFolder.addFolder("Config");
    this.configSerialFolder.open(false);

    // Move these controls into the config folder
    this.configSerialFolder.add({ comPort: SerialConfig.COM_PORT }, "comPort").name("COM port")
      .onChange((value) => { if (this.db.serial) console.log(`Note: COM_PORT changed to ${value}`); });

    this.configSerialFolder.add(controls, "debugSend").name("Debug Send")
      .onChange((value) => { eventBus.emit('uiControlChanged', { paramPath: 'serial.debugSend', value }); });

    this.configSerialFolder.add(controls, "debugReceive").name("Debug Receive")
      .onChange((value) => { eventBus.emit('uiControlChanged', { paramPath: 'serial.debugReceive', value }); });




    setInterval(() => {
      status.connection = serial.isConnected ? "Connected" : "Disconnected";
      statusController.updateDisplay();
    }, 1000);


  }

}
