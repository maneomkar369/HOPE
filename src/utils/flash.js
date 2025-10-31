function flashMiddleware(req, res, next) {
  if (!req.session) return next();
  if (!req.session.flash) {
    req.session.flash = [];
  }

  res.locals.flash = [...req.session.flash];
  req.session.flash = [];

  req.flash = function flash(type, message) {
    req.session.flash.push({ type, message });
  };

  next();
}

module.exports = flashMiddleware;
