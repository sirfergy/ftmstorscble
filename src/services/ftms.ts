import noble, { Peripheral } from "@abandonware/noble";
import Debug from "debug";
const debug = Debug("ftms");

const ftmsFlags = {
    moreData: 1,
    averageSpeed: 1 << 1,
    totalDistance: 1 << 2,
    inclination: 1 << 3,
    elevation: 1 << 4,
    pace: 1 << 5,
    averagePage: 1 << 6,
    expendedEnergy: 1 << 7,
    heartRate: 1 << 8,
    metabolicEquivalent: 1 << 9,
    elapsedTime: 1 << 10,
    remainingTime: 1 << 11,
    force: 1 << 12
};

export class FtmsService {
    private discovered = false;
    private callback?: (speedMetersPerSecond: number) => void;
    private lastDataReceived = Date.now();
    private peripheral: Peripheral;

    constructor() {
        noble.on('stateChange', this.onStateChange);
        noble.on('discover', this.onDiscover);

        setInterval(() => {
            if (Date.now() - this.lastDataReceived > 5 * 60 * 1000) {
                debug("Disconnecting due to inactivity");
                noble.stopScanning();
                noble.removeAllListeners();
                noble.resetAsync();
            }
        }, 1000);
    }

    public subscribeToFtmsMessages(callback: (speedMetersPerSecond: number) => void): void {
        this.callback = callback;
    }

    private onStateChange(state: string): void {
        debug(`State change: ${state}`);

        if (state == "poweredOn") {
            noble.startScanning(["1826"], true, (error) => {
                if (error) {
                    debug(error);
                }
            });
        }
        else if (state == "poweredOff") {
            noble.stopScanning();
        }
    }

    private async onDiscover(peripheral: Peripheral): Promise<void> {
        debug(`Discovered: ${peripheral.advertisement.localName}`);

        if (!this.discovered && peripheral.advertisement.localName && peripheral.advertisement.localName.includes("HORIZON")) {
            this.discovered = true;
            this.peripheral = peripheral;

            await noble.stopScanningAsync();
            await peripheral.connectAsync();

            const { services } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(["1826"], ["2acd"]);

            const ftms = services.find(s => s.uuid == "1826")!;
            const treadmill = ftms.characteristics.find(c => c.uuid.toLowerCase() == "2acd")!;

            await treadmill.subscribeAsync();

            peripheral.on('disconnect', () => {
                debug("Disconnected");
                this.discovered = false;
            });

            treadmill.on('data', this.onTreadmillData);
        }
    }

    private onTreadmillData(data: Buffer, isNotification: boolean): void {
        this.lastDataReceived = Date.now();
        const flags = data.readUInt16LE();

        if ((flags & ftmsFlags.moreData) !== ftmsFlags.moreData) {
            const speedInDekametersPerHour = data.readUInt16LE(2);
            debug(`Instantaneous speed: ${speedInDekametersPerHour}`);

            const speedMetersPerSecond = speedInDekametersPerHour * 10 / 3600;

            this.callback && this.callback(speedMetersPerSecond);

            return;
        }

        const averageSpeed = data.readUInt16LE(2);
        debug(`Average speed: ${averageSpeed}`);

        const totalDistance = data.readUIntLE(4, 3);
        debug(`Total distance: ${totalDistance}`);

        const inclination = data.readInt16LE(7);
        const rampAngleSetting = data.readInt16LE(9);
        debug(`Inclination: ${inclination} - ${rampAngleSetting}`);

        const totalEnergy = data.readUInt16LE(11);
        const energyPerHour = data.readUInt16LE(13); // actually total energy
        const energyPerMinute = data.readUIntLE(15, 1);
        debug(`Expended energy: ${totalEnergy} - ${energyPerHour} - ${energyPerMinute}`);

        const heartRate = data.readUIntLE(16, 1);
        debug(`Heart rate: ${heartRate}`);

        const elapsedTime = data.readUInt16LE(17);
        debug(`Elapsed time: ${elapsedTime}`);
    }
}