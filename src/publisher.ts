import { AntService } from './services/ant.js';
import { FtmsService } from './services/ftms.js';
import { MqttService } from './services/mqtt.js';

let speedMetersPerSecond = 0;
let cadenceStepsPerMinute = 0;

const mqttService = new MqttService();
const antService = new AntService();
antService.subscribeToAntMessages((cadence) => {
    cadenceStepsPerMinute = cadence;
    mqttService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
});

const ftmsService = new FtmsService();
ftmsService.subscribeToFtmsMessages((speed) => {
    speedMetersPerSecond = speed;
    mqttService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
});
