import bleno from "@abandonware/bleno";
import Debug from "debug";
import { RSCService } from "./rsc.js";
import { DeviceInformationService } from "./dis.js";
const debug = Debug("ble");

export class BleService {
    private rscService: RSCService;

    constructor() {
        this.rscService = new RSCService();

        bleno.on('stateChange', (state) => {
            debug("State change " + state);
            if (state === 'poweredOn') {
                bleno.startAdvertising('RSC', [this.rscService.uuid]);
            } else {
                bleno.stopAdvertising();
            }
        });

        bleno.on('advertisingStart', (error) => {
            debug("Advertising start " + error);
            if (!error) {
                bleno.setServices([
                    this.rscService,
                    new DeviceInformationService(),
                ]);
            }
        });
    }

    public publishRscMessage(speedMetersPerSecond: number, cadenceStepsPerMinute: number) {
        this.rscService.notify(speedMetersPerSecond, cadenceStepsPerMinute, 0, 0);
    }
}