
jest.mock('./../../src/utils/logger');

const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const event = new MyEmitter();

const Scenario = require('./../../src/scenario');

let Fluent;

beforeEach(() => {

    const foobarComponent = new Object;
    foobarComponent.triggers = (Scenario) => {
        return {
            "foobar": () => {
                return {
                    onEvent: (eventName) => {
                        event.on(eventName, () => {
                            Scenario.assert(eventName);
                        });
                        return Scenario.triggers;
                    }
                }
            }
        }
    };
    foobarComponent.constraints = (Scenario, constraints) => {
        return {
            "foobar": () => {
                return {
                    isTrue: (value) => {
                        constraints.push(() => value === true);
                        return Scenario.constraint(constraints)
                    }
                }
            }
        }
    };

    const components = {
        "foobar": foobarComponent
    };

    const mockFluent = jest.fn();
    Fluent = new mockFluent();
    Fluent.updateTestMode = jest.fn();
    Fluent.component = () => {
        return {
            all: () => components
        }
    }
});


describe('Creating basic scenarios', () => {

    it('is setup correctly', () => {
        const scenario = new Scenario(Fluent, 'Foobar');

        expect(scenario).toBeInstanceOf(Scenario);
        expect(scenario.description).toBe('Foobar');

        //Available scope
        expect(scenario.triggers.empty).toBeDefined();
        expect(scenario.triggers.constraint).toBeDefined();
        expect(scenario.triggers.then).toBeDefined();
        expect(scenario.triggers.foobar).toBeDefined();
    });

    it('returns the correct scope of available functions', () => {
        const mockCallback = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar');
        const when = scenario.when();
        const empty = when.empty();
        const then = empty.then(mockCallback);
        const result = then.assert();

        //Scenario was asserted
        expect(result).toBe(true);
        expect(mockCallback.mock.calls).toHaveLength(1);

        //Available scope
        expect(when.empty).toBeDefined();
        expect(when.constraint).toBeDefined();
        expect(when.then).toBeDefined();

        expect(empty.empty).toBeDefined();
        expect(empty.constraint).toBeDefined();
        expect(empty.then).toBeDefined();
    });

    it('fails to run if the scenario is not runnable', () => {
        const mockCallback = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .then(mockCallback);

        scenario.runnable = false;
        const result = scenario.assert();

        expect(mockCallback.mock.calls).toHaveLength(0);
        expect(result).toBe(false);
    });

    it('gets triggered with assert and parameters are passed', () => {
        const mockCallback = jest.fn();
        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .then(mockCallback);
        scenario.assert('foobar result');
        expect(mockCallback).toHaveBeenCalledWith(scenario, 'foobar result');
    });

    it('gets triggered and the callback receives scenario and the assert object', () => {
        const mockCallback = jest.fn();
        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .then(mockCallback);
        scenario.assert({ a:'b' });
        expect(mockCallback).toHaveBeenCalledWith(scenario, { a:'b' });
    });

    it('fails to run if there are no triggers', () => {
        const scenario = new Scenario(Fluent, 'Foobar');
        const result = scenario.assert();
        expect(result).toBe(false);
    });

    it('it throws if missing Fluent or description', () => {
        expect(() => new Scenario()).toThrow(Error);
        expect(() => new Scenario(Fluent)).toThrow(Error);
    });

    it('it throws if the trigger is not not found', () => {
        expect(() => 
            new Scenario()
                .when()
                    .foo()
        ).toThrow(Error);
    });

    it('it throws if the component is not found', () => {
        expect(() => 
            new Scenario()
                .when()
                    .empty()
                .constraint()
                    .bar()
        ).toThrow(Error);
    });

});


