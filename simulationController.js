const simulator = require('../simulation/simulator');
const { success, error } = require('../utils/response');

function status(req, res) {
  return success(res, simulator.getStatus());
}

async function start(req, res, next) {
  try {
    const result = await simulator.start();
    return success(res, result, 'Simulation started');
  } catch (err) {
    next(err);
  }
}

function stop(req, res) {
  const result = simulator.stop();
  return success(res, result, 'Simulation stopped');
}

async function reset(req, res, next) {
  try {
    const result = await simulator.resetDemo();
    return success(res, result, 'Simulation reset (schema and users untouched)');
  } catch (err) {
    next(err);
  }
}

function setScenario(req, res, next) {
  try {
    const { scenario } = req.body;
    if (!scenario) {
      return error(res, 'VALIDATION_ERROR', 'scenario is required', 422);
    }
    const result = simulator.setScenario(scenario);
    return success(res, result, `Scenario set to ${scenario}`);
  } catch (err) {
    if (err.code === 'INVALID_SCENARIO') {
      return error(res, err.code, err.message, 400);
    }
    next(err);
  }
}

module.exports = { status, start, stop, reset, setScenario };
