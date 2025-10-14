'use strict';

const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

function setupGoogleAuth(app) {
  const IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 30);
  const IDLE_MS = IDLE_MINUTES * 60 * 1000;
  const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback';
  const AUTH_ENABLED = String(process.env.AUTH_ENABLED || '0') === '1';

  const ALLOWED_EMAILS = new Set(
    (process.env.AUTH_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  );
  const ALLOWED_DOMAINS = new Set(
    (process.env.AUTH_DOMAINS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  );

  function isAuthorized(user) {
    if (!AUTH_ENABLED) return true;
    const emails = (user && user.emails) || [];
    for (const e of emails) {
      const email = String(e).toLowerCase();
      if (ALLOWED_EMAILS.size && ALLOWED_EMAILS.has(email)) return true;
      const at = email.lastIndexOf('@');
      if (at > 0) {
        const domain = email.slice(at + 1);
        if (ALLOWED_DOMAINS.size && ALLOWED_DOMAINS.has(domain)) return true;
      }
    }
    if (ALLOWED_EMAILS.size || ALLOWED_DOMAINS.size) return false;
    return false;
  }

  app.set('trust proxy', 1);

  app.use(session({
    secret: process.env.SESSION_SECRET || 'change-me-session-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: IDLE_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL
    },
    (accessToken, refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        displayName: profile.displayName,
        emails: (profile.emails || []).map(e => e.value),
        photos: (profile.photos || []).map(p => p.value),
        provider: 'google'
      };
      return done(null, user);
    }
  ));

  app.use((req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      const now = Date.now();
      if (req.session.lastActivity && now - req.session.lastActivity > IDLE_MS) {
        return req.logout(err => {
          if (err) return next(err);
          req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.redirect('/auth/google');
          });
        });
      }
      req.session.lastActivity = now;
    }
    next();
  });

  app.get('/auth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'consent select_account'
    })
  );

  app.get(CALLBACK_URL,
    passport.authenticate('google', { failureRedirect: '/auth/google' }),
    (req, res) => {
      if (!isAuthorized(req.user)) {
        return req.logout(err => {
          if (err) return res.status(500).send('Logout error');
          req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.status(403).send('Forbidden');
          });
        });
      }
      res.redirect('/');
    }
  );

  // Logout now redirects to a client-side data shredder page
  app.get('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/logged-out.html');
      });
    });
  });

  const open = [
    /^\/auth(\/|$)/,
    /^\/health$/,
    /^\/favicon\.ico$/,
    /^\/logged-out\.html$/,
  ];

  app.use((req, res, next) => {
    if (open.some(rx => rx.test(req.path))) return next();
    if (req.isAuthenticated && req.isAuthenticated()) {
      if (!isAuthorized(req.user)) return res.status(403).send('Forbidden');
      return next();
    }
    return res.redirect('/auth/google');
  });

  app.ensureAuth = function ensureAuth(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated() && isAuthorized(req.user)) return next();
    if (req.isAuthenticated && req.isAuthenticated()) return res.status(403).send('Forbidden');
    return res.redirect('/auth/google');
  };
}

module.exports = { setupGoogleAuth };
