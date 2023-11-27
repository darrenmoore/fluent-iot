
const RoomComponent = require('./../../../src/components/room/room_component');
const Fluent = require('./../../../src/fluent');
const ComponentHelper = require('./../../helpers/component_helper.js');
jest.mock('./../../../src/fluent', () => require('./../../__mocks__/fluent'));
jest.mock('./../../../src/utils/logger');

let room;

beforeEach(() => {
    room = new RoomComponent(Fluent);
    //jest.spyOn(variable, 'emit')
});

describe('Room add and get', () => {

    it('returns the newly created room after adding it', () => {
        const newRoom = room.add('office room');
        expect(newRoom).toBeInstanceOf(Object);
        expect(room.get('office room')).toBe(newRoom);
        expect(Object.keys(room.rooms)).toHaveLength(1);
    });

    it('returns false if trying to add a room with a name that already exists', () => {
        room.add('office room');
        expect(room.add('office room')).toBe(false);
    });

    it('returns false if the room cannot be found by the name', () => {
        expect(room.get('living room')).toBe(false);
    });

});


describe('Room attributes DSL', () => {

    it('can set and does not emit', () => {
        const office = room.add('office room');
        jest.spyOn(room, 'emit');
        expect(office.attribute.set('foobar', true)).toBe(true);
        expect(room.emit).not.toHaveBeenCalled();
    });

    it('can get', () => {
        const office = room.add('office room');
        office.attribute.set('foo', 'bar')
        expect(office.attribute.get('foo')).toBe('bar');
    });

    it('get returns null if not found', () => {
        const office = room.add('office room');
        expect(office.attribute.get('foo')).toBe(null);
    });

    it('can update and emit, updating twice does not emit twice', () => {
        const office = room.add('office room');
        jest.spyOn(room, 'emit');
        office.attribute.update('foo', 'bar');
        office.attribute.update('foo', 'bar');
        expect(room.emit).toHaveBeenCalledTimes(1);
    });

});


describe('Room occupancy', () => {

    afterEach(() => {

    });

    it('default attributes are setup', () => {
        room.add('office room');
        expect(room.get('office room').attribute.get('occupied')).toBe(false);
        expect(room.get('office room').attribute.get('thresholdDuration')).toBe(15);
        expect(room.get('office room').isOccupied()).toBe(false);
    });

    it('is occupied if attribute is passed', () => {
        room.add('office room', { occupied: true, thresholdDuration: 20, foobar: true });
        expect(room.get('office room').attribute.get('occupied')).toBe(true);
        expect(room.get('office room').attribute.get('foobar')).toBe(true);
        expect(room.get('office room').attribute.get('thresholdDuration')).toBe(20);
    });

    it('handles get and set attributes', () => {
        room.add('office room');
        room.get('office room').attribute.set('foobar','1');
        room.get('office room').attribute.set('foobar','2');
        expect(room.get('office room').attribute.get('foobar')).toBe('2');
    });

    it('returns null if the attribute is not set already', () => {
        room.add('office room');
        expect(room.get('office room').attribute.get('foobar')).toBe(null);
    });

    it('makes the room occupied based on a positive sensor value', () => {
        const office = room.add('office room');
        office.updateOccupancyBySensor(true);

        expect(room.get('office room').isOccupied()).toBe(true);
        expect(room.get('office room').attribute.get('occupied')).toBe(true);
    });

    it('stays occupied even if the sensor is negative', () => {
        const office = room.add('office room');
        office.updateOccupancyBySensor(true);
        office.updateOccupancyBySensor(false);
        office._checkIfVacant();

        expect(room.get('office room').isOccupied()).toBe(true);
        expect(room.get('office room').attribute.get('occupied')).toBe(true);
    });

    it('sets the room to vacant if threshold duration is 0 and receved a negative sensor value', () => {
        const office = room.add('office room', { thresholdDuration:0 });
        jest.spyOn(room, 'emit');

        office.updateOccupancyBySensor(true);
        office.updateOccupancyBySensor(false);

        expect(room.get('office room').isOccupied()).toBe(false);
        expect(room.get('office room').attribute.get('occupied')).toBe(false);
        expect(room.emit).toHaveBeenCalledTimes(2);
    });

});


describe('Room triggers', () => {

    let Scenario;
    let office;
    
    beforeEach(() => {
        Scenario = ComponentHelper.ScenarioAndEvent(room);
        office = room.add('office');
        jest.spyOn(room, 'emit');
    });

    it('triggers when a room is occupied', () => {
        room.triggers(Scenario).room('office').is.occupied();
        office.updateOccupancyBySensor(true);
        expect(room.emit).toHaveBeenCalledTimes(1);
        expect(Scenario.assert).toHaveBeenCalled();
    });

    it('throws an error if the room does not exist', () => {
        expect(() => room.triggers(Scenario).room('foobar').is.occupied()).toThrow(Error);
    });

    it('triggers when a room is vacant', () => {
        const living = room.add('living', { thresholdDuration:0 });

        room.triggers(Scenario).room('living').is.vacant();

        living.updateOccupancyBySensor(true);
        living.updateOccupancyBySensor(false);

        expect(room.emit).toHaveBeenCalledTimes(2);
        expect(Scenario.assert).toHaveBeenCalledTimes(1);
    });

});