describe('Constraints', () => {

    it('successfully calls a basic constraint and the callback is called', () => {
        const mockCallback = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .constraint()
                .foobar().isTrue(true)
                .then(mockCallback);

        const result = scenario.assert();

        expect(mockCallback.mock.calls).toHaveLength(1);
        expect(result).toBe(true);
    });

    it('it fails the constraint and does not call the callback', () => {
        const mockCallback = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .constraint()
                .foobar().isTrue(false)
                .then(mockCallback);

        const result = scenario.assert();

        expect(mockCallback.mock.calls).toHaveLength(0);
        expect(result).toBe(false);
    });

    it('handles multiple constraint groups and only one will callback', () => {
        const mockCallback1 = jest.fn();
        const mockCallback2 = jest.fn();
        const mockCallback3 = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .constraint()
                .foobar().isTrue(false)
                .then(mockCallback1)
            .constraint()
                .foobar().isTrue(false)
                .then(mockCallback2)
            .constraint()
                .foobar().isTrue(true)
                .then(mockCallback3);

        const result = scenario.assert();

        expect(mockCallback1.mock.calls).toHaveLength(0);
        expect(mockCallback2.mock.calls).toHaveLength(0);
        expect(mockCallback3.mock.calls).toHaveLength(1);

        expect(result).toBe(true);
    });

    it('handles multiple positive multiple constraint groups and will run them', () => {
        const mockCallback1 = jest.fn();
        const mockCallback2 = jest.fn();
        const mockCallback3 = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .constraint()
                .foobar().isTrue(false)
                .then(mockCallback1)
            .constraint()
                .foobar().isTrue(true)
                .then(mockCallback2)
            .constraint()
                .foobar().isTrue(true)
                .then(mockCallback3);

        const result = scenario.assert();

        expect(mockCallback1.mock.calls).toHaveLength(0);
        expect(mockCallback2.mock.calls).toHaveLength(1);
        expect(mockCallback3.mock.calls).toHaveLength(1);

        expect(result).toBe(true);
    });

    it('will fall back to an else constraint if other constraints are negative', () => {
        const mockCallback1 = jest.fn();
        const mockCallback2 = jest.fn();
        const mockCallback3 = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .constraint()
                .foobar().isTrue(false)
                .then(mockCallback1)
            .constraint()
                .foobar().isTrue(false)
                .then(mockCallback2)
            .else()
                .then(mockCallback3);

        const result = scenario.assert();

        expect(mockCallback1.mock.calls).toHaveLength(0);
        expect(mockCallback2.mock.calls).toHaveLength(0);
        expect(mockCallback3.mock.calls).toHaveLength(1);

        expect(result).toBe(true);
    });

    it('will make sure else is not called if a constraint group is positive', () => {
        const mockCallback1 = jest.fn();
        const mockCallback2 = jest.fn();
        const mockCallback3 = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .constraint()
                .foobar().isTrue(false)
                .then(mockCallback1)
            .constraint()
                .foobar().isTrue(true)
                .then(mockCallback2)
            .else()
                .then(mockCallback3);

        const result = scenario.assert();

        expect(mockCallback1.mock.calls).toHaveLength(0);
        expect(mockCallback2.mock.calls).toHaveLength(1);
        expect(mockCallback3.mock.calls).toHaveLength(0);

        expect(result).toBe(true);
    });

});


describe('Triggers', () => {

    it('will not run if the when() is not triggered', () => {
        const mockCallback = jest.fn();

        new Scenario(Fluent, 'Foobar')
            .when()
                .foobar().onEvent('hey')
            .then(mockCallback);

        expect(mockCallback.mock.calls).toHaveLength(0);
    });

    it('will trigger if the when() is triggered', () => {
        const mockCallback = jest.fn();

        new Scenario(Fluent, 'Foobar')
            .when()
                .foobar().onEvent('hey')
            .then(mockCallback);

        event.emit('hey');

        expect(mockCallback.mock.calls).toHaveLength(1);
    });

    it('will handle custom triggers', () => {
        const mockCallback = jest.fn();

        new Scenario(Fluent, 'Foobar')
            .when((Scenario) => {
                event.on('pop', () => {
                    Scenario.assert('pop');
                });
                return Scenario.triggers;
            })
            .then(mockCallback);

        event.emit('pop');

        expect(mockCallback.mock.calls).toHaveLength(1);
    });

    it('will handle two triggers for two different events acting as an OR', () => {
        const mockCallback = jest.fn();

        new Scenario(Fluent, 'Foobar')
            .when()
                .foobar().onEvent('foo')
                .foobar().onEvent('bar')
            .then(mockCallback);

        event.emit('foo');  //Assert
        event.emit('bar');  //Assert
        event.emit('hey');  //None

        expect(mockCallback.mock.calls).toHaveLength(2);
    });

    test('will put the scenario into test mode in the DSL', () => {
        const mockCallback = jest.fn();

        const scenario = new Scenario(Fluent, 'Foobar')
            .when()
                .empty()
            .then(mockCallback)
            .test();

        expect(scenario.testMode).toBe(true);
    });

});