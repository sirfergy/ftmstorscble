import commandLineArgs from "command-line-args";
import Debug from "debug";
import { AntService } from "./services/ant.js";
import { BleService } from "./services/ble.js";
import { FtmsService } from "./services/ftms.js";
import { MqttService } from "./services/mqtt.js";

const debug = Debug("main");

let speedMetersPerSecond = 0;
let cadenceStepsPerMinute = 0;

const optionDefinitions = [
  { name: "rsc", type: Boolean },
  { name: "ant", type: Boolean },
  { name: "ftms", type: Boolean },
  { name: "publish", type: Boolean },
  { name: "subscribe", type: Boolean },
  { name: "broker", type: String },
];
const { rsc, ant, ftms, publish, subscribe, broker } = commandLineArgs(optionDefinitions, { camelCase: true }) as {
  rsc: boolean;
  ant: boolean;
  ftms: boolean;
  publish: boolean;
  subscribe: boolean;
  broker: string;
};

let mqttService: MqttService | undefined;
if (publish && subscribe) {
  // all local!
} else if (publish || subscribe) {
  mqttService = new MqttService(broker);
}

let bleService: BleService | undefined;
if (rsc) {
  bleService = new BleService();

  if (subscribe && mqttService) {
    mqttService.subscribeToRscMessages((speedMetersPerSecond, cadenceStepsPerMinute) => {
      bleService!.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
    });
  }
}

let antService: AntService | undefined;
if (ant) {
  antService = new AntService();

  antService.subscribeToAntMessages((cadence) => {
    cadenceStepsPerMinute = cadence;

    if (publish && bleService) {
      bleService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
    } else if (publish && mqttService) {
      mqttService!.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
    }
  });
}

let ftmsService: FtmsService | undefined;
if (ftms) {
  ftmsService = new FtmsService();

  ftmsService.subscribeToFtmsMessages((speed) => {
    speedMetersPerSecond = speed;

    if (publish && bleService) {
      bleService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
    } else if (publish && mqttService) {
      mqttService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
    }
  });
}

process.on("SIGINT", () => {
  debug("Caught interrupt signal (Ctrl+C)");
  antService && antService.disconnect();
  mqttService && mqttService.disconnect();

  process.exit();
});
