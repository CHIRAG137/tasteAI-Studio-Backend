const logger = require('../utils/logger');

let phoenix = null;
let provider = null;
let initialized = false;
let enabled = false;

const DEFAULT_PROJECT_NAME = 'tasteAI-Studio';

function shouldEnableTracing() {
  if (process.env.PHOENIX_ENABLED === 'false') {
    return false;
  }
  return Boolean(
    process.env.PHOENIX_ENABLED === 'true' ||
    process.env.PHOENIX_API_KEY ||
    process.env.PHOENIX_COLLECTOR_ENDPOINT ||
    process.env.PHOENIX_BASE_URL
  );
}

function safeRequire(moduleName) {
  try {
    return require(moduleName);
  } catch (error) {
    logger.warn('Phoenix tracing dependency not available', {
      moduleName,
      error: error.message,
    });
    return null;
  }
}

function initPhoenixTracing() {
  if (initialized) {
    return { enabled, provider };
  }
  initialized = true;

  if (!shouldEnableTracing()) {
    logger.info(
      'Phoenix tracing disabled; set PHOENIX_ENABLED=true or PHOENIX_API_KEY to enable it'
    );
    return { enabled: false, provider: null };
  }

  phoenix = safeRequire('@arizeai/phoenix-otel');
  if (!phoenix?.register) {
    return { enabled: false, provider: null };
  }

  const instrumentations = [];
  const httpInstrumentation = safeRequire(
    '@opentelemetry/instrumentation-http'
  );
  const expressInstrumentation = safeRequire(
    '@opentelemetry/instrumentation-express'
  );
  const openAIInstrumentation = safeRequire(
    '@arizeai/openinference-instrumentation-openai'
  );

  if (httpInstrumentation?.HttpInstrumentation) {
    instrumentations.push(new httpInstrumentation.HttpInstrumentation());
  }

  if (expressInstrumentation?.ExpressInstrumentation) {
    instrumentations.push(new expressInstrumentation.ExpressInstrumentation());
  }

  if (openAIInstrumentation?.OpenAIInstrumentation) {
    instrumentations.push(new openAIInstrumentation.OpenAIInstrumentation());
  }

  try {
    provider = phoenix.register({
      projectName: process.env.PHOENIX_PROJECT_NAME || DEFAULT_PROJECT_NAME,
      url:
        process.env.PHOENIX_COLLECTOR_ENDPOINT || process.env.PHOENIX_BASE_URL,
      apiKey: process.env.PHOENIX_API_KEY,
      batch: process.env.PHOENIX_BATCH !== 'false',
      instrumentations,
    });

    enabled = true;
    logger.info('Phoenix tracing initialized', {
      projectName: process.env.PHOENIX_PROJECT_NAME || DEFAULT_PROJECT_NAME,
      instrumentations: instrumentations.length,
    });
  } catch (error) {
    logger.warn(
      'Phoenix tracing failed to initialize; continuing without tracing',
      {
        error: error.message,
      }
    );
  }

  return { enabled, provider };
}

function getPhoenix() {
  if (!phoenix) {
    phoenix = safeRequire('@arizeai/phoenix-otel');
  }
  return phoenix;
}

function setAttributes(span, attributes = {}) {
  if (!span) {
    return;
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'object') {
      span.setAttribute(key, JSON.stringify(value));
    } else {
      span.setAttribute(key, value);
    }
  }
}

async function runPhoenixSpan(name, kind, attributes, fn) {
  if (!enabled) {
    return fn(null);
  }

  const otel = getPhoenix();
  if (!otel?.trace) {
    return fn(null);
  }

  const tracer = otel.trace.getTracer('tasteai-studio-backend');

  return tracer.startActiveSpan(name, async (span) => {
    try {
      setAttributes(span, {
        'openinference.span.kind': kind,
        ...attributes,
      });

      const result = await fn(span);
      return result;
    } catch (error) {
      if (span.recordException) {
        span.recordException(error);
      }
      if (otel.SpanStatusCode) {
        span.setStatus({
          code: otel.SpanStatusCode.ERROR,
          message: error.message,
        });
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

async function shutdownPhoenixTracing() {
  if (!provider?.shutdown) {
    return;
  }

  try {
    await provider.shutdown();
  } catch (error) {
    logger.warn('Phoenix tracing shutdown failed', { error: error.message });
  }
}

function buildPhoenixMcpConfig() {
  return {
    mcpServers: {
      phoenix: {
        command: 'npx',
        args: [
          '-y',
          '@arizeai/phoenix-mcp@latest',
          '--baseUrl',
          process.env.PHOENIX_BASE_URL ||
            process.env.PHOENIX_COLLECTOR_ENDPOINT ||
            'https://app.phoenix.arize.com',
          '--apiKey',
          '${PHOENIX_API_KEY}',
        ],
      },
    },
  };
}

module.exports = {
  buildPhoenixMcpConfig,
  initPhoenixTracing,
  runPhoenixSpan,
  setPhoenixSpanAttributes: setAttributes,
  shutdownPhoenixTracing,
};
