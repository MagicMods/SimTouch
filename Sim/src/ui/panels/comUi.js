import { BaseUi } from "../baseUi.js";
import { NetworkConfig } from "../../com/udp/networkConfig.js";
import { SerialConfig } from "../../com/serial/serialConfig.js";
import { socketManager } from "../../com/udp/socketManager.js";
import { serialManager } from "../../com/serial/serialManager.js";
import { eventBus } from '../../util/eventManager.js';
import { comManager } from '../../com/comManager.js';

export class ComUi extends BaseUi {
  // Define constant for the request option ID
  REQUEST_PORT_OPTION_ID = '--request--';

  constructor(main, container) {
    super(main, container);
    this.db = this.main.debugFlags;
    this.gui.title("Com");

    // Serial UI State
    this.serialPortList = [];
    this.selectedSerialPortId = null; // Use null for "Select Port..."
    this.serialPortDropdownController = null;
    this.serialStatusText = 'Disconnected';
    this.isSerialSupported = serialManager.isApiSupported; // Check support

    // Track folder states
    this.isNetworkFolderOpen = true;
    this.isSerialFolderOpen = true;

    this.networkFolder = this.gui.addFolder("UDP");
    this.serialFolder = this.gui.addFolder("Serial");

    // Mutual Exclusion for Network and Serial Folders
    this.networkFolder.onOpenClose(() => {
      if (!this.networkFolder._closed) {
        eventBus.emit('comChannelChanged', 'network');
        this.serialFolder.close();
      }
    });

    this.serialFolder.onOpenClose(() => {
      if (!this.serialFolder._closed) {
        eventBus.emit('comChannelChanged', 'serial');
        this.networkFolder.close();
      }
    });

    // Ensure a defined initial state (e.g., network open, serial closed)
    this.networkFolder.open();
    this.serialFolder.close();

    this.initNetworkControls();
    this.initSerialControls();

    // Add event listeners for serial updates
    eventBus.on('serialPortsUpdated', this.handleSerialPortsUpdate.bind(this));
    eventBus.on('serialConnectionStatusChanged', this.handleSerialConnectionStatus.bind(this));
  }

  initNetworkControls() {
    const socket = socketManager;
    if (!socket) return;

    // Add status display
    const status = {
      connection: "Disconnected",
      lastMessage: "None",
      messageCount: 0,
    };

    // Status display (keep at top level)
    const statusController = this.networkFolder.add(status, "connection").name("Status");
    statusController.domElement.classList.add("noClick");
    this.networkFolder.add({ brightness: 100 }, "brightness", 0, 100, 1).name("Brightness")
      .onChange((value) => { comManager.sendBrightness(value); });

    // Power control
    this.networkFolder.add({ power: 50 }, "power", 0, 100, 1).name("PowerMx")
      .onChange((value) => { comManager.sendPower(value); });

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
    // Add Status Display (bound to reactive property)
    this.statusController = this.serialFolder.add(this, 'serialStatusText').name("Status")
    this.statusController.domElement.classList.add("noClick");
    this.statusController.domElement.style.marginBottom = "10px"; // Keep styling

    // Add API support dependent controls
    if (this.isSerialSupported) {
      this.populateSerialPorts(); // Build dropdown initially
    } else {
      this.serialFolder.add({ text: 'Web Serial not supported' }, 'text').name('Info').disable();
    }

    // Keep Brightness/Power controls using comManager
    this.serialFolder.add({ brightness: 100 }, "brightness", 0, 100, 1).name("Brightness")
      .onChange((value) => { comManager.sendBrightness(value); });

    this.serialFolder.add({ power: 50 }, "power", 0, 100, 1).name("PowerMx")
      .onChange((value) => { comManager.sendPower(value); });
  }

  // --- Serial Helper Methods ---

  async populateSerialPorts() {
    if (!this.isSerialSupported) return;
    try {
      this.serialPortList = await serialManager.getAvailablePortsInfo();
      this.buildSerialDropdown();
    } catch (error) {
      console.error("UI Error populating serial ports:", error);
    }
  }

