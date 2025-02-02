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
    { name: 'rsc', type: Boolean },
    { name: 'ant', type: Boolean },
    { name: 'ftms', type: Boolean },
    { name: 'publish', type: Boolean },
    { name: 'subscribe', type: Boolean },
    { name: 'broker', type: String },
];
const { rsc, ant, ftms, publish, subscribe, broker } = commandLineArgs(optionDefinitions, { camelCase: true }) as { rsc: boolean, ant: boolean, ftms: boolean, publish: boolean, subscribe: boolean, broker: string };

let mqttService: MqttService;
if (publish || subscribe) {
    mqttService = new MqttService(broker);

    if (subscribe) {
        mqttService.subscribeToRscMessages((speedMetersPerSecond, cadenceStepsPerMinute) => {
            bleService && bleService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
        });
    }
}

let bleService: BleService;
if (rsc) {
    bleService = new BleService();
}

let antService: AntService;
if (ant) {
    antService = new AntService();

    antService.subscribeToAntMessages((cadence) => {
        cadenceStepsPerMinute = cadence;
        mqttService && mqttService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
    });
}

let ftmsService: FtmsService;
if (ftms) {
    ftmsService = new FtmsService();

    ftmsService.subscribeToFtmsMessages((speed) => {
        speedMetersPerSecond = speed;
        mqttService && mqttService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
    });
}

process.on('SIGINT', () => {
    debug('Caught interrupt signal (Ctrl+C)');
    antService && antService.disconnect();
    mqttService && mqttService.disconnect();

    process.exit();
});