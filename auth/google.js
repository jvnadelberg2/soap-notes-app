'use strict';

const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

function setupGoogleAuth(app) {
  const IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 30); // default 30 min
  const IDLE_MS = IDLE_MINUTES * 60 * 1000;

  app.set("trust proxy", 1);

  // Session
  app.use(session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: IDLE_MS,  // idle timeout
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
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
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  ));

  // Idle timeout check
  app.use((req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      const now = Date.now();
      if (req.session.lastActivity && now - req.session.lastActivity > IDLE_MS) {
        console.log(`[idle-timeout] session expired after ${IDLE_MINUTES}m for user ${req.user.displayName}`);
        req.logout(() => {
          req.session.destroy(() => {
            res.clearCookie("connect.sid");
            return res.redirect("/auth/google");
          });
        });
        return;
      }
      req.session.lastActivity = now;
    }
    next();
  });

  // Routes
  app.get("/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "consent select_account"
    })
  );

  app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => res.redirect("/")
  );

  app.get("/logout", (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/auth/google");
      });
    });
  });

  function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/auth/google");
  }

  app.get("/dashboard", ensureAuth, (req, res) => {
    res.send(`Hello ${req.user.displayName}`);
  });
}

module.exports = { setupGoogleAuth };