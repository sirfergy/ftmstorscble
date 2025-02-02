import { GarminStick2, StrideSpeedDistanceSensor, StrideSpeedDistanceSensorState } from 'ant-plus-next';
import Debug from "debug";

const debug = Debug("ant");

export class AntService {
    private stick: GarminStick2;
    private callback?: (cadenceStepsPerMinute: number) => void;

    constructor() {
        this.stick = new GarminStick2();

        const running = new StrideSpeedDistanceSensor(this.stick);
        running.on('ssdData', (data: StrideSpeedDistanceSensorState) => {
            debug(JSON.stringify(data));

            const { CadenceInteger, CadenceFractional, SpeedInteger, SpeedFractional } = data;

            //const speedMetersPerSecond = Number(`${SpeedInteger}.${SpeedFractional}`);
            const cadenceStepsPerMinute = Number(`${CadenceInteger}.${CadenceFractional}`);

            this.callback && this.callback(cadenceStepsPerMinute);
        });

        this.stick.on('startup', () => {
            running.attach(0, 0);
        });

        this.stick.open().then(result => {
            debug('Stick open result:', result);
        });
    }

    public subscribeToAntMessages(callback: (cadenceStepsPerMinute: number) => void) {
        this.callback = callback;
    }

    public disconnect() {
        this.stick.close();
    }
}