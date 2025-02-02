import { MqttClient, connect } from "mqtt";
import os from "os";
import Debug from "debug";
const debug = Debug("mqtt");

const topic = "activity/rsc";

export class MqttService {
    private client: MqttClient;

    constructor(private brokerUrl: string) {
        this.brokerUrl = brokerUrl ?? `mqtt://127.0.0.1:1883`;

        this.client = connect(this.brokerUrl, {
            keepalive: 60,
            clientId: `${os.hostname}-rsc`,
            protocolId: 'MQTT',
            protocolVersion: 5,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
        });

        this.client.on("error", (err) => {
            debug("Error: ", err);
            this.client.end();
        });

        this.client.on("connect", () => {
            debug("Client connected to broker");
        });
    }

    public disconnect() {
        this.client.end();
    }

    public publishRscMessage(speedMetersPerSecond: number, cadenceStepsPerMinute: number) {
        if (this.client && this.client.connected) {
            const message = JSON.stringify({ speedMetersPerSecond, cadenceStepsPerMinute });
            this.client.publish(topic, message, (err) => {
                if (err) {
                    debug("Error publishing message: ", err);
                }
            });
        }
    }

    public subscribeToRscMessages(callback: (speedMetersPerSecond: number, cadenceStepsPerMinute: number) => void) {
        this.client.subscribe(topic, (err) => {
            if (!err) {
                this.client.on("message", (topic, message) => {
                    const { speedMetersPerSecond, cadenceStepsPerMinute } = JSON.parse(message.toString());
                    callback(speedMetersPerSecond, cadenceStepsPerMinute);
                });
            } else {
                debug(`Error subscribing to topic: ${topic}`);
            }
        });
    }
}