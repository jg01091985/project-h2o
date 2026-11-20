export class TwinMCPRegistry {
  constructor(twinStateStore = {}) {
    this.stateStore = twinStateStore;
    this.customTools = new Map();
  }

  // Register custom digital twin tools at runtime
  registerTool(name, description, parameters, handler) {
    this.customTools.set(name, { description, parameters, handler });
  }

  getToolDeclarations() {
    const baseDeclarations = [
      {
        name: 'get_sensor_reading',
        description: 'Retrieve real-time telemetry or sensor data from a specific digital twin node or equipment ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            nodeId: { type: 'STRING', description: 'The unique ID of the sensor or twin entity' }
          },
          required: ['nodeId']
        }
      },
      {
        name: 'set_actuator_state',
        description: 'Send a command to change state of an actuator, valve, pump, or switch in the digital twin.',
        parameters: {
          type: 'OBJECT',
          properties: {
            actuatorId: { type: 'STRING', description: 'The ID of the actuator' },
            state: { type: 'STRING', description: 'Target state: OPEN, CLOSED, or percentage value (0-100)' }
          },
          required: ['actuatorId', 'state']
        }
      },
      {
        name: 'query_twin_topology',
        description: 'List active subsystems, connections, or node hierarchy in the digital twin project.',
        parameters: {
          type: 'OBJECT',
          properties: {
            subsystem: { type: 'STRING', description: 'Subsystem filter or leave empty for full topology' }
          }
        }
      }
    ];

    for (const [name, def] of this.customTools.entries()) {
      baseDeclarations.push({
        name,
        description: def.description,
        parameters: def.parameters
      });
    }

    return [{ functionDeclarations: baseDeclarations }];
  }

  async executeTool(name, args) {
    if (this.customTools.has(name)) {
      const tool = this.customTools.get(name);
      return await tool.handler(args, this.stateStore);
    }

    switch (name) {
      case 'get_sensor_reading': {
        const { nodeId } = args;
        const data = this.stateStore.sensors?.[nodeId] || { nodeId, status: 'ONLINE', value: 42.5, unit: 'PSI' };
        return { success: true, reading: data };
      }
      case 'set_actuator_state': {
        const { actuatorId, state } = args;
        if (!this.stateStore.actuators) this.stateStore.actuators = {};
        this.stateStore.actuators[actuatorId] = { state, timestamp: new Date().toISOString() };
        return { success: true, message: `Actuator ${actuatorId} set to ${state}` };
      }
      case 'query_twin_topology': {
        const { subsystem } = args || {};
        return {
          success: true,
          topology: {
            root: 'kik-twin-core',
            subsystem: subsystem || 'all',
            nodesCount: 128,
            activeSensors: 48,
            activeActuators: 12
          }
        };
      }
      default:
        throw new Error(`Unknown twin tool: ${name}`);
    }
  }
}
