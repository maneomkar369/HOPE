function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/auth/signin');
}

function ensureRole(role) {
  return function roleMiddleware(req, res, next) {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/signin');
    }
    if (req.session.user.role !== role) {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to perform this action.'
      });
    }
    return next();
  };
}

module.exports = {
  ensureAuthenticated,
  ensureRole
};
