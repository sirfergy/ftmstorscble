import bleno from "@abandonware/bleno";
import Debug from "debug";
const debug = Debug("rsc");

const RSC_SERVICE_UUID = '1814';
const RSC_FEATURE_CHARACTERISTIC_UUID = '2A54';
const RSC_MEASUREMENT_CHARACTERISTIC_UUID = '2A53';
const SENSOR_LOCATION_CHARACTERISTIC_UUID = '2A5D';
const SC_CONTROL_POINT_CHARACTERISTIC_UUID = '2902';

class RSCFeatureCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: RSC_FEATURE_CHARACTERISTIC_UUID,
            properties: ['read'],
            value: null
        });
        this.value = Buffer.from([0x07, 0x00]); // 0x07 = Instantaneous Stride Length, Instantaneous Cadence, Total Distance
    }

    onReadRequest(offset: number, callback: (offset: number, callback?: Buffer) => void) {
        debug('RSCFeatureCharacteristic - onReadRequest');
        callback(this.RESULT_SUCCESS, this.value ?? undefined);
    }
}

type UpdateValueCallback = (data: Buffer) => void;

class RSCMeasurementCharacteristic extends bleno.Characteristic {
    private _updateValueCallback?: UpdateValueCallback | null;

    constructor() {
        super({
            uuid: RSC_MEASUREMENT_CHARACTERISTIC_UUID,
            properties: ['notify'],
            value: null,
            descriptors: [
                new bleno.Descriptor({
                    uuid: '2901',
                    value: 'Running Speed And Cadence'
                }),
            ]
        });
    }

    onSubscribe(maxValueSize: number, updateValueCallback: UpdateValueCallback) {
        debug('RSC Measurement subscribed');
        this._updateValueCallback = updateValueCallback;
    }

    onUnsubscribe() {
        debug('RSC Measurement unsubscribed');
        this._updateValueCallback = null;
    }

    sendMeasurement(speedMetersPerSecond: number, cadenceStepsPerMinute: number, strideLengthInMeters: number, totalDistanceInKilometers: number) {
        debug(`Sending measurement ${speedMetersPerSecond} m/s, ${cadenceStepsPerMinute} steps/min, ${strideLengthInMeters} m, ${totalDistanceInKilometers} km`);

        if (this._updateValueCallback) {
            const buffer = Buffer.alloc(10);

            let flags = 0;
            flags |= 0x01; // Instantaneous Stride Length Present
            flags |= 0x02; // Instantaneous Cadence Present

            buffer.writeUInt8(flags, 0);

            buffer.writeUInt16LE(speedMetersPerSecond * 256, 1); // Instantaneous Speed Unit is in m/s with a resolution of 1/256 s
            buffer.writeUInt8(cadenceStepsPerMinute, 3); // Instantaneous Cadence 
            buffer.writeUInt16LE(strideLengthInMeters * 100, 4); // Instantaneous Stride Length
            buffer.writeUInt32LE(totalDistanceInKilometers * 1000, 6); // Total Distance

            this._updateValueCallback(buffer);
        }
    }
}

class SensorLocationCharacteristic extends bleno.Characteristic {
    constructor() {
        const sensorLocation = 13; // 13 for top of the shoe
        super({
            uuid: SENSOR_LOCATION_CHARACTERISTIC_UUID,
            properties: ['read'],
            value: null
        });
        this.value = Buffer.from([sensorLocation]);
    }

    onReadRequest(offset: number, callback: (offset: number, callback?: Buffer) => void) {
        debug('SensorLocationCharacteristic - onReadRequest');
        callback(this.RESULT_SUCCESS, this.value ?? undefined);
    }
}

class SCControlPointCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: SC_CONTROL_POINT_CHARACTERISTIC_UUID,
            properties: ['write', 'indicate'],
            value: null
        });
    }

    onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: (arg0: number) => void) {
        console.log('SCControlPointCharacteristic - onWriteRequest:', data);

        // Handle the data written to the control point
        // Example: Resetting total distance (not implemented in mock data)
        // You can add your own logic here based on the control point commands
        callback(this.RESULT_SUCCESS);
    }
}

export class RSCService extends bleno.PrimaryService {
    private measurement: RSCMeasurementCharacteristic;

    constructor() {
        const measurement = new RSCMeasurementCharacteristic();
        super({
            uuid: RSC_SERVICE_UUID,
            characteristics: [
                measurement,
                new RSCFeatureCharacteristic(),
                new SensorLocationCharacteristic(),
                new SCControlPointCharacteristic()
            ]
        });
        this.measurement = measurement;
    }

    notify(speedMetersPerSecond: number, cadenceStepsPerMinute: number, strideLengthInMeters: number, totalDistanceInKilometers: number) {
        this.measurement.sendMeasurement(speedMetersPerSecond, cadenceStepsPerMinute, strideLengthInMeters, totalDistanceInKilometers);
    }
}