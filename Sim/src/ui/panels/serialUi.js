import { BaseUi } from "../baseUi.js";
import { serialConfig } from "../../com/serial/serialConfig.js";
import { SerialManager } from "../../com/serial/serialManager.js";
import { eventBus } from '../../util/eventManager.js';

export class SerialUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.db = this.main.debugFlags;
    this.gui.title("Serial");
    this.initSerialControls();
  }

  initSerialControls() {
    const serialManager = SerialManager;
    if (!serialManager) return;
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
    const statusController = this.gui.add(status, "connection").name("Status");

    // Add Enable toggle
    this.serialEnabledController = this.gui
      .add(controls, "enabled")
      .name("N-Enabled")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'serial.enabled', value }));

    this.gui
      .add({ brightness: 100 }, "brightness", 0, 100, 1)
      .name("N-Brightness")
      .onChange((value) => {
        serialManager.sendBrightness(value);
      });

    // Power control
    this.gui
      .add({ power: 50 }, "power", 0, 100, 1)
      .name("N-PowerMx")
      .onChange((value) => {
        serialManager.sendPower(value);
      });

    // Create config folder for the rest
    const configFolder = this.gui.addFolder("Config");

    // Move these controls into the config folder
    configFolder
      .add({ comPort: serialConfig.COM_PORT }, "comPort")
      .name("COM port")
      .onChange((value) => {
        if (this.db.serial) console.log(`Note: COM_PORT changed to ${value}`);
      });

    configFolder
      .add(controls, "debugSend")
      .name("Debug Send")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'serial.debugSend', value });
      });

    configFolder
      .add(controls, "debugReceive")
      .name("Debug Receive")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'serial.debugReceive', value });
      });




    setInterval(() => {
      status.connection = serialManager.isConnected ? "Connected" : "Disconnected";
      statusController.updateDisplay();
    }, 1000);

    configFolder.open(false);
    this.gui.open(false);
  }
}
