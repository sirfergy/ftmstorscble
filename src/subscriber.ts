import { MqttService } from './services/mqtt.js';
import { BleService } from './services/ble.js';

const mqttService = new MqttService();
const bleService = new BleService();

mqttService.subscribeToRscMessages((speedMetersPerSecond, cadenceStepsPerMinute) => {
    bleService.publishRscMessage(speedMetersPerSecond, cadenceStepsPerMinute);
});