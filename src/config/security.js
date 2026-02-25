const helmet = require('helmet');
const cors = require('cors');

/**
 * Helmet.js Security Headers Configuration
 * Implements multiple security headers to protect against common web vulnerabilities
 */
const helmetConfig = helmet({
  // Content Security Policy - Prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // HTTP Strict Transport Security - Forces HTTPS
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options - Prevents clickjacking
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options - Prevents MIME sniffing
  noSniff: true,

  // Referrer-Policy - Controls referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // X-Permitted-Cross-Domain-Policies - Restricts Adobe Flash/PDF
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },

  // X-DNS-Prefetch-Control - Controls DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Download-Options - Prevents IE from executing downloads in site context
  ieNoOpen: true,

  // Removes X-Powered-By header to hide Express
  hidePoweredBy: true,
});

/**
 * CORS Configuration
 * Controls which origins can access the API
 */
const getCorsOptions = () => {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies and authentication headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // Preflight cache duration: 24 hours
  };
};

const corsConfig = cors(getCorsOptions());

module.exports = {
  helmetConfig,
  corsConfig,
};
