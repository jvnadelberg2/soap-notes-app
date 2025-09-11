'use strict';
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({ name:'http_requests_total', help:'Total HTTP requests', labelNames:['method','route','status'] });
const httpDuration = new client.Histogram({ name:'http_request_duration_seconds', help:'Request duration', labelNames:['method','route','status'], buckets:[0.01,0.025,0.05,0.1,0.25,0.5,1,2,5] });
const notesGenerate = new client.Counter({ name:'notes_generate_total', help:'Generate operations' });
const notesFinalize = new client.Counter({ name:'notes_finalize_total', help:'Finalize operations' });
const notesPdf = new client.Counter({ name:'notes_pdf_total', help:'PDF exports' });

register.registerMetric(httpRequests);
register.registerMetric(httpDuration);
register.registerMetric(notesGenerate);
register.registerMetric(notesFinalize);
register.registerMetric(notesPdf);

function metricsMiddleware(){
  return (req,res,next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const route = (req.route && req.route.path) || req.path || 'unknown';
      const dur = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = { method:req.method, route, status:String(res.statusCode) };
      httpRequests.inc(labels, 1);
      httpDuration.labels(labels.method, labels.route, labels.status).observe(dur);
    });
    next();
  };
}

async function metricsHandler(req,res){
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = { register, metricsMiddleware, metricsHandler,
  incGenerate: () => notesGenerate.inc(),
  incFinalize: () => notesFinalize.inc(),
  incPdf: () => notesPdf.inc(),
};
