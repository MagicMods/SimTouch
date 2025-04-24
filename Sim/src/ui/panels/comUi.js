import { BaseUi } from "../baseUi.js";
import { UdpConfig } from "../../com/udp/udpConfig.js";
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

    this.uiState = {
      dataVizVisible: true
    };
    this.dataVisualization = this.main.dataVisualization;

    // --- Top-Level Controls ---
    this.selectedChannel = 'udp'; // Default channel
    this.generalStatusText = 'Initializing...'; // New state for general status

    // Send Data Button needs to be created and appended before controllers reference it for insertion
    this.sendData = false;
    const sendDataButton = document.createElement("button");
    sendDataButton.textContent = "SendData";
    sendDataButton.className = "toggle-button-big"; // Apply any necessary styling
    // Event listener setup remains the same
    sendDataButton.addEventListener("click", () => {
      this.sendData = !this.sendData;
      sendDataButton.classList.toggle("active", this.sendData);
      this.dataVisualization.showDataViz(this.sendData);
      if (!this.sendData && this.dataVisualization) {
        this.dataVisualization.updateData(null);
      }
      eventBus.emit('comChannelChanged', this.sendData ? 'sendData' : 'stopData');
    });
    // Append the button FIRST, so it exists in the DOM for insertBefore
    this.gui.domElement.appendChild(sendDataButton);

    // Create controllers first
    this.selectorController = this.gui.add(this, 'selectedChannel', { 'UDP': 'udp', 'Serial': 'serial' })
      .name('Channel')
      .onChange(value => {
        eventBus.emit('comChannelChanged', value);
        if (value === 'udp') {
          this.udpFolder.open();
          this.serialFolder.close();
        } else {
          this.serialFolder.open();
          this.udpFolder.close();
        }
        this.updateGeneralStatus();
      });
    this.selectorController.domElement.classList.add("full-width");

    this.generalStatusController = this.gui.add(this, 'generalStatusText').name('Status').disable();
    this.generalStatusController.domElement.classList.add("noClick");
    // this.generalStatusController.domElement.style.marginBottom = "10px"; // Styling might be adjusted if needed

    // Now, move the controllers' DOM elements outside the collapsible area,
    // placing them before the SendData button
    this.gui.domElement.insertBefore(this.selectorController.domElement, sendDataButton);
    this.gui.domElement.insertBefore(this.generalStatusController.domElement, sendDataButton);

    // Shared Sliders (remain inside collapsible area)
    this.gui.add({ brightness: 100 }, "brightness", 0, 100, 1).name("Brightness")
      .onChange((value) => { comManager.sendBrightness(value); });
    this.gui.add({ power: 50 }, "power", 0, 100, 1).name("PowerMx")
      .onChange((value) => { comManager.sendPower(value); });

    // Finally, append the SendData button
    this.gui.domElement.appendChild(sendDataButton);

    // --- Folders ---
    this.udpFolder = this.gui.addFolder("UDP");
    this.serialFolder = this.gui.addFolder("Serial");
    this.rxDataVizFolder = this.gui.addFolder("Data Visualization"); // New folder

    // Serial UI State
    this.serialPortList = [];
    this.selectedSerialPortId = null; // Use null for "Select Port..."
    this.serialPortDropdownController = null;
    this.serialStatusText = 'Disconnected';
    this.isSerialSupported = serialManager.isApiSupported; // Check support

    // Track folder states
    this.isUdpFolderOpen = true;
    this.isSerialFolderOpen = false;

    // Mutual Exclusion for Udp and Serial Folders (UI only now)
    this.udpFolder.onOpenClose(() => {
      if (!this.udpFolder._closed) {
        // eventBus.emit('comChannelChanged', 'udp'); // REMOVED
        this.serialFolder.close();
      }
    });

    this.serialFolder.onOpenClose(() => {
      if (!this.serialFolder._closed) {
        // eventBus.emit('comChannelChanged', 'serial'); // REMOVED
        this.udpFolder.close();
      }
    });

    // Ensure a defined initial state (e.g., udp open, serial closed)
    this.udpFolder.open();
    this.serialFolder.close();

    // Initialize folder contents
    this.initUdpControls();
    this.initSerialControls();
    this.initRxDataVizControls(); // New init method

    // Ensure correct initial folder visibility
    if (this.selectedChannel === 'udp') {
      this.udpFolder.open();
      this.serialFolder.close();
    } else {
      this.serialFolder.open();
      this.udpFolder.close();
    }
    this.updateGeneralStatus(); // Set initial general status

    eventBus.on('serialPortsUpdated', this.handleSerialPortsUpdate.bind(this));
    eventBus.on('serialConnectionStatusChanged', this.handleSerialConnectionStatus.bind(this));

    this.gui.close();
  }

  updateGeneralStatus() {
    if (this.selectedChannel === 'udp') {
      // Use socketManager state directly
      this.generalStatusText = socketManager.isConnected ? "Connected" : "Disconnected";
    } else if (this.selectedChannel === 'serial') {
      // Use the specific serial status text
      this.generalStatusText = this.serialStatusText;
    } else {
      this.generalStatusText = 'Unknown'; // Fallback
    }

    this.generalStatusController.updateDisplay();
  }

  initUdpControls() {
    const socket = socketManager;
    if (!socket) return;

    // UDP Specific Status display
    const udpStatus = { connection: "Disconnected" };
    const udpStatusController = this.udpFolder.add(udpStatus, "connection").name("Status").disable();
    udpStatusController.domElement.classList.add("noClick");

    // Flattened Config Items
    this.udpFolder.add({ host: UdpConfig.UDP_HOST }, "host").name("UDP Host")
      .onChange((value) => { if (this.db.udp) console.log(`UDP HOST changes ${value}`); });

    this.udpFolder.add({ port: UdpConfig.UDP_PORT }, "port", 1024, 65535, 1).name("UDP Output Port")
      .onChange((value) => { if (this.db.udp) console.log(`UDP PORT changes ${value}`); });

    this.udpFolder.add({ port: UdpConfig.UDP_INPUT_PORT }, "port", 1024, 65535, 1).name("UDP Input Port")
      .onChange((value) => { if (this.db.udp) console.log(`UDP input port changes ${value}`); });

    // UDP Input Tracking
    const inputStatus = { lastMessage: "None", messageCount: 0 };
    const lastMessageController = this.udpFolder.add(inputStatus, "lastMessage").name("Last Input").disable();
    const msgCountController = this.udpFolder.add(inputStatus, "messageCount").name("Message Count").disable();

    // Track message count
    socket.addMouseHandler((x, y) => {
      inputStatus.messageCount++;
      inputStatus.lastMessage = `X: ${x}, Y: ${y}`;
      lastMessageController.updateDisplay();
      msgCountController.updateDisplay();
    });

    setInterval(() => {
      udpStatus.connection = socket.isConnected ? "Connected" : "Disconnected";
      udpStatusController.updateDisplay();
      // Also update general status if UDP is the selected channel
      if (this.selectedChannel === 'udp') {
        this.updateGeneralStatus();
      }
    }, 1000);
  }

  initSerialControls() {
    // Serial Specific Status Display (bound to reactive property)
    this.serialStatusController = this.serialFolder.add(this, 'serialStatusText').name("Status").disable(); // Renamed controller variable
    this.serialStatusController.domElement.classList.add("noClick");
    this.serialStatusController.domElement.style.marginBottom = "10px";

    // Add API support dependent controls
    if (this.isSerialSupported) {
      this.populateSerialPorts(); // Build dropdown initially
    } else {
      this.serialFolder.add({ text: 'Web Serial not supported' }, 'text').name('Info').disable();
    }
  }

  // New method to initialize controls in the RxDataViz folder
  initRxDataVizControls() {
    this.rxDataVizFolder.add(this.uiState, 'dataVizVisible')
      .name('Show RX Data Viz')
      .onChange(visible => {
        this.dataVisualization.showDataViz(visible);
        // Optional: Handle data clearing if needed when hiding
        if (!visible && this.dataVisualization) {
          // this.dataVisualization.updateData(null); // Decide if clearing is desired here
        }
      });
    this.rxDataVizFolder.open(false); // Keep it closed by default? Or open? User preference. Let's start closed.
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

    this.serialPortDropdownController = this.serialFolder.add(this, 'selectedSerialPortId', options).name('Port').onChange(this.handleSerialPortChange.bind(this));
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
        this.serialPortDropdownController.setValue(this.selectedSerialPortId);
        this.serialPortDropdownController.updateDisplay();
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
      } else {
        // If already disconnected and "Select Port..." is chosen, still update status
        this.handleSerialConnectionStatus({ connected: false, portId: null });
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
      // If connected port disappears, update status text? serialManager might handle this.
    }
    this.buildSerialDropdown(); // Rebuild with updated list and selection
  }

  handleSerialConnectionStatus({ connected, portId }) {
    if (this.db?.serial) console.log(`UI: Received serialConnectionStatusChanged: connected=${connected}, portId=${portId}`);
    let portName = 'N/A';
    if (connected) {
      // Find the name corresponding to the portId
      const connectedPort = this.serialPortList.find(p => p.id === portId);
      portName = connectedPort ? connectedPort.name : `Port ${portId}`;
      this.serialStatusText = `Connected (${portName})`;
      this.selectedSerialPortId = portId; // Ensure state matches
    } else {
      this.serialStatusText = 'Disconnected';
      // Only reset selection if the disconnected port matches the current selection,
      // or if portId is null (explicit disconnect). Avoid resetting if a different port disconnects.
      if (portId === this.selectedSerialPortId || portId === null) {
        this.selectedSerialPortId = null;
      }
    }

    // Update UI elements
    this.serialStatusController.updateDisplay();
    // Important: Update the controller's internal value AND the display
    // Only update if the status change pertains to the selected port or is a general disconnect
    if (portId === this.selectedSerialPortId || !connected) {
      // Replace setValue with updateDisplay to prevent recursive onChange trigger
      // this.serialPortDropdownController.setValue(this.selectedSerialPortId);
      this.serialPortDropdownController.updateDisplay();
    }

    // Update the general status display
    this.updateGeneralStatus();
  }
}
