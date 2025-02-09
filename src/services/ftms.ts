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
    force: 1 << 12,
};

const crossTrainerDataFlags = {
    moreData: 1,
    averageSpeed: 1 << 1,
    totalDistance: 1 << 2,
    stepCount: 1 << 3,
    strideCount: 1 << 4,
    elevationGain: 1 << 5,
    inclination: 1 << 6,
    resistanceLevel: 1 << 7,
    instantaneousPower: 1 << 8,
    averagePower: 1 << 9,
    expendedEnergy: 1 << 10,
    heartRate: 1 << 11,
    metabolicEquivalent: 1 << 12,
    elapsedTime: 1 << 13,
    remainingTime: 1 << 14,
    movementDirection: 1 << 15,
};

export class FtmsService {
    private discovered = false;
    private callback?: (speedMetersPerSecond: number) => void;
    private lastSpeedDataReceived = Date.now();

    constructor() {
        noble.on('stateChange', (state) => this.onStateChange(state));
        noble.on('discover', (peripheral) => this.onDiscover(peripheral));

        setInterval(() => {
            if (this.discovered) {
                if (Date.now() - this.lastSpeedDataReceived > 5 * 60 * 1000) {
                    debug("Disconnecting due to inactivity");
                    noble.stopScanning();
                    noble.removeAllListeners();
                    noble.reset();
                    this.discovered = false;

                    // the interesting next step is what do we do now? the treadmill is still on, 
                    // and won't turn off is we're connected to it. the laziest idea is to just start scanning again
                    // in ~15 minutes, since by then the treadmill will have turned off
                    if (Date.now() - this.lastSpeedDataReceived > 30 * 60 * 1000) {
                        this.onStateChange("poweredOn");
                    }
                }
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
            this.lastSpeedDataReceived = Date.now();

            debug("Stopping scanning and connecting");
            await noble.stopScanningAsync();
            debug("Connecting to peripheral");
            await peripheral.connectAsync();

            debug("Discovering services and characteristics");
            const { services } = await peripheral.discoverAllServicesAndCharacteristicsAsync();

            //const { services } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(["1826"], ["2acd", "2ada"]);

            debug(`Found ${services.length} services`);
            for (const service of services) {
                debug(`Service ${service.uuid}`);
                for (const characteristic of service.characteristics) {
                    debug(`Characteristic ${characteristic.uuid}`);
                }
            }


            const ftms = services.find(s => s.uuid == "1826")!;
            const treadmill = ftms.characteristics.find(c => c.uuid.toLowerCase() == "2acd")!;
            const crossTrainer = ftms.characteristics.find(c => c.uuid.toLowerCase() == "2ace")!;
            const status = ftms.characteristics.find(c => c.uuid.toLowerCase() == "2ada")!;

            debug("Subscribing to treadmill");
            //await treadmill.subscribeAsync();

            debug("Subscribing to cross trainer");
            // await crossTrainer.subscribeAsync();

            peripheral.on('disconnect', () => this.onPeripheralDisconnect());
            treadmill.on('data', (data, isNotification) => this.onTreadmillData(data, isNotification));
            crossTrainer.on('data', (data, isNotification) => this.onCrossTrainerData(data, isNotification));
        }
    }

    private onPeripheralDisconnect(): void {
        debug("Disconnected");
        this.discovered = false;
    }

    private onCrossTrainerData(data: Buffer, isNotification: boolean): void {
        const flags = data.readUintLE(0, 3);

        debug(`Cross trainder flags: ${flags}`);

        Object.values(crossTrainerDataFlags).forEach(value => {
            if ((flags & value) == value) {
                debug(`Flag ${value} set`);
            }
        });
    }

    private onTreadmillData(data: Buffer, isNotification: boolean): void {
        const flags = data.readUInt16LE();

        if ((flags & ftmsFlags.moreData) !== ftmsFlags.moreData) {
            const speedInDekametersPerHour = data.readUInt16LE(2);
            debug(`Instantaneous speed: ${speedInDekametersPerHour}`);

            const speedMetersPerSecond = speedInDekametersPerHour * 10 / 3600;

            if (speedMetersPerSecond > 0) {
                this.lastSpeedDataReceived = Date.now();
            }

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