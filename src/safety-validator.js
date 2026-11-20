export class SafetyValidator {
  constructor() {
    this.restrictedActuators = new Set(['emergency-shutdown', 'core-override', 'main-fuel-valve']);
  }

  validateAction(toolName, args) {
    if (toolName === 'set_actuator_state') {
      const { actuatorId, state } = args;

      // Check if actuator is strictly restricted
      if (this.restrictedActuators.has(actuatorId)) {
        return {
          allowed: false,
          reason: `Action rejected: Actuator '${actuatorId}' is critical safety infrastructure and requires manual operator authorization.`
        };
      }

      // Validate numeric state range if applicable
      if (typeof state === 'string' && !['OPEN', 'CLOSED', 'ON', 'OFF'].includes(state.toUpperCase())) {
        const num = parseFloat(state);
        if (!isNaN(num) && (num < 0 || num > 100)) {
          return {
            allowed: false,
            reason: `Action rejected: Percentage value '${state}' is out of bounds (allowed: 0-100).`
          };
        }
      }
    }

    return { allowed: true };
  }
}