  buildSerialDropdown() {
    if (this.serialPortDropdownController) {
      try {
        this.serialPortDropdownController.destroy();
      } catch (e) { /* Ignore */ }
      this.serialPortDropdownController = null;
    }

    const options = { 'Select Port...': null };
    this.serialPortList.forEach(port => {
      options[port.name] = port.id;
    });
    // Add the request option
    options['[Request New Port...]'] = this.REQUEST_PORT_OPTION_ID;

    this.serialPortDropdownController = this.serialFolder.add(this, 'selectedSerialPortId', options)
      .name('Port')
      .onChange(this.handleSerialPortChange.bind(this));
    this.serialPortDropdownController.domElement.classList.add("full-width");
    // Set initial value correctly
    this.serialPortDropdownController.setValue(this.selectedSerialPortId); // Set to current state value
    this.serialPortDropdownController.updateDisplay();
  }

  async handleSerialPortChange(selectedId) {
    const previousSelection = this.selectedSerialPortId;
    this.selectedSerialPortId = selectedId; // Update state immediately for UI responsiveness

    // Handle request option
    if (selectedId === this.REQUEST_PORT_OPTION_ID) {
      if (this.db?.serial) console.log("UI: Requesting new port via dropdown...");
      await serialManager.requestPort();
      // Reset selection back to previous state after request attempt
      this.selectedSerialPortId = previousSelection;
      // Use setTimeout to ensure the dropdown updates visually after the request prompt potentially blocks
      setTimeout(() => {
        if (this.serialPortDropdownController) {
          this.serialPortDropdownController.setValue(this.selectedSerialPortId);
          this.serialPortDropdownController.updateDisplay();
        }
      }, 0);
      return; // Don't proceed with connect/disconnect logic
    }

    // Handle actual port selection or "Select Port..."
    if (selectedId !== null) {
      // Connect to the selected port ID (which is a number)
      if (this.db?.serial) console.log(`UI: Port selected, ID: ${selectedId}. Attempting connect...`);
      await serialManager.connect(selectedId);
    } else {
      // User selected "Select Port..." (selectedId is null)
      if (serialManager.isConnected) {
        if (this.db?.serial) console.log("UI: 'Select Port...' chosen, disconnecting.");
        await serialManager.disconnect();
      }
    }
  }

  // --- Event Handlers ---

  handleSerialPortsUpdate(portInfoArray) {
    if (this.db?.serial) console.log("UI: Received serialPortsUpdated event", portInfoArray);
    this.serialPortList = portInfoArray;
    // Preserve current selection if possible
    const currentPortStillAvailable = this.serialPortList.some(p => p.id === this.selectedSerialPortId);
    if (!currentPortStillAvailable) {
      // If the previously selected port is gone (or was null), reset selection
      // But only reset if *not* connected to avoid visual glitch during refresh
      if (!serialManager.isConnected) {
        this.selectedSerialPortId = null;
      }
    }
    this.buildSerialDropdown(); // Rebuild with updated list and selection
  }

  handleSerialConnectionStatus({ connected, portId }) {
    if (this.db?.serial) console.log(`UI: Received serialConnectionStatusChanged: connected=${connected}, portId=${portId}`);
    if (connected) {
      // Find the name corresponding to the portId
      const connectedPort = this.serialPortList.find(p => p.id === portId);
      const portName = connectedPort ? connectedPort.name : `Port ${portId}`;
      this.serialStatusText = `Connected (${portName})`;
      this.selectedSerialPortId = portId; // Ensure state matches
    } else {
      this.serialStatusText = 'Disconnected';
      this.selectedSerialPortId = null; // Reset selection on disconnect
    }

    // Update UI elements
    if (this.statusController) {
      this.statusController.updateDisplay();
    }
    if (this.serialPortDropdownController) {
      // Important: Update the controller's internal value AND the display
      this.serialPortDropdownController.setValue(this.selectedSerialPortId);
      this.serialPortDropdownController.updateDisplay();
    }
  }
}
